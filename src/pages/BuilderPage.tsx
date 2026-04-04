import { useCallback, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { AnimatePresence, motion } from 'framer-motion'
import {
  ArrowLeft,
  ChevronDown,
  ChevronUp,
  Minus,
  Plus,
  Search,
  X,
} from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { ApiError } from '@/lib/api/client'
import { cn } from '@/lib/utils/cn'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import {
  getBuild,
  getPartTypes,
  addBuildPart,
  updateBuildPart,
  removeBuildPart,
  updateBuild,
} from '@/features/builds/builds.api'
import type {
  BuildDetail,
  BuildPartDetail,
  PartType,
} from '@/features/builds/builds.types'
import { listCatalog } from '@/features/catalog/catalog.api'
import {
  CATEGORY_COLUMNS,
  type CatalogItem,
  type CatalogQuery,
  type Category,
  type ColumnDef,
} from '@/features/catalog/catalog.types'

const PAGE_SIZE = 15

export function BuilderPage() {
  const { id } = useParams<{ id: string }>()
  const buildId = Number(id)
  const navigate = useNavigate()
  const { state } = useAuth()
  const token = state.status === 'authenticated' ? state.token : ''
  const qc = useQueryClient()

  const [pickerSlot, setPickerSlot] = useState<PartType | null>(null)
  const [swapPartId, setSwapPartId] = useState<number | null>(null)

  const buildQuery = useQuery({
    queryKey: ['build', buildId],
    queryFn: () => getBuild(token, buildId),
    enabled: !!token && !isNaN(buildId),
  })

  const partTypesQuery = useQuery({
    queryKey: ['part-types'],
    queryFn: () => getPartTypes(token),
    enabled: !!token,
    staleTime: Infinity,
  })

  const invalidateBuild = useCallback(() => {
    void qc.invalidateQueries({ queryKey: ['build', buildId] })
    void qc.invalidateQueries({ queryKey: ['builds'] })
  }, [qc, buildId])

  const addPartMutation = useMutation({
    mutationFn: (payload: { part_type: string; part_id: number; quantity?: number }) =>
      addBuildPart(token, buildId, payload),
    onSuccess: () => {
      invalidateBuild()
      setPickerSlot(null)
    },
  })

  const swapPartMutation = useMutation({
    mutationFn: ({ partId, newPartId }: { partId: number; newPartId: number }) =>
      updateBuildPart(token, buildId, partId, { part_id: newPartId }),
    onSuccess: () => {
      invalidateBuild()
      setPickerSlot(null)
      setSwapPartId(null)
    },
  })

  const removePartMutation = useMutation({
    mutationFn: (partId: number) => removeBuildPart(token, buildId, partId),
    onSuccess: invalidateBuild,
  })

  const qtyMutation = useMutation({
    mutationFn: ({ partId, quantity }: { partId: number; quantity: number }) =>
      updateBuildPart(token, buildId, partId, { quantity }),
    onSuccess: invalidateBuild,
  })

  const build = buildQuery.data
  const partTypes = partTypesQuery.data

  const handlePickComponent = (item: CatalogItem) => {
    if (!pickerSlot) return
    if (swapPartId !== null) {
      swapPartMutation.mutate({ partId: swapPartId, newPartId: item.id })
    } else {
      addPartMutation.mutate({ part_type: pickerSlot.key, part_id: item.id })
    }
  }

  const openPicker = (slot: PartType, swapId?: number) => {
    setPickerSlot(slot)
    setSwapPartId(swapId ?? null)
  }

  if (buildQuery.isPending || partTypesQuery.isPending) {
    return <BuilderSkeleton />
  }

  if (buildQuery.isError) {
    return (
      <div>
        <button
          onClick={() => navigate('/app')}
          className="mb-4 inline-flex items-center gap-1 text-sm text-ink-800 hover:text-ink-950"
        >
          <ArrowLeft className="h-4 w-4" /> Back to builds
        </button>
        <motion.div
          className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
          role="alert"
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
        >
          {buildQuery.error instanceof ApiError
            ? buildQuery.error.message
            : 'Failed to load build.'}
        </motion.div>
      </div>
    )
  }

  if (!build || !partTypes) return null

  const partsMap = new Map<string, BuildPartDetail[]>()
  for (const part of build.parts) {
    const list = partsMap.get(part.part_type) ?? []
    list.push(part)
    partsMap.set(part.part_type, list)
  }

  const totalPrice = build.total_price ? Number(build.total_price).toFixed(2) : '0.00'

  return (
    <div>
      <button
        onClick={() => navigate('/app')}
        className="mb-4 inline-flex items-center gap-1 text-sm text-ink-800 hover:text-ink-950"
      >
        <ArrowLeft className="h-4 w-4" /> Back to builds
      </button>

      <BuildHeader build={build} token={token} onUpdate={invalidateBuild} />

      <div className="mt-6 space-y-3">
        {partTypes.map((pt) => {
          const parts = partsMap.get(pt.key) ?? []

          return (
            <PartSlot
              key={pt.key}
              partType={pt}
              parts={parts}
              onAdd={() => openPicker(pt)}
              onSwap={(partId) => openPicker(pt, partId)}
              onRemove={(partId) => removePartMutation.mutate(partId)}
              removing={removePartMutation.isPending ? removePartMutation.variables ?? null : null}
              onQtyChange={(partId, qty) => qtyMutation.mutate({ partId, quantity: qty })}
            />
          )
        })}
      </div>

      <motion.div
        className="mt-6 flex items-center justify-between rounded-xl border border-brand-200 bg-brand-50/50 px-5 py-4"
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
      >
        <span className="text-sm font-medium text-ink-800">Estimated Total</span>
        <span className="text-xl font-bold text-brand-600">${totalPrice}</span>
      </motion.div>

      <CatalogPickerModal
        open={pickerSlot !== null}
        partType={pickerSlot}
        loading={addPartMutation.isPending || swapPartMutation.isPending}
        error={
          addPartMutation.error ?? swapPartMutation.error ?? null
        }
        onPick={handlePickComponent}
        onClose={() => {
          setPickerSlot(null)
          setSwapPartId(null)
          addPartMutation.reset()
          swapPartMutation.reset()
        }}
      />
    </div>
  )
}

function BuildHeader({
  build,
  token,
  onUpdate,
}: {
  build: BuildDetail
  token: string
  onUpdate: () => void
}) {
  const [editing, setEditing] = useState(false)
  const [name, setName] = useState(build.build_name)
  const [desc, setDesc] = useState(build.description ?? '')

  const mutation = useMutation({
    mutationFn: () =>
      updateBuild(token, build.id, {
        build_name: name.trim(),
        description: desc.trim() || undefined,
      }),
    onSuccess: () => {
      onUpdate()
      setEditing(false)
    },
  })

  if (!editing) {
    return (
      <motion.div
        className="flex items-start justify-between gap-4"
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div>
          <h1 className="text-xl font-semibold text-ink-950">{build.build_name}</h1>
          {build.description ? (
            <p className="mt-0.5 text-sm text-ink-800/70">{build.description}</p>
          ) : null}
        </div>
        <Button
          variant="ghost"
          className="shrink-0 text-xs"
          onClick={() => {
            setName(build.build_name)
            setDesc(build.description ?? '')
            setEditing(true)
          }}
        >
          Edit
        </Button>
      </motion.div>
    )
  }

  return (
    <motion.form
      className="space-y-2"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      onSubmit={(e) => {
        e.preventDefault()
        mutation.mutate()
      }}
    >
      <input
        className="w-full rounded-lg border border-mist-200 bg-white px-3 py-2 text-lg font-semibold text-ink-950 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-400/30"
        value={name}
        onChange={(e) => setName(e.target.value)}
      />
      <input
        className="w-full rounded-lg border border-mist-200 bg-white px-3 py-2 text-sm text-ink-800 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-400/30"
        value={desc}
        onChange={(e) => setDesc(e.target.value)}
        placeholder="Description (optional)"
      />
      <div className="flex gap-2">
        <Button type="submit" disabled={!name.trim()} loading={mutation.isPending} className="text-xs px-3 py-1.5">
          Save
        </Button>
        <Button variant="ghost" onClick={() => setEditing(false)} className="text-xs px-3 py-1.5">
          Cancel
        </Button>
      </div>
    </motion.form>
  )
}

function PartSlot({
  partType,
  parts,
  onAdd,
  onSwap,
  onRemove,
  removing,
  onQtyChange,
}: {
  partType: PartType
  parts: BuildPartDetail[]
  onAdd: () => void
  onSwap: (partId: number) => void
  onRemove: (partId: number) => void
  removing: number | null
  onQtyChange: (partId: number, qty: number) => void
}) {
  const isEmpty = parts.length === 0
  const canAddMore = partType.allow_multiple || isEmpty

  return (
    <motion.div
      className={cn(
        'rounded-2xl border p-5 transition-all duration-200',
        isEmpty
          ? 'border-dashed border-mist-300 bg-white/40'
          : 'border-mist-200 bg-white shadow-sm hover:shadow-card',
      )}
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
    >
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-ink-950">{partType.label}</h3>
        {canAddMore ? (
          <button
            onClick={onAdd}
            className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-medium text-brand-600 transition-colors hover:bg-brand-50"
          >
            <Plus className="h-3.5 w-3.5" />
            {isEmpty ? 'Choose' : 'Add'}
          </button>
        ) : null}
      </div>

      {parts.length > 0 ? (
        <div className="mt-3 space-y-2">
          <AnimatePresence>
            {parts.map((part) => (
              <motion.div
                key={part.id}
                layout
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 8 }}
                className="flex items-center justify-between gap-3 rounded-lg bg-mist-50/60 px-3 py-2.5"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-ink-950">
                    {part.component.name}
                  </p>
                  <p className="text-xs text-ink-800/60">
                    {part.component.price
                      ? `$${Number(part.component.price).toFixed(2)}`
                      : 'No price'}
                    {part.quantity > 1 ? ` × ${part.quantity} = $${Number(part.line_total).toFixed(2)}` : ''}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  {partType.allow_multiple ? (
                    <div className="flex items-center gap-1 rounded-lg border border-mist-200 bg-white">
                      <button
                        className="p-1 text-ink-800/50 hover:text-ink-900 disabled:opacity-30"
                        disabled={part.quantity <= 1}
                        onClick={() => onQtyChange(part.id, part.quantity - 1)}
                      >
                        <Minus className="h-3 w-3" />
                      </button>
                      <span className="min-w-[1.5rem] text-center text-xs font-medium text-ink-900">
                        {part.quantity}
                      </span>
                      <button
                        className="p-1 text-ink-800/50 hover:text-ink-900"
                        onClick={() => onQtyChange(part.id, part.quantity + 1)}
                      >
                        <Plus className="h-3 w-3" />
                      </button>
                    </div>
                  ) : null}

                  {!partType.allow_multiple ? (
                    <button
                      onClick={() => onSwap(part.id)}
                      className="rounded-lg px-2 py-1 text-xs font-medium text-brand-600 hover:bg-brand-50"
                    >
                      Swap
                    </button>
                  ) : null}

                  <button
                    onClick={() => onRemove(part.id)}
                    disabled={removing === part.id}
                    className="rounded-lg p-1.5 text-ink-800/40 hover:bg-red-50 hover:text-red-500 disabled:opacity-40"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      ) : (
        <p className="mt-2 text-xs text-ink-800/40">No {partType.label.toLowerCase()} selected</p>
      )}
    </motion.div>
  )
}

function CatalogPickerModal({
  open,
  partType,
  loading,
  error,
  onPick,
  onClose,
}: {
  open: boolean
  partType: PartType | null
  loading: boolean
  error: Error | null
  onPick: (item: CatalogItem) => void
  onClose: () => void
}) {
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [submittedSearch, setSubmittedSearch] = useState('')
  const [sortBy, setSortBy] = useState('price')
  const [order, setOrder] = useState<'asc' | 'desc'>('asc')

  const category = (partType?.key ?? 'cpu') as Category
  const columns = CATEGORY_COLUMNS[category] ?? CATEGORY_COLUMNS.cpu

  const resetState = useCallback(() => {
    setPage(1)
    setSearch('')
    setSubmittedSearch('')
    setSortBy('price')
    setOrder('asc')
  }, [])

  const queryParams: CatalogQuery = {
    page,
    size: PAGE_SIZE,
    sort_by: sortBy,
    order,
    ...(submittedSearch && { search: submittedSearch }),
  }

  const catalogQuery = useQuery({
    queryKey: ['catalog-picker', category, queryParams],
    queryFn: () => listCatalog(category, queryParams),
    enabled: open && !!partType,
    placeholderData: keepPreviousData,
  })

  const data = catalogQuery.data

  const toggleSort = (key: string) => {
    if (sortBy === key) {
      setOrder((o) => (o === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortBy(key)
      setOrder('asc')
    }
    setPage(1)
  }

  const handleClose = () => {
    resetState()
    onClose()
  }

  return (
    <Modal open={open} title={`Choose ${partType?.label ?? ''}`} onClose={handleClose} size="xl">
      <div className="p-6">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-ink-950">
            Choose {partType?.label}
          </h2>
          <button
            className="rounded-lg p-2 text-ink-800/60 hover:bg-white/60 hover:text-ink-900"
            onClick={handleClose}
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        <form
          className="mt-4 flex items-center gap-2"
          onSubmit={(e) => {
            e.preventDefault()
            setSubmittedSearch(search.trim())
            setPage(1)
          }}
        >
          <div className="flex flex-1 items-center gap-2 rounded-xl border border-mist-200 bg-white px-3 py-2 shadow-sm focus-within:border-brand-400 focus-within:ring-2 focus-within:ring-brand-400/30">
            <Search className="h-4 w-4 shrink-0 text-ink-800/40" />
            <input
              type="text"
              placeholder={`Search ${partType?.label.toLowerCase() ?? ''}…`}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-transparent text-sm text-ink-950 placeholder:text-ink-800/40 focus:outline-none"
            />
            {search ? (
              <button
                type="button"
                onClick={() => {
                  setSearch('')
                  setSubmittedSearch('')
                  setPage(1)
                }}
                className="text-ink-800/40 hover:text-ink-800"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            ) : null}
          </div>
          <Button type="submit" variant="secondary" className="shrink-0 px-3 py-2 text-xs">
            Search
          </Button>
        </form>

        {error ? (
          <motion.div
            className="mt-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
            role="alert"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
          >
            {error instanceof ApiError ? error.message : 'Failed to add component.'}
          </motion.div>
        ) : null}

        <div className="mt-4">
          {catalogQuery.isPending ? (
            <PickerSkeleton />
          ) : catalogQuery.isError ? (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              Failed to load catalog.
            </div>
          ) : data && data.items.length === 0 ? (
            <div className="py-10 text-center text-sm text-ink-800/60">
              No components found.
            </div>
          ) : data ? (
            <>
              <div className="max-h-[50vh] overflow-auto rounded-xl border border-mist-200">
                <table className="w-full text-left text-sm">
                  <thead className="sticky top-0 z-10">
                    <tr className="border-b border-mist-200 bg-mist-50/95 backdrop-blur-sm">
                      {columns.map((col) => (
                        <PickerSortHeader
                          key={col.key}
                          col={col}
                          active={sortBy === col.key}
                          order={order}
                          onSort={toggleSort}
                        />
                      ))}
                      <th className="px-4 py-3 text-right font-medium text-ink-800">
                        Action
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.items.map((item) => (
                      <tr
                        key={item.id}
                        className="border-b border-mist-100 transition-colors last:border-b-0 hover:bg-brand-50/40"
                      >
                        {columns.map((col) => (
                          <td key={col.key} className="whitespace-nowrap px-4 py-2.5 text-ink-900">
                            {col.format
                              ? col.format(item[col.key])
                              : item[col.key] != null
                                ? String(item[col.key])
                                : '—'}
                          </td>
                        ))}
                        <td className="px-4 py-2.5 text-right">
                          <Button
                            variant="primary"
                            className="px-3 py-1.5 text-xs"
                            loading={loading}
                            onClick={() => onPick(item)}
                          >
                            Select
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {data.pages > 1 ? (
                <div className="mt-3 flex items-center justify-between text-xs text-ink-800">
                  <span>
                    Page {data.page} of {data.pages} ({data.total} items)
                  </span>
                  <div className="flex gap-2">
                    <Button
                      variant="ghost"
                      disabled={page <= 1}
                      onClick={() => setPage((p) => p - 1)}
                      className="text-xs px-2 py-1"
                    >
                      Previous
                    </Button>
                    <Button
                      variant="ghost"
                      disabled={page >= data.pages}
                      onClick={() => setPage((p) => p + 1)}
                      className="text-xs px-2 py-1"
                    >
                      Next
                    </Button>
                  </div>
                </div>
              ) : null}
            </>
          ) : null}
        </div>
      </div>
    </Modal>
  )
}

function PickerSortHeader({
  col,
  active,
  order,
  onSort,
}: {
  col: ColumnDef
  active: boolean
  order: 'asc' | 'desc'
  onSort: (key: string) => void
}) {
  if (!col.sortable) {
    return <th className="px-4 py-3 font-medium text-ink-800">{col.label}</th>
  }

  return (
    <th className="px-4 py-3 font-medium text-ink-800">
      <button
        className="inline-flex items-center gap-1 hover:text-ink-950"
        onClick={() => onSort(col.key)}
      >
        {col.label}
        <span className="inline-flex flex-col text-[10px] leading-none">
          <ChevronUp
            className={`h-3 w-3 ${active && order === 'asc' ? 'text-brand-600' : 'text-ink-800/25'}`}
          />
          <ChevronDown
            className={`-mt-1 h-3 w-3 ${active && order === 'desc' ? 'text-brand-600' : 'text-ink-800/25'}`}
          />
        </span>
      </button>
    </th>
  )
}

function BuilderSkeleton() {
  return (
    <div className="space-y-4">
      <div className="h-8 w-48 animate-pulse rounded-lg bg-mist-100" />
      <div className="h-6 w-72 animate-pulse rounded-lg bg-mist-100" />
      <div className="mt-4 space-y-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <motion.div
            key={i}
            className="h-20 rounded-xl bg-mist-100"
            initial={{ opacity: 0 }}
            animate={{ opacity: [0.4, 0.7, 0.4] }}
            transition={{ duration: 1.4, repeat: Infinity, delay: i * 0.06 }}
          />
        ))}
      </div>
    </div>
  )
}

function PickerSkeleton() {
  return (
    <div className="space-y-2">
      <div className="h-10 animate-pulse rounded-xl bg-mist-100" />
      {Array.from({ length: 5 }).map((_, i) => (
        <motion.div
          key={i}
          className="h-10 rounded-xl bg-mist-100"
          initial={{ opacity: 0 }}
          animate={{ opacity: [0.4, 0.7, 0.4] }}
          transition={{ duration: 1.4, repeat: Infinity, delay: i * 0.06 }}
        />
      ))}
    </div>
  )
}
