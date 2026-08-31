import { NavLink, Outlet, useLocation } from 'react-router-dom'
import {
    LayoutDashboard, FileText, BarChart2, ZapOff,
    CheckSquare, MessageSquare, TrendingUp, GitCompare,
    Building2, Blocks, Settings, Menu, LogOut, Eye, EyeOff,
    Award, Search, Briefcase, Code, PenLine
} from 'lucide-react'
import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import LogoMark from './LogoMark'
import { useAuth } from '../context/AuthContext'
import { Button } from './ui/button'
import { ScrollArea } from './ui/scroll-area'
import { Separator } from './ui/separator'
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from './ui/tooltip'
import { Avatar, AvatarFallback } from './ui/avatar'
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from './ui/sheet'
import { FEATURE_FLAGS, type FeatureFlag } from '../config/features'

type NavItem = { to: string; label: string; Icon: typeof LayoutDashboard; flag?: FeatureFlag }
type NavSection = { section: string | null; items: NavItem[] }

const NAV_SECTIONS: NavSection[] = [
    {
        section: 'Overview',
        items: [
            { to: '/dashboard', label: 'Dashboard', Icon: LayoutDashboard },
        ],
    },
    {
        section: 'Resume',
        items: [
            { to: '/resume-analyzer', label: 'Resume Analyzer', Icon: FileText },
            { to: '/readiness-score', label: 'Readiness Score', Icon: BarChart2 },
            { to: '/resume-builder', label: 'Resume Builder', Icon: PenLine },
        ],
    },
    {
        section: 'Growth',
        items: [
            { to: '/skill-gap', label: 'Skill Gap', Icon: ZapOff },
            { to: '/improvement-plan', label: 'Improvement Plan', Icon: CheckSquare },
            { to: '/progress-tracking', label: 'Progress', Icon: TrendingUp },
            { to: '/industry-alignment', label: 'Industry', Icon: Building2 },
        ],
    },
    {
        section: 'Interview',
        items: [
            { to: '/interview-readiness', label: 'Interview Prep', Icon: MessageSquare },
            { to: '/company-prep', label: 'Company Prep', Icon: Briefcase, flag: 'COMPANY_PREP' },
            { to: '/coding-practice', label: 'Coding', Icon: Code, flag: 'CODING_PRACTICE' },
            { to: '/jd-match', label: 'JD Match', Icon: Search, flag: 'JD_MATCHING' },
        ],
    },
    {
        section: 'More',
        items: [
            { to: '/my-projects', label: 'Projects', Icon: Blocks },
            { to: '/resume-comparison', label: 'Comparison', Icon: GitCompare, flag: 'RESUME_COMPARISON' },
            { to: '/certificate', label: 'Certificate', Icon: Award, flag: 'SHAREABLE_CERTIFICATE' },
        ],
    },
    {
        section: null,
        items: [
            { to: '/settings', label: 'Settings', Icon: Settings },
        ],
    },
]

function SidebarContent({ onNavClick }: { onNavClick?: () => void }) {
    const { user, logout } = useAuth()
    const [privacy, setPrivacy] = useState(() => localStorage.getItem('cse_privacy') === 'true')

    useEffect(() => { localStorage.setItem('cse_privacy', String(privacy)) }, [privacy])

    return (
        <div className="flex h-full flex-col">
            {/* Logo */}
            <div className="flex items-center gap-3 px-4 py-5">
                <LogoMark size={28} />
                <div>
                    <div className="text-sm font-semibold tracking-tight text-foreground">Jobyn</div>
                    <div className="text-xs font-medium uppercase tracking-widest text-cyan">AI</div>
                    <div className="text-[10px] text-muted-foreground/70 mt-0.5">Upload your resume. Get hired faster.</div>
                </div>
            </div>

            <Separator className="bg-border/50" />

            {/* Navigation */}
            <ScrollArea className="flex-1 px-2 py-3">
                <nav aria-label="Main navigation" className="flex flex-col gap-1">
                    {NAV_SECTIONS.map((group, gi) => {
                        const visibleItems = group.items.filter(({ flag }) => !flag || FEATURE_FLAGS[flag])
                        if (visibleItems.length === 0) return null
                        return (
                            <div key={group.section ?? `group-${gi}`} className={gi > 0 ? 'mt-3' : ''}>
                                {group.section && (
                                    <div className="px-3 pb-1 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60">
                                        {group.section}
                                    </div>
                                )}
                                <div className="flex flex-col gap-0.5">
                                    {visibleItems.map(({ to, label, Icon }) => (
                                        <NavLink
                                            key={to}
                                            to={to}
                                            onClick={onNavClick}
                                            className={({ isActive }) =>
                                                `group flex items-center gap-3 rounded-lg px-3 py-2 text-[13px] font-medium transition-all duration-150 ${
                                                    isActive
                                                        ? 'bg-accent/10 text-accent shadow-[inset_0_0_0_1px_rgba(79,70,229,0.12)]'
                                                        : 'text-muted-foreground hover:bg-black/[0.04] hover:text-foreground'
                                                }`
                                            }
                                        >
                                            <Icon className="h-4 w-4 shrink-0 opacity-70 group-hover:opacity-100" />
                                            {label}
                                        </NavLink>
                                    ))}
                                </div>
                            </div>
                        )
                    })}
                </nav>
            </ScrollArea>

            <Separator className="bg-border/50" />

            {/* Footer */}
            <div className="p-3 space-y-2">
                {/* Privacy toggle */}
                <Tooltip>
                    <TooltipTrigger
                        className="w-full"
                        render={
                            <Button
                                variant="ghost"
                                size="sm"
                                className="w-full justify-start gap-3 text-[13px] text-muted-foreground hover:text-foreground"
                                onClick={() => setPrivacy(p => !p)}
                            />
                        }
                    >
                        {privacy ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        {privacy ? 'Privacy On' : 'Privacy Off'}
                    </TooltipTrigger>
                    <TooltipContent side="right">Toggle on-device processing</TooltipContent>
                </Tooltip>

                {/* User info + logout */}
                {user && (
                    <div className="flex items-center gap-3 rounded-lg border border-slate-200/60 bg-slate-50 px-3 py-2">
                        <Avatar size="sm">
                            <AvatarFallback className="bg-accent/15 text-accent text-xs font-semibold">
                                {user.name?.[0]?.toUpperCase() || 'U'}
                            </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                            <div className="text-xs font-medium text-foreground truncate">{user.name}</div>
                            <div className="text-xs text-muted-foreground truncate">{user.email}</div>
                        </div>
                        <Tooltip>
                            <TooltipTrigger
                                render={
                                    <Button
                                        variant="ghost"
                                        size="icon-sm"
                                        className="text-muted-foreground hover:text-crimson"
                                        onClick={logout}
                                    />
                                }
                            >
                                <LogOut className="h-3.5 w-3.5" />
                            </TooltipTrigger>
                            <TooltipContent>Sign out</TooltipContent>
                        </Tooltip>
                    </div>
                )}
            </div>
        </div>
    )
}

export default function Layout() {
    const [mobileOpen, setMobileOpen] = useState(false)
    const location = useLocation()

    // Close mobile nav on route change
    useEffect(() => { setMobileOpen(false) }, [location.pathname])

    return (
        <TooltipProvider delay={200}>
            <a href="#main-content" className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-[100] focus:px-4 focus:py-2 focus:bg-primary focus:text-primary-foreground focus:rounded-md focus:outline-none">
                Skip to main content
            </a>
            <div className="flex min-h-screen bg-background">
                {/* Desktop Sidebar */}
                <aside className="hidden lg:flex lg:w-[240px] lg:shrink-0 lg:flex-col lg:fixed lg:inset-y-0 lg:border-r lg:border-border/50 lg:bg-sidebar">
                    <SidebarContent />
                </aside>

                {/* Mobile Header + Sidebar */}
                <header role="banner" className="lg:hidden fixed top-0 left-0 right-0 z-50 flex items-center justify-between border-b border-border/50 bg-background/80 backdrop-blur-xl px-4 py-3">
                    <div className="flex items-center gap-3">
                        <LogoMark size={24} />
                        <span className="text-sm font-semibold tracking-tight">Jobyn</span>
                    </div>
                    <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
                        <SheetTrigger
                            render={<Button variant="ghost" size="icon-sm" />}
                        >
                            <Menu className="h-5 w-5" />
                        </SheetTrigger>
                        <SheetContent side="left" className="w-[260px] p-0 bg-sidebar border-r-border/50">
                            <SheetTitle className="sr-only">Navigation</SheetTitle>
                            <SidebarContent onNavClick={() => setMobileOpen(false)} />
                        </SheetContent>
                    </Sheet>
                </header>

                {/* Main Content */}
                <main id="main-content" tabIndex={-1} className="flex-1 min-w-0 lg:pl-[240px]">
                    <div className="pt-[57px] lg:pt-0">
                        <AnimatePresence mode="wait">
                            <motion.div
                                key={location.pathname}
                                initial={{ opacity: 0, y: 15, scale: 0.985 }}
                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                exit={{ opacity: 0, y: -10, scale: 0.99, transition: { duration: 0.15 } }}
                                transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
                                className="p-4 md:p-6 lg:p-8 max-w-[1200px] mx-auto"
                            >
                                <Outlet />
                            </motion.div>
                        </AnimatePresence>
                    </div>
                </main>
            </div>
        </TooltipProvider>
    )
}
