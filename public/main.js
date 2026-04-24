// Бургер-меню
function initBurger() {
    const burger = document.getElementById('burgerBtn');
    const navMenu = document.getElementById('navMenu');
    if (!burger || !navMenu) return;
    const closeMenu = () => {
        burger.classList.remove('active');
        navMenu.classList.remove('active');
    };
    burger.addEventListener('click', (e) => {
        e.stopPropagation();
        burger.classList.toggle('active');
        navMenu.classList.toggle('active');
    });
    document.querySelectorAll('.nav a, .dropdown-content a').forEach(link => link.addEventListener('click', closeMenu));
    document.addEventListener('click', (e) => {
        if (navMenu.classList.contains('active') && !navMenu.contains(e.target) && !burger.contains(e.target)) closeMenu();
    });
}

// Загрузка глобальных настроек (контакты, видимость блоков)
async function loadGlobalSettings() {
    try {
        const res = await fetch('/api/settings');
        const settings = await res.json();
        // Контакты
        const phoneSpan = document.getElementById('contactPhone');
        const emailSpan = document.getElementById('contactEmail');
        const telegramLink = document.getElementById('contactTelegram');
        const addressSpan = document.getElementById('contactAddress');
        if (phoneSpan) phoneSpan.innerText = settings.phone || '';
        if (emailSpan) emailSpan.href = `mailto:${settings.email || ''}`;
        if (telegramLink) telegramLink.href = settings.telegram || '#';
        if (addressSpan) addressSpan.innerText = settings.address || '';
        // Часы работы
        const whDiv = document.getElementById('workHoursDisplay');
        if (whDiv) whDiv.innerHTML = settings.work_hours || 'Пн-Пт: 9:00–22:00<br>Сб: выходной<br>Вс: 9:00–22:00';
        return settings;
    } catch(e) { console.error(e); return {}; }
}

// Модальная форма
function initModalForm() {
    const modal = document.getElementById('modal-form');
    const closeBtn = document.querySelector('.modal-form-close');
    const form = document.getElementById('beauty-application-form');
    const statusDiv = document.getElementById('modal-form-status');
    if (!modal || !form) return;

    window.openModal = () => { modal.style.display = 'flex'; document.body.style.overflow = 'hidden'; };
    function closeModal() { modal.style.display = 'none'; document.body.style.overflow = ''; if(statusDiv) statusDiv.innerHTML = ''; }
    if (closeBtn) closeBtn.addEventListener('click', closeModal);
    modal.addEventListener('click', (e) => { if (e.target === modal) closeModal(); });
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && modal.style.display === 'flex') closeModal(); });

    const phoneInput = document.getElementById('modal-phone');
    if (phoneInput) {
        phoneInput.addEventListener('input', function(e) {
            let value = e.target.value.replace(/\D/g, '');
            if (value.length > 11) value = value.slice(0,11);
            let formatted = '';
            if (value.length > 0) formatted = '+7';
            if (value.length > 1) formatted += ' (' + value.slice(1,4);
            if (value.length > 4) formatted += ') ' + value.slice(4,7);
            if (value.length > 7) formatted += '-' + value.slice(7,9);
            if (value.length > 9) formatted += '-' + value.slice(9,11);
            e.target.value = formatted;
        });
    }

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const name = document.getElementById('modal-name').value.trim();
        const phone = document.getElementById('modal-phone').value.trim();
        const service = document.getElementById('modal-service').value;
        const date = document.getElementById('modal-date').value;
        const time = document.getElementById('modal-time').value;
        const message = document.getElementById('modal-message').value.trim();
        const consent = document.getElementById('modal-consent').checked;
        if (!name || name.length<2) { alert('Введите корректное имя'); return; }
        if (!phone || phone.replace(/\D/g,'').length!==11) { alert('Введите полный номер телефона'); return; }
        if (!consent) { alert('Подтвердите согласие на обработку данных'); return; }
        const btn = form.querySelector('.modal-submit-btn');
        const original = btn.textContent;
        btn.textContent = '⏳ Отправка...';
        btn.disabled = true;
        try {
            const resp = await fetch('/api/application', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name, phone, service, date, time, message })
            });
            const result = await resp.json();
            if (resp.ok) {
                statusDiv.innerHTML = '<div class="form-status success">✅ Заявка отправлена! Мы свяжемся с вами.</div>';
                form.reset();
                setTimeout(closeModal, 3000);
            } else {
                statusDiv.innerHTML = `<div class="form-status error">❌ ${result.error || 'Ошибка'}</div>`;
            }
        } catch (err) {
            statusDiv.innerHTML = '<div class="form-status error">❌ Ошибка соединения</div>';
        } finally {
            btn.textContent = original;
            btn.disabled = false;
        }
    });
}

// Загрузка услуг в выпадающий список модалки
async function loadServicesToSelect() {
    const select = document.getElementById('modal-service');
    if (!select) return;
    try {
        const res = await fetch('/api/services');
        const services = await res.json();
        if (services.length) {
            select.innerHTML = '<option value="">Выберите услугу</option>' + services.map(s => `<option value="${escapeHtml(s.name)}">${escapeHtml(s.name)}</option>`).join('');
        }
    } catch(e) { console.error(e); }
}

function escapeHtml(t) { if(!t) return ''; const d=document.createElement('div'); d.textContent=t; return d.innerHTML; }

// Cookie баннер
function initCookieBanner() {
    const banner = document.getElementById('cookie-banner');
    if (banner && localStorage.getItem('cookiesAccepted') !== 'true') {
        banner.style.display = 'flex';
        const accept = document.getElementById('accept-cookies');
        if (accept) accept.addEventListener('click', () => {
            localStorage.setItem('cookiesAccepted', 'true');
            banner.style.display = 'none';
        });
    } else if (banner) banner.style.display = 'none';
}

document.addEventListener('DOMContentLoaded', () => {
    initBurger();
    initModalForm();
    loadGlobalSettings();
    loadServicesToSelect();
    initCookieBanner();
});