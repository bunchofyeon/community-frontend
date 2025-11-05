// scripts/api.js
export async function apiFetch(path, options = {}) {
  const token = localStorage.getItem('token');

  const headers = {
    ...(options.body instanceof FormData ? {} : { 'Content-Type': 'application/json' }),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  };

  const res = await fetch(`/api${path}`, { ...options, headers });
  const data = await readBodyOnce(res);

  if (!res.ok) {
    throw new Error(formatError(res, data));
  }

  return data;
}

async function readBodyOnce(res) {
  if (res.status === 204 || res.status === 205) return null;

  const ct = res.headers.get('content-type') || '';
  if (ct.includes('application/json')) {
    try { return await res.json(); } catch { return null; }
  }

  try {
    const text = await res.text();
    return text || null;
  } catch {
    return null;
  }
}

function formatError(res, data) {
  if (data && typeof data === 'object' && data.message) return data.message;
  if (typeof data === 'string' && data.trim().length) return data;
  return `${res.status} ${res.statusText}`;
}