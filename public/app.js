let items = [];
let editingId = null;
let buffs = [];
let editingBuffId = null;
let buffTimerInterval = null;

async function fetchItems() {
  const res = await fetch('/api/items');
  items = await res.json();
  render();
}

async function toggleComplete(id) {
  await fetch(`/api/items/${id}/complete`, { method: 'POST' });
  await fetchItems();
}

async function addItem(name) {
  await fetch('/api/items', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name }),
  });
  await fetchItems();
}

async function deleteItem(id) {
  await fetch(`/api/items/${id}`, { method: 'DELETE' });
  await fetchItems();
}

async function fetchBuffs() {
  const res = await fetch('/api/buffs');
  buffs = await res.json();
  renderBuffs();
  startBuffTimers();
}

async function toggleBuff(id) {
  await fetch(`/api/buffs/${id}/activate`, { method: 'POST' });
  await fetchBuffs();
}

async function addBuff() {
  const nameInput = document.getElementById('new-buff-name');
  const durationInput = document.getElementById('new-buff-duration');
  const name = nameInput.value.trim();
  const duration_minutes = parseInt(durationInput.value);
  if (!name || !duration_minutes || duration_minutes < 1) return;
  await fetch('/api/buffs', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, duration_minutes }),
  });
  nameInput.value = '';
  durationInput.value = '';
  await fetchBuffs();
}

async function deleteBuff(id) {
  await fetch(`/api/buffs/${id}`, { method: 'DELETE' });
  await fetchBuffs();
}

function openBuffEditModal(buff) {
  editingBuffId = buff.id;
  document.getElementById('buff-edit-name').value = buff.name;
  document.getElementById('buff-edit-duration').value = buff.duration_minutes;
  document.getElementById('buff-edit-modal').classList.add('active');
  document.getElementById('buff-edit-name').focus();
}

function closeBuffModal() {
  editingBuffId = null;
  document.getElementById('buff-edit-modal').classList.remove('active');
}

async function saveBuffEdit() {
  const name = document.getElementById('buff-edit-name').value.trim();
  const duration_minutes = parseInt(document.getElementById('buff-edit-duration').value);
  if (!name || !editingBuffId || !duration_minutes || duration_minutes < 1) return;
  await fetch(`/api/buffs/${editingBuffId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, duration_minutes }),
  });
  closeBuffModal();
  await fetchBuffs();
}

async function saveEdit() {
  const name = document.getElementById('edit-name').value.trim();
  if (!name || !editingId) return;
  await fetch(`/api/items/${editingId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name }),
  });
  closeModal();
  await fetchItems();
}

function openEditModal(item) {
  editingId = item.id;
  document.getElementById('edit-name').value = item.name;
  document.getElementById('edit-modal').classList.add('active');
  document.getElementById('edit-name').focus();
}

function closeModal() {
  editingId = null;
  document.getElementById('edit-modal').classList.remove('active');
}

function render() {
  const tracker = document.getElementById('tracker');
  const categories = [
    { key: 'daily', label: 'Daily' },
    { key: 'weekly', label: 'Weekly' },
    { key: 'custom', label: 'Custom' },
  ];

  tracker.innerHTML = categories.map(cat => {
    const catItems = items.filter(i => i.category === cat.key);
    const itemsHtml = catItems.map(item => `
      <div class="item ${item.completed ? 'completed' : ''}" data-id="${item.id}">
        <div class="item-checkbox" onclick="toggleComplete(${item.id})"></div>
        <span class="item-name" onclick="toggleComplete(${item.id})">${escapeHtml(item.name)}</span>
        ${item.category === 'custom' ? `
          <div class="item-actions">
            <button onclick="event.stopPropagation(); openEditModal(${JSON.stringify(item).replace(/"/g, '&quot;')})">Edit</button>
            <button onclick="event.stopPropagation(); deleteItem(${item.id})">Del</button>
          </div>
        ` : ''}
      </div>
    `).join('');

    const addForm = cat.key === 'custom' ? `
      <div class="add-item">
        <input type="text" id="new-item-input" placeholder="Add custom item..."
               onkeydown="if(event.key==='Enter'){addItem(this.value);this.value=''}">
        <button onclick="const inp=document.getElementById('new-item-input');addItem(inp.value);inp.value=''">Add</button>
      </div>
    ` : '';

    return `
      <div class="category">
        <div class="category-header">${cat.label}</div>
        ${itemsHtml}
        ${addForm}
      </div>
    `;
  }).join('');
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function renderBuffs() {
  const list = document.getElementById('buff-list');
  list.innerHTML = buffs.map(buff => `
    <div class="buff-item ${buff.active ? 'active' : ''}" data-id="${buff.id}">
      <div class="buff-indicator" onclick="toggleBuff(${buff.id})"></div>
      <div class="buff-info" onclick="toggleBuff(${buff.id})">
        <div class="buff-name">${escapeHtml(buff.name)}</div>
        <div class="buff-timer" id="buff-timer-${buff.id}">
          ${buff.active ? formatSeconds(buff.remaining_seconds) : buff.duration_minutes + ' min'}
        </div>
      </div>
      <div class="buff-actions">
        <button onclick="event.stopPropagation(); openBuffEditModal(${JSON.stringify(buff).replace(/"/g, '&quot;')})">Edit</button>
        <button onclick="event.stopPropagation(); deleteBuff(${buff.id})">Del</button>
      </div>
    </div>
  `).join('');
}

function formatSeconds(totalSeconds) {
  if (totalSeconds <= 0) return 'EXPIRED';
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

function showToast(message) {
  const container = document.getElementById('toast-container');
  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.textContent = message;
  container.appendChild(toast);
  setTimeout(() => toast.classList.add('fade-out'), 2600);
  setTimeout(() => toast.remove(), 3000);
}

function flashBuffRow(buffId) {
  const row = document.querySelector(`.buff-item[data-id="${buffId}"]`);
  if (row) {
    row.classList.add('expired-flash');
    row.addEventListener('animationend', () => row.classList.remove('expired-flash'), { once: true });
  }
}

function startBuffTimers() {
  if (buffTimerInterval) clearInterval(buffTimerInterval);
  buffTimerInterval = setInterval(() => {
    let anyExpired = false;
    buffs.forEach(buff => {
      if (buff.active && buff.remaining_seconds > 0) {
        buff.remaining_seconds--;
        const el = document.getElementById(`buff-timer-${buff.id}`);
        if (el) {
          if (buff.remaining_seconds <= 0) {
            el.textContent = 'EXPIRED';
            anyExpired = true;
            flashBuffRow(buff.id);
            showToast(`${buff.name} expired`);
          } else {
            el.textContent = formatSeconds(buff.remaining_seconds);
          }
        }
      }
    });
    if (anyExpired) fetchBuffs();
  }, 1000);
}

// Reset countdown timers
async function updateTimers() {
  const res = await fetch('/api/reset-info');
  const { nextDaily, nextWeekly } = await res.json();

  function countdown(target, elId) {
    const el = document.getElementById(elId);
    function tick() {
      const diff = new Date(target) - new Date();
      if (diff <= 0) {
        el.textContent = 'RESET!';
        fetchItems();
        return;
      }
      const h = Math.floor(diff / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      el.textContent = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
    }
    tick();
    setInterval(tick, 1000);
  }

  countdown(nextDaily, 'daily-timer');
  countdown(nextWeekly, 'weekly-timer');
}

// Wire up modal buttons
document.getElementById('edit-save').addEventListener('click', saveEdit);
document.getElementById('edit-cancel').addEventListener('click', closeModal);
document.getElementById('edit-name').addEventListener('keydown', (e) => {
  if (e.key === 'Enter') saveEdit();
  if (e.key === 'Escape') closeModal();
});
document.getElementById('buff-edit-save').addEventListener('click', saveBuffEdit);
document.getElementById('buff-edit-cancel').addEventListener('click', closeBuffModal);
document.getElementById('buff-edit-name').addEventListener('keydown', (e) => {
  if (e.key === 'Enter') saveBuffEdit();
  if (e.key === 'Escape') closeBuffModal();
});
document.getElementById('add-buff-btn').addEventListener('click', addBuff);
document.getElementById('new-buff-name').addEventListener('keydown', (e) => {
  if (e.key === 'Enter') addBuff();
});

// Init
fetchItems();
fetchBuffs();
updateTimers();
