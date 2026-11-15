import { useEffect, useState } from 'react'
import { Loader2, Save } from 'lucide-react'
import { api } from '../api'
import { Button, Select } from '../ui'

const LANGUAGES = ['plaintext', 'javascript', 'typescript', 'python', 'java', 'go', 'rust', 'sql', 'html', 'css', 'json', 'yaml', 'shell', 'markdown']

export function FileEditor({ file, onSaved }) {
  const [content, setContent] = useState('')
  const [language, setLanguage] = useState('plaintext')
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [dirty, setDirty] = useState(false)
  const [message, setMessage] = useState(null)

  useEffect(() => {
    if (!file) {
      setContent('')
      return
    }
    setLoading(true)
    setMessage(null)
    void (async () => {
      try {
        const res = await api.getFile(file.id)
        setContent(res.file.content)
        setLanguage(res.file.language)
        setDirty(false)
      } catch (e) {
        setMessage(e.message)
      } finally {
        setLoading(false)
      }
    })()
  }, [file?.id])

  const handleSave = async () => {
    if (!file) return
    setSaving(true)
    setMessage(null)
    try {
      await api.saveFile(file.id, { content, language })
      setDirty(false)
      setMessage('Disimpan.')
      onSaved()
    } catch (e) {
      setMessage(e.message)
    } finally {
      setSaving(false)
    }
  }

  if (!file) {
    return (
      <div className="flex h-full items-center justify-center rounded-lg border border-dashed border-border p-10 text-sm text-muted-foreground">
        Pilih atau buka fail untuk edit. Cuba {'`open <nama>`'} dalam terminal.
      </div>
    )
  }

  return (
    <div className="flex h-full flex-col gap-2">
      <div className="flex items-center gap-2">
        <span className="min-w-0 flex-1 truncate font-mono text-sm">{file.name}{dirty ? ' *' : ''}</span>
        <Select
          className="w-36"
          value={language}
          onChange={(v) => { setLanguage(v); setDirty(true) }}
          options={LANGUAGES.map((l) => ({ value: l, label: l }))}
        />
        <Button size="sm" onClick={() => void handleSave()} disabled={saving || loading}>
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Simpan
        </Button>
      </div>
      {loading ? (
        <div className="flex flex-1 items-center justify-center rounded-lg border border-border">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <textarea
          value={content}
          onChange={(e) => { setContent(e.target.value); setDirty(true) }}
          spellCheck={false}
          className="min-h-0 flex-1 resize-none rounded-lg border border-border bg-muted p-4 font-mono text-sm leading-relaxed outline-none focus:ring-1 ring-ring"
        />
      )}
      {message && <p className="text-xs text-muted-foreground">{message}</p>}
    </div>
  )
}
