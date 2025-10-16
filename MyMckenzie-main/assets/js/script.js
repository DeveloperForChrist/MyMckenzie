// Placeholder script for JoinMckenzie or other small behaviours
console.log('Placeholder script loaded');

// Handle McKenzie Friend registration button
document.addEventListener('DOMContentLoaded', () => {
  const mckenzieCard = document.getElementById('mckenzieCard');
  if (mckenzieCard) {
    console.log('mckenzieCard found, adding click handler');
    mckenzieCard.addEventListener('click', () => {
      console.log('Redirecting to mckenzie-signup.html');
      window.location.href = 'join/mckenzie-signup.html';
    });
  } else {
    console.log('mckenzieCard not found');
  }

  // Handle User registration button
  const userCard = document.getElementById('userCard');
  if (userCard) {
    console.log('userCard found, adding click handler');
    userCard.addEventListener('click', () => {
      console.log('Redirecting to user-signup.html');
      window.location.href = 'auth/user-signup.html';
    });
  } else {
    console.log('userCard not found');
  }
});
