const form = document.getElementById('feedback-form');
const status = document.getElementById('feedback-status');
const recipient = 'nasiloynanir57@gmail.com';
const HOME_STATE_KEY = 'furkan-home-page-state';

function saveHomeStateFromCache() {
  try {
    const cachedGames = JSON.parse(localStorage.getItem('furkan-games-cache') || '[]');
    const currentState = localStorage.getItem(HOME_STATE_KEY);
    const queryValue = currentState ? JSON.parse(currentState).query || '' : '';
    const payload = {
      games: Array.isArray(cachedGames) ? cachedGames : [],
      query: queryValue
    };
    if (payload.games.length) {
      localStorage.setItem(HOME_STATE_KEY, JSON.stringify(payload));
      sessionStorage.setItem(HOME_STATE_KEY, JSON.stringify(payload));
    }
  } catch (error) {
    // ignore
  }
}

document.addEventListener('click', event => {
  const link = event.target.closest('a[href="index.html"]');
  if (link) saveHomeStateFromCache();
});
window.addEventListener('beforeunload', saveHomeStateFromCache);
window.addEventListener('pagehide', saveHomeStateFromCache);

form.addEventListener('submit', event => {
  event.preventDefault();
  if (!recipient) {
    status.textContent = 'İletişim e-posta adresi yakında eklenecek.';
    return;
  }

  const formData = new FormData(form);
  const subject = encodeURIComponent('Nasıl Oynanır öneri ve iletişim');
  const body = encodeURIComponent(`Ad: ${formData.get('name') || 'Belirtilmedi'}\n\n${formData.get('message')}`);
  window.location.href = `mailto:${recipient}?subject=${subject}&body=${body}`;
});
