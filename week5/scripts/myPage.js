// scripts/mypage.js
import { renderHeader, requireAuth } from './common.js';
import { apiFetch } from './api.js';

renderHeader('mypage');
requireAuth();

/** ========= 백엔드 엔드포인트 매핑 ========= */
const API = {
  me: '/users/me',
  myPosts: '/users/myPosts',
  myComments: '/users/myComments',
  withdrawMe: '/users/me',
  withdrawById: (id) => `/users/${id}`,
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
    throw e; // 호출부에서 처리
  }
}

function makePager(el, uiPage, totalPages, onMove) {
  if (!el) return;
  const btn = (label, to, { active = false, disabled = false } = {}) => {
    const a = document.createElement('a');
    a.href = '#';
    a.textContent = label;
    a.className = `page-btn${active ? ' active' : ''}${disabled ? ' disabled' : ''}`;
    a.addEventListener('click', (e) => {
      e.preventDefault();
      if (!disabled && !active) onMove(to);
    });
    return a;
  };
  const start = Math.max(1, uiPage - 2);
  const end = Math.min(totalPages, Math.max(start + 4, uiPage));
  el.innerHTML = '';
  el.appendChild(btn('‹', Math.max(1, uiPage - 1), { disabled: uiPage === 1 }));
  for (let p = start; p <= end; p++) el.appendChild(btn(String(p), p, { active: p === uiPage }));
  el.appendChild(btn('›', Math.min(totalPages, uiPage + 1), { disabled: uiPage === totalPages }));
}

async function loadSummary() {
  // 1) /users/me
  try {
    const res = await safeFetch(API.me, { method: 'GET' });
    const data = res?.data ?? res;
    if (data?.email && dom.email) dom.email.textContent = data.email;
    if (data?.nickname && dom.nickname) dom.nickname.textContent = data.nickname;
    if (data?.profileImageUrl && dom.avatar) dom.avatar.src = data.profileImageUrl;
    return;
  } catch {}

  // 2) JWT payload에서 email 추출
  const payload = decodeJwtPayload();
  const email = payload?.email || payload?.sub || payload?.username;
  if (email && dom.email) dom.email.textContent = email;

  // 3) 닉네임 추정
  try {
    const page0 = await loadMyPosts(true);
    if (page0 && page0.items?.length) {
      const first = page0.items[0];
      const nick = first?.authorNickname || first?.nickname || first?.writerNickname;
      if (nick && dom.nickname && !dom.nickname.textContent) dom.nickname.textContent = nick;
    }
  } catch {}
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

    if (dom.postCount) dom.postCount.textContent = pageObj?.totalElements ?? items.length ?? 0;
    if (previewOnly) return { items, totalPages };

    if (!items.length) {
      if (dom.postsWrap) dom.postsWrap.innerHTML = `<div class="empty">작성한 글이 없습니다.</div>`;
    } else if (dom.postsWrap) {
      dom.postsWrap.innerHTML = items.map((p) => `
        <div class="row">
          <div class="title">
            <a href="post-detail.html?id=${encodeURIComponent(String(p.id))}">${p.title ?? '(제목 없음)'}</a>
          </div>
          <div>${fmtDate(p.createdAt)}</div>
          <div>${fmtDate(p.updatedAt)}</div>
        </div>
      `).join('');
    }

    makePager(dom.postsPager, postsUiPage, totalPages, (to) => { postsUiPage = to; loadMyPosts(); });
    return { items, totalPages };
  } catch (e) {
    if (!previewOnly && dom.postsWrap) {
      console.error(e);
      dom.postsWrap.innerHTML = `<div class="empty">목록을 불러오지 못했습니다.</div>`;
    }
    return null;
  }
}

/** ========= postId 깊이 탐색 ========= */
function resolvePostIdDeep(obj, depth = 0, seen = new Set()) {
  if (!obj || typeof obj !== 'object') return null;
  if (seen.has(obj) || depth > 5) return null;
  seen.add(obj);

  for (const [k, v] of Object.entries(obj)) {
    if (v == null) continue;

    if (/(^|_)(post|posts|article|board)(_|$)/i.test(k)) {
      if (typeof v === 'number' || (typeof v === 'string' && v !== '')) return v;
      if (typeof v === 'object') {
        if (v.id != null) return v.id;
        if (v.postId != null) return v.postId;
        if (v.postsId != null) return v.postsId;
        const inner = resolvePostIdDeep(v, depth + 1, seen);
        if (inner != null) return inner;
      }
    }
    if (typeof v === 'object') {
      const inner = resolvePostIdDeep(v, depth + 1, seen);
      if (inner != null) return inner;
    }
  }
  return null;
}

/** ========= 내 댓글 ========= */
let commentsUiPage = 1;
async function loadMyComments(previewOnly = false) {
  const page = commentsUiPage - 1;
  const size = 5;
  const sort = 'createdAt,desc';
  const qs = new URLSearchParams({ page, size, sort }).toString();

  try {
    const res = await safeFetch(`${API.myComments}?${qs}`, { method: 'GET' });
    const pageObj = res?.data ?? res;
    const items = pageObj?.content ?? [];
    const totalPages = Math.max(1, pageObj?.totalPages ?? 1);

    if (dom.commentCount) dom.commentCount.textContent = pageObj?.totalElements ?? items.length ?? 0;
    if (previewOnly) return { items, totalPages };

    if (!items.length) {
      if (dom.commentsWrap) dom.commentsWrap.innerHTML = `<div class="empty">작성한 댓글이 없습니다.</div>`;
    } else if (dom.commentsWrap) {
      dom.commentsWrap.innerHTML = items.map((c) => {
        // 백엔드에서 postId 내려오니까 우선 사용, 없으면 깊이 탐색
        const pidAny =
          c.postId ?? c.post_id ?? c.postsId ?? c.postID ??
          (c.post && (c.post.id ?? c.post.postId)) ??
          resolvePostIdDeep(c);

        const pid = pidAny == null ? '' : String(pidAny).trim();
        const href = pid ? `post-detail.html?id=${encodeURIComponent(pid)}` : '#';
        const content = (c.content ?? '').trim() || '(내용 없음)';
        const created = c.createdAt ?? null;
        const updated = c.updatedAt ?? c.modifiedAt ?? c.lastModifiedAt ?? created ?? null;

        return `
          <div class="row">
            <div class="title">
              ${pid
                ? `<a href="${href}" data-post-id="${pid}">${content}</a>`
                : `<span class="title-link">${content}</span>`}
            </div>
            <div>${fmtDate(created)}</div>
            <div>${fmtDate(updated)}</div>
          </div>
        `;
      }).join('');

      // 디버그 로그(필요시 확인)
      console.log('[mypage] comments sample raw', items.slice(0,3));
      console.log('[mypage] resolved pid list',
        items.slice(0,10).map(x => {
          const pidAny =
            x.postId ?? x.post_id ?? x.postsId ?? x.postID ??
            (x.post && (x.post.id ?? x.post.postId)) ??
            resolvePostIdDeep(x);
          return pidAny ?? null;
        })
      );
    }

    makePager(dom.commentsPager, commentsUiPage, totalPages, (to) => {
      commentsUiPage = to;
      loadMyComments();
    });

    return { items, totalPages };
  } catch (e) {
    console.error(e);
    if (!previewOnly && dom.commentsWrap) {
      dom.commentsWrap.innerHTML = `<div class="empty">목록을 불러오지 못했습니다.</div>`;
    }
    return null;
  }
}

/** ========= 회원 탈퇴 ========= */
dom.withdrawBtn?.addEventListener('click', async () => {
  if (!confirm('정말 탈퇴하시겠습니까? 이 작업은 되돌릴 수 없습니다.')) return;

  try {
    await safeFetch(API.withdrawMe, { method: 'DELETE' });
    localStorage.removeItem('token');
    alert('탈퇴 완료');
    location.href = 'signup.html';
    return;
  } catch (e) {}

  alert(
    '현재 서버는 /users/me 삭제 엔드포인트가 없어 탈퇴를 직접 호출할 수 없어요.\n' +
    '백엔드에 DELETE /users/me 를 추가해 주면, 버튼이 바로 동작합니다.\n' +
    '(또는 프론트가 userId를 안전하게 알 수 있게 JWT에 id 클레임을 넣어주세요)'
  );
});

/** ========= 부트스트랩 ========= */
document.addEventListener('DOMContentLoaded', async () => {
  // 아바타 폴백(이미지 없을 때)
  dom.avatar?.addEventListener('error', () => {
    dom.avatar.src = 'https://placehold.co/88x88?text=No+Img';
  });

  await loadSummary();
  await Promise.all([loadMyPosts(), loadMyComments()]);
});