const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcryptjs');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));
app.use('/admin', express.static(path.join(__dirname, 'admin')));

// Подключение к БД
const db = new sqlite3.Database('./database.sqlite');

// Создание таблиц
db.serialize(() => {
    // Таблица заявок
    db.run(`
        CREATE TABLE IF NOT EXISTS applications (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            phone TEXT NOT NULL,
            service TEXT,
            date TEXT,
            time TEXT,
            message TEXT,
            status TEXT DEFAULT 'new',
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `);

    // Таблица новостей
    db.run(`
        CREATE TABLE IF NOT EXISTS news (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            title TEXT NOT NULL,
            content TEXT NOT NULL,
            is_active INTEGER DEFAULT 1,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `);

    // Таблица администратора
    db.run(`
        CREATE TABLE IF NOT EXISTS admin (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE NOT NULL,
            password TEXT NOT NULL
        )
    `, (err) => {
        if (err) {
            console.error('Ошибка создания таблицы admin:', err.message);
            return;
        }
        
        db.get("SELECT * FROM admin WHERE username = ?", ['admin'], (err, row) => {
            if (err) {
                console.error('Ошибка проверки admin:', err.message);
                return;
            }
            
            if (!row) {
                const hashedPassword = bcrypt.hashSync('admin123', 10);
                db.run("INSERT INTO admin (username, password) VALUES (?, ?)", ['admin', hashedPassword], (err) => {
                    if (err) {
                        console.error('Ошибка создания администратора:', err.message);
                    } else {
                        console.log('✅ Администратор создан (логин: admin, пароль: admin123)');
                    }
                });
            } else {
                console.log('✅ Администратор уже существует');
            }
        });
    });
});

// ============ API для сайта ============

// Получение активных новостей
app.get('/api/news', (req, res) => {
    db.all("SELECT id, title, content, created_at FROM news WHERE is_active = 1 ORDER BY created_at DESC LIMIT 10", (err, rows) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        res.json(rows || []);
    });
});

// Отправка заявки
app.post('/api/application', (req, res) => {
    const { name, phone, service, date, time, message } = req.body;
    
    if (!name || !phone) {
        return res.status(400).json({ error: 'Имя и телефон обязательны' });
    }

    db.run(
        `INSERT INTO applications (name, phone, service, date, time, message) 
         VALUES (?, ?, ?, ?, ?, ?)`,
        [name, phone, service || null, date || null, time || null, message || null],
        function(err) {
            if (err) {
                return res.status(500).json({ error: err.message });
            }
            res.json({ success: true, id: this.lastID });
        }
    );
});

// ============ API для админки ============

const checkAuth = (req, res, next) => {
    const token = req.headers['authorization'];
    const validToken = process.env.ADMIN_TOKEN || 'secret-token-2026';
    
    if (token === `Bearer ${validToken}`) {
        next();
    } else {
        res.status(401).json({ error: 'Не авторизован' });
    }
};

// Логин
app.post('/api/admin/login', (req, res) => {
    const { username, password } = req.body;
    
    db.get("SELECT * FROM admin WHERE username = ?", [username], (err, user) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        
        if (!user) {
            res.status(401).json({ error: 'Неверный логин или пароль' });
            return;
        }
        
        if (bcrypt.compareSync(password, user.password)) {
            res.json({ 
                success: true, 
                token: process.env.ADMIN_TOKEN || 'secret-token-2026'
            });
        } else {
            res.status(401).json({ error: 'Неверный логин или пароль' });
        }
    });
});

// Получение заявок
app.get('/api/admin/applications', checkAuth, (req, res) => {
    db.all("SELECT * FROM applications ORDER BY created_at DESC", (err, rows) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        res.json(rows || []);
    });
});

// Получение заявок по дате (для календаря)
app.get('/api/admin/applications/by-date', checkAuth, (req, res) => {
    const { date } = req.query;
    if (!date) {
        return res.status(400).json({ error: 'Дата обязательна' });
    }
    
    db.all(
        `SELECT * FROM applications WHERE DATE(created_at) = ? ORDER BY created_at DESC`,
        [date],
        (err, rows) => {
            if (err) {
                res.status(500).json({ error: err.message });
                return;
            }
            res.json(rows || []);
        }
    );
});

// Обновление статуса заявки
app.put('/api/admin/applications/:id', checkAuth, (req, res) => {
    const { status } = req.body;
    db.run("UPDATE applications SET status = ? WHERE id = ?", [status, req.params.id], function(err) {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        res.json({ success: true });
    });
});

// Удаление заявки
app.delete('/api/admin/applications/:id', checkAuth, (req, res) => {
    db.run("DELETE FROM applications WHERE id = ?", [req.params.id], function(err) {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        res.json({ success: true });
    });
});

// Получение новостей (для админки)
app.get('/api/admin/news', checkAuth, (req, res) => {
    db.all("SELECT * FROM news ORDER BY created_at DESC", (err, rows) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        res.json(rows || []);
    });
});

// Создание новости
app.post('/api/admin/news', checkAuth, (req, res) => {
    const { title, content, is_active } = req.body;
    
    if (!title || !content) {
        res.status(400).json({ error: 'Заголовок и текст обязательны' });
        return;
    }
    
    db.run(
        "INSERT INTO news (title, content, is_active) VALUES (?, ?, ?)",
        [title, content, is_active !== undefined ? is_active : 1],
        function(err) {
            if (err) {
                res.status(500).json({ error: err.message });
                return;
            }
            res.json({ success: true, id: this.lastID });
        }
    );
});

// Обновление новости
app.put('/api/admin/news/:id', checkAuth, (req, res) => {
    const { title, content, is_active } = req.body;
    db.run(
        "UPDATE news SET title = ?, content = ?, is_active = ? WHERE id = ?",
        [title, content, is_active, req.params.id],
        function(err) {
            if (err) {
                res.status(500).json({ error: err.message });
                return;
            }
            res.json({ success: true });
        }
    );
});

// Удаление новости
app.delete('/api/admin/news/:id', checkAuth, (req, res) => {
    db.run("DELETE FROM news WHERE id = ?", [req.params.id], function(err) {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        res.json({ success: true });
    });
});

// Статистика
app.get('/api/admin/stats', checkAuth, (req, res) => {
    db.get("SELECT COUNT(*) as total FROM applications", (err, totalApps) => {
        const total = totalApps ? totalApps.total : 0;
        
        db.get("SELECT COUNT(*) as new FROM applications WHERE status = 'new'", (err, newApps) => {
            const newCount = newApps ? newApps.new : 0;
            
            db.get("SELECT COUNT(*) as newsCount FROM news", (err, newsCount) => {
                const newsTotal = newsCount ? newsCount.newsCount : 0;
                
                res.json({
                    total_applications: total,
                    new_applications: newCount,
                    news_count: newsTotal
                });
            });
        });
    });
});

// Отдача страниц
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Запуск сервера
app.listen(PORT, () => {
    console.log(`✅ Сервер запущен на http://localhost:${PORT}`);
});

// ========== ДОБАВИТЬ ТАБЛИЦЫ ==========
db.serialize(() => {
    // ... существующие таблицы ...
    
    // Таблица услуг
    db.run(`
        CREATE TABLE IF NOT EXISTS services (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            price TEXT NOT NULL,
            description TEXT,
            image TEXT,
            sort_order INTEGER DEFAULT 0,
            is_active INTEGER DEFAULT 1,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `);

    // Таблица отзывов
    db.run(`
        CREATE TABLE IF NOT EXISTS reviews (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            author TEXT NOT NULL,
            text TEXT NOT NULL,
            rating INTEGER DEFAULT 5,
            photo TEXT,
            is_active INTEGER DEFAULT 1,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `);

    // Таблица врачей
    db.run(`
        CREATE TABLE IF NOT EXISTS doctors (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            position TEXT,
            description TEXT,
            photo TEXT,
            experience TEXT,
            sort_order INTEGER DEFAULT 0,
            is_active INTEGER DEFAULT 1,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `);

    // Таблица галереи
    db.run(`
        CREATE TABLE IF NOT EXISTS gallery (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            image TEXT NOT NULL,
            title TEXT,
            sort_order INTEGER DEFAULT 0,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `);
});

// ========== API ДЛЯ УСЛУГ ==========
app.get('/api/admin/services', checkAuth, (req, res) => {
    db.all("SELECT * FROM services ORDER BY sort_order, id", (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows || []);
    });
});

app.post('/api/admin/services', checkAuth, (req, res) => {
    const { name, price, description, image, sort_order, is_active } = req.body;
    if (!name || !price) {
        return res.status(400).json({ error: 'Название и цена обязательны' });
    }
    db.run(
        "INSERT INTO services (name, price, description, image, sort_order, is_active) VALUES (?, ?, ?, ?, ?, ?)",
        [name, price, description || '', image || '', sort_order || 0, is_active !== undefined ? is_active : 1],
        function(err) {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ success: true, id: this.lastID });
        }
    );
});

app.put('/api/admin/services/:id', checkAuth, (req, res) => {
    const { name, price, description, image, sort_order, is_active } = req.body;
    db.run(
        "UPDATE services SET name = ?, price = ?, description = ?, image = ?, sort_order = ?, is_active = ? WHERE id = ?",
        [name, price, description, image, sort_order, is_active, req.params.id],
        function(err) {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ success: true });
        }
    );
});

app.delete('/api/admin/services/:id', checkAuth, (req, res) => {
    db.run("DELETE FROM services WHERE id = ?", [req.params.id], function(err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ success: true });
    });
});

// Публичный API для услуг (для сайта)
app.get('/api/services', (req, res) => {
    db.all("SELECT * FROM services WHERE is_active = 1 ORDER BY sort_order, id", (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows || []);
    });
});

// ========== API ДЛЯ ОТЗЫВОВ ==========
app.get('/api/admin/reviews', checkAuth, (req, res) => {
    db.all("SELECT * FROM reviews ORDER BY created_at DESC", (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows || []);
    });
});

app.post('/api/admin/reviews', checkAuth, (req, res) => {
    const { author, text, rating, photo, is_active } = req.body;
    if (!author || !text) {
        return res.status(400).json({ error: 'Имя и текст отзыва обязательны' });
    }
    db.run(
        "INSERT INTO reviews (author, text, rating, photo, is_active) VALUES (?, ?, ?, ?, ?)",
        [author, text, rating || 5, photo || '', is_active !== undefined ? is_active : 1],
        function(err) {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ success: true, id: this.lastID });
        }
    );
});

app.put('/api/admin/reviews/:id', checkAuth, (req, res) => {
    const { author, text, rating, photo, is_active } = req.body;
    db.run(
        "UPDATE reviews SET author = ?, text = ?, rating = ?, photo = ?, is_active = ? WHERE id = ?",
        [author, text, rating, photo, is_active, req.params.id],
        function(err) {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ success: true });
        }
    );
});

app.delete('/api/admin/reviews/:id', checkAuth, (req, res) => {
    db.run("DELETE FROM reviews WHERE id = ?", [req.params.id], function(err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ success: true });
    });
});

// Публичный API для отзывов
app.get('/api/reviews', (req, res) => {
    db.all("SELECT * FROM reviews WHERE is_active = 1 ORDER BY created_at DESC LIMIT 10", (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows || []);
    });
});

// ========== API ДЛЯ ВРАЧЕЙ ==========
app.get('/api/admin/doctors', checkAuth, (req, res) => {
    db.all("SELECT * FROM doctors ORDER BY sort_order, id", (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows || []);
    });
});

app.post('/api/admin/doctors', checkAuth, (req, res) => {
    const { name, position, description, photo, experience, sort_order, is_active } = req.body;
    if (!name) return res.status(400).json({ error: 'Имя врача обязательно' });
    db.run(
        "INSERT INTO doctors (name, position, description, photo, experience, sort_order, is_active) VALUES (?, ?, ?, ?, ?, ?, ?)",
        [name, position || '', description || '', photo || '', experience || '', sort_order || 0, is_active !== undefined ? is_active : 1],
        function(err) {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ success: true, id: this.lastID });
        }
    );
});

app.put('/api/admin/doctors/:id', checkAuth, (req, res) => {
    const { name, position, description, photo, experience, sort_order, is_active } = req.body;
    db.run(
        "UPDATE doctors SET name = ?, position = ?, description = ?, photo = ?, experience = ?, sort_order = ?, is_active = ? WHERE id = ?",
        [name, position, description, photo, experience, sort_order, is_active, req.params.id],
        function(err) {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ success: true });
        }
    );
});

app.delete('/api/admin/doctors/:id', checkAuth, (req, res) => {
    db.run("DELETE FROM doctors WHERE id = ?", [req.params.id], function(err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ success: true });
    });
});

// Публичный API для врачей
app.get('/api/doctors', (req, res) => {
    db.all("SELECT * FROM doctors WHERE is_active = 1 ORDER BY sort_order, id", (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows || []);
    });
});

// ========== API ДЛЯ ГАЛЕРЕИ ==========
app.get('/api/admin/gallery', checkAuth, (req, res) => {
    db.all("SELECT * FROM gallery ORDER BY sort_order, id", (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows || []);
    });
});

app.post('/api/admin/gallery', checkAuth, (req, res) => {
    const { image, title, sort_order } = req.body;
    if (!image) return res.status(400).json({ error: 'Ссылка на изображение обязательна' });
    db.run(
        "INSERT INTO gallery (image, title, sort_order) VALUES (?, ?, ?)",
        [image, title || '', sort_order || 0],
        function(err) {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ success: true, id: this.lastID });
        }
    );
});

app.delete('/api/admin/gallery/:id', checkAuth, (req, res) => {
    db.run("DELETE FROM gallery WHERE id = ?", [req.params.id], function(err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ success: true });
    });
});

// Публичный API для галереи
app.get('/api/gallery', (req, res) => {
    db.all("SELECT * FROM gallery ORDER BY sort_order, id", (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows || []);
    });
});