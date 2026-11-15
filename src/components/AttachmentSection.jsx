import { useEffect, useState } from 'react'
import { Download, Eye, File as FileIcon, Loader2, Trash2, UploadCloud, X } from 'lucide-react'
import { api, base64ToBlobUrl, fileToBase64 } from '../api'
import { Button } from '../ui'

const MAX_BYTES = 10 * 1024 * 1024

function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

export function AttachmentSection({ itemId }) {
  const [attachments, setAttachments] = useState([])
  const [uploading, setUploading] = useState(false)
  const [message, setMessage] = useState(null)
  const [preview, setPreview] = useState(null)

  const refresh = async () => {
    const res = await api.listAttachments(itemId)
    setAttachments(res.attachments)
  }

  useEffect(() => {
    void refresh()
  }, [itemId])

  const handleUpload = async (file) => {
    if (file.size > MAX_BYTES) {
      setMessage('Fail melebihi had 10MB (versi standalone).')
      return
    }
    setUploading(true)
    setMessage(null)
    try {
      const base64Data = await fileToBase64(file)
      await api.uploadAttachment({ itemId, name: file.name, mime: file.type || 'application/octet-stream', base64Data })
      await refresh()
      setMessage('Fail berjaya dimuat naik.')
    } catch (e) {
      setMessage(e.message)
    } finally {
      setUploading(false)
    }
  }

  const handlePreview = async (att) => {
    setMessage(null)
    try {
      const res = await api.attachmentContent(att.id)
      setPreview({ name: att.name, mime: att.mime, url: base64ToBlobUrl(res.base64Data, att.mime) })
    } catch (e) {
      setMessage(e.message)
    }
  }

  const handleDownload = async (att) => {
    try {
      const res = await api.attachmentContent(att.id)
      const url = base64ToBlobUrl(res.base64Data, att.mime)
      const a = document.createElement('a')
      a.href = url
      a.download = att.name
      a.click()
      URL.revokeObjectURL(url)
    } catch (e) {
      setMessage(e.message)
    }
  }

  return (
    <div className="space-y-3">
      <label className="flex cursor-pointer items-center justify-center gap-2 rounded-md border border-dashed border-border px-4 py-6 text-sm text-muted-foreground transition-colors hover:bg-accent">
        {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <UploadCloud className="h-4 w-4" />}
        {uploading ? 'Sedang memuat naik...' : 'Klik untuk muat naik fail (sehingga 10MB)'}
        <input
          type="file"
          className="hidden"
          disabled={uploading}
          onChange={(e) => {
            const f = e.target.files?.[0]
            if (f) void handleUpload(f)
            e.target.value = ''
          }}
        />
      </label>
      {message && <p className="text-xs text-muted-foreground">{message}</p>}
      <ul className="space-y-2">
        {attachments.map((att) => (
          <li key={att.id} className="flex items-center gap-2 rounded-md border border-border px-3 py-2 text-sm">
            <FileIcon className="h-4 w-4 shrink-0 text-muted-foreground" />
            <span className="min-w-0 flex-1 truncate">{att.name}</span>
            <span className="shrink-0 text-xs text-muted-foreground">{formatBytes(att.size_bytes)}</span>
            <Button variant="ghost" size="icon" aria-label="Buka" onClick={() => void handlePreview(att)}>
              <Eye className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" aria-label="Muat turun" onClick={() => void handleDownload(att)}>
              <Download className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              aria-label="Padam"
              onClick={async () => { await api.deleteAttachment(att.id); await refresh() }}
            >
              <Trash2 className="h-4 w-4 text-destructive" />
            </Button>
          </li>
        ))}
      </ul>
      {preview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={() => setPreview(null)}>
          <div className="max-h-[90vh] w-full max-w-3xl overflow-auto rounded-lg border border-border bg-card p-4" onClick={(e) => e.stopPropagation()}>
            <div className="mb-3 flex items-center justify-between">
              <p className="truncate text-sm font-medium">{preview.name}</p>
              <Button variant="ghost" size="icon" aria-label="Tutup" onClick={() => setPreview(null)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
            {preview.mime.startsWith('image/') ? (
              <img src={preview.url} alt={preview.name} className="mx-auto max-h-[70vh]" />
            ) : preview.mime.startsWith('video/') ? (
              <video src={preview.url} controls className="mx-auto max-h-[70vh]" />
            ) : (
              <p className="text-sm text-muted-foreground">Pratonton tidak tersedia. Guna butang muat turun.</p>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
