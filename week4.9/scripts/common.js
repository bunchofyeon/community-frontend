export function renderHeader(active = '') {
  const header = document.querySelector('#app-header');
  if (!header) return;

  const loggedIn = !!localStorage.getItem('token');

  header.innerHTML = `
    <div class="header">
      <a class="brand" href="posts.html" aria-label="홈으로">piney community</a>
      <nav>
        <a href="posts.html" class="${active === 'posts' ? 'active' : ''}">게시글 목록</a>
        ${loggedIn
          ? `<a href="post-create.html">게시글 작성</a>
             <a href="profile.html">프로필 수정</a>
             <a href="#" id="logoutBtn">로그아웃</a>`
          : `<a href="login.html" class="${active === 'login' ? 'active' : ''}">로그인</a>
             <a href="signup.html" class="${active === 'signup' ? 'active' : ''}">회원가입</a>`
        }
      </nav>
    </div>
  `;

  const logout = header.querySelector('#logoutBtn');
  if (logout) {
    logout.addEventListener('click', (e) => {
      e.preventDefault();
      localStorage.removeItem('token');
      location.href = 'login.html';
    });
  }
}

export function requireAuth() {
  if (!localStorage.getItem('token')) {
    alert('로그인이 필요합니다.');
    location.href = 'login.html';
  }
}