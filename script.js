document.addEventListener('DOMContentLoaded', () => {
  const API_BASE = 'https://archinspirestudio-backend.onrender.com';

  const loginBtn = document.getElementById('loginBtn');
  if (loginBtn) {
    loginBtn.addEventListener('click', async () => {
      const username = document.getElementById('username').value;
      const password = document.getElementById('password').value;

      try {
        const res = await fetch(`${API_BASE}/api/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username, password })
        });

        if (!res.ok) {
          throw new Error('Login failed');
        }

        const data = await res.json();
        alert('Login successful! Redirecting...');
        // Replace with actual redirect or admin panel logic
      } catch (error) {
        alert('Login failed. Please try again.');
        console.error(error);
      }
    });
  } else {
    console.log('Login button not found — normal if not on admin page.');
  }
});
