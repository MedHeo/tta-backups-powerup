const t = window.TrelloPowerUp.iframe();

const BACKEND_URL = 'https://script.google.com/macros/s/AKfycbxLyhCoV4z1Ksqvf3BXzhHGgmUPvv13KqkQ3NX9GG2b6u1LpQurIcvvfRnTvC6EvuK0/exec';
const BACKEND_SECRET = '3f8b7c92-2b13-4f7e-a932-9eaa4b8731ab';

let state = { boardId:null, selectedFileId:null, backups:[] };

async function api(action, payload) {
  const resp = await fetch(BACKEND_URL, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(Object.assign({ action, secret: BACKEND_SECRET }, payload || {}))
  });
  return await resp.json();
}

async function loadList() {
  const ctx = await t.getContext();
  state.boardId = ctx.board;
  const data = await api('list_backups', { boardId: state.boardId });
  state.backups = data.batches || [];
  render();
}

function render() {
  const root = document.getElementById('list'); root.innerHTML = '';
  state.backups.forEach(group => {
    const header = document.createElement('div');
    header.innerHTML = `<strong>${group.dateFolder}</strong>`;
    root.appendChild(header);
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

document.getElementById('backup-now').addEventListener('click', async () => {
  await api('backup_now', { boardId: state.boardId });
  await loadList();
  t.alert({ message: 'Backup completed' });
});
document.getElementById('refresh').addEventListener('click', loadList);
document.getElementById('restore-btn').addEventListener('click', async () => {
  const name = document.getElementById('newBoardName').value || 'Restored board';
  if (!state.selectedFileId) return t.alert({ message: 'Select backup first' });
  const res = await api('restore', { fileId: state.selectedFileId, newBoardName: name });
  if (res && res.newBoardUrl) { t.alert({ message: 'Restored. Opening new board...' }); window.open(res.newBoardUrl, '_blank'); }
  else { t.alert({ message: 'Restore done' }); }
});
loadList();

