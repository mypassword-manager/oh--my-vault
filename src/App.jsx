import { Routes, Route, Navigate } from 'react-router-dom'
import Lock from './pages/Lock'
import Vault from './pages/Vault'
import CodeVault from './pages/CodeVault'

export default function App() {
  return (
    <div className="h-full bg-background text-foreground">
      <Routes>
        <Route path="/" element={<Lock />} />
        <Route path="/lock" element={<Lock />} />
        <Route path="/vault" element={<Vault />} />
        <Route path="/code" element={<CodeVault />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </div>
  )
}
