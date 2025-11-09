import { renderHeader } from './common.js';
import { apiFetch } from './api.js';

renderHeader();

const postId = new URLSearchParams(location.search).get('id');
const detailEl = document.getElementById('postDetail');

const fmtDT = (iso) => iso ? new Date(iso).toLocaleString('ko-KR') : '';
const esc = (s='') => s
  .replaceAll('&','&amp;')
  .replaceAll('<','&lt;')
  .replaceAll('>','&gt;')
  .replaceAll('"','&quot;')
  .replaceAll("'",'&#39;');
const isEdited = (c,u) => c && u && new Date(u).getTime() !== new Date(c).getTime();

/* ================== 게시글 상세 ================== */
async function loadPost() {
  if (!postId) { alert('잘못된 접근입니다. (id 누락)'); location.replace('posts.html'); return; }
  try {
    const res = await apiFetch(`/posts/${postId}`, { method: 'GET' });
    const p = res?.data ?? res;

    const meta = isEdited(p.createdAt, p.updatedAt)
      ? `${esc(p.nickname ?? '익명')} · ${fmtDT(p.updatedAt)} (수정됨)`
      : `${esc(p.nickname ?? '익명')} · ${fmtDT(p.createdAt)}`;

    const loggedIn = !!localStorage.getItem('token');
    const controls = loggedIn ? `
      <div class="actions" style="margin-top:12px;">
        <a href="post-edit.html?id=${p.id}" class="btn ghost">수정</a>
        <button class="btn danger" id="deleteBtn">삭제</button>
      </div>` : '';

    // ✅ 조회수만 출력
    const viewInfo = `
      <div style="margin-top:6px; color:var(--muted); font-size:14px;">
        조회수 ${p.viewCount ?? 0}
      </div>
    `;

    detailEl.innerHTML = `
      <h2 class="detail-title">${esc(p.title ?? '')}</h2>
      <div class="meta">${meta}</div>
      ${viewInfo}
      <div class="detail-content">${esc(p.content ?? '').replaceAll('\n','<br />')}</div>
      ${controls}
    `;

    if (loggedIn) {
      document.getElementById('deleteBtn')?.addEventListener('click', async () => {
        if (!confirm('삭제하시겠습니까?')) return;
        try {
          await apiFetch(`/posts/${postId}`, { method: 'DELETE' });
          alert('삭제 완료');
          location.href='posts.html';
        } catch (e) {
          alert('삭제 실패: ' + (e?.message || ''));
        }
      });
    }
  } catch (err) {
    alert('게시글을 불러오지 못했습니다: ' + (err?.message || ''));
  }
}

document.addEventListener('DOMContentLoaded', loadPost);