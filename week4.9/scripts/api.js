const BASE_URL = 'http://localhost:8080';

export async function apiFetch(path, options = {}) {
  const token = localStorage.getItem('token');
  const headers = {
    ...(options.body instanceof FormData ? {} : { 'Content-Type': 'application/json' }),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  };
  const res = await fetch(`${BASE_URL}${path}`, { ...options, headers, credentials: 'include' });
  if (!res.ok) {
    const message = await tryRead(res);
    throw new Error(`${res.status} ${res.statusText}: ${message}`);
  }
  return res.status === 204 ? null : await tryRead(res);
}
async function tryRead(res) {
  try { return await res.json(); } catch { return await res.text(); }
}