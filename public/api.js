// Загрузка новостей на главную страницу
async function loadNews() {
    try {
        const response = await fetch('/api/news');
        const news = await response.json();
        
        const newsContainer = document.getElementById('news-container');
        if (!newsContainer) return;
        
        if (news.length === 0) {
            newsContainer.innerHTML = '<p>Новостей пока нет</p>';
            return;
        }
        
        newsContainer.innerHTML = news.map(item => `
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

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Запускаем загрузку при загрузке страницы
document.addEventListener('DOMContentLoaded', loadNews);