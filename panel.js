const t = window.TrelloPowerUp.iframe();

// ВСТАВЬ свой URL Apps Script (с /exec на конце)
const BACKEND_URL = 'https://script.google.com/macros/s/AKfycbxLyhCoV4z1Ksqvf3BXzhHGgmUPvv13KqkQ3NX9GG2b6u1LpQurIcvvfRnTvC6EvuK0/exec';
// И тот же секрет, что в Script Properties (BACKEND_SECRET)
const BACKEND_SECRET = '7a1407cfd686d70048968c82fc57cfd2cad9t';

let state = { boardId: null, backups: [], selectedFileId: null };

async function api(action, payload) {
  const body = new URLSearchParams();
  body.set('payload', JSON.stringify(Object.assign({ action, secret: BACKEND_SECRET }, payload || {})));

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
    const h = document.createElement('div');
    h.style.marginTop = '8px';
    h.innerHTML = `<strong>${group.dateFolder}</strong>`;
    root.appendChild(h);
    group.files.forEach(f => {
      const row = document.createElement('div');
      row.className = 'item';
      const sizeKB = Math.round((f.size || 0) / 1024);
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
  state.backups = res.batches || [];
  s.textContent = '';
  renderList();
}

async function onBackupNow() {
  await ensureBoardId();
  const res = await api('backup_now', { boardId: state.boardId });
  const s = document.getElementById('status');
  if (!res || !res.ok) { s.textContent = 'Ошибка backup_now: ' + (res && res.error || 'unknown'); return; }
  await loadBackups();
  await t.alert({ message: 'Backup completed' });
}

async function onRestoreSelected() {
  await ensureBoardId();
  if (!state.selectedFileId) return t.alert({ message: 'Сначала выбери бэкап (Select)' });
  const name = document.getElementById('newBoardName').value || 'Restored board';
  const res = await api('restore', { fileId: state.selectedFileId, newBoardName: name });
  const s = document.getElementById('status');
  if (!res || !res.ok) { s.textContent = 'Ошибка restore: ' + (res && res.error || 'unknown'); return; }
  await t.alert({ message: 'Восстановлено. Откроем новую доску…' });
  if (res.newBoardUrl) window.open(res.newBoardUrl, '_blank');
}

async function onDiag() {
  const s = document.getElementById('status');
  const res = await api('health', {});
  if (!res) { s.textContent = 'Нет ответа от бэкенда. Проверь BACKEND_URL / Web App доступ.'; return; }
  s.innerHTML = [
    `<b>secretPresent</b>: ${res.secretPresent}`,
    ` | <b>trelloKeyPresent</b>: ${res.trelloKeyPresent}`,
    ` | <b>trelloTokenPresent</b>: ${res.trelloTokenPresent}`,
    ` | <b>trelloApiOk</b>: ${res.trelloApiOk}`,
    ` | <b>driveWriteOk</b>: ${res.driveWriteOk}`,
    (res.errors && res.errors.length ? `<div style="color:#f77">Errors: ${res.errors.join(' | ')}</div>` : '')
  ].join('');
  if (!res.ok) await t.alert({ message: 'Diagnostics: есть ошибки (см. статус)' });
  else await t.alert({ message: 'Diagnostics: всё ок' });
}

document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('backup-now')?.addEventListener('click', onBackupNow);
  document.getElementById('refresh')?.addEventListener('click', loadBackups);
  document.getElementById('restore-btn')?.addEventListener('click', onRestoreSelected);
  document.getElementById('diag')?.addEventListener('click', onDiag);
  loadBackups();
});
