const API_BASE = '/api/admin';
let token = localStorage.getItem('adminToken');
if (!token) window.location.href = 'login.html';
const authHeaders = { 'Authorization': `Bearer ${token}` };

// ========== СТАТИСТИКА ==========
async function loadStats() {
    const res = await fetch(`${API_BASE}/stats`, { headers: authHeaders });
    const stats = await res.json();
    document.getElementById('stats').innerHTML = `
        <div class="stat-card"><div class="stat-number">${stats.total_applications}</div><div>Заявок</div></div>
        <div class="stat-card"><div class="stat-number">${stats.new_applications}</div><div>Новых</div></div>
        <div class="stat-card"><div class="stat-number" id="servicesCount">-</div><div>Услуг</div></div>
        <div class="stat-card"><div class="stat-number" id="reviewsCount">-</div><div>Отзывов</div></div>
    `;
}

// ========== ЗАЯВКИ ==========
async function loadApplications() {
    const res = await fetch(`${API_BASE}/applications`, { headers: authHeaders });
    const apps = await res.json();
    const tbody = document.querySelector('#applications-table tbody');
    tbody.innerHTML = apps.map(app => `
        <tr>
            <td>${app.id}</td>
            <td>${new Date(app.created_at).toLocaleString()}</td>
            <td>${escapeHtml(app.name)}</td>
            <td>${escapeHtml(app.phone)}</td>
            <td>${escapeHtml(app.service || '-')}</td>
            <td>
                <select onchange="updateStatus(${app.id}, this.value)">
                    <option value="new" ${app.status==='new' ? 'selected' : ''}>🟡 Новая</option>
                    <option value="in_progress" ${app.status==='in_progress' ? 'selected' : ''}>🔵 В работе</option>
                    <option value="completed" ${app.status==='completed' ? 'selected' : ''}>🟢 Завершена</option>
                </select>
            </td>
            <td><button class="btn-delete" onclick="deleteApplication(${app.id})">🗑️</button></td>
        </tr>
    `).join('');
}
window.updateStatus = async (id, status) => {
    await fetch(`${API_BASE}/applications/${id}`, { method: 'PUT', headers: { ...authHeaders, 'Content-Type':'application/json' }, body: JSON.stringify({ status }) });
    loadApplications(); loadStats();
};
window.deleteApplication = async (id) => {
    if (!confirm('Удалить заявку?')) return;
    await fetch(`${API_BASE}/applications/${id}`, { method: 'DELETE', headers: authHeaders });
    loadApplications(); loadStats();
};

// ========== УСЛУГИ ==========
async function loadServices() {
    const res = await fetch(`${API_BASE}/services`, { headers: authHeaders });
    const services = await res.json();
    document.getElementById('servicesCount') && (document.getElementById('servicesCount').innerText = services.length);
    const container = document.getElementById('services-list');
    container.innerHTML = services.map(s => `
        <div class="edit-card" data-id="${s.id}">
            <input class="edit-name" value="${escapeHtml(s.name)}" placeholder="Название">
            <input class="edit-price" value="${escapeHtml(s.price)}" placeholder="Цена">
            <textarea class="edit-desc" placeholder="Описание">${escapeHtml(s.description || '')}</textarea>
            <input type="file" class="edit-image-file" accept="image/*">
            <input type="hidden" class="edit-image-old" value="${escapeHtml(s.image || '')}">
            <div class="image-preview">${s.image ? `<img src="${s.image}" width="80">` : ''}</div>
            <div class="edit-card-actions">
                <label>Активна: <input type="checkbox" class="edit-active" ${s.is_active ? 'checked' : ''}></label>
                <label>Сортировка: <input type="number" class="edit-order" value="${s.sort_order}" style="width:70px"></label>
                <button class="btn-save" onclick="saveService(${s.id}, this)">💾 Сохранить</button>
                <button class="btn-delete" onclick="deleteService(${s.id})">🗑️ Удалить</button>
            </div>
        </div>
    `).join('');
}
window.saveService = async (id, btn) => {
    const card = btn.closest('.edit-card');
    const formData = new FormData();
    formData.append('name', card.querySelector('.edit-name').value);
    formData.append('price', card.querySelector('.edit-price').value);
    formData.append('description', card.querySelector('.edit-desc').value);
    formData.append('sort_order', card.querySelector('.edit-order').value);
    formData.append('is_active', card.querySelector('.edit-active').checked ? '1' : '0');
    const file = card.querySelector('.edit-image-file').files[0];
    if (file) formData.append('image', file);
    else formData.append('old_image', card.querySelector('.edit-image-old').value);
    const res = await fetch(`${API_BASE}/services/${id}`, { method: 'PUT', headers: authHeaders, body: formData });
    if (res.ok) { alert('Сохранено'); loadServices(); } else alert('Ошибка');
};
window.deleteService = async (id) => {
    if (!confirm('Удалить услугу?')) return;
    await fetch(`${API_BASE}/services/${id}`, { method: 'DELETE', headers: authHeaders });
    loadServices();
};
window.addService = () => {
    const container = document.getElementById('services-list');
    container.insertAdjacentHTML('beforeend', `
        <div class="edit-card" data-id="new">
            <input class="edit-name" placeholder="Название"><input class="edit-price" placeholder="Цена">
            <textarea class="edit-desc" placeholder="Описание"></textarea>
            <input type="file" class="edit-image-file" accept="image/*">
            <div class="edit-card-actions">
                <label>Активна: <input type="checkbox" class="edit-active" checked></label>
                <label>Сортировка: <input type="number" class="edit-order" value="0"></label>
                <button class="btn-save" onclick="saveNewService(this)">💾 Сохранить</button>
                <button class="btn-delete" onclick="this.closest('.edit-card').remove()">🗑️</button>
            </div>
        </div>
    `);
};
window.saveNewService = async (btn) => {
    const card = btn.closest('.edit-card');
    const formData = new FormData();
    formData.append('name', card.querySelector('.edit-name').value);
    formData.append('price', card.querySelector('.edit-price').value);
    formData.append('description', card.querySelector('.edit-desc').value);
    formData.append('sort_order', card.querySelector('.edit-order').value);
    formData.append('is_active', card.querySelector('.edit-active').checked ? '1' : '0');
    const file = card.querySelector('.edit-image-file').files[0];
    if (file) formData.append('image', file);
    const res = await fetch(`${API_BASE}/services`, { method: 'POST', headers: authHeaders, body: formData });
    if (res.ok) { alert('Добавлено'); loadServices(); } else alert('Ошибка');
};

// ========== ОТЗЫВЫ ==========
async function loadReviews() {
    const res = await fetch(`${API_BASE}/reviews`, { headers: authHeaders });
    const reviews = await res.json();
    document.getElementById('reviewsCount') && (document.getElementById('reviewsCount').innerText = reviews.length);
    const container = document.getElementById('reviews-list');
    container.innerHTML = reviews.map(r => `
        <div class="edit-card" data-id="${r.id}">
            <input class="edit-author" value="${escapeHtml(r.author)}" placeholder="Автор">
            <textarea class="edit-text" placeholder="Текст">${escapeHtml(r.text)}</textarea>
            <div class="edit-card-actions">
                <label>⭐ Рейтинг: <input type="number" class="edit-rating" value="${r.rating}" min="1" max="5" style="width:70px"></label>
                <label>✅ Активен: <input type="checkbox" class="edit-active" ${r.is_active ? 'checked' : ''}></label>
                <button class="btn-save" onclick="saveReview(${r.id}, this)">💾 Сохранить</button>
                <button class="btn-delete" onclick="deleteReview(${r.id})">🗑️ Удалить</button>
            </div>
        </div>
    `).join('');
}
window.saveReview = async (id, btn) => {
    const card = btn.closest('.edit-card');
    const data = {
        author: card.querySelector('.edit-author').value,
        text: card.querySelector('.edit-text').value,
        rating: parseInt(card.querySelector('.edit-rating').value),
        is_active: card.querySelector('.edit-active').checked ? 1 : 0
    };
    await fetch(`${API_BASE}/reviews/${id}`, { method: 'PUT', headers: { ...authHeaders, 'Content-Type':'application/json' }, body: JSON.stringify(data) });
    alert('Сохранено'); loadReviews();
};
window.deleteReview = async (id) => {
    if (!confirm('Удалить отзыв?')) return;
    await fetch(`${API_BASE}/reviews/${id}`, { method: 'DELETE', headers: authHeaders });
    loadReviews();
};
window.addReview = async () => {
    const data = { author: 'Новый клиент', text: 'Текст отзыва...', rating: 5, is_active: 1 };
    await fetch(`${API_BASE}/reviews`, { method: 'POST', headers: { ...authHeaders, 'Content-Type':'application/json' }, body: JSON.stringify(data) });
    loadReviews();
};

// ========== ВРАЧИ ==========
async function loadDoctors() {
    const res = await fetch(`${API_BASE}/doctors`, { headers: authHeaders });
    const doctors = await res.json();
    const container = document.getElementById('doctors-list');
    container.innerHTML = doctors.map(d => `
        <div class="edit-card" data-id="${d.id}">
            <input class="edit-name" value="${escapeHtml(d.name)}" placeholder="Имя">
            <input class="edit-position" value="${escapeHtml(d.position || '')}" placeholder="Должность">
            <textarea class="edit-desc" placeholder="Описание">${escapeHtml(d.description || '')}</textarea>
            <input class="edit-experience" value="${escapeHtml(d.experience || '')}" placeholder="Стаж">
            <input type="file" class="edit-photo-file" accept="image/*">
            <input type="hidden" class="edit-photo-old" value="${escapeHtml(d.photo || '')}">
            <div class="image-preview">${d.photo ? `<img src="${d.photo}" width="80">` : ''}</div>
            <div class="edit-card-actions">
                <label>✅ Активен: <input type="checkbox" class="edit-active" ${d.is_active ? 'checked' : ''}></label>
                <label>🔢 Сортировка: <input type="number" class="edit-order" value="${d.sort_order}" style="width:70px"></label>
                <button class="btn-save" onclick="saveDoctor(${d.id}, this)">💾 Сохранить</button>
                <button class="btn-delete" onclick="deleteDoctor(${d.id})">🗑️ Удалить</button>
            </div>
        </div>
    `).join('');
}
window.saveDoctor = async (id, btn) => {
    const card = btn.closest('.edit-card');
    const formData = new FormData();
    formData.append('name', card.querySelector('.edit-name').value);
    formData.append('position', card.querySelector('.edit-position').value);
    formData.append('description', card.querySelector('.edit-desc').value);
    formData.append('experience', card.querySelector('.edit-experience').value);
    formData.append('sort_order', card.querySelector('.edit-order').value);
    formData.append('is_active', card.querySelector('.edit-active').checked ? '1' : '0');
    const file = card.querySelector('.edit-photo-file').files[0];
    if (file) formData.append('photo', file);
    else formData.append('old_photo', card.querySelector('.edit-photo-old').value);
    const res = await fetch(`${API_BASE}/doctors/${id}`, { method: 'PUT', headers: authHeaders, body: formData });
    if (res.ok) { alert('Сохранено'); loadDoctors(); } else alert('Ошибка');
};
window.deleteDoctor = async (id) => {
    if (!confirm('Удалить врача?')) return;
    await fetch(`${API_BASE}/doctors/${id}`, { method: 'DELETE', headers: authHeaders });
    loadDoctors();
};
window.addDoctor = () => {
    const container = document.getElementById('doctors-list');
    container.insertAdjacentHTML('beforeend', `
        <div class="edit-card" data-id="new">
            <input class="edit-name" placeholder="Имя"><input class="edit-position" placeholder="Должность">
            <textarea class="edit-desc" placeholder="Описание"></textarea>
            <input class="edit-experience" placeholder="Стаж">
            <input type="file" class="edit-photo-file" accept="image/*">
            <div class="edit-card-actions">
                <label>Активен: <input type="checkbox" class="edit-active" checked></label>
                <label>Сортировка: <input type="number" class="edit-order" value="0"></label>
                <button class="btn-save" onclick="saveNewDoctor(this)">💾 Сохранить</button>
                <button class="btn-delete" onclick="this.closest('.edit-card').remove()">🗑️</button>
            </div>
        </div>
    `);
};
window.saveNewDoctor = async (btn) => {
    const card = btn.closest('.edit-card');
    const formData = new FormData();
    formData.append('name', card.querySelector('.edit-name').value);
    formData.append('position', card.querySelector('.edit-position').value);
    formData.append('description', card.querySelector('.edit-desc').value);
    formData.append('experience', card.querySelector('.edit-experience').value);
    formData.append('sort_order', card.querySelector('.edit-order').value);
    formData.append('is_active', card.querySelector('.edit-active').checked ? '1' : '0');
    const file = card.querySelector('.edit-photo-file').files[0];
    if (file) formData.append('photo', file);
    const res = await fetch(`${API_BASE}/doctors`, { method: 'POST', headers: authHeaders, body: formData });
    if (res.ok) { alert('Добавлено'); loadDoctors(); } else alert('Ошибка');
};

// ========== ГАЛЕРЕЯ ==========
async function loadGallery() {
    const res = await fetch(`${API_BASE}/gallery`, { headers: authHeaders });
    const images = await res.json();
    const container = document.getElementById('gallery-list');
    container.innerHTML = images.map(img => `
        <div class="gallery-item-admin" data-id="${img.id}">
            <img src="${img.image}" onerror="this.src='https://via.placeholder.com/150'">
            <button class="btn-delete" onclick="deleteGalleryItem(${img.id})">🗑️ Удалить</button>
        </div>
    `).join('');
}
window.deleteGalleryItem = async (id) => {
    if (!confirm('Удалить фото?')) return;
    await fetch(`${API_BASE}/gallery/${id}`, { method: 'DELETE', headers: authHeaders });
    loadGallery();
};
window.addGalleryItem = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = async () => {
        const file = input.files[0];
        if (!file) return;
        const formData = new FormData();
        formData.append('image', file);
        formData.append('title', '');
        formData.append('sort_order', 0);
        const res = await fetch(`${API_BASE}/gallery`, { method: 'POST', headers: authHeaders, body: formData });
        if (res.ok) { alert('Фото добавлено'); loadGallery(); } else alert('Ошибка');
    };
    input.click();
};

// ========== НОВОСТИ ==========
async function loadNews() {
    const res = await fetch(`${API_BASE}/news`, { headers: authHeaders });
    const news = await res.json();
    const container = document.getElementById('news-list');
    container.innerHTML = news.map(n => `
        <div class="edit-card" data-id="${n.id}">
            <input class="edit-title" value="${escapeHtml(n.title)}" placeholder="Заголовок">
            <textarea class="edit-content" placeholder="Текст">${escapeHtml(n.content)}</textarea>
            <div class="edit-card-actions">
                <label>Активна: <input type="checkbox" class="edit-active" ${n.is_active ? 'checked' : ''}></label>
                <button class="btn-save" onclick="saveNews(${n.id}, this)">💾 Сохранить</button>
                <button class="btn-delete" onclick="deleteNewsItem(${n.id})">🗑️ Удалить</button>
            </div>
        </div>
    `).join('');
}
window.saveNews = async (id, btn) => {
    const card = btn.closest('.edit-card');
    const data = {
        title: card.querySelector('.edit-title').value,
        content: card.querySelector('.edit-content').value,
        is_active: card.querySelector('.edit-active').checked ? 1 : 0
    };
    await fetch(`${API_BASE}/news/${id}`, { method: 'PUT', headers: { ...authHeaders, 'Content-Type':'application/json' }, body: JSON.stringify(data) });
    alert('Сохранено'); loadNews();
};
window.deleteNewsItem = async (id) => {
    if (!confirm('Удалить новость?')) return;
    await fetch(`${API_BASE}/news/${id}`, { method: 'DELETE', headers: authHeaders });
    loadNews();
};
window.addNews = async () => {
    const data = { title: 'Новая новость', content: 'Текст новости...', is_active: 1 };
    await fetch(`${API_BASE}/news`, { method: 'POST', headers: { ...authHeaders, 'Content-Type':'application/json' }, body: JSON.stringify(data) });
    loadNews();
};

// ========== КАЛЕНДАРЬ ==========
async function loadCalendar() {
    const monthInput = document.getElementById('calendar-month');
    if (!monthInput.value) monthInput.value = new Date().toISOString().slice(0, 7);
    const [year, month] = monthInput.value.split('-');
    const firstDay = new Date(year, month - 1, 1);
    const lastDay = new Date(year, month, 0);
    let startWeekday = firstDay.getDay();
    startWeekday = startWeekday === 0 ? 6 : startWeekday - 1;

    const res = await fetch(`${API_BASE}/applications`, { headers: authHeaders });
    const allApps = await res.json();
    const appsByDate = {};
    allApps.forEach(app => {
        let dateKey = app.date;
        if (!dateKey) dateKey = app.created_at.split('T')[0];
        if (!appsByDate[dateKey]) appsByDate[dateKey] = [];
        appsByDate[dateKey].push(app);
    });

    let html = '<div class="calendar-weekdays">' + ['ПН','ВТ','СР','ЧТ','ПТ','СБ','ВС'].map(d => `<div>${d}</div>`).join('') + '</div><div class="calendar-days">';
    for (let i = 0; i < startWeekday; i++) html += '<div class="calendar-day empty"></div>';
    for (let d = 1; d <= lastDay.getDate(); d++) {
        const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
        const count = appsByDate[dateStr] ? appsByDate[dateStr].length : 0;
        html += `<div class="calendar-day ${count ? 'has-appointments' : ''}" onclick="loadAppointmentsByDate('${dateStr}')">
            <span class="day-number">${d}</span>${count ? `<span class="appointment-badge">${count}</span>` : ''}
        </div>`;
    }
    html += '</div>';
    document.getElementById('calendar-grid').innerHTML = html;
}
window.loadAppointmentsByDate = async (dateStr) => {
    const res = await fetch(`${API_BASE}/applications/by-date?date=${dateStr}`, { headers: authHeaders });
    const apps = await res.json();
    const container = document.getElementById('day-appointments');
    if (!apps.length) { container.innerHTML = '<p>📭 Нет заявок на этот день</p>'; return; }
    container.innerHTML = `<h4>📅 ${new Date(dateStr).toLocaleDateString('ru-RU')} — ${apps.length} заявок</h4>
        <table class="admin-table"><thead><tr><th>Время</th><th>Имя</th><th>Телефон</th><th>Услуга</th><th>Статус</th><th></th></thead><tbody>
        ${apps.map(app => `
            <tr>
                <td>${app.time || '—'}</td>
                <td>${escapeHtml(app.name)}</td><td>${escapeHtml(app.phone)}</td><td>${escapeHtml(app.service || '-')}</td>
                <td><select onchange="updateStatus(${app.id}, this.value)"><option value="new" ${app.status==='new' ? 'selected' : ''}>🟡 Новая</option><option value="in_progress" ${app.status==='in_progress' ? 'selected' : ''}>🔵 В работе</option><option value="completed" ${app.status==='completed' ? 'selected' : ''}>🟢 Завершена</option></select></td>
                <td><button class="btn-delete" onclick="deleteApplication(${app.id})">🗑️</button></td>
            </tr>
        `).join('')}</tbody></table>`;
};

// ========== НАСТРОЙКИ ==========
async function loadSettings() {
    const res = await fetch(`${API_BASE}/settings`, { headers: authHeaders });
    const settings = await res.json();
    const container = document.getElementById('settings-form');
    container.innerHTML = '';
    settings.forEach(s => {
        const wrapper = document.createElement('div');
        wrapper.style.marginBottom = '15px';
        if (s.type === 'checkbox') {
            const label = document.createElement('label');
            const cb = document.createElement('input');
            cb.type = 'checkbox';
            cb.dataset.key = s.key;
            cb.checked = s.value === '1';
            label.appendChild(cb);
            label.appendChild(document.createTextNode(' ' + s.description));
            wrapper.appendChild(label);
        } else if (s.type === 'textarea') {
            const label = document.createElement('label');
            label.textContent = s.description;
            const ta = document.createElement('textarea');
            ta.dataset.key = s.key;
            ta.value = s.value;
            ta.rows = 3;
            label.appendChild(ta);
            wrapper.appendChild(label);
        } else {
            const label = document.createElement('label');
            label.textContent = s.description;
            const input = document.createElement('input');
            input.type = 'text';
            input.dataset.key = s.key;
            input.value = s.value;
            label.appendChild(input);
            wrapper.appendChild(label);
        }
        container.appendChild(wrapper);
    });
}
window.saveAllSettings = async () => {
    const inputs = document.querySelectorAll('#settings-form input, #settings-form textarea');
    for (const el of inputs) {
        const key = el.dataset.key;
        let value = el.type === 'checkbox' ? (el.checked ? '1' : '0') : el.value;
        await fetch(`${API_BASE}/settings/${key}`, { method: 'PUT', headers: { ...authHeaders, 'Content-Type':'application/json' }, body: JSON.stringify({ value }) });
    }
    alert('Настройки сохранены');
};

// ========== НАВИГАЦИЯ ==========
document.querySelectorAll('.admin-nav-item').forEach(item => {
    item.addEventListener('click', (e) => {
        e.preventDefault();
        const tab = item.dataset.tab;
        document.querySelectorAll('.admin-nav-item').forEach(nav => nav.classList.remove('active'));
        item.classList.add('active');
        document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
        document.getElementById(`${tab}-tab`).classList.add('active');
        if (tab === 'applications') { loadApplications(); loadStats(); }
        else if (tab === 'calendar') { loadCalendar(); loadStats(); }
        else if (tab === 'services') { loadServices(); loadStats(); }
        else if (tab === 'reviews') { loadReviews(); loadStats(); }
        else if (tab === 'doctors') { loadDoctors(); loadStats(); }
        else if (tab === 'gallery') { loadGallery(); loadStats(); }
        else if (tab === 'news') { loadNews(); loadStats(); }
        else if (tab === 'settings') { loadSettings(); loadStats(); }
    });
});
window.logout = () => { localStorage.removeItem('adminToken'); window.location.href = 'login.html'; };
function escapeHtml(str) { if (!str) return ''; const div = document.createElement('div'); div.textContent = str; return div.innerHTML; }

// Инициализация
loadStats();
loadApplications();