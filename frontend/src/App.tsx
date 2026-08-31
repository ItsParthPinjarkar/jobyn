import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { HelmetProvider } from 'react-helmet-async'
import { AuthProvider, useAuth } from './context/AuthContext'
import { ResumeProvider } from './context/ResumeContext'
import { ToastProvider } from './context/ToastContext'
import { PrivacyProvider } from './context/PrivacyContext'
import Layout from './components/Layout'
import AdminLayout from './components/AdminLayout'
import ErrorBoundary from './components/ErrorBoundary'
import React, { Suspense, lazy, useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import LogoMark from './components/LogoMark'
import { FEATURE_FLAGS } from './config/features'
import { Lock } from 'lucide-react'

// ── Lazy-loaded pages (each becomes its own chunk) ──────────────
const Landing = lazy(() => import('./pages/Landing'))
const Login = lazy(() => import('./pages/Login'))
const Signup = lazy(() => import('./pages/Signup'))
const Dashboard = lazy(() => import('./pages/Dashboard'))
const ResumeAnalyzer = lazy(() => import('./pages/ResumeAnalyzer'))
const ReadinessScore = lazy(() => import('./pages/ReadinessScore'))
const SkillGap = lazy(() => import('./pages/SkillGap'))
const ImprovementPlan = lazy(() => import('./pages/ImprovementPlan'))
const InterviewReadiness = lazy(() => import('./pages/InterviewReadiness'))
const ProgressTracking = lazy(() => import('./pages/ProgressTracking'))
const ResumeComparison = lazy(() => import('./pages/ResumeComparison'))
const IndustryAlignment = lazy(() => import('./pages/IndustryAlignment'))
const MyProjects = lazy(() => import('./pages/MyProjects'))
const AdminDashboard = lazy(() => import('./pages/AdminDashboard'))
const Settings = lazy(() => import('./pages/Settings'))
const NotFound = lazy(() => import('./pages/NotFound'))
const Privacy = lazy(() => import('./pages/Privacy'))
const Docs = lazy(() => import('./pages/Docs'))
const Terms = lazy(() => import('./pages/Terms'))
const Certificate = lazy(() => import('./pages/Certificate'))
const QuickScore = lazy(() => import('./pages/QuickScore'))
const JDMatch = lazy(() => import('./pages/JDMatch'))
const CompanyPrep = lazy(() => import('./pages/CompanyPrep'))
const CodingPractice = lazy(() => import('./pages/CodingPractice'))
const ResumeBuilder = lazy(() => import('./pages/ResumeBuilder'))
const Blog = lazy(() => import('./pages/Blog'))
const BlogPost = lazy(() => import('./pages/BlogPost'))
const Onboarding = lazy(() => import('./pages/Onboarding'))

/** Global page loading spinner for lazy chunks */
function PageLoader() {
    return (
        <div className="flex items-center justify-center min-h-[60vh]">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-border border-t-accent" />
        </div>
    )
}

/** Per-feature error boundary — isolates crashes to a single route */
function FeatureErrorBoundary({ children, featureName }: { children: React.ReactNode; featureName: string }) {
    return (
        <ErrorBoundary fallback={
            <div className="flex min-h-[60vh] flex-col items-center justify-center p-6 text-center">
                <div className="mb-4 flex size-12 items-center justify-center rounded-full bg-destructive/10">
                    <span className="text-2xl">!</span>
                </div>
                <h2 className="font-heading text-lg font-bold">{featureName} encountered an error</h2>
                <p className="mt-1 text-sm text-muted-foreground">Your data is safe. Try refreshing.</p>
                <button
                    onClick={() => window.location.reload()}
                    className="mt-4 rounded-lg bg-primary px-4 py-2 text-sm text-primary-foreground"
                >
                    Reload Page
                </button>
            </div>
        }>
            {children}
        </ErrorBoundary>
    )
}

/** Guard: redirect unauthenticated users to login; redirect first-time users to onboarding */
function RequireAuth({ children }: { children: React.ReactNode }) {
    const { user, loading } = useAuth()
    const location = useLocation()
    if (loading) return <PageLoader />
    if (!user) return <Navigate to="/login" replace />

    // Redirect first-time users to onboarding (unless they're already there or on settings/admin)
    const skipOnboardingCheck = location.pathname === '/onboarding' || location.pathname === '/settings' || location.pathname === '/admin'
    if (!skipOnboardingCheck) {
        const onboardingDone = localStorage.getItem(`${user.email}_cse_onboarding_done`)
        if (!onboardingDone) return <Navigate to="/onboarding" replace />
    }

    return <>{children}</>
}

/** Guard: redirect non-admin users to dashboard */
function RequireAdmin({ children }: { children: React.ReactNode }) {
    const { user, loading } = useAuth()
    if (loading) return <PageLoader />
    if (!user?.isAdmin) return <Navigate to="/dashboard" replace />
    return <>{children}</>
}

/** Guard: redirect authenticated users to dashboard */
function GuestOnly({ children }: { children: React.ReactNode }) {
    const { user, loading } = useAuth()
    if (loading) return <PageLoader />
    if (user) return <Navigate to="/dashboard" replace />
    return <>{children}</>
}

function ComingSoon({ feature }: { feature: string }) {
    return (
        <div className="flex items-center justify-center min-h-[60vh]">
            <div className="text-center">
                <Lock className="size-12 mx-auto mb-4 text-muted-foreground" />
                <h2 className="font-heading text-xl font-bold mb-2">{feature}</h2>
                <p className="text-sm text-muted-foreground">This feature is being enhanced with real data. Coming soon.</p>
            </div>
        </div>
    )
}

function AppRoutes() {
    const location = useLocation()
    return (
        <Suspense fallback={<PageLoader />}>
            <AnimatePresence mode="wait">
                <Routes location={location} key={location.pathname}>
                    {/* Public */}
                    <Route path="/" element={<Landing />} />
                    <Route path="/login" element={<GuestOnly><Login /></GuestOnly>} />
                    <Route path="/signup" element={<GuestOnly><Signup /></GuestOnly>} />
                    <Route path="/privacy" element={<Privacy />} />
                    <Route path="/terms" element={<Terms />} />
                    <Route path="/docs" element={<Docs />} />
                    <Route path="/quick-score" element={<QuickScore />} />
                    <Route path="/blog" element={<Blog />} />
                    <Route path="/blog/:slug" element={<BlogPost />} />

                    {/* Authenticated — no Layout (onboarding) */}
                    <Route path="/onboarding" element={<RequireAuth><Onboarding /></RequireAuth>} />

                    {/* Authenticated — wrapped in Layout */}
                    <Route element={<RequireAuth><Layout /></RequireAuth>}>
                        <Route path="/dashboard" element={<FeatureErrorBoundary featureName="Dashboard"><Dashboard /></FeatureErrorBoundary>} />
                        <Route path="/resume-analyzer" element={<FeatureErrorBoundary featureName="Resume Analyzer"><ResumeAnalyzer /></FeatureErrorBoundary>} />
                        <Route path="/readiness-score" element={<FeatureErrorBoundary featureName="Readiness Score"><ReadinessScore /></FeatureErrorBoundary>} />
                        <Route path="/skill-gap" element={<FeatureErrorBoundary featureName="Skill Gap"><SkillGap /></FeatureErrorBoundary>} />
                        <Route path="/improvement-plan" element={<FeatureErrorBoundary featureName="Improvement Plan"><ImprovementPlan /></FeatureErrorBoundary>} />
                        <Route path="/interview-readiness" element={<FeatureErrorBoundary featureName="Interview Readiness"><InterviewReadiness /></FeatureErrorBoundary>} />
                        <Route path="/progress-tracking" element={<FeatureErrorBoundary featureName="Progress Tracking"><ProgressTracking /></FeatureErrorBoundary>} />
                        <Route path="/resume-comparison" element={<FeatureErrorBoundary featureName="Resume Comparison">{FEATURE_FLAGS.RESUME_COMPARISON ? <ResumeComparison /> : <ComingSoon feature="Resume Comparison" />}</FeatureErrorBoundary>} />
                        <Route path="/resume-builder" element={<FeatureErrorBoundary featureName="Resume Builder"><ResumeBuilder /></FeatureErrorBoundary>} />
                        <Route path="/industry-alignment" element={<FeatureErrorBoundary featureName="Industry Alignment"><IndustryAlignment /></FeatureErrorBoundary>} />
                        <Route path="/my-projects" element={<FeatureErrorBoundary featureName="My Projects"><MyProjects /></FeatureErrorBoundary>} />
                        <Route path="/settings" element={<FeatureErrorBoundary featureName="Settings"><Settings /></FeatureErrorBoundary>} />
                        <Route path="/certificate" element={<FeatureErrorBoundary featureName="Certificate">{FEATURE_FLAGS.SHAREABLE_CERTIFICATE ? <Certificate /> : <ComingSoon feature="Certificate" />}</FeatureErrorBoundary>} />
                        <Route path="/jd-match" element={<FeatureErrorBoundary featureName="JD Match">{FEATURE_FLAGS.JD_MATCHING ? <JDMatch /> : <ComingSoon feature="JD Matching" />}</FeatureErrorBoundary>} />
                        <Route path="/company-prep" element={<FeatureErrorBoundary featureName="Company Prep">{FEATURE_FLAGS.COMPANY_PREP ? <CompanyPrep /> : <ComingSoon feature="Company Prep" />}</FeatureErrorBoundary>} />
                        <Route path="/coding-practice" element={<FeatureErrorBoundary featureName="Coding Practice">{FEATURE_FLAGS.CODING_PRACTICE ? <CodingPractice /> : <ComingSoon feature="Coding Practice" />}</FeatureErrorBoundary>} />
                    </Route>

                    {/* Admin — fully separate shell, guarded by auth + admin role */}
                    <Route element={<RequireAuth><RequireAdmin><AdminLayout /></RequireAdmin></RequireAuth>}>
                        <Route path="/admin" element={<FeatureErrorBoundary featureName="Admin Dashboard"><AdminDashboard /></FeatureErrorBoundary>} />
                    </Route>

                    {/* 404 */}
                    <Route path="*" element={<NotFound />} />
                </Routes>
            </AnimatePresence>
        </Suspense>
    )
}

export default function App() {
    const [appLoading, setAppLoading] = useState(() => {
        // Skip splash if user has visited before
        return !sessionStorage.getItem('cs_splash_seen')
    })
    const [statusMessage, setStatusMessage] = useState('Initializing Jobyn OS...')
    const [loadStep, setLoadStep] = useState(0)

    useEffect(() => {
        if (!appLoading) return
        sessionStorage.setItem('cs_splash_seen', '1')

        const statusMsgs = [
            'Mapping Corporate Placement Bridges...',
            'Verifying Attic Code signatures...',
            'Readying Speech Arena console...'
        ]
        
        let msgIndex = 0
        const interval = setInterval(() => {
            if (msgIndex < statusMsgs.length) {
                setStatusMessage(statusMsgs[msgIndex])
                msgIndex++
            }
        }, 550)

        // Step 0 -> 1: Pulsing & unsealing the seal
        const t1 = setTimeout(() => setLoadStep(1), 1000)
        // Step 1 -> 2: Flap swings open
        const t2 = setTimeout(() => setLoadStep(2), 1700)
        // Step 2 -> 3: Paper slides up
        const t3 = setTimeout(() => setLoadStep(3), 2600)
        // Step 3 -> 4: Full page fade and interactive entry
        const t4 = setTimeout(() => {
            setLoadStep(4)
            setAppLoading(false)
            clearInterval(interval)
        }, 3600)

        return () => {
            clearInterval(interval)
            clearTimeout(t1)
            clearTimeout(t2)
            clearTimeout(t3)
            clearTimeout(t4)
        }
    }, [])

    return (
        <ErrorBoundary>
            <BrowserRouter>
                <HelmetProvider>
                    <AuthProvider>
                    <PrivacyProvider>
                        <ResumeProvider>
                            <ToastProvider>
                                <div className="relative">
                                    <AppRoutes />

                                    <AnimatePresence>
                                        {appLoading && (
                                            <motion.div
                                                key="global-loader"
                                                initial={{ opacity: 1 }}
                                                exit={{
                                                    opacity: 0,
                                                    transition: { duration: 0.6 }
                                                }}
                                                className="fixed inset-0 z-[9999] overflow-hidden flex flex-col items-center justify-center bg-[#FAF8F5] select-none"
                                            >
                                                {/* 3D Envelope Wrapper */}
                                                <div className="relative flex flex-col items-center" style={{ perspective: "1200px" }}>
                                                    
                                                    {/* The Envelope Body */}
                                                    <motion.div
                                                        initial={{ scale: 0.92, y: 30, opacity: 0 }}
                                                        animate={{ scale: 1, y: 0, opacity: 1 }}
                                                        transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
                                                        className="relative w-[380px] h-[240px] bg-[#E2DCD3] rounded-b-2xl shadow-2xl border border-stone-300/40 z-20 flex items-end justify-center overflow-visible"
                                                    >
                                                        {/* Front pocket flaps of the envelope (Left, Right, Bottom) */}
                                                        <div className="absolute inset-0 bg-gradient-to-tr from-[#D6CFC5] to-transparent rounded-bl-2xl z-30 pointer-events-none" style={{ clipPath: "polygon(0 0, 0 100%, 50% 50%)" }} />
                                                        <div className="absolute inset-0 bg-gradient-to-tl from-[#D6CFC5] to-transparent rounded-br-2xl z-30 pointer-events-none" style={{ clipPath: "polygon(100% 0, 100% 100%, 50% 50%)" }} />
                                                        <div className="absolute inset-0 bg-[#E8E2D9] rounded-b-2xl border-t border-stone-200/50 z-30 pointer-events-none" style={{ clipPath: "polygon(0 100%, 100% 100%, 50% 50%)" }} />

                                                        {/* The Paper inside the envelope */}
                                                        <motion.div
                                                            animate={{
                                                                y: loadStep >= 3 ? -180 : 0,
                                                                scale: loadStep >= 3 ? 1.05 : 0.95,
                                                                zIndex: loadStep >= 3 ? 40 : 10,
                                                                opacity: loadStep >= 3 ? 1 : 0,
                                                            }}
                                                            transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
                                                            className="absolute bottom-4 w-[340px] h-[190px] bg-white rounded-xl shadow-md border border-stone-200/60 p-5 flex flex-col items-center justify-center space-y-3 origin-bottom"
                                                        >
                                                            {/* Miniature Jobyn Page Header Mock */}
                                                            <div className="flex items-center gap-2">
                                                                <LogoMark size={24} />
                                                                <span className="font-heading text-xs font-bold text-foreground tracking-tight">Jobyn</span>
                                                            </div>
                                                            <div className="w-16 h-1 bg-primary/20 rounded-full animate-pulse" />
                                                            <div className="text-center space-y-1">
                                                                <div className="text-[8px] font-bold text-muted-foreground uppercase tracking-widest">{statusMessage}</div>
                                                                <div className="text-[7px] text-stone-400 font-semibold uppercase tracking-wider">Connected Placement OS</div>
                                                            </div>
                                                        </motion.div>

                                                        {/* Top Triangular Flap */}
                                                        <motion.div
                                                            style={{
                                                                transformOrigin: "top",
                                                                clipPath: "polygon(0 0, 100% 0, 50% 100%)",
                                                            }}
                                                            animate={{
                                                                rotateX: loadStep >= 2 ? 180 : 0,
                                                                zIndex: loadStep >= 2 ? 10 : 35,
                                                            }}
                                                            transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
                                                            className="absolute top-0 left-0 right-0 h-[125px] bg-[#D4CDBF] border-b border-stone-300/20 shadow-inner"
                                                        />

                                                        {/* The Wax Seal Logo (Pulsing and keeping it closed) */}
                                                        <motion.div
                                                            animate={{
                                                                y: loadStep >= 2 ? -100 : 0,
                                                                opacity: loadStep >= 2 ? 0 : 1,
                                                                scale: loadStep === 1 ? 1.15 : 1,
                                                            }}
                                                            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
                                                            className="absolute top-[80px] z-50 pointer-events-none"
                                                        >
                                                            <motion.div
                                                                animate={{ scale: loadStep === 0 ? [0.95, 1.05, 0.95] : 1 }}
                                                                transition={{ repeat: Infinity, duration: 1.8, ease: "easeInOut" }}
                                                                className="flex items-center justify-center p-3 bg-white rounded-full shadow-lg border-2 border-primary/20 relative"
                                                            >
                                                                <LogoMark size={32} />
                                                                <div className="absolute inset-0 size-full rounded-full border border-dashed border-primary/25 animate-spin [animation-duration:9s]" />
                                                            </motion.div>
                                                        </motion.div>
                                                    </motion.div>

                                                    {/* Background text indicator */}
                                                    <motion.div
                                                        animate={{ opacity: loadStep >= 3 ? 0 : 1 }}
                                                        className="text-center mt-12 space-y-1.5"
                                                    >
                                                        <h4 className="font-heading text-stone-500 text-sm font-semibold tracking-wide">Jobyn OS</h4>
                                                        <p className="font-mono text-[10px] uppercase tracking-wider text-stone-400 animate-pulse">UNSEALING PLACEMENT CREDENTIALS...</p>
                                                    </motion.div>
                                                </div>
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </div>
                            </ToastProvider>
                        </ResumeProvider>
                    </PrivacyProvider>
                </AuthProvider>
                </HelmetProvider>
            </BrowserRouter>
        </ErrorBoundary>
    )
}
