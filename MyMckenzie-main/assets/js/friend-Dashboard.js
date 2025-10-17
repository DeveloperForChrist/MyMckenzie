// No Firebase stats loading needed since stats cards were removed

// Route Talk button to chatbot
const talkBtn = document.querySelector('.talk-btn');
if (talkBtn) {
  talkBtn.addEventListener('click', () => {
    window.location.href = '../chatbot/chatbot.html';
  });
}

// Handle Case Portal link
const portalLink = document.getElementById('portal-link');
if (portalLink) {
  portalLink.addEventListener('click', (e) => {
    e.preventDefault();
    // Redirect to the case portal page
    window.location.href = '../dashboard/case-portal.html';
  });
}
