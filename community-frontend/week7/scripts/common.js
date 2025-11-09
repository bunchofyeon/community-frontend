// scripts/common.js

// 현재 파일명으로 active 추론
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

// 헤더 렌더 (layout.js가 헤더를 주입한 뒤 호출)
export function renderHeader(active = '') {
  const header = document.querySelector('#app-header');
  if (!header) return;

  const loggedIn = !!localStorage.getItem('token');
  const resolvedActive = inferActiveKey(active);

  // nav a[data-key]에 active 적용
  header.querySelectorAll('nav a[data-key]').forEach(a => {
    const key = a.getAttribute('data-key');
    const isActive = key === resolvedActive || (key === 'posts' && resolvedActive === 'posts');
    a.classList.toggle('active', isActive);
    if (isActive) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current');
  });

  // 사이드바가 있다면(다른 페이지 공유 레이아웃 대비) 안전 가드
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

  // 로그아웃(헤더에 있을 때만)
  header.querySelector('#logoutBtn')?.addEventListener('click', (e) => {
    e.preventDefault();
    localStorage.removeItem('token');
    location.href = 'login.html';
  });
}

// 인증이 필요한 페이지에서만 호출하세요
export function requireAuth() {
  if (!localStorage.getItem('token')) {
    alert('로그인이 필요합니다.');
    location.href = 'login.html';
  }
}