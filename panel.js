const t = window.TrelloPowerUp.iframe();

// ВСТАВЬ свой URL Apps Script (с /exec на конце)
const BACKEND_URL = 'https://script.google.com/macros/s/AKfycbywoHclS5_D_XGta1hxv2y9AgHzcGkjoIg_-zbIKyUavRV78F3qNFAm6ZHbAByjaaN1/exec';

let state = { boardId: null, backups: [], selectedFileId: null };

async function api(action, payload) {
  const body = new URLSearchParams();
  body.set('payload', JSON.stringify(Object.assign({ action }, payload || {})));
  const resp = await fetch(BACKEND_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body
  });
  let data = {};
  try { data = await resp.json(); } catch (e) {}
  return data;
}

async function ensureBoardId() {
  if (!state.boardId) {
    const ctx = await t.getContext();
    state.boardId = ctx.board;
  }
  return state.boardId;
}

function renderList() {
  const root = document.getElementById('list');
  root.innerHTML = '';
  if (!state.backups.length) { root.innerHTML = '<div style="opacity:.7">Пока нет бэкапов. Нажми «Backup now».</div>'; return; }
  state.backups.forEach(group => {
    const h = document.createElement('div'); h.style.marginTop='8px'; h.innerHTML = `<strong>${group.dateFolder}</strong>`;
    root.appendChild(h);
    group.files.forEach(f => {
      const row = document.createElement('div'); row.className='item';
      const sizeKB = Math.round((f.size||0)/1024);
      row.innerHTML = `<div>${f.name} — ${sizeKB} KB</div><div><button data-id="${f.id}" class="select">Select</button></div>`;
      root.appendChild(row);
    });
  });
  root.querySelectorAll('.select').forEach(btn => {
    btn.addEventListener('click', () => {
      state.selectedFileId = btn.getAttribute('data-id');
      document.getElementById('restore-btn').disabled = !state.selectedFileId;
      t.alert({ message: 'Backup selected' });
    });
  });
}

async function loadBackups() {
  await ensureBoardId();
  const res = await api('list_backups', { boardId: state.boardId });
  const s = document.getElementById('status');
  if (!res || !res.ok) { s.textContent = 'Ошибка list_backups: ' + (res && res.error || 'unknown'); return; }
  state.backups = res.batches || []; s.textContent = ''; renderList();
}

async function onBackupNow() {
  await ensureBoardId();
  const res = await api('backup_now', { boardId: state.boardId });
  const s = document.getElementById('status');
  if (!res || !res.ok) { s.textContent = 'Ошибка backup_now: ' + (res && res.error || 'unknown'); return; }
  if (res.skipped) {
    s.textContent = 'Пропущено: ' + (res.reason || 'no changes') + (res.lastActivity ? ` (lastActivity: ${res.lastActivity})` : '');
    await t.alert({ message: 'Бэкап не делали — изменений не было.' });
  } else {
    s.textContent = '';
    await t.alert({ message: 'Backup completed' });
  }
  await loadBackups();
}

// --- PIN-поток ---
async function onGetPin() {
  await ensureBoardId();
  const res = await api('new_restore_pin', { boardId: state.boardId });
  const s = document.getElementById('status');
  if (!res || !res.ok || !res.pin) { s.textContent = 'Ошибка выдачи PIN'; return; }
  document.getElementById('pin').value = res.pin;
  await t.alert({ message: 'PIN создан и действителен 5 минут' });
}

async function onRestoreSelected() {
  await ensureBoardId();
  if (!state.selectedFileId) return t.alert({ message: 'Сначала выбери бэкап (Select)' });
  const pin = document.getElementById('pin').value.trim();
  if (!pin) return t.alert({ message: 'Введи PIN (Get PIN)' });

  // overlay по умолчанию (мягкий откат); если хочешь жёсткий — mode:'overwrite'
  const res = await api('restore', {
    mode: 'overlay',
    boardId: state.boardId,
    fileId: state.selectedFileId,
    pin
  });

  const s = document.getElementById('status');
  if (!res || !res.ok) { s.textContent = 'Ошибка restore: ' + (res && res.error || 'unknown'); return; }
  await t.alert({ message: res.mode === 'overwrite' ? 'Доска перезаписана' : 'Готово: восстановили, OLD списки сдвинуты вправо' });
}

async function onDiag() {
  const s = document.getElementById('status');
  const res = await api('health', {});
  if (!res) { s.textContent = 'Нет ответа от бэкенда. Проверь BACKEND_URL / Web App.'; return; }
  s.innerHTML = [
    `<b>trelloKeyPresent</b>: ${res.trelloKeyPresent}`,
    ` | <b>trelloTokenPresent</b>: ${res.trelloTokenPresent}`,
    ` | <b>trelloApiOk</b>: ${res.trelloApiOk}`,
    ` | <b>driveWriteOk</b>: ${res.driveWriteOk}`,
    (res.errors?.length ? `<div style="color:#f77">Errors: ${res.errors.join(' | ')}</div>` : '')
  ].join('');
  await t.alert({ message: res.ok ? 'Diagnostics: всё ок' : 'Diagnostics: есть ошибки (см. статус)' });
}

document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('backup-now')?.addEventListener('click', onBackupNow);
  document.getElementById('refresh')?.addEventListener('click', loadBackups);
  document.getElementById('restore-btn')?.addEventListener('click', onRestoreSelected);
  document.getElementById('get-pin')?.addEventListener('click', onGetPin);
  document.getElementById('diag')?.addEventListener('click', onDiag);
  loadBackups();
});



