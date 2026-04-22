const API_BASE = '/api/admin';
let token = localStorage.getItem('adminToken');

if (!token) window.location.href = 'login.html';

const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
};

// ========== СТАТИСТИКА ==========
async function loadStats() {
    try {
        const response = await fetch(`${API_BASE}/stats`, { headers });
        const stats = await response.json();
        document.getElementById('stats').innerHTML = `
            <div class="stat-card"><div class="stat-number">${stats.total_applications}</div><div class="stat-label">Заявок</div></div>
            <div class="stat-card"><div class="stat-number">${stats.new_applications}</div><div class="stat-label">Новых</div></div>
            <div class="stat-card"><div class="stat-number" id="servicesCount">-</div><div class="stat-label">Услуг</div></div>
            <div class="stat-card"><div class="stat-number" id="reviewsCount">-</div><div class="stat-label">Отзывов</div></div>
        `;
    } catch (error) {
        console.error(error);
    }
}

// ========== ЗАЯВКИ ==========
async function loadApplications() {
    try {
        const response = await fetch(`${API_BASE}/applications`, { headers });
        const apps = await response.json();
        const tbody = document.querySelector('#applications-table tbody');
        tbody.innerHTML = apps.map(app => `
            <tr>
                <td data-label="ID">${app.id}</td>
                <td data-label="Дата">${new Date(app.created_at).toLocaleString('ru-RU')}</td>
                <td data-label="Имя">${escapeHtml(app.name)}</td>
                <td data-label="Телефон">${escapeHtml(app.phone)}</td>
                <td data-label="Услуга">${escapeHtml(app.service || '-')}</td>
                <td data-label="Статус">
                    <select onchange="updateStatus(${app.id}, this.value)">
                        <option value="new" ${app.status === 'new' ? 'selected' : ''}>🟡 Новая</option>
                        <option value="in_progress" ${app.status === 'in_progress' ? 'selected' : ''}>🔵 В работе</option>
                        <option value="completed" ${app.status === 'completed' ? 'selected' : ''}>🟢 Завершена</option>
                    </select>
                </td>
                <td data-label="Действия">
                    <button class="btn-delete" onclick="deleteApplication(${app.id})">🗑️</button>
                </td>
            </tr>
        `).join('');
    } catch (error) {
        console.error(error);
    }
}

async function updateStatus(id, status) {
    try {
        await fetch(`${API_BASE}/applications/${id}`, { method: 'PUT', headers, body: JSON.stringify({ status }) });
        loadApplications();
        loadStats();
    } catch (error) { console.error(error); }
}

async function deleteApplication(id) {
    if (!confirm('Удалить заявку?')) return;
    try {
        await fetch(`${API_BASE}/applications/${id}`, { method: 'DELETE', headers });
        loadApplications();
        loadStats();
    } catch (error) { console.error(error); }
}

// ========== УСЛУГИ ==========
async function loadServices() {
    try {
        const response = await fetch(`${API_BASE}/services`, { headers });
        const services = await response.json();
        document.getElementById('servicesCount') && (document.getElementById('servicesCount').innerText = services.length);
        
        const container = document.getElementById('services-list');
        if (!container) return;
        
        container.innerHTML = services.map(service => `
            <div class="edit-card" data-id="${service.id}">
                <div class="edit-card-header">
                    <input class="edit-name" value="${escapeHtml(service.name)}" placeholder="Название">
                    <input class="edit-price" value="${escapeHtml(service.price)}" placeholder="Цена">
                </div>
                <textarea class="edit-desc" placeholder="Описание">${escapeHtml(service.description || '')}</textarea>
                <input class="edit-image" value="${escapeHtml(service.image || '')}" placeholder="URL фото">
                <div class="edit-card-actions">
                    <label>🔘 Активна: <input type="checkbox" class="edit-active" ${service.is_active ? 'checked' : ''}></label>
                    <label>🔢 Сортировка: <input type="number" class="edit-order" value="${service.sort_order}" style="width:60px"></label>
                    <button class="btn-save" onclick="saveService(${service.id}, this)">💾 Сохранить</button>
                    <button class="btn-delete" onclick="deleteService(${service.id})">🗑️ Удалить</button>
                </div>
            </div>
        `).join('');
    } catch (error) { console.error(error); }
}

async function saveService(id, btn) {
    const card = btn.closest('.edit-card');
    const data = {
        name: card.querySelector('.edit-name').value,
        price: card.querySelector('.edit-price').value,
        description: card.querySelector('.edit-desc').value,
        image: card.querySelector('.edit-image').value,
        is_active: card.querySelector('.edit-active').checked ? 1 : 0,
        sort_order: parseInt(card.querySelector('.edit-order').value) || 0
    };
    try {
        await fetch(`${API_BASE}/services/${id}`, { method: 'PUT', headers, body: JSON.stringify(data) });
        alert('Сохранено!');
        loadServices();
    } catch (error) { alert('Ошибка'); }
}

async function deleteService(id) {
    if (!confirm('Удалить услугу?')) return;
    try {
        await fetch(`${API_BASE}/services/${id}`, { method: 'DELETE', headers });
        loadServices();
    } catch (error) { alert('Ошибка'); }
}

async function addService() {
    const data = { name: 'Новая услуга', price: 'от 0 ₽', description: '', image: '', is_active: 1, sort_order: 0 };
    try {
        await fetch(`${API_BASE}/services`, { method: 'POST', headers, body: JSON.stringify(data) });
        loadServices();
    } catch (error) { alert('Ошибка'); }
}

// ========== ОТЗЫВЫ ==========
async function loadReviews() {
    try {
        const response = await fetch(`${API_BASE}/reviews`, { headers });
        const reviews = await response.json();
        document.getElementById('reviewsCount') && (document.getElementById('reviewsCount').innerText = reviews.length);
        
        const container = document.getElementById('reviews-list');
        if (!container) return;
        
        container.innerHTML = reviews.map(review => `
            <div class="edit-card" data-id="${review.id}">
                <input class="edit-author" value="${escapeHtml(review.author)}" placeholder="Автор">
                <textarea class="edit-text" placeholder="Текст отзыва">${escapeHtml(review.text)}</textarea>
                <div class="edit-card-actions">
                    <label>⭐ Рейтинг: <input type="number" class="edit-rating" value="${review.rating}" min="1" max="5" style="width:60px"></label>
                    <label>✅ Активен: <input type="checkbox" class="edit-active" ${review.is_active ? 'checked' : ''}></label>
                    <button class="btn-save" onclick="saveReview(${review.id}, this)">💾 Сохранить</button>
                    <button class="btn-delete" onclick="deleteReview(${review.id})">🗑️ Удалить</button>
                </div>
            </div>
        `).join('');
    } catch (error) { console.error(error); }
}

async function saveReview(id, btn) {
    const card = btn.closest('.edit-card');
    const data = {
        author: card.querySelector('.edit-author').value,
        text: card.querySelector('.edit-text').value,
        rating: parseInt(card.querySelector('.edit-rating').value) || 5,
        is_active: card.querySelector('.edit-active').checked ? 1 : 0
    };
    try {
        await fetch(`${API_BASE}/reviews/${id}`, { method: 'PUT', headers, body: JSON.stringify(data) });
        alert('Сохранено!');
        loadReviews();
    } catch (error) { alert('Ошибка'); }
}

async function deleteReview(id) {
    if (!confirm('Удалить отзыв?')) return;
    try {
        await fetch(`${API_BASE}/reviews/${id}`, { method: 'DELETE', headers });
        loadReviews();
    } catch (error) { alert('Ошибка'); }
}

async function addReview() {
    const data = { author: 'Новый клиент', text: 'Текст отзыва...', rating: 5, is_active: 1 };
    try {
        await fetch(`${API_BASE}/reviews`, { method: 'POST', headers, body: JSON.stringify(data) });
        loadReviews();
    } catch (error) { alert('Ошибка'); }
}

// ========== ВРАЧИ ==========
async function loadDoctors() {
    try {
        const response = await fetch(`${API_BASE}/doctors`, { headers });
        const doctors = await response.json();
        const container = document.getElementById('doctors-list');
        if (!container) return;
        
        container.innerHTML = doctors.map(doc => `
            <div class="edit-card" data-id="${doc.id}">
                <input class="edit-name" value="${escapeHtml(doc.name)}" placeholder="Имя врача">
                <input class="edit-position" value="${escapeHtml(doc.position || '')}" placeholder="Должность">
                <textarea class="edit-desc" placeholder="Описание">${escapeHtml(doc.description || '')}</textarea>
                <input class="edit-photo" value="${escapeHtml(doc.photo || '')}" placeholder="URL фото">
                <input class="edit-experience" value="${escapeHtml(doc.experience || '')}" placeholder="Стаж">
                <div class="edit-card-actions">
                    <label>✅ Активен: <input type="checkbox" class="edit-active" ${doc.is_active ? 'checked' : ''}></label>
                    <label>🔢 Сортировка: <input type="number" class="edit-order" value="${doc.sort_order}" style="width:60px"></label>
                    <button class="btn-save" onclick="saveDoctor(${doc.id}, this)">💾 Сохранить</button>
                    <button class="btn-delete" onclick="deleteDoctor(${doc.id})">🗑️ Удалить</button>
                </div>
            </div>
        `).join('');
    } catch (error) { console.error(error); }
}

async function saveDoctor(id, btn) {
    const card = btn.closest('.edit-card');
    const data = {
        name: card.querySelector('.edit-name').value,
        position: card.querySelector('.edit-position').value,
        description: card.querySelector('.edit-desc').value,
        photo: card.querySelector('.edit-photo').value,
        experience: card.querySelector('.edit-experience').value,
        is_active: card.querySelector('.edit-active').checked ? 1 : 0,
        sort_order: parseInt(card.querySelector('.edit-order').value) || 0
    };
    try {
        await fetch(`${API_BASE}/doctors/${id}`, { method: 'PUT', headers, body: JSON.stringify(data) });
        alert('Сохранено!');
        loadDoctors();
    } catch (error) { alert('Ошибка'); }
}

async function deleteDoctor(id) {
    if (!confirm('Удалить врача?')) return;
    try {
        await fetch(`${API_BASE}/doctors/${id}`, { method: 'DELETE', headers });
        loadDoctors();
    } catch (error) { alert('Ошибка'); }
}

async function addDoctor() {
    const data = { name: 'Новый врач', position: 'Врач-косметолог', description: '', photo: '', experience: '', is_active: 1, sort_order: 0 };
    try {
        await fetch(`${API_BASE}/doctors`, { method: 'POST', headers, body: JSON.stringify(data) });
        loadDoctors();
    } catch (error) { alert('Ошибка'); }
}

// ========== ГАЛЕРЕЯ ==========
async function loadGallery() {
    try {
        const response = await fetch(`${API_BASE}/gallery`, { headers });
        const images = await response.json();
        const container = document.getElementById('gallery-list');
        if (!container) return;
        
        container.innerHTML = images.map(img => `
            <div class="gallery-item-admin" data-id="${img.id}">
                <img src="${escapeHtml(img.image)}" onerror="this.src='https://via.placeholder.com/150'">
                <input class="edit-image" value="${escapeHtml(img.image)}" placeholder="URL фото">
                <input class="edit-title" value="${escapeHtml(img.title || '')}" placeholder="Название">
                <button class="btn-delete" onclick="deleteGalleryItem(${img.id})">🗑️ Удалить</button>
            </div>
        `).join('');
    } catch (error) { console.error(error); }
}

async function deleteGalleryItem(id) {
    if (!confirm('Удалить фото?')) return;
    try {
        await fetch(`${API_BASE}/gallery/${id}`, { method: 'DELETE', headers });
        loadGallery();
    } catch (error) { alert('Ошибка'); }
}

async function addGalleryItem() {
    const url = prompt('Введите URL изображения:');
    if (!url) return;
    const data = { image: url, title: '', sort_order: 0 };
    try {
        await fetch(`${API_BASE}/gallery`, { method: 'POST', headers, body: JSON.stringify(data) });
        loadGallery();
    } catch (error) { alert('Ошибка'); }
}

// ========== НОВОСТИ ==========
async function loadNews() {
    try {
        const response = await fetch(`${API_BASE}/news`, { headers });
        const news = await response.json();
        const container = document.getElementById('news-list');
        if (!container) return;
        
        container.innerHTML = news.map(item => `
            <div class="edit-card" data-id="${item.id}">
                <input class="edit-title" value="${escapeHtml(item.title)}" placeholder="Заголовок">
                <textarea class="edit-content" placeholder="Текст новости">${escapeHtml(item.content)}</textarea>
                <div class="edit-card-actions">
                    <label>✅ Активна: <input type="checkbox" class="edit-active" ${item.is_active ? 'checked' : ''}></label>
                    <button class="btn-save" onclick="saveNews(${item.id}, this)">💾 Сохранить</button>
                    <button class="btn-delete" onclick="deleteNewsItem(${item.id})">🗑️ Удалить</button>
                </div>
            </div>
        `).join('');
    } catch (error) { console.error(error); }
}

async function saveNews(id, btn) {
    const card = btn.closest('.edit-card');
    const data = {
        title: card.querySelector('.edit-title').value,
        content: card.querySelector('.edit-content').value,
        is_active: card.querySelector('.edit-active').checked ? 1 : 0
    };
    try {
        await fetch(`${API_BASE}/news/${id}`, { method: 'PUT', headers, body: JSON.stringify(data) });
        alert('Сохранено!');
        loadNews();
    } catch (error) { alert('Ошибка'); }
}

async function deleteNewsItem(id) {
    if (!confirm('Удалить новость?')) return;
    try {
        await fetch(`${API_BASE}/news/${id}`, { method: 'DELETE', headers });
        loadNews();
    } catch (error) { alert('Ошибка'); }
}

async function addNews() {
    const data = { title: 'Новая новость', content: 'Текст новости...', is_active: 1 };
    try {
        await fetch(`${API_BASE}/news`, { method: 'POST', headers, body: JSON.stringify(data) });
        loadNews();
    } catch (error) { alert('Ошибка'); }
}

// ========== КАЛЕНДАРЬ ==========
let currentCalendarDate = null;

async function loadCalendar() {
    const monthInput = document.getElementById('calendar-month');
    if (!monthInput.value) monthInput.value = new Date().toISOString().slice(0, 7);
    
    const [year, month] = monthInput.value.split('-');
    const firstDay = new Date(year, month - 1, 1);
    const lastDay = new Date(year, month, 0);
    let startWeekday = firstDay.getDay();
    startWeekday = startWeekday === 0 ? 6 : startWeekday - 1;
    
    let appointmentsMap = {};
    try {
        const response = await fetch(`${API_BASE}/applications`, { headers });
        const allApps = await response.json();
        allApps.forEach(app => {
            const dateKey = app.created_at.split('T')[0];
            if (!appointmentsMap[dateKey]) appointmentsMap[dateKey] = [];
            appointmentsMap[dateKey].push(app);
        });
    } catch (error) { console.error(error); }
    
    let gridHtml = '<div class="calendar-weekdays">';
    ['ПН', 'ВТ', 'СР', 'ЧТ', 'ПТ', 'СБ', 'ВС'].forEach(day => {
        gridHtml += `<div class="calendar-weekday">${day}</div>`;
    });
    gridHtml += '</div><div class="calendar-days">';
    
    for (let i = 0; i < startWeekday; i++) {
        gridHtml += '<div class="calendar-day empty"></div>';
    }
    
    for (let d = 1; d <= lastDay.getDate(); d++) {
        const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
        const hasAppointments = appointmentsMap[dateStr] && appointmentsMap[dateStr].length > 0;
        const appointmentCount = appointmentsMap[dateStr] ? appointmentsMap[dateStr].length : 0;
        
        gridHtml += `
            <div class="calendar-day ${hasAppointments ? 'has-appointments' : ''}" onclick="loadAppointmentsByDate('${dateStr}')">
                <span class="day-number">${d}</span>
                ${hasAppointments ? `<span class="appointment-badge">${appointmentCount}</span>` : ''}
            </div>
        `;
    }
    gridHtml += '</div>';
    document.getElementById('calendar-grid').innerHTML = gridHtml;
}

async function loadAppointmentsByDate(dateStr) {
    currentCalendarDate = dateStr;
    try {
        const response = await fetch(`${API_BASE}/applications/by-date?date=${dateStr}`, { headers });
        const apps = await response.json();
        const container = document.getElementById('day-appointments');
        if (apps.length === 0) {
            container.innerHTML = '<p>📭 Нет заявок на этот день</p>';
            return;
        }
        container.innerHTML = `
            <h4>📅 ${new Date(dateStr).toLocaleDateString('ru-RU')} — ${apps.length} заявок</h4>
            <div style="overflow-x:auto">
                <table style="width:100%">
                    <thead><tr><th>Время</th><th>Имя</th><th>Телефон</th><th>Услуга</th><th>Статус</th><th>Действия</th></tr></thead>
                    <tbody>
                        ${apps.map(app => `
                            <tr>
                                <td>${app.time || new Date(app.created_at).toLocaleTimeString('ru-RU', {hour:'2-digit', minute:'2-digit'})}</td>
                                <td>${escapeHtml(app.name)}</td>
                                <td>${escapeHtml(app.phone)}</td>
                                <td>${escapeHtml(app.service || '-')}</td>
                                <td>
                                    <select onchange="updateStatus(${app.id}, this.value)">
                                        <option value="new" ${app.status === 'new' ? 'selected' : ''}>🟡 Новая</option>
                                        <option value="in_progress" ${app.status === 'in_progress' ? 'selected' : ''}>🔵 В работе</option>
                                        <option value="completed" ${app.status === 'completed' ? 'selected' : ''}>🟢 Завершена</option>
                                    </select>
                                </td>
                                <td><button class="btn-delete" onclick="deleteApplication(${app.id})">🗑️</button></td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        `;
    } catch (error) { console.error(error); }
}

// ========== ВСПОМОГАТЕЛЬНЫЕ ==========
function logout() { localStorage.removeItem('adminToken'); window.location.href = 'login.html'; }
function escapeHtml(text) { if (!text) return ''; const div = document.createElement('div'); div.textContent = text; return div.innerHTML; }

// ========== ТАБЫ ==========
document.querySelectorAll('.tab').forEach(tab => {
    tab.addEventListener('click', () => {
        document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        const tabId = tab.dataset.tab;
        document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
        document.getElementById(`${tabId}-tab`).classList.add('active');
        
        if (tabId === 'applications') { loadApplications(); loadStats(); }
        else if (tabId === 'calendar') { loadCalendar(); loadStats(); }
        else if (tabId === 'services') { loadServices(); loadStats(); }
        else if (tabId === 'reviews') { loadReviews(); loadStats(); }
        else if (tabId === 'doctors') { loadDoctors(); loadStats(); }
        else if (tabId === 'gallery') { loadGallery(); loadStats(); }
        else if (tabId === 'news') { loadNews(); loadStats(); }
    });
});

// Инициализация
loadStats();
loadApplications();