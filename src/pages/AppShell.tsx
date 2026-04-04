import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { TopNav } from '@/components/layout/TopNav'
import { useAuth } from '@/hooks/useAuth'
import { cn } from '@/lib/utils/cn'

const pageVariants = {
  initial: { opacity: 0, y: 10 },
  enter: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -10 },
}

export function AppShell() {
  const { state } = useAuth()
  const location = useLocation()

  return (
    <div className="flex min-h-screen flex-col bg-mist-50 selection:bg-brand-200">
      <TopNav />
      <div className="flex flex-1 items-stretch overflow-hidden">
        <motion.aside
          className="hidden w-64 flex-col border-r border-mist-200 bg-white/80 px-4 py-8 backdrop-blur-xl md:flex"
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ type: 'spring', duration: 0.6, bounce: 0.1 }}
        >
          <div className="px-3 pb-3 text-xs font-semibold uppercase tracking-wider text-ink-800/50">
            Workspace
          </div>
          <nav className="space-y-1 text-sm font-medium">
            <SideLink to="/app" end>
              Builds
            </SideLink>
            <SideLink to="/app/catalog">Catalog</SideLink>
            <SideLink to="/app/chat">Chat</SideLink>
            {state.status === 'authenticated' && state.user.role === 'admin' ? (
              <>
                <div className="px-3 pb-3 pt-8 text-xs font-semibold uppercase tracking-wider text-ink-800/50">
                  Admin
                </div>
                <SideLink to="/app/admin/users">Users</SideLink>
              </>
            ) : null}
          </nav>
        </motion.aside>

        <main className="flex-1 overflow-y-auto pb-20 md:pb-0">
          <div className="mx-auto w-full max-w-[1600px] p-4 sm:p-6 md:p-10 lg:p-12">
            <AnimatePresence mode="wait">
              <motion.div
                key={location.pathname}
                variants={pageVariants}
                initial="initial"
                animate="enter"
                exit="exit"
                transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
              >
                <Outlet />
              </motion.div>
            </AnimatePresence>
          </div>
        </main>
      </div>

      {/* Mobile Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 flex items-center justify-around border-t border-mist-200 bg-white/80 px-2 pb-3 pt-2 backdrop-blur-xl md:hidden">
        <MobileNavButton to="/app" end icon={
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 002-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
          </svg>
        }>
          Builds
        </MobileNavButton>
        <MobileNavButton to="/app/catalog" icon={
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
          </svg>
        }>
          Catalog
        </MobileNavButton>
        <MobileNavButton to="/app/chat" icon={
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
        }>
          Chat
        </MobileNavButton>
        {state.status === 'authenticated' && state.user.role === 'admin' && (
          <MobileNavButton to="/app/admin/users" icon={
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
          }>
            Users
          </MobileNavButton>
        )}
      </nav>
    </div>
  )
}

function SideLink({ to, end, children }: { to: string; end?: boolean; children: React.ReactNode }) {
  return (
    <NavLink
      to={to}
      end={end}
      className={({ isActive }) =>
        cn(
          'flex rounded-xl px-3 py-2.5 text-ink-900 transition-all duration-200 hover:bg-mist-100/80',
          isActive && 'bg-mist-100 font-semibold text-brand-700 shadow-sm',
        )
      }
    >
      {children}
    </NavLink>
  )
}

function MobileNavButton({ to, end, icon, children }: { to: string; end?: boolean; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <NavLink
      to={to}
      end={end}
      className={({ isActive }) =>
        cn(
          'flex flex-col items-center justify-center gap-1 rounded-xl p-2 text-[10px] font-medium transition-colors',
          isActive ? 'text-brand-600' : 'text-ink-800/60 hover:text-ink-900',
        )
      }
    >
      {icon}
      <span>{children}</span>
    </NavLink>
  )
}