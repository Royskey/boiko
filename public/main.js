/**
 * Косметологическая клиника — общие скрипты
 */

// ---------- Бургер-меню ----------
(function initBurgerMenu() {
    document.addEventListener('DOMContentLoaded', () => {
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

        document.querySelectorAll('.nav a:not(.dropbtn), .dropdown-content a').forEach(link => {
            link.addEventListener('click', closeMenu);
        });

        document.addEventListener('click', (e) => {
            if (navMenu.classList.contains('active') && !navMenu.contains(e.target) && !burger.contains(e.target)) {
                closeMenu();
            }
        });
    });
})();

// ---------- Анимация появления элементов при скролле ----------
(function initScrollAnimation() {
    document.addEventListener('DOMContentLoaded', () => {
        const animatedItems = document.querySelectorAll(
            '.service-card, .service-item, .page-title, .btn-telegram, ' +
            '.address-detail, .map-container, .directions, .contact-card'
        );
        
        if (animatedItems.length === 0) return;

        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('visible');
                    observer.unobserve(entry.target);
                }
            });
        }, {
            threshold: 0.15,
            rootMargin: '0px 0px 80px 0px'
        });
        
        animatedItems.forEach(item => observer.observe(item));
    });
})();

// ---------- Подсветка активного пункта меню ----------
(function initActiveMenuItem() {
    document.addEventListener('DOMContentLoaded', () => {
        let currentFile = window.location.pathname.split('/').pop();
        if (currentFile === '' || currentFile === '/') currentFile = 'index.html';
        
        document.querySelectorAll('.nav a').forEach(link => {
            const href = link.getAttribute('href');
            if (!href) return;
            const linkFile = href.split('/').pop().split('#')[0];
            if (linkFile === currentFile) {
                link.classList.add('active');
            } else {
                link.classList.remove('active');
            }
        });
    });
})();

// ---------- Cookie-баннер ----------
(function initCookieBanner() {
    document.addEventListener('DOMContentLoaded', () => {
        const banner = document.getElementById('cookie-banner');
        if (!banner) return;
        
        const acceptBtn = document.getElementById('accept-cookies');
        if (!acceptBtn) return;
        
        if (localStorage.getItem('cookiesAccepted') === 'true') {
            banner.style.display = 'none';
        }
        
        acceptBtn.addEventListener('click', () => {
            localStorage.setItem('cookiesAccepted', 'true');
            banner.style.display = 'none';
        });
    });
})();

// ---------- Выпадающее меню "О нас" на мобильных ----------
(function initMobileDropdown() {
    document.addEventListener('DOMContentLoaded', () => {
        const dropdown = document.querySelector('.dropdown');
        const dropbtn = dropdown?.querySelector('.dropbtn');
        if (!dropdown || !dropbtn) return;

        dropbtn.addEventListener('click', (e) => {
            if (window.innerWidth <= 768) {
                e.preventDefault();
                dropdown.classList.toggle('active');
            }
        });

        document.addEventListener('click', (e) => {
            if (window.innerWidth <= 768 && dropdown.classList.contains('active') && !dropdown.contains(e.target)) {
                dropdown.classList.remove('active');
            }
        });
    });
})();

// ========== МОДАЛЬНАЯ ФОРМА ==========
document.addEventListener('DOMContentLoaded', function() {
    const modal = document.getElementById('modal-form');
    const closeBtn = document.querySelector('.modal-form-close');
    const form = document.getElementById('beauty-application-form');
    const statusDiv = document.getElementById('modal-form-status');

    // Функция открытия модального окна
    window.openModal = function() {
        if (modal) {
            modal.style.display = 'flex';
            document.body.style.overflow = 'hidden';
        }
    };

    // Функция закрытия модального окна
    function closeModal() {
        if (modal) {
            modal.style.display = 'none';
            document.body.style.overflow = '';
            // Очищаем ошибки
            if (statusDiv) statusDiv.innerHTML = '';
        }
    }

    // Закрытие по крестику
    if (closeBtn) closeBtn.addEventListener('click', closeModal);

    // Закрытие по клику вне окна
    if (modal) {
        modal.addEventListener('click', function(e) {
            if (e.target === modal) closeModal();
        });
    }

    // Закрытие по Escape
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape' && modal && modal.style.display === 'flex') {
            closeModal();
        }
    });

    // Маска для телефона
    const phoneInput = document.getElementById('modal-phone');
    if (phoneInput) {
        phoneInput.addEventListener('input', function(e) {
            let value = e.target.value.replace(/\D/g, '');
            if (value.length > 11) value = value.slice(0, 11);
            let formatted = '';
            if (value.length > 0) formatted = '+7';
            if (value.length > 1) formatted += ' (' + value.slice(1, 4);
            if (value.length > 4) formatted += ') ' + value.slice(4, 7);
            if (value.length > 7) formatted += '-' + value.slice(7, 9);
            if (value.length > 9) formatted += '-' + value.slice(9, 11);
            e.target.value = formatted;
        });
    }

    // Валидация формы
    function validateForm() {
        let isValid = true;
        const name = document.getElementById('modal-name').value.trim();
        const phone = document.getElementById('modal-phone').value.trim();
        const consent = document.getElementById('modal-consent').checked;

        document.getElementById('name-error').innerHTML = '';
        document.getElementById('phone-error').innerHTML = '';

        if (!name) {
            document.getElementById('name-error').innerHTML = 'Пожалуйста, введите ваше имя';
            isValid = false;
        } else if (name.length < 2) {
            document.getElementById('name-error').innerHTML = 'Имя должно содержать минимум 2 символа';
            isValid = false;
        }

        const phoneDigits = phone.replace(/\D/g, '');
        if (!phone) {
            document.getElementById('phone-error').innerHTML = 'Пожалуйста, введите номер телефона';
            isValid = false;
        } else if (phoneDigits.length !== 11) {
            document.getElementById('phone-error').innerHTML = 'Введите полный номер телефона (11 цифр)';
            isValid = false;
        }

        if (!consent) {
            alert('Пожалуйста, дайте согласие на обработку персональных данных');
            isValid = false;
        }

        return isValid;
    }

    // Отправка формы
    if (form) {
        form.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            if (!validateForm()) return;

            const formData = {
                name: document.getElementById('modal-name').value.trim(),
                phone: document.getElementById('modal-phone').value.trim(),
                service: document.getElementById('modal-service').value,
                date: document.getElementById('modal-date').value,
                message: document.getElementById('modal-message').value.trim()
            };

            const submitBtn = form.querySelector('.modal-submit-btn');
            const originalText = submitBtn.textContent;
            submitBtn.textContent = '⏳ Отправка...';
            submitBtn.disabled = true;

            try {
                const response = await fetch('/api/application', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(formData)
                });

                const result = await response.json();

                if (response.ok) {
                    statusDiv.innerHTML = '<div class="form-status success">✅ Заявка успешно отправлена! Мы свяжемся с вами в ближайшее время.</div>';
                    form.reset();
                    setTimeout(() => {
                        closeModal();
                        statusDiv.innerHTML = '';
                    }, 3000);
                } else {
                    statusDiv.innerHTML = '<div class="form-status error">❌ ' + (result.error || 'Ошибка отправки. Попробуйте позже.') + '</div>';
                }
            } catch (error) {
                statusDiv.innerHTML = '<div class="form-status error">❌ Ошибка соединения. Проверьте интернет и попробуйте снова.</div>';
            } finally {
                submitBtn.textContent = originalText;
                submitBtn.disabled = false;
            }
        });
    }
});

// Загрузка новостей для главной страницы
async function loadNews() {
    const container = document.getElementById('news-container');
    if (!container) return;

    try {
        const response = await fetch('/api/news');
        const news = await response.json();

        if (news.length === 0) {
            container.innerHTML = '<p style="text-align: center;">Новостей пока нет</p>';
            return;
        }

        container.innerHTML = news.slice(0, 3).map(item => `
            <div class="news-item">
                <h3 class="news-title">${escapeHtml(item.title)}</h3>
                <div class="news-date">${new Date(item.created_at).toLocaleDateString('ru-RU')}</div>
                <div class="news-content">${escapeHtml(item.content)}</div>
            </div>
        `).join('');
    } catch (error) {
        console.error('Ошибка загрузки новостей:', error);
    }
}

document.addEventListener('DOMContentLoaded', loadNews);