// scripts/profileImage.js
import { requireAuth, showToast } from './common.js';
import { apiFetch } from './api.js';

requireAuth();

const $ = (sel) => document.querySelector(sel);

const $preview = $('#profileImagePreview');
const $fileInput = $('#profileImageFile');
const $saveBtn = $('#profileImageSaveBtn');
const $deleteBtn = $('#profileImageDeleteBtn');

const API = {
  me: '/users/me',
  profileImage: '/profile-image',
};

function defaultProfileSrc() {
  return './assets/img/comong.png';
}

function attachFallback(img) {
  if (!img) return;
  img.addEventListener(
    'error',
    () => {
      img.src = 'https://placehold.co/88x88?text=IMG';
    },
    { once: true },
  );
}

let selectedFile = null;
let pendingDelete = false;

async function loadMe() {
  try {
    const res = await apiFetch(API.me, { method: 'GET' });
    const me = res?.data ?? res;

    if ($preview) {
      attachFallback($preview);
      const url = me?.profileImageUrl || defaultProfileSrc();
      $preview.src = url ? `${url}?t=${Date.now()}` : defaultProfileSrc();
    }
  } catch (e) {
    console.error('[profile-image] load me error', e);
    if ($preview) {
      attachFallback($preview);
      $preview.src = defaultProfileSrc();
    }
    showToast('프로필 정보를 불러오지 못했습니다.', 'error');
  }
}

$fileInput?.addEventListener('change', (e) => {
  const file = e.target.files?.[0] ?? null;
  if (!file) {
    selectedFile = null;
    return;
  }
  selectedFile = file;
  pendingDelete = false;

  const url = URL.createObjectURL(file);
  if ($preview) {
    attachFallback($preview);
    $preview.src = url;
  }
});

$deleteBtn?.addEventListener('click', async (e) => {
  e.preventDefault();
  pendingDelete = true;
  selectedFile = null;
  if ($fileInput) $fileInput.value = '';
  if ($preview) {
    attachFallback($preview);
    $preview.src = defaultProfileSrc();
  }
});

async function applyChanges() {
  if (pendingDelete) {
    await apiFetch(API.profileImage, { method: 'DELETE' });
    return { profileImageUrl: null };
  }
  if (selectedFile) {
    const fd = new FormData();
    fd.append('file', selectedFile);
    const res = await apiFetch(API.profileImage, {
      method: 'POST',
      body: fd,
    });
    return res?.data ?? res;
  }
  return {};
}

$saveBtn?.addEventListener('click', async (e) => {
  e.preventDefault();

  if (!selectedFile && !pendingDelete) {
    showToast('변경된 이미지가 없습니다.', 'info');
    return;
  }

  try {
    const imgRes = await applyChanges();

    if (imgRes && imgRes.profileImageUrl && $preview) {
      $preview.src = `${imgRes.profileImageUrl}?t=${Date.now()}`;
    } else if (pendingDelete && $preview) {
      $preview.src = defaultProfileSrc();
    }

    pendingDelete = false;
    selectedFile = null;
    if ($fileInput) $fileInput.value = '';

    showToast('프로필 이미지가 저장되었습니다.', 'success');
  } catch (err) {
    console.error('[profile-image] save error', err);
    showToast('이미지 저장 실패', 'error');
  }
});

document.addEventListener('DOMContentLoaded', loadMe);