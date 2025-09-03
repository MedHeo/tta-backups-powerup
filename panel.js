// ====== ПАРАМЕТРЫ ======
const t = window.TrelloPowerUp.iframe();

// ВСТАВЬ СВОЙ URL ВЕБ-АППА (ОБЯЗАТЕЛЬНО с /exec на конце)
const BACKEND_URL = 'https://script.google.com/macros/s/PASTE_YOUR_ID/exec';

// ВСТАВЬ ТОТ ЖЕ СЕКРЕТ, ЧТО В Script Properties (BACKEND_SECRET)
const BACKEND_SECRET = 'PASTE_YOUR_SECRET';

// ====== СОСТОЯНИЕ ======
let state = {
  boardId: null,
  backups: [],
  selectedFileId: null
};

// ====== УТИЛИТЫ ======
async function api(action, payload) {
  // Шлём как x-www-form-urlencoded, чтобы не было preflight
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
    state.boardId = ctx.board; // id текущей доски Trello
  }
  return state.boardId;
}

function renderList() {
  const root = document.getElementById('list');
  root.innerHTML = '';

  if (!state.backups.length) {
    root.innerHTML = '<div style="opacity:.7">Пока нет бэкапов. Нажми «Backup now».</div>';
    return;
  }

  state.backups.forEach(group => {
    const h = document.createElement('div');
    h.style.marginTop = '8px';
    h.innerHTML = `<strong>${group.dateFolder}</strong>`;
    root.appendChild(h);

    group.files.forEach(f => {
      const row = document.createElement('div');
      row.className = 'item';
      row.style.display = 'flex';
      row.style.justifyContent = 'space-between';
      row.style.padding = '8px 0';
      row.style.borderBottom = '1px dashed #eee';
      const sizeKB = Math.round((f.size || 0) / 1024);
      row.innerHTML = `
        <div>${f.name} — ${sizeKB} KB</div>
        <div>
          <button data-id="${f.id}" class="select">Select</button>
        </div>`;
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

// ====== ДЕЙСТВИЯ ======
async function loadBackups() {
  await ensureBoardId();
  const res = await api('list_backups', { boardId: state.boardId });
  if (!res || !res.ok) {
    console.error('list_backups error:', res);
    await t.alert({ message: 'Ошибка list_backups: ' + (res && res.error || 'unknown') });
    return;
  }
  state.backups = res.batches || [];
  renderList();
}

async function onBackupNow() {
  await ensureBoardId();
  const res = await api('backup_now', { boardId: state.boardId });
  if (!res || !res.ok) {
    console.error('backup_now error:', res);
    await t.alert({ message: 'Ошибка backup_now: ' + (res && res.error || 'unknown') });
    return;
  }
  await loadBackups();
  await t.alert({ message: 'Backup completed' });
}

async function onRestoreSelected() {
  await ensureBoardId();
  if (!state.selectedFileId) return t.alert({ message: 'Сначала выбери бэкап (кнопка Select)' });

  const name = document.getElementById('newBoardName').value || 'Restored board';
  const res = await api('restore', { fileId: state.selectedFileId, newBoardName: name });
  if (!res || !res.ok) {
    console.error('restore error:', res);
    await t.alert({ message: 'Ошибка restore: ' + (res && res.error || 'unknown') });
    return;
  }
  await t.alert({ message: 'Восстановлено. Откроем новую доску…' });
  if (res.newBoardUrl) window.open(res.newBoardUrl, '_blank');
}

// ====== ИНИЦ ======
document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('backup-now')?.addEventListener('click', onBackupNow);
  document.getElementById('refresh')?.addEventListener('click', loadBackups);
  document.getElementById('restore-btn')?.addEventListener('click', onRestoreSelected);
  loadBackups();
});
