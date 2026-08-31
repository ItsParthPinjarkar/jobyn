import { useState, FormEvent } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useAuth } from '../context/AuthContext'
import LogoMark from '../components/LogoMark'
import { isValidEmail, isValidPassword } from '../utils/sanitize'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { AlertCircle, Loader2 } from 'lucide-react'

export default function Login() {
    const { login, loginWithGoogle } = useAuth()
    const navigate = useNavigate()

    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault()
        if (!email || !password) {
            setError('Please fill all fields.')
            return
        }
        if (!isValidEmail(email)) {
            setError('Please enter a valid email address.')
            return
        }
        const pwCheck = isValidPassword(password)
        if (!pwCheck.valid) {
            setError(pwCheck.message)
            return
        }
        setLoading(true)
        setError('')
        try {
            await login(email.trim(), password)
            setTimeout(() => navigate('/dashboard'), 300)
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : 'Invalid credentials. Please try again.')
        } finally {
            setLoading(false)
        }
    }

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, transition: { duration: 0.15 } }}
            transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
            className="relative flex min-h-dvh items-center justify-center overflow-hidden bg-background p-4"
        >
            {/* Gradient mesh background */}
            <div className="pointer-events-none absolute inset-0" aria-hidden="true">
                <div className="absolute -top-1/4 -left-1/4 h-[600px] w-[600px] rounded-full bg-primary/5 blur-[120px]" />
                <div className="absolute -right-1/4 -bottom-1/4 h-[500px] w-[500px] rounded-full bg-violet/5 blur-[120px]" />
            </div>

            <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                className="relative w-full max-w-sm"
            >
                <Card className="premium-hover-card border-border/50 shadow-lg">
                    <CardHeader className="flex flex-col items-center gap-2 pt-6 pb-2 text-center">
                        <LogoMark size={56} className="transition-transform duration-300 hover:scale-105" />
                        <div className="space-y-0.5">
                            <div className="font-heading text-2xl font-bold tracking-tight text-foreground">Jobyn</div>
                            <div className="text-xs font-semibold uppercase tracking-widest text-primary">AI</div>
                        </div>
                    </CardHeader>

                    <CardContent className="space-y-5">
                        <div className="text-center">
                            <h1 className="font-heading text-xl font-bold tracking-tight">Welcome back</h1>
                            <p className="mt-1 text-sm text-muted-foreground">Sign in to your Career Intelligence dashboard</p>
                        </div>

                        {error && (
                            <motion.div
                                initial={{ opacity: 0, y: -4 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive"
                            >
                                <AlertCircle className="mt-0.5 size-4 shrink-0" />
                                <span>{error}</span>
                            </motion.div>
                        )}

                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div className="space-y-1.5">
                                <Label htmlFor="login-email" className="text-xs font-medium">Email address</Label>
                                <Input
                                    id="login-email"
                                    type="email"
                                    placeholder="you@college.edu"
                                    value={email}
                                    onChange={e => setEmail(e.target.value)}
                                    autoComplete="email"
                                    className="h-9"
                                />
                            </div>
                            <div className="space-y-1.5">
                                <Label htmlFor="login-password" className="text-xs font-medium">Password</Label>
                                <Input
                                    id="login-password"
                                    type="password"
                                    placeholder="••••••••"
                                    value={password}
                                    onChange={e => setPassword(e.target.value)}
                                    autoComplete="current-password"
                                    className="h-9"
                                />
                            </div>
                            <Button type="submit" className="w-full h-9" disabled={loading}>
                                {loading ? (
                                    <>
                                        <Loader2 className="size-4 animate-spin" />
                                        Signing in...
                                    </>
                                ) : 'Sign In'}
                            </Button>
                        </form>

                        <div className="relative flex items-center gap-2">
                            <div className="flex-1 border-t border-border" />
                            <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">or</span>
                            <div className="flex-1 border-t border-border" />
                        </div>

                        <Button
                            type="button"
                            variant="outline"
                            className="w-full h-9 gap-2.5"
                            onClick={async () => {
                                try { await loginWithGoogle() }
                                catch (err) { setError(err instanceof Error ? err.message : 'Google sign-in failed.') }
                            }}
                        >
                            <svg width="14" height="14" viewBox="0 0 48 48">
                                <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
                                <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
                                <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
                                <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.18 1.48-4.97 2.35-8.16 2.35-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
                            </svg>
                            Continue with Google
                        </Button>

                        <div className="text-center text-sm text-muted-foreground">
                            Don't have an account?{' '}
                            <Link to="/signup" className="font-medium text-primary hover:underline">Sign up free</Link>
                        </div>

                        <div className="text-center">
                            <Link to="/" className="text-xs text-muted-foreground hover:text-foreground transition-colors">
                                ← Back to homepage
                            </Link>
                        </div>
                    </CardContent>
                </Card>
            </motion.div>
        </motion.div>
    )
}
