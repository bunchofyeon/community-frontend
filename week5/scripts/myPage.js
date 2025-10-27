// scripts/mypage.js
import { renderHeader, requireAuth } from './common.js';
import { apiFetch } from './api.js';

renderHeader('mypage');
requireAuth();

/** ========= 백엔드 엔드포인트 매핑 (지금 코드에 맞춤) ========= */
const API = {
  // 있으면 사용, 없으면 자동 폴백
  me: '/users/me',                           // (없을 수도 있음)
  myPosts: '/users/myPosts',                 // ✅ 네 백엔드에 이미 존재
  myComments: '/users/myComments',           // ✅ 네 백엔드에 이미 존재
  withdrawMe: '/users/me',                   // (없을 수도 있음)
  withdrawById: (id) => `/users/${id}`,      // 현재 백엔드가 제공하는 방식 (id 필요)
};

const $ = (sel) => document.querySelector(sel);
const dom = {
  email: $('#email'),
  nickname: $('#nickname'),
  avatar: $('#avatar'),
  postCount: $('#postCount'),
  commentCount: $('#commentCount'),
  postsWrap: $('#myPosts'),
  postsPager: $('#pgMyPosts'),
  commentsWrap: $('#myComments'),
  commentsPager: $('#pgMyComments'),
  withdrawBtn: $('#withdrawBtn'),
};

/** ========= 유틸 ========= */
function fmtDate(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  return d.toLocaleDateString('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit' });
}

// JWT Base64URL 디코드 → JSON
function decodeJwtPayload() {
  try {
    const token = localStorage.getItem('token');
    if (!token) return null;
    const [, payload] = token.split('.');
    if (!payload) return null;
    const json = atob(payload.replace(/-/g, '+').replace(/_/g, '/'));
    return JSON.parse(decodeURIComponent(escape(json)));
  } catch {
    return null;
  }
}

async function safeFetch(url, init) {
  try {
    return await apiFetch(url, init);
  } catch (e) {
    // 404/405/500 등은 호출부에서 분기할 수 있게 그대로 throw
    throw e;
  }
}

function makePager(el, uiPage, totalPages, onMove) {
  const btn = (label, to, { active=false, disabled=false }={}) => {
    const a = document.createElement('a');
    a.href = '#'; a.textContent = label; a.className = `page-btn${active?' active':''}${disabled?' disabled':''}`;
    a.addEventListener('click', (e)=>{ e.preventDefault(); if(!disabled&&!active) onMove(to); });
    return a;
  };
  const start = Math.max(1, uiPage - 2);
  const end = Math.min(totalPages, Math.max(start + 4, uiPage));
  el.innerHTML = '';
  el.appendChild(btn('‹', Math.max(1, uiPage-1), {disabled:uiPage===1}));
  for (let p=start; p<=end; p++) el.appendChild(btn(String(p), p, {active:p===uiPage}));
  el.appendChild(btn('›', Math.min(totalPages, uiPage+1), {disabled:uiPage===totalPages}));
}

/** ========= 상단 요약 로드 (다중 폴백) ========= */
async function loadSummary() {
  // 1) 우선 /users/me 가 있으면 사용
  try {
    const res = await safeFetch(API.me, { method: 'GET' });
    const data = res?.data ?? res;
    if (data?.email) dom.email.textContent = data.email;
    if (data?.nickname) dom.nickname.textContent = data.nickname;
    if (data?.profileImageUrl) dom.avatar.src = data.profileImageUrl;
    return; // 성공했으면 끝
  } catch (e) {
    // 계속 폴백
  }

  // 2) JWT payload에서 email 추출 (sub/email/username 중 하나)
  const payload = decodeJwtPayload();
  const email = payload?.email || payload?.sub || payload?.username;
  if (email) dom.email.textContent = email;

  // 3) 닉네임은 내 글 첫 페이지에서 추정 (없으면 빈 값 유지)
  try {
    const page0 = await loadMyPosts(true); // preview 모드
    if (page0 && page0.items?.length) {
      // PostListResponse 필드명에 따라 보정
      const first = page0.items[0];
      const nick = first?.authorNickname || first?.nickname || first?.writerNickname;
      if (nick && !dom.nickname.textContent) dom.nickname.textContent = nick;
    }
  } catch {/* 무시 */}
}

/** ========= 내 글 ========= */
let postsUiPage = 1;
async function loadMyPosts(previewOnly = false) {
  const page = postsUiPage - 1;
  const size = 5;
  const sort = 'createdAt,desc';

  const qs = new URLSearchParams({ page, size, sort }).toString();
  try {
    const res = await safeFetch(`${API.myPosts}?${qs}`, { method: 'GET' });
    const pageObj = res?.data ?? res;
    const items = pageObj?.content ?? [];
    const totalPages = Math.max(1, pageObj?.totalPages ?? 1);

    // 상단 개수 갱신
    dom.postCount.textContent = pageObj?.totalElements ?? items.length ?? 0;

    if (previewOnly) return { items, totalPages };

    if (!items.length) {
      dom.postsWrap.innerHTML = `<div class="empty">작성한 글이 없습니다.</div>`;
    } else {
      dom.postsWrap.innerHTML = items.map(p => `
        <div class="row">
          <div class="title"><a href="post-detail.html?id=${p.id}">${(p.title ?? '(제목 없음)')}</a></div>
          <div>${fmtDate(p.createdAt)}</div>
          <div>${fmtDate(p.updatedAt)}</div>
        </div>
      `).join('');
    }
    makePager(dom.postsPager, postsUiPage, totalPages, (to)=>{ postsUiPage = to; loadMyPosts(); });
    return { items, totalPages };
  } catch (e) {
    if (!previewOnly) {
      console.error(e);
      dom.postsWrap.innerHTML = `<div class="empty">목록을 불러오지 못했습니다.</div>`;
    }
    return null;
  }
}

/** ========= 내 댓글 ========= */
let commentsUiPage = 1;
async function loadMyComments() {
  const page = commentsUiPage - 1;
  const size = 5;
  const sort = 'createdAt,desc';

  const qs = new URLSearchParams({ page, size, sort }).toString();
  try {
    const res = await safeFetch(`${API.myComments}?${qs}`, { method: 'GET' });
    const pageObj = res?.data ?? res;
    const items = pageObj?.content ?? [];
    const totalPages = Math.max(1, pageObj?.totalPages ?? 1);

    dom.commentCount.textContent = pageObj?.totalElements ?? items.length ?? 0;

    if (!items.length) {
      dom.commentsWrap.innerHTML = `<div class="empty">작성한 댓글이 없습니다.</div>`;
    } else {
      dom.commentsWrap.innerHTML = items.map(c => `
        <div class="row">
          <div class="title">${(c.content ?? '').trim() || '(내용 없음)'}</div>
          <div>${fmtDate(c.createdAt)}</div>
          <div><a href="post-detail.html?id=${c.postId}">보기</a></div>
        </div>
      `).join('');
    }
    makePager(dom.commentsPager, commentsUiPage, totalPages, (to)=>{ commentsUiPage = to; loadMyComments(); });
  } catch (e) {
    console.error(e);
    dom.commentsWrap.innerHTML = `<div class="empty">목록을 불러오지 못했습니다.</div>`;
  }
}

/** ========= 회원 탈퇴 ========= */
dom.withdrawBtn?.addEventListener('click', async ()=>{
  if (!confirm('정말 탈퇴하시겠습니까? 이 작업은 되돌릴 수 없습니다.')) return;

  // 1) /users/me 우선 시도
  try {
    await safeFetch(API.withdrawMe, { method: 'DELETE' });
    localStorage.removeItem('token');
    alert('탈퇴 완료');
    location.href = 'signup.html';
    return;
  } catch (e) {
    // 계속 폴백
  }

  // 2) /users/{id}는 현재 프론트에서 id를 알 수 없음 → 안내
  alert(
    '현재 서버는 /users/me 삭제 엔드포인트가 없어 탈퇴를 직접 호출할 수 없어요.\n' +
    '백엔드에 DELETE /users/me 를 추가해 주면, 버튼이 바로 동작합니다.\n' +
    '(또는 프론트가 userId를 안전하게 알 수 있게 JWT에 id 클레임을 넣어주세요)'
  );
});

/** ========= 부트스트랩 ========= */
document.addEventListener('DOMContentLoaded', async ()=>{
  await loadSummary();
  await Promise.all([loadMyPosts(), loadMyComments()]);
});