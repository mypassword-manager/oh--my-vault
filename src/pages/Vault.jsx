import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { FolderGit2, LockKeyhole, LogOut, Plus, Search } from 'lucide-react'
import { api } from '../api'
import { Button, Input, lockVault, Tabs } from '../ui'
import { ItemCard } from '../components/ItemCard'
import { ItemDialog } from '../components/ItemDialog'

const TYPE_LABELS = { login: 'Log Masuk', credit_card: 'Kad Kredit', note: 'Nota', file: 'Fail Sulit' }

export default function Vault() {
  const navigate = useNavigate()
  const [items, setItems] = useState([])
  const [category, setCategory] = useState('all')
  const [search, setSearch] = useState('')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState(null)

  const refresh = async () => {
    const res = await api.listItems()
    setItems(res.items)
  }

  useEffect(() => {
    if (!sessionStorage.getItem('vault-unlocked')) {
      navigate('/lock', { replace: true })
      return
    }
    void refresh()
  }, [navigate])

  const filtered = useMemo(() => {
    const s = search.trim().toLowerCase()
    return items.filter((it) => {
      if (category !== 'all' && it.type !== category) return false
      if (!s) return true
      return `${it.title} ${JSON.stringify(it.fields)}`.toLowerCase().includes(s)
    })
  }, [items, category, search])

  const counts = useMemo(() => {
    const c = { all: items.length, login: 0, credit_card: 0, note: 0, file: 0 }
    for (const it of items) c[it.type]++
    return c
  }, [items])

  const handleToggleFavorite = async (item) => {
    await api.saveItem({ id: item.id, type: item.type, title: item.title, fields: item.fields, favorite: !item.favorite })
    await refresh()
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-10 border-b border-border bg-background">
        <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-3">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <LockKeyhole className="h-5 w-5" />
          </span>
          <h1 className="mr-auto text-lg font-bold">MyVault</h1>
          <Button variant="outline" size="sm" onClick={() => navigate('/code')}>
            <FolderGit2 className="h-4 w-4" /> Code Vault
          </Button>
          <Button variant="ghost" size="icon" aria-label="Kunci vault" onClick={() => { lockVault(); navigate('/lock') }}>
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </header>

      <main className="mx-auto max-w-6xl space-y-4 px-4 py-6">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative min-w-[200px] flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Cari item..." className="pl-9" />
          </div>
          <Button onClick={() => { setEditing(null); setDialogOpen(true) }}>
            <Plus className="h-4 w-4" /> Item Baru
          </Button>
        </div>

        <Tabs
          value={category}
          onChange={setCategory}
          tabs={[
            { value: 'all', label: `Semua (${counts.all})` },
            ...Object.entries(TYPE_LABELS).map(([value, label]) => ({ value, label: `${label} (${counts[value]})` })),
          ]}
        />

        {filtered.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border p-12 text-center text-sm text-muted-foreground">
            Tiada item. Klik "Item Baru" untuk mula menyimpan.
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((item) => (
              <ItemCard
                key={item.id}
                item={item}
                onEdit={(it) => { setEditing(it); setDialogOpen(true) }}
                onToggleFavorite={handleToggleFavorite}
              />
            ))}
          </div>
        )}
      </main>

      <ItemDialog open={dialogOpen} onOpenChange={setDialogOpen} item={editing} onSaved={() => void refresh()} />
    </div>
  )
}
