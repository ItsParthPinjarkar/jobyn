import { useState, useEffect, useMemo } from 'react'
import { useResume } from '../context/ResumeContext'
import { useAuth } from '../context/AuthContext'
import { getHealth } from '../api/client'
import { getItem, setItem } from '../utils/storage'
import { loadHistory } from '../utils/history'
import {
  Settings as SettingsIcon, Save, CheckCircle, Trash2,
  Monitor, Shield, Cloud, Info, Bell,
  User, Download, HardDrive, Keyboard,
  Sliders, Database, Zap, FileText, Target,
  Wifi,
} from 'lucide-react'
import { motion } from 'framer-motion'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'

export default function Settings() {
  const { analysis, masteredSkills, completedTasks, dailyCommitment, setDailyCommitment, clear } = useResume()
  const { user } = useAuth()
  const [saved, setSaved] = useState(false)
  const [health, setHealth] = useState<{ status: string; model_version?: string; accuracy?: number; vocabulary_size?: number } | null>(null)
  const [healthLoading, setHealthLoading] = useState(true)
  const [notifications, setNotifications] = useState(() => getItem<string>('notifs') !== 'false')
  const [privacyMode, setPrivacyMode] = useState(() => getItem<string>('privacy') === 'true')
  const [lowDataMode, setLowDataMode] = useState(() => getItem<string>('low_data') === 'true')
  const [deleting, setDeleting] = useState(false)

  useEffect(() => { getHealth().then(h => setHealth(h)).catch(() => {}).finally(() => setHealthLoading(false)) }, [])

  const handleSave = () => {
    setItem('notifs', String(notifications))
    setItem('privacy', String(privacyMode))
    setItem('low_data', String(lowDataMode))
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const hist = loadHistory(user?.email)
  const profileStats = useMemo(() => ({
    analysisCount: hist.length,
    firstDate: hist.length > 0 ? hist[0].label : null,
  }), [hist])

  const storageStats = useMemo(() => {
    let totalBytes = 0
    const breakdown: { key: string; label: string; bytes: number }[] = []
    const checks = [
      { key: 'analysis', label: 'Resume Analysis', pattern: 'cse_analysis' },
      { key: 'history', label: 'Score History', pattern: 'cse_score_history' },
      { key: 'mastered', label: 'Mastered Skills', pattern: 'cse_mastered_skills' },
      { key: 'tasks', label: 'Completed Tasks', pattern: 'cse_completed_tasks' },
      { key: 'interview', label: 'Interview Log', pattern: 'cse_interview_log' },
      { key: 'cache', label: 'Study Cache', pattern: 'study_' },
    ]
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i)
      if (!k) continue
      const val = localStorage.getItem(k) || ''
      const bytes = new Blob([val]).size
      totalBytes += bytes
      for (const check of checks) {
        if (k.includes(check.pattern)) {
          const existing = breakdown.find(b => b.key === check.key)
          if (existing) existing.bytes += bytes
          else breakdown.push({ key: check.key, label: check.label, bytes })
        }
      }
    }
    return { totalBytes, breakdown: breakdown.sort((a, b) => b.bytes - a.bytes) }
  }, [])

  const formatBytes = (b: number) => b < 1024 ? `${b} B` : b < 1048576 ? `${(b / 1024).toFixed(1)} KB` : `${(b / 1048576).toFixed(1)} MB`

  const exportData = () => {
    const data: Record<string, unknown> = {}
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i)
      if (k && k.includes('cse_')) {
        try { data[k] = JSON.parse(localStorage.getItem(k) || 'null') }
        catch { data[k] = localStorage.getItem(k) }
      }
    }
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `jobyn-export-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  const shortcuts = [
    { keys: 'Ctrl + Enter', action: 'Submit interview answer' },
    { keys: 'Esc', action: 'Close study hub / modal' },
    { keys: '1-5 keys', action: 'Jump to section in study' },
    { keys: 'Arrow keys', action: 'Navigate study sections' },
  ]

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-xl bg-primary/10">
            <SettingsIcon className="size-5 text-primary" />
          </div>
          <div>
            <h1 className="font-heading text-2xl font-bold tracking-tight">Command Center</h1>
            <p className="text-sm text-muted-foreground">Profile, preferences, data, and system diagnostics</p>
          </div>
        </div>
        <Button onClick={handleSave} className={saved ? 'bg-green-600 hover:bg-green-700' : ''}>
          {saved ? <><CheckCircle className="mr-1.5 size-4" /> Saved</> : <><Save className="mr-1.5 size-4" /> Apply</>}
        </Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_1fr]">
        {/* LEFT COLUMN */}
        <div className="space-y-5">
          {/* Profile Intel */}
          <Card className="premium-hover-card">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-sm"><User className="size-3.5" /> Profile Intel</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="flex size-10 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">
                  {(user?.name ?? 'U')[0].toUpperCase()}
                </div>
                <div>
                  <p className="text-sm font-bold text-foreground">{user?.name ?? 'User'}</p>
                  <p className="text-xs text-muted-foreground">{user?.email ?? '-'}</p>
                </div>
              </div>
              <Separator />
              <div className="grid grid-cols-4 gap-3">
                {[
                  { icon: FileText, value: profileStats.analysisCount, label: 'Analyses' },
                  { icon: CheckCircle, value: masteredSkills.length, label: 'Mastered' },
                  { icon: Target, value: completedTasks?.length ?? 0, label: 'Tasks' },
                  { icon: Zap, value: analysis?.role?.split(' ')[0] ?? '-', label: 'Role' },
                ].map((s, i) => (
                  <div key={i} className="flex flex-col items-center gap-1 rounded-lg bg-muted/30 p-2.5 text-center">
                    <s.icon className="size-3.5 text-muted-foreground" />
                    <span className="text-sm font-bold text-foreground">{s.value}</span>
                    <span className="text-xs text-muted-foreground">{s.label}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Learning Commitment */}
          <Card className="premium-hover-card">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-sm"><Sliders className="size-3.5" /> Daily Learning Goal</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="mb-3 text-xs text-muted-foreground">Hours per day you can dedicate to skill building. Used by Improvement Plan to tailor your schedule.</p>
              <input type="range" min={1} max={6} step={0.5} value={dailyCommitment}
                onChange={e => setDailyCommitment(Number(e.target.value))}
                className="w-full accent-primary"
              />
              <div className="mt-1 flex justify-between text-xs text-muted-foreground">
                <span>1h</span>
                <span className="font-bold text-primary">{dailyCommitment}h / day</span>
                <span>6h</span>
              </div>
            </CardContent>
          </Card>

          {/* Preferences */}
          <Card className="premium-hover-card">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-sm"><Monitor className="size-3.5" /> Preferences</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label className="flex items-center gap-1.5 text-sm font-medium"><Bell className="size-3.5" /> Notifications</Label>
                  <p className="text-xs text-muted-foreground">Get alerts when analysis completes</p>
                </div>
                <Switch checked={notifications} onCheckedChange={setNotifications} />
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div>
                  <Label className="flex items-center gap-1.5 text-sm font-medium"><Shield className="size-3.5" /> Enhanced Privacy</Label>
                  <p className="text-xs text-muted-foreground">Anonymize resume data before cloud processing</p>
                </div>
                <Switch checked={privacyMode} onCheckedChange={setPrivacyMode} />
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div>
                  <Label className="flex items-center gap-1.5 text-sm font-medium"><Wifi className="size-3.5" /> Low Data Mode</Label>
                  <p className="text-xs text-muted-foreground">Reduce API calls and skip heavy animations for slower connections. ML predictions run on-device automatically.</p>
                </div>
                <Switch checked={lowDataMode} onCheckedChange={setLowDataMode} />
              </div>
            </CardContent>
          </Card>

          {/* Danger Zone */}
          <Card className="premium-hover-card border-destructive/20">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-sm text-destructive"><Trash2 className="size-3.5" /> Danger Zone</CardTitle>
            </CardHeader>
            <CardContent>
              {analysis && (
                <div className="mb-3 flex items-center gap-2 rounded-lg bg-muted/30 p-3 text-xs">
                  <Badge variant="outline" className="text-xs">Active Session</Badge>
                  <span className="font-mono text-foreground">{analysis.filename}</span>
                  <span className="text-muted-foreground">{analysis.role} · {analysis.final_score}%</span>
                </div>
              )}
              <Button variant="destructive" size="sm" onClick={clear} disabled={!analysis} className="gap-1.5">
                <Trash2 className="size-3.5" /> Clear All Data
              </Button>
              <Separator className="my-3" />
              <p className="text-xs text-muted-foreground mb-2">
                Permanently delete all your data from our servers (resumes, analyses, progress, contributions). This cannot be undone.
              </p>
              <Button
                variant="destructive"
                size="sm"
                disabled={deleting}
                onClick={async () => {
                  if (!confirm('Are you sure you want to delete ALL your data from our servers? This action cannot be undone.')) return
                  setDeleting(true)
                  try {
                    const API = import.meta.env.VITE_API_URL || 'http://localhost:8000'
                    const token = localStorage.getItem('sb-access-token') || ''
                    const res = await fetch(`${API}/user/data`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${token}` } })
                    if (res.ok) { clear(); alert('All your data has been deleted from our servers.') }
                    else { alert('Failed to delete data. Please try again.') }
                  } catch { alert('Network error. Please try again.') }
                  finally { setDeleting(false) }
                }}
                className="gap-1.5"
              >
                <Trash2 className="size-3.5" /> {deleting ? 'Deleting...' : 'Delete All My Data (GDPR)'}
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* RIGHT COLUMN */}
        <div className="space-y-5">
          {/* System Status */}
          <Card className="premium-hover-card">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-sm"><Cloud className="size-3.5" /> System Status</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-3">
                <div className="flex items-center justify-between rounded-lg bg-muted/30 p-3 text-xs">
                  <span className="text-muted-foreground">Backend</span>
                  {health ? (
                    <Badge variant="outline" className="gap-1 border-green-500/30 text-green-500"><span className="size-1.5 rounded-full bg-green-500 animate-pulse" /> Live</Badge>
                  ) : healthLoading ? (
                    <Badge variant="outline" className="text-muted-foreground">Checking…</Badge>
                  ) : (
                    <Badge variant="destructive">Offline</Badge>
                  )}
                </div>
                <div className="flex items-center justify-between rounded-lg bg-muted/30 p-3 text-xs">
                  <span className="text-muted-foreground">Model</span>
                  <span className="font-mono font-bold text-foreground">{health?.model_version ? `v${health.model_version}` : '-'}</span>
                </div>
                <div className="flex items-center justify-between rounded-lg bg-muted/30 p-3 text-xs">
                  <span className="text-muted-foreground">Accuracy</span>
                  <span className="font-bold text-primary">{health?.accuracy ? `${(health.accuracy * 100).toFixed(1)}%` : '-'}</span>
                </div>
                <div className="flex items-center justify-between rounded-lg bg-muted/30 p-3 text-xs">
                  <span className="text-muted-foreground">Vocabulary</span>
                  <span className="font-bold text-foreground">{health?.vocabulary_size?.toLocaleString() ?? '-'} terms</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Data Vault */}
          <Card className="premium-hover-card">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-sm"><HardDrive className="size-3.5" /> Data Vault</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-2 rounded-lg bg-muted/30 p-3 text-xs">
                <Database className="size-3.5 text-muted-foreground" />
                <span>Local Storage: <strong>{formatBytes(storageStats.totalBytes)}</strong></span>
              </div>
              {storageStats.breakdown.length > 0 && (
                <div className="space-y-2">
                  {storageStats.breakdown.map(b => (
                    <div key={b.key} className="flex items-center gap-3 text-xs">
                      <span className="w-24 shrink-0 text-muted-foreground">{b.label}</span>
                      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
                        <div className="h-full rounded-full bg-primary" style={{ width: `${Math.max(3, (b.bytes / Math.max(storageStats.totalBytes, 1)) * 100)}%` }} />
                      </div>
                      <span className="w-14 text-right font-mono text-foreground">{formatBytes(b.bytes)}</span>
                    </div>
                  ))}
                </div>
              )}
              <Button variant="ghost" size="sm" onClick={exportData} className="gap-1.5">
                <Download className="size-3.5" /> Export All Data
              </Button>
            </CardContent>
          </Card>

          {/* Keyboard Shortcuts */}
          <Card className="premium-hover-card">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-sm"><Keyboard className="size-3.5" /> Keyboard Shortcuts</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {shortcuts.map(s => (
                  <div key={s.keys} className="flex items-center justify-between text-xs">
                    <kbd className="rounded border bg-muted/50 px-2 py-0.5 font-mono text-[11px] text-foreground">{s.keys}</kbd>
                    <span className="text-muted-foreground">{s.action}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* About */}
          <Card className="premium-hover-card">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-sm"><Info className="size-3.5" /> About</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-xs">
              <p className="font-bold text-foreground">Jobyn - v2.0</p>
              <p className="leading-relaxed text-muted-foreground">Locally cached ONNX model for classification + Gemini 2.0 Flash for semantic reasoning. Built to help students bridge the gap between academic skills and industry expectations.</p>
              <p className="font-mono text-xs text-muted-foreground/60">FastAPI · React · Supabase · ONNX Runtime</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </motion.div>
  )
}
