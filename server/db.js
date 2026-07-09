const path = require('path');
const fs = require('fs');
const Database = require('better-sqlite3');

const DATA_DIR = path.join(__dirname, '..', 'data');
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

const db = new Database(path.join(DATA_DIR, 'game11.db'));

// Safer defaults for a small single-file app.
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.exec(`
  CREATE TABLE IF NOT EXISTS registrations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    ref_code TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE COLLATE NOCASE,
    phone TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
    ip_address TEXT
  );

  CREATE INDEX IF NOT EXISTS idx_registrations_created_at ON registrations(created_at);
`);

const statements = {
  insert: db.prepare(`
    INSERT INTO registrations (ref_code, name, email, phone, ip_address)
    VALUES (@ref_code, @name, @email, @phone, @ip_address)
  `),
  findByEmail: db.prepare(`SELECT id FROM registrations WHERE email = ? COLLATE NOCASE`),
  all: db.prepare(`SELECT id, ref_code, name, email, phone, created_at FROM registrations ORDER BY created_at DESC`),
  count: db.prepare(`SELECT COUNT(*) AS total FROM registrations`),
  deleteById: db.prepare(`DELETE FROM registrations WHERE id = ?`),
};

module.exports = { db, statements };
