// Sidebar toggle
const menuIcon = document.querySelector('#menu-icon');
const sidebar = document.querySelector('#sidebar');

if (menuIcon && sidebar) {
  menuIcon.addEventListener('click', () => {
    sidebar.classList.toggle('hide');
    localStorage.setItem('sidebarHidden', sidebar.classList.contains('hide'));
  });

  // Keep sidebar state remembered
  if (localStorage.getItem('sidebarHidden') === 'true') {
    sidebar.classList.add('hide');
  }
}

// Sidebar active link highlighting
const menuLinks = document.querySelectorAll('#sidebar .side-menu li a');

if (menuLinks.length > 0) {
  function setActiveLink(link) {
    menuLinks.forEach(l => l.classList.remove('active'));
    link.classList.add('active');
    localStorage.setItem('activeLink', link.textContent.trim());
  }

  menuLinks.forEach(link => {
    link.addEventListener('click', e => {
      e.preventDefault();
      setActiveLink(link);
    });
  });

  // Restore last active link
  const saved = localStorage.getItem('activeLink');
  if (saved) {
    menuLinks.forEach(link => {
      if (link.textContent.trim() === saved) link.classList.add('active');
    });
  } else if (menuLinks[0]) {
    menuLinks[0].classList.add('active');
  }
}

// Route Talk button to chatbot
const talkBtn = document.querySelector('.talk-btn');
if (talkBtn) {
  talkBtn.addEventListener('click', () => {
    window.location.href = '../chatbot/chatbot.html';
  });
}
