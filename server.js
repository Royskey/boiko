const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcryptjs');
const cors = require('cors');
const path = require('path');
const multer = require('multer');
const fs = require('fs');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));
app.use('/admin', express.static(path.join(__dirname, 'admin')));

// Папка для загрузок
const uploadDir = path.join(__dirname, 'public', 'uploads');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, uploadDir),
    filename: (req, file, cb) => {
        const unique = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, unique + path.extname(file.originalname));
    }
});
const upload = multer({ storage, limits: { fileSize: 10 * 1024 * 1024 } });

// База данных с поддержкой постоянного хранилища Amvera
const dbPath = process.env.DB_PATH || path.join('/data', 'database.sqlite');
const db = new sqlite3.Database(dbPath);
console.log(`📁 База данных: ${dbPath}`);

// ========== ИНИЦИАЛИЗАЦИЯ ТАБЛИЦ ==========
db.serialize(() => {
    db.run(`CREATE TABLE IF NOT EXISTS applications (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        phone TEXT NOT NULL,
        service TEXT,
        date TEXT,
        time TEXT,
        message TEXT,
        status TEXT DEFAULT 'new',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS news (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        content TEXT NOT NULL,
        is_active INTEGER DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS admin (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS services (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        price TEXT NOT NULL,
        description TEXT,
        image TEXT,
        sort_order INTEGER DEFAULT 0,
        is_active INTEGER DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS reviews (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        author TEXT NOT NULL,
        text TEXT NOT NULL,
        rating INTEGER DEFAULT 5,
        photo TEXT,
        is_active INTEGER DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS doctors (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        position TEXT,
        description TEXT,
        photo TEXT,
        experience TEXT,
        sort_order INTEGER DEFAULT 0,
        is_active INTEGER DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS gallery (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        image TEXT NOT NULL,
        title TEXT,
        sort_order INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS settings (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        key TEXT UNIQUE NOT NULL,
        value TEXT,
        type TEXT DEFAULT 'text',
        description TEXT
    )`);

    // Настройки по умолчанию
    const defaultSettings = [
        ['phone', '+7 (999) 123-45-67', 'text', 'Телефон'],
        ['email', 'info@cosmetology.ru', 'text', 'Email'],
        ['telegram', 'https://t.me/hahahustla', 'text', 'Telegram'],
        ['address', 'г. Новосибирск, ул. Ленина, 3, офис 335', 'text', 'Адрес'],
        ['work_hours', 'Пн-Пт: 9:00–22:00<br>Сб: выходной<br>Вс: 9:00–22:00', 'textarea', 'Часы работы'],
        ['show_hero', '1', 'checkbox', 'Показывать Hero'],
        ['show_mission', '1', 'checkbox', 'Показывать миссию'],
        ['show_gallery', '1', 'checkbox', 'Показывать галерею'],
        ['show_values', '1', 'checkbox', 'Показывать "Почему мы"'],
        ['show_services_home', '1', 'checkbox', 'Услуги на главной'],
        ['show_reviews_home', '1', 'checkbox', 'Отзывы на главной'],
        ['hero_title', 'Красота, которая рождается снаружи', 'text', 'Заголовок Hero'],
        ['hero_subtitle', 'Премиальная косметология в Новосибирске', 'textarea', 'Подзаголовок'],
        ['mission_text', 'Дарить уверенность через естественную красоту.', 'textarea', 'Текст миссии'],
        ['mission_slogan', '«Ваша кожа заслуживает лучшего»', 'text', 'Слоган']
    ];
    defaultSettings.forEach(([key, value, type, desc]) => {
        db.run("INSERT OR IGNORE INTO settings (key, value, type, description) VALUES (?, ?, ?, ?)", [key, value, type, desc]);
    });

    // Админ по умолчанию (пароль: admin123)
    db.get("SELECT * FROM admin WHERE username = ?", ['admin'], (err, row) => {
        if (!row) {
            const hashed = bcrypt.hashSync('admin123', 10);
            db.run("INSERT INTO admin (username, password) VALUES (?, ?)", ['admin', hashed]);
            console.log('✅ Администратор создан: admin / admin123');
        }
    });
});

// Утилита удаления старого файла
function deleteOldFile(filePath) {
    if (filePath && !filePath.startsWith('http')) {
        const full = path.join(__dirname, 'public', filePath);
        if (fs.existsSync(full)) fs.unlinkSync(full);
    }
}

// ========== ПУБЛИЧНЫЕ API ==========
app.get('/api/news', (req, res) => {
    db.all("SELECT id, title, content, created_at FROM news WHERE is_active = 1 ORDER BY created_at DESC LIMIT 10", (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows || []);
    });
});

app.get('/api/services', (req, res) => {
    db.all("SELECT * FROM services WHERE is_active = 1 ORDER BY sort_order, id", (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows || []);
    });
});

app.get('/api/doctors', (req, res) => {
    db.all("SELECT * FROM doctors WHERE is_active = 1 ORDER BY sort_order, id", (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows || []);
    });
});

app.get('/api/reviews', (req, res) => {
    db.all("SELECT * FROM reviews WHERE is_active = 1 ORDER BY created_at DESC LIMIT 20", (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows || []);
    });
});

app.get('/api/gallery', (req, res) => {
    db.all("SELECT * FROM gallery ORDER BY sort_order, id", (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows || []);
    });
});

app.get('/api/settings', (req, res) => {
    db.all("SELECT key, value FROM settings", (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        const settings = {};
        rows.forEach(r => settings[r.key] = r.value);
        res.json(settings);
    });
});

app.post('/api/application', (req, res) => {
    const { name, phone, service, date, time, message } = req.body;
    if (!name || !phone) return res.status(400).json({ error: 'Имя и телефон обязательны' });
    db.run(`INSERT INTO applications (name, phone, service, date, time, message) VALUES (?, ?, ?, ?, ?, ?)`,
        [name, phone, service || null, date || null, time || null, message || null],
        function(err) {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ success: true, id: this.lastID });
        });
});

// ========== АДМИН API ==========
const checkAuth = (req, res, next) => {
    const token = req.headers['authorization'];
    const validToken = process.env.ADMIN_TOKEN || 'secret-token-2026';
    if (token === `Bearer ${validToken}`) return next();
    res.status(401).json({ error: 'Не авторизован' });
};

app.post('/api/admin/login', (req, res) => {
    const { username, password } = req.body;
    db.get("SELECT * FROM admin WHERE username = ?", [username], (err, user) => {
        if (err || !user || !bcrypt.compareSync(password, user.password)) {
            return res.status(401).json({ error: 'Неверный логин или пароль' });
        }
        res.json({ success: true, token: process.env.ADMIN_TOKEN || 'secret-token-2026' });
    });
});

// Заявки
app.get('/api/admin/applications', checkAuth, (req, res) => {
    db.all("SELECT * FROM applications ORDER BY created_at DESC", (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows || []);
    });
});

app.get('/api/admin/applications/by-date', checkAuth, (req, res) => {
    const { date } = req.query;
    if (!date) return res.status(400).json({ error: 'Дата обязательна' });
    db.all("SELECT * FROM applications WHERE date = ? ORDER BY time ASC", [date], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows || []);
    });
});

app.put('/api/admin/applications/:id', checkAuth, (req, res) => {
    const { status } = req.body;
    db.run("UPDATE applications SET status = ? WHERE id = ?", [status, req.params.id], (err) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ success: true });
    });
});

app.delete('/api/admin/applications/:id', checkAuth, (req, res) => {
    db.run("DELETE FROM applications WHERE id = ?", [req.params.id], (err) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ success: true });
    });
});

// Услуги
app.get('/api/admin/services', checkAuth, (req, res) => {
    db.all("SELECT * FROM services ORDER BY sort_order, id", (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows || []);
    });
});

app.post('/api/admin/services', checkAuth, upload.single('image'), (req, res) => {
    const { name, price, description, sort_order, is_active } = req.body;
    if (!name || !price) return res.status(400).json({ error: 'Название и цена обязательны' });
    const image = req.file ? `/uploads/${req.file.filename}` : '';
    db.run(`INSERT INTO services (name, price, description, image, sort_order, is_active) VALUES (?, ?, ?, ?, ?, ?)`,
        [name, price, description || '', image, sort_order || 0, is_active !== undefined ? is_active : 1],
        function(err) {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ success: true, id: this.lastID });
        });
});

app.put('/api/admin/services/:id', checkAuth, upload.single('image'), (req, res) => {
    const { name, price, description, sort_order, is_active, old_image } = req.body;
    let image = old_image || '';
    if (req.file) {
        image = `/uploads/${req.file.filename}`;
        if (old_image && old_image !== image) deleteOldFile(old_image);
    }
    db.run(`UPDATE services SET name = ?, price = ?, description = ?, image = ?, sort_order = ?, is_active = ? WHERE id = ?`,
        [name, price, description || '', image, sort_order || 0, is_active, req.params.id],
        (err) => {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ success: true });
        });
});

app.delete('/api/admin/services/:id', checkAuth, (req, res) => {
    db.get("SELECT image FROM services WHERE id = ?", [req.params.id], (err, row) => {
        if (row?.image) deleteOldFile(row.image);
        db.run("DELETE FROM services WHERE id = ?", [req.params.id], (err) => {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ success: true });
        });
    });
});

// Отзывы
app.get('/api/admin/reviews', checkAuth, (req, res) => {
    db.all("SELECT * FROM reviews ORDER BY created_at DESC", (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows || []);
    });
});

app.post('/api/admin/reviews', checkAuth, (req, res) => {
    const { author, text, rating, photo, is_active } = req.body;
    if (!author || !text) return res.status(400).json({ error: 'Имя и текст обязательны' });
    db.run(`INSERT INTO reviews (author, text, rating, photo, is_active) VALUES (?, ?, ?, ?, ?)`,
        [author, text, rating || 5, photo || '', is_active !== undefined ? is_active : 1],
        function(err) {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ success: true, id: this.lastID });
        });
});

app.put('/api/admin/reviews/:id', checkAuth, (req, res) => {
    const { author, text, rating, photo, is_active } = req.body;
    db.run(`UPDATE reviews SET author = ?, text = ?, rating = ?, photo = ?, is_active = ? WHERE id = ?`,
        [author, text, rating, photo, is_active, req.params.id],
        (err) => {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ success: true });
        });
});

app.delete('/api/admin/reviews/:id', checkAuth, (req, res) => {
    db.run("DELETE FROM reviews WHERE id = ?", [req.params.id], (err) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ success: true });
    });
});

// Врачи
app.get('/api/admin/doctors', checkAuth, (req, res) => {
    db.all("SELECT * FROM doctors ORDER BY sort_order, id", (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows || []);
    });
});

app.post('/api/admin/doctors', checkAuth, upload.single('photo'), (req, res) => {
    const { name, position, description, experience, sort_order, is_active } = req.body;
    if (!name) return res.status(400).json({ error: 'Имя обязательно' });
    const photo = req.file ? `/uploads/${req.file.filename}` : '';
    db.run(`INSERT INTO doctors (name, position, description, photo, experience, sort_order, is_active) VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [name, position || '', description || '', photo, experience || '', sort_order || 0, is_active !== undefined ? is_active : 1],
        function(err) {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ success: true, id: this.lastID });
        });
});

app.put('/api/admin/doctors/:id', checkAuth, upload.single('photo'), (req, res) => {
    const { name, position, description, experience, sort_order, is_active, old_photo } = req.body;
    let photo = old_photo || '';
    if (req.file) {
        photo = `/uploads/${req.file.filename}`;
        if (old_photo && old_photo !== photo) deleteOldFile(old_photo);
    }
    db.run(`UPDATE doctors SET name = ?, position = ?, description = ?, photo = ?, experience = ?, sort_order = ?, is_active = ? WHERE id = ?`,
        [name, position || '', description || '', photo, experience || '', sort_order || 0, is_active, req.params.id],
        (err) => {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ success: true });
        });
});

app.delete('/api/admin/doctors/:id', checkAuth, (req, res) => {
    db.get("SELECT photo FROM doctors WHERE id = ?", [req.params.id], (err, row) => {
        if (row?.photo) deleteOldFile(row.photo);
        db.run("DELETE FROM doctors WHERE id = ?", [req.params.id], (err) => {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ success: true });
        });
    });
});

// Галерея
app.get('/api/admin/gallery', checkAuth, (req, res) => {
    db.all("SELECT * FROM gallery ORDER BY sort_order, id", (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows || []);
    });
});

app.post('/api/admin/gallery', checkAuth, upload.single('image'), (req, res) => {
    if (!req.file) return res.status(400).json({ error: 'Файл не загружен' });
    const image = `/uploads/${req.file.filename}`;
    const { title, sort_order } = req.body;
    db.run(`INSERT INTO gallery (image, title, sort_order) VALUES (?, ?, ?)`,
        [image, title || '', sort_order || 0],
        function(err) {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ success: true, id: this.lastID });
        });
});

app.delete('/api/admin/gallery/:id', checkAuth, (req, res) => {
    db.get("SELECT image FROM gallery WHERE id = ?", [req.params.id], (err, row) => {
        if (row?.image) deleteOldFile(row.image);
        db.run("DELETE FROM gallery WHERE id = ?", [req.params.id], (err) => {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ success: true });
        });
    });
});

// Новости
app.get('/api/admin/news', checkAuth, (req, res) => {
    db.all("SELECT * FROM news ORDER BY created_at DESC", (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows || []);
    });
});

app.post('/api/admin/news', checkAuth, (req, res) => {
    const { title, content, is_active } = req.body;
    if (!title || !content) return res.status(400).json({ error: 'Заголовок и текст обязательны' });
    db.run(`INSERT INTO news (title, content, is_active) VALUES (?, ?, ?)`,
        [title, content, is_active !== undefined ? is_active : 1],
        function(err) {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ success: true, id: this.lastID });
        });
});

app.put('/api/admin/news/:id', checkAuth, (req, res) => {
    const { title, content, is_active } = req.body;
    db.run(`UPDATE news SET title = ?, content = ?, is_active = ? WHERE id = ?`,
        [title, content, is_active, req.params.id],
        (err) => {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ success: true });
        });
});

app.delete('/api/admin/news/:id', checkAuth, (req, res) => {
    db.run("DELETE FROM news WHERE id = ?", [req.params.id], (err) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ success: true });
    });
});

// Настройки
app.get('/api/admin/settings', checkAuth, (req, res) => {
    db.all("SELECT * FROM settings", (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows || []);
    });
});

app.put('/api/admin/settings/:key', checkAuth, (req, res) => {
    const { value } = req.body;
    db.run("UPDATE settings SET value = ? WHERE key = ?", [value, req.params.key], (err) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ success: true });
    });
});

// Статистика
app.get('/api/admin/stats', checkAuth, (req, res) => {
    db.get("SELECT COUNT(*) as total FROM applications", (err, total) => {
        const totalApps = total ? total.total : 0;
        db.get("SELECT COUNT(*) as new FROM applications WHERE status = 'new'", (err, newApps) => {
            const newCount = newApps ? newApps.new : 0;
            db.get("SELECT COUNT(*) as newsCount FROM news", (err, newsCount) => {
                res.json({
                    total_applications: totalApps,
                    new_applications: newCount,
                    news_count: newsCount ? newsCount.newsCount : 0
                });
            });
        });
    });
});

// Запуск сервера
app.listen(PORT, '0.0.0.0', () => {
    console.log(`✅ Сервер запущен на порту ${PORT}`);
    console.log(`🌐 Доступен по адресу: http://localhost:${PORT}`);
});
