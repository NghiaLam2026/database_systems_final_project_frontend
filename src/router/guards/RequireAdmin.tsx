import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'

export function RequireAdmin() {
  const { state } = useAuth()

  if (state.status === 'loading') {
    return (
      <div className="min-h-[40vh]">
        <div className="rounded-xl2 bg-white/70 p-8 shadow-card backdrop-blur">
          <div className="h-6 w-40 animate-pulse rounded bg-mist-200" />
          <div className="mt-4 h-4 w-64 animate-pulse rounded bg-mist-200" />
        </div>
      </div>
    )
  }
  if (state.status !== 'authenticated') return <Navigate to="/" replace />
  if (state.user.role !== 'admin') return <Navigate to="/app" replace />

  return <Outlet />
}