const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const dataDir = path.join(__dirname, 'data');
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir);

const db = new Database(path.join(dataDir, 'f76.db'));

db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.exec(`
  CREATE TABLE IF NOT EXISTS items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    category TEXT NOT NULL CHECK(category IN ('daily', 'weekly', 'custom')),
    reset_type TEXT NOT NULL CHECK(reset_type IN ('daily', 'weekly', 'manual')),
    sort_order INTEGER NOT NULL DEFAULT 0,
    is_active INTEGER NOT NULL DEFAULT 1
  );

  CREATE TABLE IF NOT EXISTS completions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    item_id INTEGER NOT NULL REFERENCES items(id),
    completed_at TEXT NOT NULL
  );

  CREATE INDEX IF NOT EXISTS idx_completions_item_id ON completions(item_id);
  CREATE INDEX IF NOT EXISTS idx_completions_completed_at ON completions(completed_at);
`);

db.exec(`
  CREATE TABLE IF NOT EXISTS buffs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    duration_minutes INTEGER NOT NULL,
    sort_order INTEGER NOT NULL DEFAULT 0,
    is_active INTEGER NOT NULL DEFAULT 1
  );

  CREATE TABLE IF NOT EXISTS buff_activations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    buff_id INTEGER NOT NULL REFERENCES buffs(id),
    activated_at TEXT NOT NULL
  );

  CREATE INDEX IF NOT EXISTS idx_buff_activations_buff_id ON buff_activations(buff_id);
`);

// Seed default items if table is empty
const count = db.prepare('SELECT COUNT(*) as c FROM items').get();
if (count.c === 0) {
  const insert = db.prepare(
    'INSERT INTO items (name, category, reset_type, sort_order) VALUES (?, ?, ?, ?)'
  );
  const seedMany = db.transaction((items) => {
    for (const item of items) insert.run(...item);
  });
  seedMany([
    // Daily limits
    ['Vendor Caps (1,400)', 'daily', 'daily', 1],
    ['Scrip (300)', 'daily', 'daily', 2],
    ['Gold Bullion (200)', 'daily', 'daily', 3],
    // Daily activities
    ['Daily Ops', 'daily', 'daily', 10],
    ['Daily Expedition', 'daily', 'daily', 11],
    ['Daily Challenges', 'daily', 'daily', 12],
    // Daily quests
    ['Vital Equipment (Foundation)', 'daily', 'daily', 20],
    ['Retirement Plan (Crater)', 'daily', 'daily', 21],
    ['Waste Not (Crater)', 'daily', 'daily', 22],
    ['Cop a Squatter', 'daily', 'daily', 23],
    ['Queen of the Hunt', 'daily', 'daily', 24],
    ['Someone To Talk To', 'daily', 'daily', 25],
    ['Idle Explosives', 'daily', 'daily', 26],
    ['Play Time (Camden Park)', 'daily', 'daily', 27],
    ['Lucky Mucker (Camden Park)', 'daily', 'daily', 28],
    // Weekly
    ['Weekly Challenges', 'weekly', 'weekly', 50],
  ]);
}

const buffCount = db.prepare('SELECT COUNT(*) as c FROM buffs').get();
if (buffCount.c === 0) {
  const insertBuff = db.prepare(
    'INSERT INTO buffs (name, duration_minutes, sort_order) VALUES (?, ?, ?)'
  );
  const seedBuffs = db.transaction((buffs) => {
    for (const buff of buffs) insertBuff.run(...buff);
  });
  seedBuffs([
    ['Food', 60, 1],
    ['Company Tea', 30, 2],
    ['Well Rested', 120, 3],
  ]);
}

module.exports = db;
