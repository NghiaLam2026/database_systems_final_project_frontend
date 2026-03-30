import { useState, type FormEvent } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { useAuth } from '@/hooks/useAuth'
import { ApiError } from '@/lib/api/client'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { TextField } from '@/components/ui/TextField'
import { listUsers, createUser, changeUserRole } from '@/features/users/users.api'
import type { Role, UserOut } from '@/features/auth/auth.types'

const PAGE_SIZE = 20

const rowVariant = {
  hidden: { opacity: 0, x: -8 },
  visible: { opacity: 1, x: 0 },
}

export function AdminUsersPage() {
  const { state } = useAuth()
  const qc = useQueryClient()
  const token = state.status === 'authenticated' ? state.token : ''

  const [page, setPage] = useState(1)
  const [createOpen, setCreateOpen] = useState(false)

  const usersQuery = useQuery({
    queryKey: ['admin', 'users', page, PAGE_SIZE],
    queryFn: () => listUsers(token, { page, size: PAGE_SIZE }),
    enabled: !!token,
  })

  const roleMutation = useMutation({
    mutationFn: ({ userId, role }: { userId: number; role: Role }) =>
      changeUserRole(token, userId, role),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['admin', 'users'] })
    },
  })

  const data = usersQuery.data

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-ink-950">Users</h1>
        <Button onClick={() => setCreateOpen(true)}>Create user</Button>
      </div>

      {usersQuery.isPending ? (
        <div className="mt-6 space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <motion.div
              key={i}
              className="h-12 rounded-xl bg-mist-100"
              initial={{ opacity: 0 }}
              animate={{ opacity: [0.4, 0.7, 0.4] }}
              transition={{ duration: 1.4, repeat: Infinity, delay: i * 0.08 }}
            />
          ))}
        </div>
      ) : usersQuery.isError ? (
        <motion.div
          className="mt-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
          role="alert"
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
        >
          {usersQuery.error instanceof ApiError
            ? usersQuery.error.message
            : 'Failed to load users.'}
        </motion.div>
      ) : data ? (
        <>
          <div className="mt-6 overflow-hidden rounded-xl border border-mist-200">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-mist-200 bg-mist-50/60">
                  <th className="px-4 py-3 font-medium text-ink-800">Name</th>
                  <th className="px-4 py-3 font-medium text-ink-800">Email</th>
                  <th className="px-4 py-3 font-medium text-ink-800">Role</th>
                  <th className="px-4 py-3 font-medium text-ink-800">Joined</th>
                  <th className="px-4 py-3 text-right font-medium text-ink-800">Actions</th>
                </tr>
              </thead>
              <motion.tbody
                initial="hidden"
                animate="visible"
                variants={{ hidden: {}, visible: { transition: { staggerChildren: 0.04 } } }}
              >
                {data.items.map((user) => (
                  <UserRow
                    key={user.id}
                    user={user}
                    loading={
                      roleMutation.isPending &&
                      roleMutation.variables?.userId === user.id
                    }
                    onToggleRole={() => {
                      const next: Role = user.role === 'admin' ? 'user' : 'admin'
                      roleMutation.mutate({ userId: user.id, role: next })
                    }}
                  />
                ))}
              </motion.tbody>
            </table>
          </div>

          {data.pages > 1 ? (
            <div className="mt-4 flex items-center justify-between text-sm text-ink-800">
              <span>
                Page {data.page} of {data.pages} ({data.total} users)
              </span>
              <div className="flex gap-2">
                <Button
                  variant="ghost"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => p - 1)}
                >
                  Previous
                </Button>
                <Button
                  variant="ghost"
                  disabled={page >= data.pages}
                  onClick={() => setPage((p) => p + 1)}
                >
                  Next
                </Button>
              </div>
            </div>
          ) : null}
        </>
      ) : null}

      <CreateUserModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        token={token}
      />
    </div>
  )
}

function UserRow({
  user,
  loading,
  onToggleRole,
}: {
  user: UserOut
  loading: boolean
  onToggleRole: () => void
}) {
  const { state } = useAuth()
  const isSelf = state.status === 'authenticated' && state.user.id === user.id

  return (
    <motion.tr
      className="border-b border-mist-100 last:border-b-0"
      variants={rowVariant}
      transition={{ duration: 0.25, ease: 'easeOut' }}
    >
      <td className="px-4 py-3 text-ink-950">
        {user.first_name} {user.last_name}
      </td>
      <td className="px-4 py-3 text-ink-800">{user.email}</td>
      <td className="px-4 py-3">
        <span
          className={
            user.role === 'admin'
              ? 'inline-block rounded-full bg-brand-100 px-2.5 py-0.5 text-xs font-medium text-brand-700'
              : 'inline-block rounded-full bg-mist-100 px-2.5 py-0.5 text-xs font-medium text-ink-800'
          }
        >
          {user.role}
        </span>
      </td>
      <td className="px-4 py-3 text-ink-800">
        {new Date(user.created_at).toLocaleDateString()}
      </td>
      <td className="px-4 py-3 text-right">
        {isSelf ? (
          <span className="text-xs text-ink-800/50">You</span>
        ) : (
          <Button
            variant="ghost"
            onClick={onToggleRole}
            loading={loading}
            className="text-xs"
          >
            Make {user.role === 'admin' ? 'user' : 'admin'}
          </Button>
        )}
      </td>
    </motion.tr>
  )
}

function CreateUserModal({
  open,
  onClose,
  token,
}: {
  open: boolean
  onClose: () => void
  token: string
}) {
  const qc = useQueryClient()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [role, setRole] = useState<Role>('user')
  const [error, setError] = useState<string | null>(null)

  const mutation = useMutation({
    mutationFn: () =>
      createUser(token, {
        email,
        password,
        first_name: firstName,
        last_name: lastName,
        role,
      }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['admin', 'users'] })
      resetAndClose()
    },
    onError: (err) => {
      if (err instanceof ApiError) setError(err.message)
      else setError('Failed to create user.')
    },
  })

  const canSubmit =
    email.trim().length > 0 &&
    password.length >= 8 &&
    firstName.trim().length > 0 &&
    lastName.trim().length > 0

  const resetAndClose = () => {
    setEmail('')
    setPassword('')
    setFirstName('')
    setLastName('')
    setRole('user')
    setError(null)
    onClose()
  }

  const onSubmit = (e: FormEvent) => {
    e.preventDefault()
    setError(null)
    mutation.mutate()
  }

  return (
    <Modal open={open} title="Create User" onClose={resetAndClose}>
      <div className="p-7">
        <button
          className="absolute right-4 top-4 rounded-lg p-2 text-ink-800/60 hover:bg-white/60 hover:text-ink-900"
          onClick={resetAndClose}
          aria-label="Close"
        >
          ✕
        </button>

        <h2 className="text-lg font-semibold text-ink-950">Create User</h2>

        <form className="mt-4 space-y-3" onSubmit={onSubmit} noValidate>
          <div className="grid grid-cols-2 gap-3">
            <TextField label="First name" value={firstName} onChange={setFirstName} placeholder="First name" />
            <TextField label="Last name" value={lastName} onChange={setLastName} placeholder="Last name" />
          </div>
          <TextField label="Email" value={email} onChange={setEmail} placeholder="user@example.com" autoComplete="off" />
          <TextField
            label="Password"
            type="password"
            value={password}
            onChange={setPassword}
            placeholder="Min. 8 characters"
            autoComplete="new-password"
            error={password.length > 0 && password.length < 8 ? 'Must be at least 8 characters' : undefined}
          />

          <div>
            <div className="mb-1 text-xs font-medium text-ink-800">Role</div>
            <div className="flex gap-2">
              {(['user', 'admin'] as const).map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setRole(r)}
                  className={
                    role === r
                      ? 'rounded-lg border border-brand-300 bg-brand-50 px-3 py-2 text-sm font-medium text-brand-700 transition-colors duration-150'
                      : 'rounded-lg border border-mist-200 bg-white px-3 py-2 text-sm text-ink-800 transition-colors duration-150 hover:bg-mist-50'
                  }
                >
                  {r}
                </button>
              ))}
            </div>
          </div>

          {error ? (
            <motion.div
              className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
              role="alert"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              transition={{ duration: 0.25 }}
            >
              {error}
            </motion.div>
          ) : null}

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" onClick={resetAndClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={!canSubmit} loading={mutation.isPending}>
              Create
            </Button>
          </div>
        </form>
      </div>
    </Modal>
  )
}
