import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { AnimatePresence, motion } from 'framer-motion'
import { Plus, Copy, Trash2, Pencil, Cpu } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { ApiError } from '@/lib/api/client'
import { Button } from '@/components/ui/Button'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { Modal } from '@/components/ui/Modal'
import { TextField } from '@/components/ui/TextField'
import {
  listBuilds,
  createBuild,
  deleteBuild,
  cloneBuild,
  updateBuild,
} from '@/features/builds/builds.api'
import type { BuildSummary } from '@/features/builds/builds.types'

export function BuildsPage() {
  const { state } = useAuth()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const token = state.status === 'authenticated' ? state.token : ''

  const [createOpen, setCreateOpen] = useState(false)
  const [editBuild, setEditBuild] = useState<BuildSummary | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<BuildSummary | null>(null)

  const buildsQuery = useQuery({
    queryKey: ['builds'],
    queryFn: () => listBuilds(token),
    enabled: !!token,
  })

  const cloneMutation = useMutation({
    mutationFn: (buildId: number) => cloneBuild(token, buildId),
    onSuccess: (cloned) => {
      void qc.invalidateQueries({ queryKey: ['builds'] })
      navigate(`/app/builds/${cloned.id}`)
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (buildId: number) => deleteBuild(token, buildId),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['builds'] })
      setDeleteTarget(null)
    },
  })

  const builds = buildsQuery.data

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-ink-950">My Builds</h1>
        <Button onClick={() => setCreateOpen(true)}>
          <span className="flex items-center gap-1.5">
            <Plus className="h-4 w-4" /> New Build
          </span>
        </Button>
      </div>

      {buildsQuery.isPending ? (
        <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <motion.div
              key={i}
              className="h-44 rounded-2xl bg-mist-200/50"
              initial={{ opacity: 0 }}
              animate={{ opacity: [0.4, 0.7, 0.4] }}
              transition={{ duration: 1.4, repeat: Infinity, delay: i * 0.08 }}
            />
          ))}
        </div>
      ) : buildsQuery.isError ? (
        <motion.div
          className="mt-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
          role="alert"
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
        >
          {buildsQuery.error instanceof ApiError
            ? buildsQuery.error.message
            : 'Failed to load builds.'}
        </motion.div>
      ) : builds && builds.length === 0 ? (
        <motion.div
          className="mt-12 flex flex-col items-center gap-3 text-center"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="rounded-full bg-mist-100 p-4">
            <Cpu className="h-8 w-8 text-ink-800/40" />
          </div>
          <p className="text-sm text-ink-800/60">
            You don&rsquo;t have any builds yet.
          </p>
          <Button onClick={() => setCreateOpen(true)}>Create your first build</Button>
        </motion.div>
      ) : builds ? (
        <motion.div
          className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
          initial="hidden"
          animate="visible"
          variants={{ hidden: {}, visible: { transition: { staggerChildren: 0.05 } } }}
        >
          <AnimatePresence>
            {builds.map((build) => (
              <BuildCard
                key={build.id}
                build={build}
                onOpen={() => navigate(`/app/builds/${build.id}`)}
                onEdit={() => setEditBuild(build)}
                onClone={() => cloneMutation.mutate(build.id)}
                onDelete={() => setDeleteTarget(build)}
                cloning={cloneMutation.isPending && cloneMutation.variables === build.id}
              />
            ))}
          </AnimatePresence>
        </motion.div>
      ) : null}

      <CreateBuildModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        token={token}
      />

      <EditBuildModal
        build={editBuild}
        onClose={() => setEditBuild(null)}
        token={token}
      />

      <ConfirmDialog
        open={deleteTarget !== null}
        onClose={() => setDeleteTarget(null)}
        title="Delete build?"
        description={
          <>
            Are you sure you want to delete <strong>{deleteTarget?.build_name}</strong>? This
            action cannot be undone.
          </>
        }
        loading={deleteMutation.isPending}
        onConfirm={() => {
          if (deleteTarget) deleteMutation.mutate(deleteTarget.id)
        }}
      />
    </div>
  )
}

function BuildCard({
  build,
  onOpen,
  onEdit,
  onClone,
  onDelete,
  cloning,
}: {
  build: BuildSummary
  onOpen: () => void
  onEdit: () => void
  onClone: () => void
  onDelete: () => void
  cloning: boolean
}) {
  const price = build.total_price ? `$${Number(build.total_price).toFixed(2)}` : '$0.00'

  return (
    <motion.div
      layout
      variants={{
        hidden: { opacity: 0, y: 10 },
        visible: { opacity: 1, y: 0 },
      }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.25, ease: 'easeOut' }}
      className="group relative flex cursor-pointer flex-col justify-between overflow-hidden rounded-2xl border border-mist-200 bg-white p-6 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-card"
      onClick={onOpen}
    >
      <div>
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <h3 className="truncate text-lg font-semibold tracking-tight text-ink-950">
              {build.build_name}
            </h3>
            {build.description ? (
              <p className="mt-1 line-clamp-2 text-sm leading-relaxed text-ink-800/70">
                {build.description}
              </p>
            ) : null}
          </div>
        </div>
      </div>

      <div className="mt-6">
        <div className="flex items-end justify-between">
          <div className="flex flex-col gap-1 text-xs font-medium text-ink-800/50">
            <span>{build.parts_count} {build.parts_count === 1 ? 'part' : 'parts'}</span>
            <span>Updated {new Date(build.updated_at).toLocaleDateString()}</span>
          </div>
          <div className="text-right">
            <span className="text-xl font-bold tracking-tight text-brand-600">{price}</span>
          </div>
        </div>

        <div className="absolute right-4 top-4 flex gap-1.5 opacity-0 transition-opacity duration-200 group-hover:opacity-100">
          <button
            title="Edit details"
            onClick={(e) => { e.stopPropagation(); onEdit() }}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-mist-100/80 text-ink-800 transition-colors hover:bg-mist-200 hover:text-ink-950"
          >
            <Pencil className="h-3.5 w-3.5" />
          </button>
          <button
            title="Clone build"
            onClick={(e) => { e.stopPropagation(); onClone() }}
            disabled={cloning}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-mist-100/80 text-ink-800 transition-colors hover:bg-mist-200 hover:text-ink-950 disabled:opacity-40"
          >
            <Copy className="h-3.5 w-3.5" />
          </button>
          <button
            title="Delete build"
            onClick={(e) => { e.stopPropagation(); onDelete() }}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-red-50 text-red-600 transition-colors hover:bg-red-100 hover:text-red-700"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </motion.div>
  )
}

function CreateBuildModal({
  open,
  onClose,
  token,
}: {
  open: boolean
  onClose: () => void
  token: string
}) {
  const navigate = useNavigate()
  const qc = useQueryClient()

  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [error, setError] = useState<string | null>(null)

  const mutation = useMutation({
    mutationFn: () =>
      createBuild(token, {
        build_name: name.trim(),
        ...(description.trim() && { description: description.trim() }),
      }),
    onSuccess: (build) => {
      void qc.invalidateQueries({ queryKey: ['builds'] })
      resetAndClose()
      navigate(`/app/builds/${build.id}`)
    },
    onError: (err) => {
      setError(err instanceof ApiError ? err.message : 'Failed to create build.')
    },
  })

  const resetAndClose = () => {
    setName('')
    setDescription('')
    setError(null)
    onClose()
  }

  const onSubmit = (e: FormEvent) => {
    e.preventDefault()
    setError(null)
    mutation.mutate()
  }

  return (
    <Modal open={open} title="New Build" onClose={resetAndClose}>
      <div className="p-7">
        <button
          className="absolute right-4 top-4 rounded-lg p-2 text-ink-800/60 hover:bg-white/60 hover:text-ink-900"
          onClick={resetAndClose}
          aria-label="Close"
        >
          ✕
        </button>

        <h2 className="text-lg font-semibold text-ink-950">New Build</h2>

        <form className="mt-4 space-y-3" onSubmit={onSubmit} noValidate>
          <TextField
            label="Build name"
            value={name}
            onChange={setName}
            placeholder="e.g. My Gaming PC"
          />
          <TextField
            label="Description (optional)"
            value={description}
            onChange={setDescription}
            placeholder="A quick summary of this build"
          />

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
            <Button variant="ghost" onClick={resetAndClose}>Cancel</Button>
            <Button type="submit" disabled={!name.trim()} loading={mutation.isPending}>
              Create &amp; Open Builder
            </Button>
          </div>
        </form>
      </div>
    </Modal>
  )
}

function EditBuildModal({
  build,
  onClose,
  token,
}: {
  build: BuildSummary | null
  onClose: () => void
  token: string
}) {
  const qc = useQueryClient()

  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [initialized, setInitialized] = useState(false)

  if (build && !initialized) {
    setName(build.build_name)
    setDescription(build.description ?? '')
    setInitialized(true)
  }
  if (!build && initialized) {
    setInitialized(false)
  }

  const mutation = useMutation({
    mutationFn: () =>
      updateBuild(token, build!.id, {
        build_name: name.trim(),
        description: description.trim() || undefined,
      }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['builds'] })
      resetAndClose()
    },
    onError: (err) => {
      setError(err instanceof ApiError ? err.message : 'Failed to update build.')
    },
  })

  const resetAndClose = () => {
    setName('')
    setDescription('')
    setError(null)
    setInitialized(false)
    onClose()
  }

  const onSubmit = (e: FormEvent) => {
    e.preventDefault()
    setError(null)
    mutation.mutate()
  }

  return (
    <Modal open={build !== null} title="Edit Build" onClose={resetAndClose}>
      <div className="p-7">
        <button
          className="absolute right-4 top-4 rounded-lg p-2 text-ink-800/60 hover:bg-white/60 hover:text-ink-900"
          onClick={resetAndClose}
          aria-label="Close"
        >
          ✕
        </button>

        <h2 className="text-lg font-semibold text-ink-950">Edit Build</h2>

        <form className="mt-4 space-y-3" onSubmit={onSubmit} noValidate>
          <TextField
            label="Build name"
            value={name}
            onChange={setName}
            placeholder="e.g. My Gaming PC"
          />
          <TextField
            label="Description (optional)"
            value={description}
            onChange={setDescription}
            placeholder="A quick summary of this build"
          />

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
            <Button variant="ghost" onClick={resetAndClose}>Cancel</Button>
            <Button type="submit" disabled={!name.trim()} loading={mutation.isPending}>
              Save
            </Button>
          </div>
        </form>
      </div>
    </Modal>
  )
}
