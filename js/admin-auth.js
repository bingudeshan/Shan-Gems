/**
 * SHAN GEMS — admin-auth.js
 * Admin Login Logic | Node.js API Integration
 */

document.getElementById('loginForm')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const btn = e.target.querySelector('button');
  const email = document.getElementById('email').value;
  const password = document.getElementById('password').value;

  btn.textContent = 'AUTHENTICATING...';
  btn.disabled = true;

  try {
    const response = await fetch('http://localhost:5000/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });

    const data = await response.json();

    if (response.ok) {
      // Store token in localStorage
      localStorage.setItem('shangems_admin_token', data.token);
      localStorage.setItem('shangems_admin_user', JSON.stringify(data.user));
      window.location.href = 'admin.html';
    } else {
      alert(data.error || 'Authentication failed');
      btn.textContent = 'AUTHENTICATE →';
      btn.disabled = false;
    }
  } catch (err) {
    console.error("Login error:", err);
    alert("Connection error. Is the backend running?");
    btn.textContent = 'AUTHENTICATE →';
    btn.disabled = false;
  }
});
