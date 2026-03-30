import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { Button } from '@/components/ui/Button'
import { useAuth } from '@/hooks/useAuth'

export function RequireAuth() {
  const { state, logout, refetchSession } = useAuth()
  const location = useLocation()

  if (state.status === 'loading') {
    return (
      <div className="min-h-screen bg-hero">
        <div className="mx-auto max-w-6xl px-6 py-16">
          <div className="rounded-xl2 bg-white/70 p-8 shadow-card backdrop-blur">
            <div className="h-6 w-40 animate-pulse rounded bg-mist-200" />
            <div className="mt-4 h-4 w-64 animate-pulse rounded bg-mist-200" />
          </div>
        </div>
      </div>
    )
  }

  if (state.status === 'profile_error') {
    return (
      <div className="min-h-screen bg-hero">
        <div className="mx-auto max-w-md px-6 py-24">
          <div className="rounded-xl2 border border-white/70 bg-white/80 p-8 shadow-card backdrop-blur">
            <h1 className="text-lg font-semibold text-ink-950">Could not verify your session</h1>
            <p className="mt-2 text-sm leading-6 text-ink-800">
              Check your connection and try again. If the problem continues, sign out and log back in.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Button type="button" onClick={() => void refetchSession()}>
                Retry
              </Button>
              <Button type="button" variant="secondary" onClick={logout}>
                Sign out
              </Button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (state.status !== 'authenticated') {
    const from = `${location.pathname}${location.search}`
    return <Navigate to="/" replace state={{ from, openAuth: true }} />
  }

  return <Outlet />
}