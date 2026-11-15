// MyVault standalone — server API (Express + Postgres).
// Ganti `retoolDb` (Retool) dengan panggilan SQL terus, dan `retoolStorage`
// dengan simpanan fail di disk (folder ./data/uploads).
import express from 'express'
import pg from 'pg'
import crypto from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const UPLOAD_DIR = path.join(__dirname, '..', 'data', 'uploads')
fs.mkdirSync(UPLOAD_DIR, { recursive: true })

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL || 'postgres://localhost:5432/myvault' })
const q = (text, params) => pool.query(text, params)

// ---------- hashing (scrypt, tanpa dependensi luar) ----------
function hashSecret(secret, salt) {
  return crypto.scryptSync(secret, salt, 32).toString('hex')
}
function makeHash(secret) {
  const salt = crypto.randomBytes(16).toString('hex')
  return `${salt}:${hashSecret(secret, salt)}`
}
function verifyHash(secret, stored) {
  const [salt, hash] = String(stored).split(':')
  return hashSecret(secret, salt) === hash
}

// ---------- schema ----------
async function initSchema() {
  await q(`CREATE TABLE IF NOT EXISTS vault_profiles (
    id SERIAL PRIMARY KEY,
    username TEXT UNIQUE NOT NULL,
    display_name TEXT,
    password_hash TEXT NOT NULL,
    pin_hash TEXT,
    phone TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`)
  await q(`CREATE TABLE IF NOT EXISTS vault_items (
    id SERIAL PRIMARY KEY,
    owner_id INT NOT NULL REFERENCES vault_profiles(id),
    type TEXT NOT NULL,
    title TEXT NOT NULL,
    fields JSONB NOT NULL DEFAULT '{}'::jsonb,
    favorite BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`)
  await q(`CREATE TABLE IF NOT EXISTS vault_attachments (
    id SERIAL PRIMARY KEY,
    owner_id INT NOT NULL REFERENCES vault_profiles(id),
    item_id INT,
    name TEXT NOT NULL,
    mime TEXT NOT NULL,
    size_bytes BIGINT NOT NULL,
    file_path TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`)
  await q(`CREATE TABLE IF NOT EXISTS code_folders (
    id SERIAL PRIMARY KEY,
    owner_id INT NOT NULL REFERENCES vault_profiles(id),
    parent_id INT,
    name TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`)
  await q(`CREATE TABLE IF NOT EXISTS code_files (
    id SERIAL PRIMARY KEY,
    owner_id INT NOT NULL REFERENCES vault_profiles(id),
    folder_id INT NOT NULL,
    name TEXT NOT NULL,
    language TEXT NOT NULL DEFAULT 'plaintext',
    content TEXT NOT NULL DEFAULT '',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`)
  await q(`CREATE TABLE IF NOT EXISTS sessions (
    token TEXT PRIMARY KEY,
    profile_id INT NOT NULL REFERENCES vault_profiles(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`)
}

// ---------- app ----------
const app = express()
app.use(express.json({ limit: '20mb' }))

async function auth(req, res, next) {
  const token = (req.headers.authorization || '').replace('Bearer ', '')
  if (!token) return res.status(401).json({ error: 'Tidak dibenarkan.' })
  const { rows } = await q(
    `SELECT p.* FROM sessions s JOIN vault_profiles p ON p.id = s.profile_id WHERE s.token = $1`,
    [token],
  )
  if (rows.length === 0) return res.status(401).json({ error: 'Sesi tidak sah.' })
  req.profile = rows[0]
  next()
}

function issueToken(profileId) {
  const token = crypto.randomBytes(32).toString('hex')
  return q(`INSERT INTO sessions (token, profile_id) VALUES ($1, $2)`, [token, profileId]).then(() => token)
}

// ---------- auth routes ----------
app.post('/api/auth/profile', async (req, res) => {
  const token = (req.headers.authorization || '').replace('Bearer ', '')
  if (token) {
    const { rows } = await q(`SELECT profile_id FROM sessions WHERE token = $1`, [token])
    if (rows.length > 0) {
      const { rows: p } = await q(`SELECT id, username, display_name, phone FROM vault_profiles WHERE id = $1`, [rows[0].profile_id])
      return res.json({ exists: true, profile: p[0] ?? null, loggedIn: true })
    }
  }
  const { rows } = await q(`SELECT COUNT(*)::int AS n FROM vault_profiles`)
  res.json({ exists: rows[0].n > 0, profile: null, loggedIn: false })
})

app.post('/api/auth/setup', async (req, res) => {
  const { username, password, phone, pin } = req.body || {}
  if (!username || username.length < 3) return res.status(400).json({ error: 'Username mesti sekurang-kurangnya 3 aksara.' })
  if (!password || password.length < 6) return res.status(400).json({ error: 'Password mesti sekurang-kurangnya 6 aksara.' })
  if (pin && !/^\d{6}$/.test(pin)) return res.status(400).json({ error: 'PIN mesti 6 digit.' })

  const taken = await q(`SELECT id FROM vault_profiles WHERE username = $1`, [username])
  if (taken.rows.length > 0) return res.status(400).json({ error: 'Username sudah diambil.' })

  const { rows } = await q(
    `INSERT INTO vault_profiles (username, display_name, password_hash, pin_hash, phone)
     VALUES ($1, $2, $3, $4, $5) RETURNING id`,
    [username, username, makeHash(password), pin ? makeHash(pin) : null, phone ?? null],
  )
  const token = await issueToken(rows[0].id)
  res.json({ ok: true, token })
})

app.post('/api/auth/unlock', async (req, res) => {
  const { method, pin, username, password } = req.body || {}
  const { rows } = await q(`SELECT * FROM vault_profiles ORDER BY id LIMIT 1`)
  const profile = rows[0]
  if (!profile) return res.status(400).json({ error: 'Vault belum diwujudkan.' })

  if (method === 'pin') {
    if (!pin || !/^\d{6}$/.test(pin)) return res.status(400).json({ error: 'PIN mesti 6 digit.' })
    if (!profile.pin_hash) return res.status(400).json({ error: 'PIN tidak ditetapkan.' })
    if (!verifyHash(pin, profile.pin_hash)) return res.status(400).json({ error: 'PIN salah.' })
  } else {
    if (username !== profile.username || !verifyHash(password || '', profile.password_hash)) {
      return res.status(400).json({ error: 'Username atau password salah.' })
    }
  }
  const token = await issueToken(profile.id)
  res.json({ ok: true, token })
})

// ---------- vault items ----------
app.get('/api/items', auth, async (req, res) => {
  const { rows } = await q(
    `SELECT id, type, title, fields, favorite, created_at, updated_at
     FROM vault_items WHERE owner_id = $1 ORDER BY updated_at DESC LIMIT 500`,
    [req.profile.id],
  )
  res.json({ items: rows })
})

app.post('/api/items', auth, async (req, res) => {
  const { id, type, title, fields, favorite } = req.body || {}
  if (!title?.trim()) return res.status(400).json({ error: 'Title diperlukan.' })
  if (id) {
    const { rows } = await q(
      `UPDATE vault_items SET type = $1, title = $2, fields = $3, favorite = COALESCE($4, favorite), updated_at = NOW()
       WHERE id = $5 AND owner_id = $6 RETURNING *`,
      [type, title, JSON.stringify(fields ?? {}), favorite ?? null, id, req.profile.id],
    )
    if (rows.length === 0) return res.status(404).json({ error: 'Item tidak dijumpai.' })
    return res.json({ ok: true, item: rows[0] })
  }
  const { rows } = await q(
    `INSERT INTO vault_items (owner_id, type, title, fields, favorite) VALUES ($1, $2, $3, $4, $5) RETURNING *`,
    [req.profile.id, type, title, JSON.stringify(fields ?? {}), favorite ?? false],
  )
  res.json({ ok: true, item: rows[0] })
})

app.delete('/api/items/:id', auth, async (req, res) => {
  const atts = await q(`SELECT file_path FROM vault_attachments WHERE item_id = $1 AND owner_id = $2`, [req.params.id, req.profile.id])
  for (const a of atts.rows) fs.promises.unlink(a.file_path).catch(() => {})
  await q(`DELETE FROM vault_attachments WHERE item_id = $1 AND owner_id = $2`, [req.params.id, req.profile.id])
  await q(`DELETE FROM vault_items WHERE id = $1 AND owner_id = $2`, [req.params.id, req.profile.id])
  res.json({ ok: true })
})

// ---------- attachments (disimpan sebagai fail di disk) ----------
const MAX_BYTES = 10 * 1024 * 1024

app.get('/api/attachments', auth, async (req, res) => {
  const { itemId } = req.query
  const { rows } = await q(
    `SELECT id, item_id, name, mime, size_bytes, created_at FROM vault_attachments
     WHERE owner_id = $1 ${itemId != null ? 'AND item_id = $2' : ''} ORDER BY created_at DESC LIMIT 500`,
    itemId != null ? [req.profile.id, itemId] : [req.profile.id],
  )
  res.json({ attachments: rows })
})

app.post('/api/attachments', auth, async (req, res) => {
  const { itemId, name, mime, base64Data } = req.body || {}
  if (!name?.trim()) return res.status(400).json({ error: 'Nama fail diperlukan.' })
  const bytes = Buffer.from(base64Data || '', 'base64')
  if (bytes.length > MAX_BYTES) return res.status(400).json({ error: 'Fail melebihi had 10MB (versi standalone).' })
  const safeName = name.trim().replace(/[^\w.\- ]/g, '_')
  const filePath = path.join(UPLOAD_DIR, `${crypto.randomUUID()}-${safeName}`)
  await fs.promises.writeFile(filePath, bytes)
  const { rows } = await q(
    `INSERT INTO vault_attachments (owner_id, item_id, name, mime, size_bytes, file_path)
     VALUES ($1, $2, $3, $4, $5, $6) RETURNING id, item_id, name, mime, size_bytes, created_at`,
    [req.profile.id, itemId ?? null, safeName, mime || 'application/octet-stream', bytes.length, filePath],
  )
  res.json({ ok: true, attachment: rows[0] })
})

app.get('/api/attachments/:id/content', auth, async (req, res) => {
  const { rows } = await q(`SELECT * FROM vault_attachments WHERE id = $1 AND owner_id = $2`, [req.params.id, req.profile.id])
  const att = rows[0]
  if (!att) return res.status(404).json({ error: 'Attachment tidak dijumpai.' })
  if (att.size_bytes > MAX_BYTES) return res.status(400).json({ error: 'Fail terlalu besar untuk dibuka dalam app.' })
  const buf = await fs.promises.readFile(att.file_path)
  res.json({ ok: true, name: att.name, mime: att.mime, base64Data: buf.toString('base64') })
})

app.delete('/api/attachments/:id', auth, async (req, res) => {
  const { rows } = await q(`SELECT file_path FROM vault_attachments WHERE id = $1 AND owner_id = $2`, [req.params.id, req.profile.id])
  if (rows[0]) fs.promises.unlink(rows[0].file_path).catch(() => {})
  await q(`DELETE FROM vault_attachments WHERE id = $1 AND owner_id = $2`, [req.params.id, req.profile.id])
  res.json({ ok: true })
})

// ---------- code vault ----------
app.get('/api/code/tree', auth, async (req, res) => {
  const folders = await q(`SELECT id, parent_id, name, created_at FROM code_folders WHERE owner_id = $1 ORDER BY name`, [req.profile.id])
  const files = await q(
    `SELECT id, folder_id, name, language, LENGTH(content) AS size, updated_at FROM code_files WHERE owner_id = $1 ORDER BY name LIMIT 5000`,
    [req.profile.id],
  )
  res.json({ folders: folders.rows, files: files.rows })
})

app.post('/api/code/folders', auth, async (req, res) => {
  const { parentId, name } = req.body || {}
  if (!name?.trim()) return res.status(400).json({ error: 'Nama folder diperlukan.' })
  const { rows } = await q(`INSERT INTO code_folders (owner_id, parent_id, name) VALUES ($1, $2, $3) RETURNING *`, [
    req.profile.id, parentId ?? null, name.trim(),
  ])
  res.json({ ok: true, folder: rows[0] })
})

app.post('/api/code/files', auth, async (req, res) => {
  const { folderId, name, language, content } = req.body || {}
  if (!name?.trim()) return res.status(400).json({ error: 'Nama fail diperlukan.' })
  const folder = await q(`SELECT id FROM code_folders WHERE id = $1 AND owner_id = $2`, [folderId, req.profile.id])
  if (folder.rows.length === 0) return res.status(404).json({ error: 'Folder tidak dijumpai.' })
  const safeName = name.trim().replace(/[^\w.\- ]/g, '_')
  const { rows } = await q(
    `INSERT INTO code_files (owner_id, folder_id, name, language, content) VALUES ($1, $2, $3, $4, $5)
     RETURNING id, folder_id, name, language`,
    [req.profile.id, folderId, safeName, language || 'plaintext', content ?? ''],
  )
  res.json({ ok: true, file: rows[0] })
})

app.get('/api/code/files/:id', auth, async (req, res) => {
  const { rows } = await q(`SELECT * FROM code_files WHERE id = $1 AND owner_id = $2`, [req.params.id, req.profile.id])
  if (rows.length === 0) return res.status(404).json({ error: 'Fail tidak dijumpai.' })
  res.json({ ok: true, file: rows[0] })
})

app.put('/api/code/files/:id', auth, async (req, res) => {
  const { name, language, content } = req.body || {}
  const { rows } = await q(
    `UPDATE code_files SET name = COALESCE($1, name), language = COALESCE($2, language),
       content = COALESCE($3, content), updated_at = NOW()
     WHERE id = $4 AND owner_id = $5 RETURNING id, name, language`,
    [name ?? null, language ?? null, content ?? null, req.params.id, req.profile.id],
  )
  if (rows.length === 0) return res.status(404).json({ error: 'Fail tidak dijumpai.' })
  res.json({ ok: true, file: rows[0] })
})

app.delete('/api/code/files/:id', auth, async (req, res) => {
  await q(`DELETE FROM code_files WHERE id = $1 AND owner_id = $2`, [req.params.id, req.profile.id])
  res.json({ ok: true })
})

app.delete('/api/code/folders/:id', auth, async (req, res) => {
  await q(
    `WITH RECURSIVE sub AS (
       SELECT id FROM code_folders WHERE id = $1 AND owner_id = $2
       UNION ALL SELECT f.id FROM code_folders f JOIN sub s ON f.parent_id = s.id
     ) DELETE FROM code_files WHERE folder_id IN (SELECT id FROM sub) AND owner_id = $3`,
    [req.params.id, req.profile.id, req.profile.id],
  )
  await q(
    `WITH RECURSIVE sub AS (
       SELECT id FROM code_folders WHERE id = $1 AND owner_id = $2
       UNION ALL SELECT f.id FROM code_folders f JOIN sub s ON f.parent_id = s.id
     ) DELETE FROM code_folders WHERE id IN (SELECT id FROM sub) AND owner_id = $3`,
    [req.params.id, req.profile.id, req.profile.id],
  )
  res.json({ ok: true })
})

// ---------- static client (production) ----------
const distDir = path.join(__dirname, '..', 'dist')
app.use(express.static(distDir))
app.get(/^\/(?!api).*/, (_req, res) => res.sendFile(path.join(distDir, 'index.html')))

const PORT = process.env.PORT || 8787
initSchema()
  .then(() => app.listen(PORT, () => console.log(`MyVault API berjalan di http://localhost:${PORT}`)))
  .catch((err) => {
    console.error('Gagal sambung ke Postgres:', err.message)
    process.exit(1)
  })
