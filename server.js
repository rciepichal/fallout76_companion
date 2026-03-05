const express = require('express');
const path = require('path');
const db = require('./db');
const { getResetBoundaries } = require('./reset');

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// GET /api/items — all active items with completion status
app.get('/api/items', (req, res) => {
  const { dailyReset, weeklyReset } = getResetBoundaries();
  const items = db.prepare('SELECT * FROM items WHERE is_active = 1 ORDER BY sort_order, id').all();

  const result = items.map(item => {
    const resetBoundary = item.reset_type === 'weekly' ? weeklyReset
      : item.reset_type === 'daily' ? dailyReset
      : '1970-01-01T00:00:00.000Z'; // manual items: show all completions
    const completion = db.prepare(
      'SELECT id FROM completions WHERE item_id = ? AND completed_at > ? LIMIT 1'
    ).get(item.id, resetBoundary);
    return { ...item, completed: !!completion };
  });

  res.json(result);
});

// POST /api/items — create a custom item
app.post('/api/items', (req, res) => {
  const { name } = req.body;
  if (!name || !name.trim()) return res.status(400).json({ error: 'Name is required' });
  const maxOrder = db.prepare('SELECT MAX(sort_order) as m FROM items').get();
  const sort_order = (maxOrder.m || 0) + 1;
  const result = db.prepare(
    'INSERT INTO items (name, category, reset_type, sort_order) VALUES (?, ?, ?, ?)'
  ).run(name.trim(), 'custom', 'manual', sort_order);
  const item = db.prepare('SELECT * FROM items WHERE id = ?').get(result.lastInsertRowid);
  res.status(201).json({ ...item, completed: false });
});

// PUT /api/items/:id — edit item
app.put('/api/items/:id', (req, res) => {
  const { name, sort_order } = req.body;
  const item = db.prepare('SELECT * FROM items WHERE id = ? AND is_active = 1').get(req.params.id);
  if (!item) return res.status(404).json({ error: 'Item not found' });
  if (name !== undefined) {
    if (!name.trim()) return res.status(400).json({ error: 'Name cannot be empty' });
    db.prepare('UPDATE items SET name = ? WHERE id = ?').run(name.trim(), item.id);
  }
  if (sort_order !== undefined) {
    db.prepare('UPDATE items SET sort_order = ? WHERE id = ?').run(sort_order, item.id);
  }
  const updated = db.prepare('SELECT * FROM items WHERE id = ?').get(item.id);
  res.json(updated);
});

// DELETE /api/items/:id — soft-delete
app.delete('/api/items/:id', (req, res) => {
  const item = db.prepare('SELECT * FROM items WHERE id = ? AND is_active = 1').get(req.params.id);
  if (!item) return res.status(404).json({ error: 'Item not found' });
  db.prepare('UPDATE items SET is_active = 0 WHERE id = ?').run(item.id);
  res.json({ success: true });
});

// POST /api/items/:id/complete — toggle completion
app.post('/api/items/:id/complete', (req, res) => {
  const { dailyReset, weeklyReset } = getResetBoundaries();
  const item = db.prepare('SELECT * FROM items WHERE id = ? AND is_active = 1').get(req.params.id);
  if (!item) return res.status(404).json({ error: 'Item not found' });

  const resetBoundary = item.reset_type === 'weekly' ? weeklyReset
    : item.reset_type === 'daily' ? dailyReset
    : '1970-01-01T00:00:00.000Z';

  const existing = db.prepare(
    'SELECT id FROM completions WHERE item_id = ? AND completed_at > ?'
  ).get(item.id, resetBoundary);

  if (existing) {
    db.prepare('DELETE FROM completions WHERE id = ?').run(existing.id);
    res.json({ completed: false });
  } else {
    db.prepare('INSERT INTO completions (item_id, completed_at) VALUES (?, ?)').run(
      item.id, new Date().toISOString()
    );
    res.json({ completed: true });
  }
});

// GET /api/reset-info — time until next resets
app.get('/api/reset-info', (req, res) => {
  const { nextDaily, nextWeekly } = getResetBoundaries();
  res.json({ nextDaily, nextWeekly });
});

const PORT = process.env.PORT || 3076;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`F76 Tracker running on http://0.0.0.0:${PORT}`);
});
