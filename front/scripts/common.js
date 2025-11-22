// common.js

/* ========= UI Helpers ========= */

function getToastContainer() {
  let c = document.getElementById('toast-container');
  if (!c) {
    c = document.createElement('div');
    c.id = 'toast-container';
    c.className = 'toast-container';
    document.body.appendChild(c);
  }
  return c;
}

export function showToast(message, type = 'info') {
  const container = getToastContainer();

  const toast = document.createElement('div');
  toast.className = `toast toast--${type}`;
  toast.textContent = message;

  container.appendChild(toast);

  setTimeout(() => {
    toast.classList.add('toast--hide');
    setTimeout(() => toast.remove(), 250);
  }, 2000);
}

// 인라인 메시지 element 가져오거나 parent 아래 생성
function getInlineEl(selectorOrId, parentSelector) {
  let el = document.querySelector(selectorOrId);
  if (!el && parentSelector) {
    const parent = document.querySelector(parentSelector);
    if (parent) {
      el = document.createElement('p');
      if (selectorOrId.startsWith('#')) {
        el.id = selectorOrId.slice(1);
      }
      el.className = 'form-message';
      parent.appendChild(el);
    }
  }
  return el;
}

export function setInlineMessage(selectorOrId, message, type = 'error', parentSelector) {
  const el = getInlineEl(selectorOrId, parentSelector);
  if (!el) return;
  el.textContent = message;
  el.className = `form-message form-message--${type}`;
}

export function clearInlineMessage(selectorOrId) {
  const el = document.querySelector(selectorOrId);
  if (!el) return;
  el.textContent = '';
  el.className = 'form-message';
}

// 커스텀 모달 confirm
export function confirmModal({
  title = '알림',
  message = '',
  confirmText = '확인',
  cancelText = '취소',
} = {}) {
  return new Promise((resolve) => {
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';

    const modal = document.createElement('div');
    modal.className = 'modal';

    modal.innerHTML = `
      <h2 class="modal-title">${title}</h2>
      <p class="modal-message">${message}</p>
      <div class="modal-actions">
        <button type="button" class="btn btn-light" data-role="cancel">${cancelText}</button>
        <button type="button" class="btn btn-accent" data-role="confirm">${confirmText}</button>
      </div>
    `;

    overlay.appendChild(modal);
    document.body.appendChild(overlay);

    const cleanup = () => {
      overlay.classList.add('modal-overlay--hide');
      setTimeout(() => overlay.remove(), 200);
    };

    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) {
        cleanup();
        resolve(false);
      }
    });

    modal.querySelector('[data-role="cancel"]')?.addEventListener('click', () => {
      cleanup();
      resolve(false);
    });

    modal.querySelector('[data-role="confirm"]')?.addEventListener('click', () => {
      cleanup();
      resolve(true);
    });
  });
}

/* ========= 헤더 / 가드 ========= */

function inferActiveKey(explicit = '') {
  if (explicit) return explicit;
  const path = (new URL(location.href)).pathname.split('/').pop() || '';

  if (path === '' || path === 'index.html' || path === 'posts.html') return 'posts';
  if (path === 'post-detail.html' || path === 'post-edit.html') return 'posts';
  if (path === 'post-create.html') return 'create';
  if (path === 'my-page.html') return 'mypage';
  if (path === 'profile.html') return 'profile';
  if (path === 'login.html') return 'login';
  if (path === 'signup.html') return 'signup';
  return '';
}

export function renderHeader(active = '') {
  const header = document.querySelector('#app-header');
  if (!header) return;

  const loggedIn = !!localStorage.getItem('token');
  const resolvedActive = inferActiveKey(active);

  header.querySelectorAll('nav a[data-key]').forEach(a => {
    const key = a.getAttribute('data-key');
    const isActive = key === resolvedActive || (key === 'posts' && resolvedActive === 'posts');
    a.classList.toggle('active', isActive);
    if (isActive) a.setAttribute('aria-current', 'page');
    else a.removeAttribute('aria-current');
  });

  const sidebar = document.querySelector('.sidebar[data-guard="auth"]');
  if (sidebar) {
    sidebar.hidden = !loggedIn;
    if (loggedIn) {
      const key = inferActiveKey(active);
      sidebar.querySelectorAll('a').forEach(a => {
        a.classList.toggle('active', a.dataset.key === key);
      });
    }
  }

  header.querySelector('#logoutBtn')?.addEventListener('click', (e) => {
    e.preventDefault();
    localStorage.removeItem('token');
    showToast('로그아웃 되었습니다.', 'info');
    location.href = 'login.html';
  });
}

export function requireAuth() {
  if (!localStorage.getItem('token')) {
    showToast('로그인이 필요합니다.', 'error');
    location.href = 'login.html';
  }
}

