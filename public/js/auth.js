// public/js/auth.js
// Replaces form submission with explicit click handlers to avoid native browser submit behavior.
document.addEventListener('DOMContentLoaded', () => {
  // UI elements
  const loginTab = document.getElementById('loginTab');
  const signupTab = document.getElementById('signupTab');
  const loginForm = document.getElementById('loginForm');
  const signupForm = document.getElementById('signupForm');
  const message = document.getElementById('message');
  const backBtn = document.getElementById('backBtn');

  const loginEmail = document.getElementById('loginEmail');
  const loginPassword = document.getElementById('loginPassword');
  const signupUsername = document.getElementById('signupUsername');
  const signupEmail = document.getElementById('signupEmail');
  const signupPassword = document.getElementById('signupPassword');

  const loginSubmit = document.getElementById('loginSubmit');
  const signupSubmit = document.getElementById('signupSubmit');

  // Tab switching
  loginTab.addEventListener('click', () => {
    loginForm.classList.add('active');
    signupForm.classList.remove('active');
    loginTab.classList.add('active');
    signupTab.classList.remove('active');
    message.textContent = '';
  });

  signupTab.addEventListener('click', () => {
    signupForm.classList.add('active');
    loginForm.classList.remove('active');
    signupTab.classList.add('active');
    loginTab.classList.remove('active');
    message.textContent = '';
  });

  // Helper: show message
  function showMessage(text, color = 'red') {
    if (!message) return;
    message.style.color = color;
    message.textContent = text;
  }

  // LOGIN click handler (explicit, not a form submit)
  loginSubmit.addEventListener('click', async (e) => {
    e.preventDefault();
    e.stopPropagation();
    showMessage('', 'red');

    const email = loginEmail.value?.trim() || '';
    const password = loginPassword.value || '';

    if (!email || !password) {
      showMessage('Please enter email and password', 'red');
      return;
    }

    try {
      const res = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        showMessage(data.message || 'Wrong username/password', 'red');
        return;
      }

      // Save user & fallback token for map page compatibility
      try {
        localStorage.setItem('user', JSON.stringify(data.user));
        localStorage.setItem('token', '1');
      } catch (err) {
        // In case localStorage is blocked, still proceed with redirect so user can continue
        console.warn('localStorage set failed', err);
      }

      // Force navigate to index explicitly
      window.location.replace('/index.html');
    } catch (err) {
      console.error('Login fetch error', err);
      showMessage('Network error', 'red');
    }
  });

  // SIGNUP click handler
  signupSubmit.addEventListener('click', async (e) => {
    e.preventDefault();
    e.stopPropagation();
    showMessage('', 'red');

    const username = signupUsername.value?.trim() || '';
    const email = signupEmail.value?.trim() || '';
    const password = signupPassword.value || '';

    if (!email || !password) {
      showMessage('Please enter email and password', 'red');
      return;
    }

    try {
      const res = await fetch('/api/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        showMessage(data.message || 'Signup failed', 'red');
        return;
      }

      showMessage('Account created! You can log in now.', 'green');
      // Switch to login tab
      loginTab.click();
    } catch (err) {
      console.error('Signup fetch error', err);
      showMessage('Network error', 'red');
    }
  });

  // Back button
  backBtn?.addEventListener('click', () => {
    // Use absolute link to index
    window.location.href = '/index.html';
  });

  // Extra precaution: prevent any accidental native 'submit' events from doing anything
  // (should be redundant because buttons are type="button", but harmless)
  [loginForm, signupForm].forEach((f) => {
    if (!f) return;
    f.addEventListener('submit', (ev) => {
      ev.preventDefault();
      ev.stopPropagation();
      return false;
    });
  });
});