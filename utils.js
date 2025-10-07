async function fetchWithAuth(url, options = {}) {
    const token = localStorage.getItem('token');
    const headers = {
      "Content-Type": "application/json",
      "x-auth-token": token,
      ...(options.headers || {})
    };
    return fetch(url, { ...options, headers });
  }
  