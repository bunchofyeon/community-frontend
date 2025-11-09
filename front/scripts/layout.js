// scripts/layout.js
// 외부 템플릿을 불러오지 않고 "헤더만" 직접 주입합니다.
export async function loadLayout() {
  const header = document.getElementById('app-header');
  if (!header) return;

  header.innerHTML = `
    <header class="site-header">
      <div class="header">
        <a class="brand" href="posts.html" aria-label="홈">piney community</a>
        <nav>
          <a href="posts.html" data-key="posts">게시글 목록</a>
          <a href="post-create.html" data-key="create">글쓰기</a>
          <a href="my-page.html" data-key="mypage">마이페이지</a>
          <a href="login.html" data-key="login" id="loginLink">로그인</a>
          <a href="signup.html" data-key="signup" id="signupLink">회원가입</a>
          <a href="#" id="logoutBtn" style="display:none;">로그아웃</a>
        </nav>
      </div>
    </header>
  `;

  // 로그인/로그아웃 표기 전환
  const token = localStorage.getItem('token');
  const login = header.querySelector('#loginLink');
  const signup = header.querySelector('#signupLink');
  const logout = header.querySelector('#logoutBtn');

  if (token) {
    login?.setAttribute('style', 'display:none;');
    signup?.setAttribute('style', 'display:none;');
    logout?.setAttribute('style', 'display:inline-block;');
    logout?.addEventListener('click', (e) => {
      e.preventDefault();
      localStorage.removeItem('token');
      location.href = 'login.html';
    });
  }
}