import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { ApiError } from '@/lib/api/client'
import {
  AUTH_TOKEN_STORAGE_KEY,
  clearToken,
  getToken,
  isTokenExpired,
  setToken,
} from '@/lib/auth/token'
import { login as loginApi, me as meApi } from '@/features/auth/auth.api'
import { AuthContext, type AuthContextValue, type AuthState } from './AuthContext'

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const qc = useQueryClient()
  const [token, setTokenState] = useState<string | null>(() => {
    const t = getToken()
    if (!t) return null
    if (isTokenExpired(t)) {
      clearToken()
      return null
    }
    return t
  })

  const shouldFetchMe = token != null && !isTokenExpired(token)

  const meQuery = useQuery({
    queryKey: ['auth', 'me', token],
    queryFn: async () => {
      if (!token) throw new Error('Missing token')
      return await meApi(token)
    },
    enabled: shouldFetchMe,
    retry: (count, err) => {
      if (err instanceof ApiError && (err.status === 401 || err.status === 403)) return false
      return count < 1
    },
  })

  const logout = useCallback(() => {
    clearToken()
    setTokenState(null)
    qc.removeQueries({ queryKey: ['auth', 'me'] })
  }, [qc])

  const refetchSession = useCallback(async () => {
    await meQuery.refetch({ throwOnError: false })
  }, [meQuery])

  const login = useCallback(
    async (email: string, password: string) => {
      const res = await loginApi({ email, password })
      setToken(res.access_token)
      setTokenState(res.access_token)
      // Populate cache for the new query key before the next render so `/me` never runs with a stale token.
      await qc.fetchQuery({
        queryKey: ['auth', 'me', res.access_token],
        queryFn: () => meApi(res.access_token),
      })
    },
    [qc],
  )

  /**
   * JWT exp is client-trusted for UX only; when it lapses during a session, clear react state/storage.
   * Deferred with a microtask to avoid synchronous setState-in-effect lint issues while keeping behavior deterministic.
   */
  useEffect(() => {
    if (!token) return
    if (!isTokenExpired(token)) return
    queueMicrotask(() => {
      clearToken()
      setTokenState(null)
      qc.removeQueries({ queryKey: ['auth', 'me'] })
    })
  }, [qc, token])

  /** Revoked or invalid token from API: clear client session (same microtask pattern as above). */
  useEffect(() => {
    if (!meQuery.isError || !meQuery.error) return
    if (meQuery.error instanceof ApiError && (meQuery.error.status === 401 || meQuery.error.status === 403)) {
      queueMicrotask(() => logout())
    }
  }, [logout, meQuery.error, meQuery.isError])

  /** Log out in this tab when another tab clears the token; pick up login from another tab. */
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key !== AUTH_TOKEN_STORAGE_KEY) return

      if (e.newValue === null) {
        setTokenState(null)
        qc.removeQueries({ queryKey: ['auth', 'me'] })
        return
      }

      if (e.newValue && !isTokenExpired(e.newValue)) {
        setTokenState(e.newValue)
        void qc.invalidateQueries({ queryKey: ['auth', 'me'] })
      }
    }

    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [qc])

  const state: AuthState = useMemo(() => {
    if (!token) return { status: 'anonymous', token: null, user: null }
    if (isTokenExpired(token)) return { status: 'anonymous', token: null, user: null }

    if (meQuery.isPending) return { status: 'loading', token, user: null }
    if (meQuery.data) return { status: 'authenticated', token, user: meQuery.data }

    if (meQuery.isError) {
      if (meQuery.error instanceof ApiError && (meQuery.error.status === 401 || meQuery.error.status === 403)) {
        return { status: 'anonymous', token: null, user: null }
      }
      return { status: 'profile_error', token, user: null }
    }

    return { status: 'loading', token, user: null }
  }, [meQuery.data, meQuery.error, meQuery.isError, meQuery.isPending, token])

  const value = useMemo<AuthContextValue>(
    () => ({ state, login, logout, refetchSession }),
    [state, login, logout, refetchSession],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
