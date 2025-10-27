// week5/scripts/common.js

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

// 헤더 렌더
export function renderHeader(active = '') {
  const header = document.querySelector('#app-header');
  if (!header) return;

  const loggedIn = !!localStorage.getItem('token');
  const resolvedActive = inferActiveKey(active);
  const acls = (k) => (k === resolvedActive ? 'active' : '');
  const aria = (k) => (k === resolvedActive ? 'aria-current="page"' : '');

  // 항상: 게시글 목록
  // 로그인: 글쓰기/마이페이지/로그아웃
  // 비로그인: 로그인/회원가입
  header.innerHTML = `
    <div class="header">
      <a class="brand" href="posts.html" aria-label="홈">piney community</a>
      <nav>
        <a href="posts.html" class="${acls('posts')}" ${aria('posts')}>게시글 목록</a>
        ${
          loggedIn
            ? `
              <a href="post-create.html" class="${acls('create')}" ${aria('create')}>글쓰기</a>
              <a href="my-page.html" class="${acls('mypage')}" ${aria('mypage')}>마이페이지</a>
              <a href="#" id="logoutBtn">로그아웃</a>
            `
            : `
              <a href="login.html" class="${acls('login')}" ${aria('login')}>로그인</a>
              <a href="signup.html" class="${acls('signup')}" ${aria('signup')}>회원가입</a>
            `
        }
      </nav>
    </div>
  `;

  // 로그인 시에만 사이드바 노출 + active 처리
  const sidebar = document.querySelector('.sidebar[data-guard="auth"]');
  if (sidebar) {
    if (loggedIn) {
      sidebar.hidden = false;
      const key = inferActiveKey(active);
      sidebar.querySelectorAll('a').forEach(a => {
        a.classList.toggle('active', a.dataset.key === key);
      });
    } else {
      sidebar.hidden = true;
    }
  }

  // 로그아웃
  header.querySelector('#logoutBtn')?.addEventListener('click', (e) => {
    e.preventDefault();
    localStorage.removeItem('token');
    location.href = 'login.html';
  });
}

// 인증이 필요한 페이지에서만 호출하세요(목록/상세/댓글보기에는 호출 X)
export function requireAuth() {
  if (!localStorage.getItem('token')) {
    alert('로그인이 필요합니다.');
    location.href = 'login.html';
  }
}