# MyVault (Standalone)

Versi berdikari web app MyVault — **tanpa sebarang dependensi Retool**. Boleh di-clone ke GitHub dan dijalankan di mana-mana (komputer sendiri, VPS, Render, Railway, dsb.).

Seni bina:
- **Backend**: Node.js + Express + PostgreSQL (API di bawah `/api`)
- **Frontend**: React + Vite + Tailwind (dari CDN)
- **Auth**: Username + Password, dan PIN 6 digit (scrypt hash). Token sesi disimpan dalam jadual `sessions`.
- **Fail lampiran**: disimpan sebagai fail di disk (`data/uploads`), metadata dalam Postgres.

## Struktur

```
myvault-standalone/
├── package.json
├── server/
│   └── index.js          # API penuh: auth, vault items, attachments, code vault
└── client/
    ├── index.html
    ├── vite.config.js
    └── src/
        ├── main.jsx, App.jsx, api.js, ui.jsx, styles.css
        ├── pages/        # Lock, Vault, CodeVault
        └── components/   # ItemCard, ItemDialog, AttachmentSection, FolderTree, FileEditor
```

## Cara jalankan

1. **Perlu**: Node.js 18+, PostgreSQL berjalan.

2. **Cipta pangkalan data**:
   ```bash
   createdb myvault   # atau guna psql: CREATE DATABASE myvault;
   ```

3. **Pasang & jalan (development)**:
   ```bash
   npm install
   export DATABASE_URL="postgres://localhost:5432/myvault"   # Windows: set DATABASE_URL=...
   npm run dev
   ```
   - API: http://localhost:8787
   - App:  http://localhost:5173

4. **Production**:
   ```bash
   npm run build
   npm start        # server menyajikan client dari folder dist/
   ```

Jadual dicipta secara automatik bila server mula.

## Perbezaan dari versi Retool

| Perkara | Versi Retool | Versi ini |
|---|---|---|
| Pangkalan data | `retoolDb` (Retool DB) | Postgres terus (`pg`) |
| Storan fail | `retoolStorage` (presigned upload) | fail di disk `data/uploads` |
| Hooks | auto-jana `useBackendFunction` | modul `api.js` (fetch) |
| UI | shadcn/ui | primitif ringkas dalam `ui.jsx` (kelas Tailwind sama) |
| Had lampiran | 40MB | 10MB (base64 melalui JSON) |

## Nota keselamatan

- Password & PIN di-hash dengan **scrypt + salt** — tidak pernah disimpan sebagai teks jelas.
- Untuk production sebenar: guna HTTPS, `helmet`, rate-limit, dan tukar `express.static` kepada reverse proxy (nginx) jika perlu.
- Simpan `DATABASE_URL` dalam `.env` (jangan commit — sudah ada dalam `.gitignore`).
