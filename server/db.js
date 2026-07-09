const path = require('path');
const fs = require('fs');
const Database = require('better-sqlite3');
const { Pool } = require('pg');

const DATA_DIR = path.join(__dirname, '..', 'data');
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

const databaseUrl = process.env.DATABASE_URL && process.env.DATABASE_URL.trim();
const usePostgres = Boolean(databaseUrl);

let db = null;
let pool = null;
let statements = null;
let backendStatements = null;
let initialized = false;

function createSqliteStatements(sqliteDb) {
  return {
    insert: {
      run: (values) => Promise.resolve(sqliteDb.prepare(`
        INSERT INTO registrations (ref_code, name, email, phone, ip_address)
        VALUES (@ref_code, @name, @email, @phone, @ip_address)
      `).run(values)),
    },
    findByEmail: {
      get: (email) => Promise.resolve(sqliteDb.prepare(`SELECT id FROM registrations WHERE email = ? COLLATE NOCASE`).get(email)),
    },
    all: {
      all: () => Promise.resolve(sqliteDb.prepare(`SELECT id, ref_code, name, email, phone, created_at FROM registrations ORDER BY created_at DESC`).all()),
    },
    count: {
      get: () => Promise.resolve(sqliteDb.prepare(`SELECT COUNT(*) AS total FROM registrations`).get()),
    },
    deleteById: {
      run: (id) => Promise.resolve(sqliteDb.prepare(`DELETE FROM registrations WHERE id = ?`).run(id)),
    },
  };
}

async function ensurePostgresInitialized() {
  if (initialized) return;

  pool = new Pool({
    connectionString: databaseUrl,
    ssl: process.env.PGSSLMODE === 'disable' ? false : { rejectUnauthorized: false },
  });

  await pool.query(`
    CREATE TABLE IF NOT EXISTS registrations (
      id SERIAL PRIMARY KEY,
      ref_code TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      phone TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      ip_address TEXT
    );

    CREATE INDEX IF NOT EXISTS idx_registrations_created_at ON registrations(created_at);
    CREATE UNIQUE INDEX IF NOT EXISTS idx_registrations_email_lower ON registrations (lower(email));
  `);

  backendStatements = {
    insert: {
      run: async (values) => {
        const result = await pool.query(`
          INSERT INTO registrations (ref_code, name, email, phone, ip_address)
          VALUES ($1, $2, $3, $4, $5)
        `, [values.ref_code, values.name, values.email, values.phone, values.ip_address]);
        return { changes: result.rowCount };
      },
    },
    findByEmail: {
      get: async (email) => {
        const result = await pool.query(
          `SELECT id FROM registrations WHERE lower(email) = lower($1)`,
          [email]
        );
        return result.rows[0] || null;
      },
    },
    all: {
      all: async () => {
        const result = await pool.query(`SELECT id, ref_code, name, email, phone, created_at FROM registrations ORDER BY created_at DESC`);
        return result.rows;
      },
    },
    count: {
      get: async () => {
        const result = await pool.query(`SELECT COUNT(*) AS total FROM registrations`);
        return result.rows[0] || { total: 0 };
      },
    },
    deleteById: {
      run: async (id) => {
        const result = await pool.query(`DELETE FROM registrations WHERE id = $1`, [id]);
        return { changes: result.rowCount };
      },
    },
  };

  statements = {
    insert: { run: (values) => backendStatements.insert.run(values) },
    findByEmail: { get: (email) => backendStatements.findByEmail.get(email) },
    all: { all: () => backendStatements.all.all() },
    count: { get: () => backendStatements.count.get() },
    deleteById: { run: (id) => backendStatements.deleteById.run(id) },
  };

  initialized = true;
}

if (!usePostgres) {
  console.log('[db] Using SQLite storage at data/game11.db');
  db = new Database(path.join(DATA_DIR, 'game11.db'));
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
  statements = createSqliteStatements(db);
  initialized = true;
} else {
  console.log('[db] Using Postgres storage from DATABASE_URL');
  // Postgres will initialize lazily on first use.
  statements = {
    insert: {
      run: async (values) => {
        await ensurePostgresInitialized();
        return backendStatements.insert.run(values);
      },
    },
    findByEmail: {
      get: async (email) => {
        await ensurePostgresInitialized();
        return backendStatements.findByEmail.get(email);
      },
    },
    all: {
      all: async () => {
        await ensurePostgresInitialized();
        return backendStatements.all.all();
      },
    },
    count: {
      get: async () => {
        await ensurePostgresInitialized();
        return backendStatements.count.get();
      },
    },
    deleteById: {
      run: async (id) => {
        await ensurePostgresInitialized();
        return backendStatements.deleteById.run(id);
      },
    },
  };
}

module.exports = { db, statements };
