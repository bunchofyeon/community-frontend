// const BASE_URL = 'http://localhost:8080';

export async function apiFetch(path, options = {}) {
  const token = localStorage.getItem('token');

  const headers = {
    ...(options.body instanceof FormData ? {} : { 'Content-Type': 'application/json' }),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  };

  const res = await fetch(`/api${path}`, { ...options, headers });

  // 바디는 딱 한 번만 읽기
  const data = await readBodyOnce(res);

  if (!res.ok) {
    throw new Error(formatError(res, data));
  }

  return data;
}

async function readBodyOnce(res) {
  // 204/205 는 바디 없음
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
  // 서버가 { message: "..."} 형태로 줄 때 우선 사용
  if (data && typeof data === 'object' && data.message) return data.message;
  if (typeof data === 'string' && data.trim().length) return data;
  return `${res.status} ${res.statusText}`;
}