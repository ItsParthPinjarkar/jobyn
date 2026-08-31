import { NavLink, Outlet, useLocation, useSearchParams } from 'react-router-dom'
import {
    Shield, LayoutGrid, Users, Database, Menu, LogOut, ArrowLeft, MessageSquareWarning,
} from 'lucide-react'
import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import LogoMark from './LogoMark'
import { useAuth } from '../context/AuthContext'
import { Button } from './ui/button'
import { ScrollArea } from './ui/scroll-area'
import { Separator } from './ui/separator'
import { Badge } from './ui/badge'
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from './ui/tooltip'
import { Avatar, AvatarFallback } from './ui/avatar'
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from './ui/sheet'

/**
 * Admin nav. Each item maps to a view inside AdminDashboard via the `?view=`
 * query param. `view: null` = the Command Center (default). Only views that
 * actually exist are listed here — no dead links.
 */
const ADMIN_NAV: { view: string | null; label: string; Icon: typeof Shield }[] = [
    { view: null, label: 'Command Center', Icon: LayoutGrid },
    { view: 'users', label: 'Student Directory', Icon: Users },
    { view: 'database', label: 'Dataset', Icon: Database },
    { view: 'feedback', label: 'Feedback Review', Icon: MessageSquareWarning },
]

function AdminSidebarContent({ onNavClick }: { onNavClick?: () => void }) {
    const { user, logout } = useAuth()
    const [searchParams] = useSearchParams()
    const currentView = searchParams.get('view')

    return (
        <div className="flex h-full flex-col">
            {/* Logo + Admin badge */}
            <div className="flex items-center gap-3 px-4 py-5">
                <LogoMark size={28} />
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold tracking-tight text-foreground">Jobyn</span>
                        <Badge variant="outline" className="gap-1 border-primary/40 text-primary text-[10px] px-1.5 py-0">
                            <Shield className="h-2.5 w-2.5" /> Admin
                        </Badge>
                    </div>
                    <div className="text-xs font-medium uppercase tracking-widest text-cyan">Control Plane</div>
                </div>
            </div>

            <Separator className="bg-border/50" />

            {/* Back to user app */}
            <div className="px-2 pt-3">
                <NavLink
                    to="/dashboard"
                    onClick={onNavClick}
                    className="group flex items-center gap-3 rounded-lg px-3 py-2 text-[13px] font-medium text-muted-foreground transition-all duration-150 hover:bg-black/[0.04] hover:text-foreground"
                >
                    <ArrowLeft className="h-4 w-4 shrink-0 opacity-70 group-hover:opacity-100" />
                    Back to App
                </NavLink>
            </div>

            <Separator className="my-2 bg-border/50" />

            {/* Admin navigation */}
            <ScrollArea className="flex-1 px-2 py-1">
                <div className="px-3 pb-1 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60">
                    Administration
                </div>
                <nav aria-label="Admin navigation" className="flex flex-col gap-0.5">
                    {ADMIN_NAV.map(({ view, label, Icon }) => {
                        const isActive = (currentView ?? null) === view
                        const to = view ? `/admin?view=${view}` : '/admin'
                        return (
                            <NavLink
                                key={label}
                                to={to}
                                onClick={onNavClick}
                                className={`group flex items-center gap-3 rounded-lg px-3 py-2 text-[13px] font-medium transition-all duration-150 ${
                                    isActive
                                        ? 'bg-accent/10 text-accent shadow-[inset_0_0_0_1px_rgba(79,70,229,0.12)]'
                                        : 'text-muted-foreground hover:bg-black/[0.04] hover:text-foreground'
                                }`}
                            >
                                <Icon className="h-4 w-4 shrink-0 opacity-70 group-hover:opacity-100" />
                                {label}
                            </NavLink>
                        )
                    })}
                </nav>
            </ScrollArea>

            <Separator className="bg-border/50" />

            {/* User info + logout */}
            {user && (
                <div className="p-3">
                    <div className="flex items-center gap-3 rounded-lg border border-slate-200/60 bg-slate-50 px-3 py-2">
                        <Avatar size="sm">
                            <AvatarFallback className="bg-primary/15 text-primary text-xs font-semibold">
                                {user.name?.[0]?.toUpperCase() || 'A'}
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
                </div>
            )}
        </div>
    )
}

export default function AdminLayout() {
    const [mobileOpen, setMobileOpen] = useState(false)
    const location = useLocation()

    // Close mobile nav on route / view change
    useEffect(() => { setMobileOpen(false) }, [location.pathname, location.search])

    return (
        <TooltipProvider delay={200}>
            <a href="#main-content" className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-[100] focus:px-4 focus:py-2 focus:bg-primary focus:text-primary-foreground focus:rounded-md focus:outline-none">
                Skip to main content
            </a>
            <div className="flex min-h-screen bg-background">
                {/* Desktop Sidebar */}
                <aside className="hidden lg:flex lg:w-[240px] lg:shrink-0 lg:flex-col lg:fixed lg:inset-y-0 lg:border-r lg:border-border/50 lg:bg-sidebar">
                    <AdminSidebarContent />
                </aside>

                {/* Mobile Header + Sidebar */}
                <header role="banner" className="lg:hidden fixed top-0 left-0 right-0 z-50 flex items-center justify-between border-b border-border/50 bg-background/80 backdrop-blur-xl px-4 py-3">
                    <div className="flex items-center gap-2">
                        <LogoMark size={24} />
                        <span className="text-sm font-semibold tracking-tight">Jobyn</span>
                        <Badge variant="outline" className="gap-1 border-primary/40 text-primary text-[10px] px-1.5 py-0">
                            <Shield className="h-2.5 w-2.5" /> Admin
                        </Badge>
                    </div>
                    <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
                        <SheetTrigger
                            render={<Button variant="ghost" size="icon-sm" />}
                        >
                            <Menu className="h-5 w-5" />
                        </SheetTrigger>
                        <SheetContent side="left" className="w-[260px] p-0 bg-sidebar border-r-border/50">
                            <SheetTitle className="sr-only">Admin navigation</SheetTitle>
                            <AdminSidebarContent onNavClick={() => setMobileOpen(false)} />
                        </SheetContent>
                    </Sheet>
                </header>

                {/* Main Content */}
                <main id="main-content" tabIndex={-1} className="flex-1 lg:pl-[240px]">
                    <div className="pt-[57px] lg:pt-0">
                        <AnimatePresence mode="wait">
                            <motion.div
                                key={location.pathname + location.search}
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
