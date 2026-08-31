const form = document.getElementById('feedback-form');
const status = document.getElementById('feedback-status');
const recipient = 'nasiloynanir57@gmail.com';

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
