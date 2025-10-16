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
    // For now, redirect to marketplace where they can see pending cases
    // In future, this could open a dedicated portal page
    window.location.href = '../marketplace/marketplace.html?tab=portal';
  });
}
