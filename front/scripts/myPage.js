// my-page.js
import { requireAuth, showToast, confirmModal } from './common.js';
import { apiFetch } from './api.js';

requireAuth();

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

const API = {
  me: '/users/me',
  myPosts: '/users/myPosts',
  myComments: '/users/myComments',
  withdrawMe: '/users/me',
  withdrawById: (id) => `/users/${id}`,
};

function fmtDate(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  return d.toLocaleDateString('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit' });
}

async function safeFetch(url, init) {
  return await apiFetch(url, init);
}

// 요약 정보
async function loadSummary() {
  try {
    const res = await safeFetch(API.me, { method: 'GET' });
    const data = res?.data ?? res;

    if (data?.email && dom.email) dom.email.textContent = data.email;
    if (data?.nickname && dom.nickname) dom.nickname.textContent = data.nickname;

    if (dom.avatar) {
      dom.avatar.src = data?.profileImageUrl || './assets/img/comong.png';
    }
  } catch (e) {
    console.error('[mypage] me load error', e);
    if (dom.avatar) dom.avatar.src = './assets/img/comong.png';
    showToast('내 정보 로드에 실패했습니다.', 'error');
  }
}

// 페이지네이터 도우미
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

// 내가 쓴 글
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
    console.error('[mypage] posts load error', e);
    if (!previewOnly && dom.postsWrap) {
      dom.postsWrap.innerHTML = `<div class="empty">목록을 불러오지 못했습니다.</div>`;
    }
    showToast('내가 쓴 글을 불러오지 못했습니다.', 'error');
    return null;
  }
}

// 댓글 헬퍼
let commentsUiPage = 1;

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
    }

    makePager(dom.commentsPager, commentsUiPage, totalPages, (to) => {
      commentsUiPage = to;
      loadMyComments();
    });

    return { items, totalPages };
  } catch (e) {
    console.error('[mypage] comments load error', e);
    if (!previewOnly && dom.commentsWrap) {
      dom.commentsWrap.innerHTML = `<div class="empty">목록을 불러오지 못했습니다.</div>`;
    }
    showToast('내 댓글 목록을 불러오지 못했습니다.', 'error');
    return null;
  }
}

// 회원 탈퇴
dom.withdrawBtn?.addEventListener('click', async () => {
  const ok = await confirmModal({
    title: '회원 탈퇴',
    message: '정말 탈퇴하시겠습니까? 이 작업은 되돌릴 수 없습니다.',
    confirmText: '탈퇴',
    cancelText: '취소',
  });
  if (!ok) return;

  try {
    await safeFetch(API.withdrawMe, { method: 'DELETE' });
    localStorage.removeItem('token');
    showToast('탈퇴가 완료되었습니다.', 'success');
    location.href = 'signup.html';
  } catch (e) {
    console.error('[mypage] withdraw error', e);
    showToast('탈퇴 처리에 실패했습니다.', 'error');
  }
});

// 부트스트랩
document.addEventListener('DOMContentLoaded', async () => {
  dom.avatar?.addEventListener('error', () => {
    dom.avatar.src = './assets/img/comong.png';
  });

  await loadSummary();
  await Promise.all([loadMyPosts(), loadMyComments()]);
});