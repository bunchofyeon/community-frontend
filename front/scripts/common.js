// common.js

/* ========= Toast ========= */

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

/**
 * 단순 토스트 (현재 페이지에서만 보이는 버전)
 */
export function showToast(message, type = 'info', duration) {
  const container = getToastContainer();

  const toast = document.createElement('div');
  toast.className = `toast toast--${type}`;
  toast.textContent = message;

  container.appendChild(toast);

  // 타입별 기본 노출 시간 (ms)
  const defaultDuration =
    duration ??
    (type === 'error'
      ? 5000      // 에러는 길게
      : type === 'success'
      ? 3500      // 성공은 약간 짧게
      : 4000);    // 나머지는 보통

  // 사라지는 애니메이션 시작 시점
  const hideAfter = Math.max(defaultDuration - 300, 0);

  setTimeout(() => {
    toast.classList.add('toast--hide');
  }, hideAfter);

  // 실제 DOM 제거
  setTimeout(() => {
    toast.remove();
  }, defaultDuration);
}

/**
 * 🔁 페이지 이동 후에도 토스트를 보여주기 위한 헬퍼
 */
export function redirectToast(message, type = 'info', duration) {
  const payload = { message, type };
  if (duration != null) {
    payload.duration = duration;
  }
  localStorage.setItem('redirectToast', JSON.stringify(payload));
}

/**
 * 🔂 새로 로드된 페이지에서 redirectToast 값이 있다면 자동으로 토스트 출력
 */
(function () {
  try {
    const raw = localStorage.getItem('redirectToast');
    if (!raw) return;

    const { message, type, duration } = JSON.parse(raw);
    if (message) {
      showToast(message, type || 'info', duration);
    }
  } catch (e) {
    console.error('redirectToast 파싱 오류', e);
  } finally {
    localStorage.removeItem('redirectToast');
  }
})();

/* ========= 인라인 메시지 ========= */

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

/* ========= 커스텀 모달 confirm ========= */
/**
 * 가운데 흰 카드 모달 + 어두운 배경
 */
export function confirmModal({
  title = '알림',
  message = '',
  confirmText = '확인',
  cancelText = '취소',
} = {}) {
  return new Promise((resolve) => {
    // 전체 어두운 배경 + 가운데 정렬 역할
    const modal = document.createElement('div');
    modal.className = 'modal';

    // 흰 카드(시트) + 내용
    modal.innerHTML = `
      <div class="sheet">
        <h2 class="modal-title">${title}</h2>
        <p class="modal-message">${message}</p>
        <div class="modal-actions">
          <button type="button" class="btn btn-light" data-role="cancel">${cancelText}</button>
          <button type="button" class="btn btn-accent" data-role="confirm">${confirmText}</button>
        </div>
      </div>
    `;

    document.body.appendChild(modal);

    const cleanup = () => {
      modal.classList.add('modal--hide');
      setTimeout(() => modal.remove(), 200);
    };

    // 회색 배경 클릭하면 닫기
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        cleanup();
        resolve(false);
      }
    });

    // 취소 버튼
    modal.querySelector('[data-role="cancel"]')?.addEventListener('click', () => {
      cleanup();
      resolve(false);
    });

    // 확인 버튼
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
    // 로그아웃은 redirectToast로 로그인 페이지에서 안내
    redirectToast('로그아웃 되었습니다.', 'info', 3500);
    location.href = 'login.html';
  });
}

export function requireAuth() {
  if (!localStorage.getItem('token')) {
    // 보호 페이지 진입 시 로그인 페이지에서 안내
    redirectToast('로그인이 필요합니다.', 'error', 5000);
    location.href = 'login.html';
  }
}