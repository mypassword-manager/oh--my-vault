import { useMemo, useState } from 'react'
import { ChevronDown, ChevronRight, Folder, FolderOpen } from 'lucide-react'

export function FolderTree({ folders, currentId, onSelect }) {
  const [expanded, setExpanded] = useState(new Set())

  const childrenOf = useMemo(() => {
    const map = new Map()
    for (const f of folders) {
      const key = f.parent_id ?? null
      const list = map.get(key) ?? []
      list.push(f)
      map.set(key, list)
    }
    for (const list of map.values()) list.sort((a, b) => a.name.localeCompare(b.name))
    return map
  }, [folders])

  const toggle = (id) =>
    setExpanded((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })

  const renderNode = (folder, depth) => {
    const children = childrenOf.get(folder.id) ?? []
    const isOpen = expanded.has(folder.id)
    return (
      <div key={folder.id}>
        <button
          type="button"
          onClick={() => onSelect(folder.id)}
          style={{ paddingLeft: `${depth * 14 + 8}px` }}
          className={`flex w-full items-center gap-1 rounded px-2 py-1 text-left text-sm transition-colors hover:bg-accent ${currentId === folder.id ? 'bg-accent font-medium' : ''}`}
        >
          <span
            role="button"
            tabIndex={-1}
            className="rounded p-0.5"
            onClick={(e) => { e.stopPropagation(); toggle(folder.id) }}
          >
            {children.length > 0 ? (isOpen ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />) : <span className="inline-block h-3.5 w-3.5" />}
          </span>
          {isOpen ? <FolderOpen className="h-4 w-4 text-emerald-500" /> : <Folder className="h-4 w-4 text-emerald-500" />}
          <span className="truncate">{folder.name}</span>
        </button>
        {isOpen && children.map((child) => renderNode(child, depth + 1))}
      </div>
    )
  }

  return (
    <div className="space-y-0.5">
      <button
        type="button"
        onClick={() => onSelect(null)}
        className={`flex w-full items-center gap-1 rounded px-2 py-1 text-left text-sm transition-colors hover:bg-accent ${currentId === null ? 'bg-accent font-medium' : ''}`}
      >
        <FolderOpen className="h-4 w-4 text-emerald-500" />
        <span>root</span>
      </button>
      {(childrenOf.get(null) ?? []).map((f) => renderNode(f, 1))}
    </div>
  )
}
