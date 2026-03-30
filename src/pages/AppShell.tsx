import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { TopNav } from '@/components/layout/TopNav'
import { useAuth } from '@/hooks/useAuth'
import { cn } from '@/lib/utils/cn'

const pageVariants = {
  initial: { opacity: 0, y: 8 },
  enter: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -6 },
}

export function AppShell() {
  const { state } = useAuth()
  const location = useLocation()

  return (
    <div className="min-h-screen bg-hero">
      <TopNav />
      <div className="mx-auto grid max-w-6xl gap-6 px-6 py-8 md:grid-cols-[220px_1fr]">
        <motion.aside
          className="rounded-xl2 border border-white/70 bg-white/55 p-3 shadow-soft backdrop-blur"
          initial={{ opacity: 0, x: -12 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ type: 'spring', duration: 0.45, bounce: 0.15 }}
        >
          <div className="px-3 pb-3 text-xs font-semibold text-ink-800">Workspace</div>
          <nav className="space-y-1 text-sm">
            <SideLink to="/app" end>
              Builds
            </SideLink>
            <SideLink to="/app/catalog">Catalog</SideLink>
            <SideLink to="/app/chat">Chat</SideLink>
            {state.status === 'authenticated' && state.user.role === 'admin' ? (
              <>
                <div className="px-3 pt-4 text-xs font-semibold text-ink-800">Admin</div>
                <SideLink to="/app/admin/users">Users</SideLink>
              </>
            ) : null}
          </nav>
        </motion.aside>

        <main className="rounded-xl2 border border-white/70 bg-white/55 p-6 shadow-soft backdrop-blur">
          <AnimatePresence mode="wait">
            <motion.div
              key={location.pathname}
              variants={pageVariants}
              initial="initial"
              animate="enter"
              exit="exit"
              transition={{ duration: 0.2, ease: 'easeOut' }}
            >
              <Outlet />
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
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
          'flex rounded-lg px-3 py-2 text-ink-900 transition-colors duration-150 hover:bg-white/60',
          isActive && 'bg-white/80 font-semibold shadow-sm',
        )
      }
    >
      {children}
    </NavLink>
  )
}