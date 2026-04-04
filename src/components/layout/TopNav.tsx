import { Link } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { cn } from '@/lib/utils/cn'

export function TopNav({ onLoginClick }: { onLoginClick?: () => void }) {
  const { state, logout } = useAuth()

  return (
    <header className="sticky top-0 z-30 border-b border-mist-200 bg-white/80 backdrop-blur-xl">
      <div className="flex w-full items-center justify-between px-6 py-4 md:px-8">
        <Link to="/" className="flex items-center gap-2">
          <span className="inline-flex h-8 w-8 items-center justify-center rounded-xl bg-ink-950 text-sm font-semibold text-white shadow-soft">
            PC
          </span>
          <span className="text-sm font-semibold tracking-tight text-ink-950">PC Build Assistant</span>
        </Link>

        <nav className="flex items-center gap-2 text-sm font-medium text-ink-900">
          <div className="hidden items-center gap-1 md:flex">
            <Link className="rounded-xl px-3 py-2 transition-colors hover:bg-mist-100/80" to="/app">
              Dashboard
            </Link>
            <Link className="rounded-xl px-3 py-2 transition-colors hover:bg-mist-100/80" to="/app/catalog">
              Catalog
            </Link>
          </div>

          {state.status === 'authenticated' ? (
            <>
              <span className="hidden text-xs text-ink-800 sm:inline">
                {state.user.first_name} {state.user.last_name}
              </span>
              <button
                onClick={logout}
                className={cn(
                  'ml-2 inline-flex items-center justify-center rounded-xl px-4 py-2 text-xs font-semibold',
                  'bg-ink-950 text-white hover:bg-ink-900',
                )}
              >
                Log out
              </button>
            </>
          ) : (
            <button
              onClick={onLoginClick}
              className={cn(
                'ml-2 inline-flex items-center justify-center rounded-xl px-4 py-2 text-xs font-semibold',
                'bg-brand-600 text-white hover:bg-brand-500',
              )}
            >
              Log in
            </button>
          )}
        </nav>
      </div>
    </header>
  )
}