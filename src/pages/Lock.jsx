import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Loader2, LockKeyhole, ShieldCheck } from 'lucide-react'
import { api, setToken } from '../api'
import {
  Button, Card, CardContent, CardDescription, CardHeader, CardTitle,
  Input, Label, PinInput, Tabs,
} from '../ui'

export default function Lock() {
  const navigate = useNavigate()
  const [mode, setMode] = useState('setup')
  const [checked, setChecked] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)

  // setup
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [phone, setPhone] = useState('')
  const [pin, setPin] = useState('')

  // unlock
  const [unlockPin, setUnlockPin] = useState('')
  const [unlockUser, setUnlockUser] = useState('')
  const [unlockPass, setUnlockPass] = useState('')

  useEffect(() => {
    void (async () => {
      try {
        const res = await api.getProfile()
        setMode(res.exists && !res.loggedIn ? 'unlock' : res.loggedIn ? 'unlock' : 'setup')
      } catch {
        setMode('setup')
      }
      setChecked(true)
    })()
  }, [])

  const enterVault = () => {
    sessionStorage.setItem('vault-unlocked', '1')
    navigate('/vault')
  }

  const handleSetup = async () => {
    setBusy(true)
    setError(null)
    try {
      const res = await api.setup({ username, password, phone, ...(pin ? { pin } : {}) })
      setToken(res.token)
      enterVault()
    } catch (e) {
      setError(e.message)
    } finally {
      setBusy(false)
    }
  }

  const handleUnlockPin = async (value) => {
    const code = value ?? unlockPin
    if (!/^\d{6}$/.test(code)) return
    setBusy(true)
    setError(null)
    try {
      const res = await api.unlock({ method: 'pin', pin: code })
      setToken(res.token)
      enterVault()
    } catch (e) {
      setError(e.message)
      setUnlockPin('')
    } finally {
      setBusy(false)
    }
  }

  const handleUnlockPassword = async () => {
    setBusy(true)
    setError(null)
    try {
      const res = await api.unlock({ method: 'password', username: unlockUser, password: unlockPass })
      setToken(res.token)
      enterVault()
    } catch (e) {
      setError(e.message)
    } finally {
      setBusy(false)
    }
  }

  if (!checked) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="w-full max-w-md space-y-6">
        <div className="flex flex-col items-center gap-2 text-center">
          <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
            <LockKeyhole className="h-7 w-7" />
          </span>
          <h1 className="text-2xl font-bold">MyVault</h1>
          <p className="text-sm text-muted-foreground">Vault peribadi untuk kata laluan, kad & fail sulit</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">{mode === 'setup' ? 'Wujudkan Vault Anda' : 'Buka Vault'}</CardTitle>
            <CardDescription>
              {mode === 'setup'
                ? 'Sediakan Username + Password, nombor telefon dan PIN 6 digit.'
                : 'Pilih kaedah buka: PIN 6 digit atau Username + Password.'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {mode === 'setup' ? (
              <div className="space-y-4">
                <div>
                  <Label>Username</Label>
                  <Input value={username} onChange={(e) => setUsername(e.target.value)} placeholder="cth. ahmad_vault" />
                </div>
                <div>
                  <Label>Password</Label>
                  <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Min. 6 aksara" />
                </div>
                <div>
                  <Label>Nombor Telefon</Label>
                  <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="cth. +60123456789" />
                </div>
                <div>
                  <Label>PIN 6 Digit (pilihan)</Label>
                  <PinInput value={pin} onChange={setPin} />
                </div>
                {error && <p className="text-sm text-destructive">{error}</p>}
                <Button className="w-full" onClick={() => void handleSetup()} disabled={busy}>
                  {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
                  Wujudkan Vault
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                <Tabs
                  className="w-full"
                  value={undefined}
                  tabs={[
                    { value: 'pin', label: 'PIN 6 Digit' },
                    { value: 'password', label: 'Username + Password' },
                  ]}
                  onChange={() => {}}
                />
                <div className="space-y-2">
                  <Label>PIN 6 Digit</Label>
                  <PinInput
                    value={unlockPin}
                    onChange={setUnlockPin}
                    onComplete={(v) => void handleUnlockPin(v)}
                  />
                </div>
                <div className="border-t border-border pt-4 space-y-2">
                  <Label>Username</Label>
                  <Input value={unlockUser} onChange={(e) => setUnlockUser(e.target.value)} />
                  <Label>Password</Label>
                  <Input
                    type="password"
                    value={unlockPass}
                    onChange={(e) => setUnlockPass(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && void handleUnlockPassword()}
                  />
                  <Button className="w-full" onClick={() => void handleUnlockPassword()} disabled={busy}>
                    Buka Vault
                  </Button>
                </div>
                {error && <p className="text-sm text-destructive">{error}</p>}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
