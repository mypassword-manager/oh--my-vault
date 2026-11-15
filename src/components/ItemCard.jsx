import { CreditCard, File as FileIcon, Globe, KeyRound, NotebookPen, Star } from 'lucide-react'

export const TYPE_META = {
  login: { icon: KeyRound, label: 'Log Masuk', color: 'bg-indigo-500/10 text-indigo-500' },
  credit_card: { icon: CreditCard, label: 'Kad Kredit', color: 'bg-emerald-500/10 text-emerald-500' },
  note: { icon: NotebookPen, label: 'Nota', color: 'bg-amber-500/10 text-amber-500' },
  file: { icon: FileIcon, label: 'Fail Sulit', color: 'bg-sky-500/10 text-sky-500' },
}

function subtitleFor(item) {
  const f = item.fields ?? {}
  if (item.type === 'login') return f.username || f.email || f.url || ''
  if (item.type === 'credit_card') return f.cardholder ? `${f.cardholder} •••• ${(f.number || '').slice(-4)}` : ''
  if (item.type === 'note') return (f.content || '').slice(0, 80)
  return ''
}

export function ItemCard({ item, onEdit, onToggleFavorite }) {
  const meta = TYPE_META[item.type]
  const Icon = meta.icon
  return (
    <button
      type="button"
      onClick={() => onEdit(item)}
      className="group flex w-full flex-col gap-2 rounded-lg border border-border bg-card p-4 text-left text-card-foreground transition-colors hover:bg-accent"
    >
      <div className="flex items-center gap-3">
        <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-md ${meta.color}`}>
          <Icon className="h-4 w-4" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium">{item.title}</p>
          <p className="truncate text-xs text-muted-foreground">{subtitleFor(item) || meta.label}</p>
        </div>
        <span
          role="button"
          tabIndex={0}
          aria-label="Kegemari"
          className={`shrink-0 rounded p-1 transition-colors hover:bg-accent ${item.favorite ? 'text-amber-500' : 'text-muted-foreground/40'}`}
          onClick={(e) => { e.stopPropagation(); onToggleFavorite(item) }}
          onKeyDown={(e) => e.key === 'Enter' && onToggleFavorite(item)}
        >
          <Star className={`h-4 w-4 ${item.favorite ? 'fill-current' : ''}`} />
        </span>
      </div>
      {item.type === 'login' && item.fields?.url && (
        <span className="flex items-center gap-1 text-xs text-muted-foreground">
          <Globe className="h-3 w-3" />
          <span className="truncate">{item.fields.url}</span>
        </span>
      )}
      {item.type === 'credit_card' && item.fields?.expiry && (
        <span className="text-xs text-muted-foreground">Tamat: {item.fields.expiry}</span>
      )}
    </button>
  )
}
