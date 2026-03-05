let items = [];
let editingId = null;

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

// Init
fetchItems();
updateTimers();
