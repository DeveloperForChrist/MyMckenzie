// Select all sidebar links
const allSideMenuLinks = document.querySelectorAll('#sidebar .side-menu li a');
const sidebar = document.getElementById('sidebar');
const menuBtn = document.querySelector('.bx-menu');

// Highlight active link and store it
function setActiveLink(link) {
  allSideMenuLinks.forEach(l => l.classList.remove('active'));
  link.classList.add('active');
  localStorage.setItem('activeLink', link.textContent.trim());
}

// Add event listeners to links
allSideMenuLinks.forEach(link => {
  link.addEventListener('click', function(e) {
    e.preventDefault(); // Prevent page reload
    setActiveLink(this);
  });
});

// Restore active link on reload
const savedLink = localStorage.getItem('activeLink');
if (savedLink) {
  allSideMenuLinks.forEach(link => {
    if (link.textContent.trim() === savedLink) {
      link.classList.add('active');
    }
  });
}

// Sidebar toggle
menuBtn.addEventListener('click', () => {
  sidebar.classList.toggle('hide');
});
