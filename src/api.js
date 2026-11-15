// Klien API — menggantikan hooks auto-jana Retool dengan panggilan fetch biasa.
const BASE = '/api'

export function getToken() {
  return localStorage.getItem('vault-token')
}

export function setToken(token) {
  if (token) localStorage.setItem('vault-token', token)
  else localStorage.removeItem('vault-token')
}

async function req(path, options = {}) {
  const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) }
  const token = getToken()
  if (token) headers.Authorization = `Bearer ${token}`
  const res = await fetch(BASE + path, { ...options, headers })
  const data = await res.json().catch(() => null)
  if (!res.ok) throw new Error((data && data.error) || 'Ralat server')
  return data
}

export const api = {
  // auth
  getProfile: () => req('/auth/profile', { method: 'POST' }),
  setup: (body) => req('/auth/setup', { method: 'POST', body: JSON.stringify(body) }),
  unlock: (body) => req('/auth/unlock', { method: 'POST', body: JSON.stringify(body) }),

  // vault items
  listItems: () => req('/items'),
  saveItem: (body) => req('/items', { method: 'POST', body: JSON.stringify(body) }),
  deleteItem: (id) => req(`/items/${id}`, { method: 'DELETE' }),

  // attachments
  listAttachments: (itemId) => req(`/attachments${itemId != null ? `?itemId=${itemId}` : ''}`),
  uploadAttachment: (body) => req('/attachments', { method: 'POST', body: JSON.stringify(body) }),
  attachmentContent: (id) => req(`/attachments/${id}/content`),
  deleteAttachment: (id) => req(`/attachments/${id}`, { method: 'DELETE' }),

  // code vault
  tree: () => req('/code/tree'),
  createFolder: (body) => req('/code/folders', { method: 'POST', body: JSON.stringify(body) }),
  createFile: (body) => req('/code/files', { method: 'POST', body: JSON.stringify(body) }),
  getFile: (id) => req(`/code/files/${id}`),
  saveFile: (id, body) => req(`/code/files/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
  deleteCode: (kind, id) => req(`/code/${kind}/${id}`, { method: 'DELETE' }),
}

export function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result).split(',')[1])
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

export function base64ToBlobUrl(b64, mime) {
  const bin = atob(b64)
  const bytes = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i)
  return URL.createObjectURL(new Blob([bytes], { type: mime }))
}
