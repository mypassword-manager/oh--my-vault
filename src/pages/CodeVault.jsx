import { useEffect, useState } from 'react'
import { Eye, EyeOff, Loader2, Save, Trash2 } from 'lucide-react'
import { api } from '../api'
import { Button, Dialog, Input, Label, Select, Switch, Textarea } from '../ui'
import { AttachmentSection } from './AttachmentSection'

const TYPE_LABELS = { login: 'Log Masuk', credit_card: 'Kad Kredit', note: 'Nota', file: 'Fail Sulit' }

const TYPE_FIELDS = {
  login: [
    { key: 'username', label: 'Username' },
    { key: 'password', label: 'Password', secret: true },
    { key: 'email', label: 'Email', type: 'email' },
    { key: 'url', label: 'URL Website' },
  ],
  credit_card: [
    { key: 'cardholder', label: 'Nama Pemegang Kad' },
    { key: 'number', label: 'Nombor Kad' },
    { key: 'expiry', label: 'Tarikh Tamat (MM/YY)' },
    { key: 'cvv', label: 'CVV', secret: true },
    { key: 'pin', label: 'PIN Kad', secret: true },
    { key: 'bank', label: 'Bank/Penerbit' },
  ],
  note: [
    { key: 'noteType', label: 'Jenis Nota (custom)' },
    { key: 'content', label: 'Kandungan Nota', textarea: true },
  ],
  file: [],
}

export function ItemDialog({ open, onOpenChange, item, onSaved }) {
  const [type, setType] = useState('login')
  const [title, setTitle] = useState('')
  const [fields, setFields] = useState({})
  const [favorite, setFavorite] = useState(false)
  const [revealed, setRevealed] = useState({})
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!open) return
    setError(null)
    setRevealed({})
    if (item) {
      setType(item.type)
      setTitle(item.title)
      setFields({ ...item.fields })
      setFavorite(item.favorite)
    } else {
      setType('login')
      setTitle('')
      setFields({})
      setFavorite(false)
    }
  }, [open, item])

  const setField = (key, value) => setFields((prev) => ({ ...prev, [key]: value }))

  const handleSave = async () => {
    setSaving(true)
    setError(null)
    try {
      await api.saveItem({ ...(item ? { id: item.id } : {}), type, title, fields, favorite })
      onSaved()
      onOpenChange(false)
    } catch (e) {
      setError(e.message)
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!item) return
    await api.deleteItem(item.id)
    onSaved()
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onClose={() => onOpenChange(false)}>
      <h2 className="mb-1 text-lg font-semibold">{item ? 'Edit Item' : 'Item Baharu'}</h2>
      <p className="mb-4 text-sm text-muted-foreground">Simpan maklumat sulit anda dalam vault.</p>

      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>Jenis</Label>
            <Select
              value={type}
              disabled={!!item}
              onChange={(v) => { setType(v); setFields({}) }}
              options={Object.entries(TYPE_LABELS).map(([value, label]) => ({ value, label }))}
            />
          </div>
          <div>
            <Label>Tajuk</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="cth. Gmail Peribadi" />
          </div>
        </div>

        {TYPE_FIELDS[type].map((f) => {
          const isSecret = !!f.secret
          const shown = !isSecret || revealed[f.key]
          return (
            <div key={f.key}>
              <Label>{f.label}</Label>
              {f.textarea ? (
                <Textarea rows={6} value={fields[f.key] ?? ''} onChange={(e) => setField(f.key, e.target.value)} />
              ) : (
                <div className="relative">
                  <Input
                    type={shown ? (isSecret ? 'text' : f.type) : 'password'}
                    value={fields[f.key] ?? ''}
                    onChange={(e) => setField(f.key, e.target.value)}
                    className={isSecret ? 'pr-10 font-mono' : ''}
                  />
                  {isSecret && (
                    <button
                      type="button"
                      aria-label="Tunjuk/sorok"
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground"
                      onClick={() => setRevealed((prev) => ({ ...prev, [f.key]: !prev[f.key] }))}
                    >
                      {revealed[f.key] ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  )}
                </div>
              )}
            </div>
          )
        })}

        <div className="flex items-center justify-between rounded-md border border-border px-3 py-2">
          <span className="text-sm">Kegemari</span>
          <Switch checked={favorite} onChange={setFavorite} />
        </div>

        {item && (
          <div>
            <Label>Lampiran (gambar, video, dokumen)</Label>
            <AttachmentSection itemId={item.id} />
          </div>
        )}
        {!item && type === 'file' && (
          <p className="text-xs text-muted-foreground">Simpan item dahulu, kemudian muat naik fail sulit sebagai lampiran.</p>
        )}

        {error && <p className="text-sm text-destructive">{error}</p>}
      </div>

      <div className="mt-4 flex justify-between gap-2">
        {item ? (
          <Button variant="destructive" onClick={() => void handleDelete()}>
            <Trash2 className="h-4 w-4" /> Padam
          </Button>
        ) : <span />}
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Batal</Button>
          <Button onClick={() => void handleSave()} disabled={saving}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Simpan
          </Button>
        </div>
      </div>
    </Dialog>
  )
}