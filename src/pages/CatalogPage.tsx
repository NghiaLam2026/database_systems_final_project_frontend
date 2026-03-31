import { useCallback, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { AnimatePresence, motion } from 'framer-motion'
import { ChevronUp, ChevronDown, Search, X } from 'lucide-react'
import { ApiError } from '@/lib/api/client'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { listCatalog } from '@/features/catalog/catalog.api'
import {
  CATEGORIES,
  CATEGORY_COLUMNS,
  CATEGORY_LABELS,
  type CatalogItem,
  type CatalogQuery,
  type Category,
  type ColumnDef,
} from '@/features/catalog/catalog.types'

const PAGE_SIZE = 20

export function CatalogPage() {
  const [category, setCategory] = useState<Category>('cpu')
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [submittedSearch, setSubmittedSearch] = useState('')
  const [minPrice, setMinPrice] = useState('')
  const [maxPrice, setMaxPrice] = useState('')
  const [sortBy, setSortBy] = useState('price')
  const [order, setOrder] = useState<'asc' | 'desc'>('asc')
  const [detailItem, setDetailItem] = useState<CatalogItem | null>(null)

  const resetFilters = useCallback(() => {
    setPage(1)
    setSearch('')
    setSubmittedSearch('')
    setMinPrice('')
    setMaxPrice('')
    setSortBy('price')
    setOrder('asc')
  }, [])

  const switchCategory = (cat: Category) => {
    setCategory(cat)
    resetFilters()
  }

  const queryParams: CatalogQuery = {
    page,
    size: PAGE_SIZE,
    sort_by: sortBy,
    order,
    ...(submittedSearch && { search: submittedSearch }),
    ...(minPrice && { min_price: Number(minPrice) }),
    ...(maxPrice && { max_price: Number(maxPrice) }),
  }

  const catalogQuery = useQuery({
    queryKey: ['catalog', category, queryParams],
    queryFn: () => listCatalog(category, queryParams),
  })

  const columns = CATEGORY_COLUMNS[category]
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

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setSubmittedSearch(search.trim())
    setPage(1)
  }

  const handlePriceApply = () => {
    setPage(1)
  }

  const hasFilters = submittedSearch || minPrice || maxPrice

  return (
    <div>
      <h1 className="text-xl font-semibold text-ink-950">Catalog</h1>

      {/* Category tabs */}
      <div className="mt-4 flex gap-1 overflow-x-auto pb-1">
        {CATEGORIES.map((cat) => (
          <button
            key={cat}
            onClick={() => switchCategory(cat)}
            className={
              cat === category
                ? 'shrink-0 rounded-lg bg-brand-600 px-3 py-1.5 text-xs font-semibold text-white transition-colors'
                : 'shrink-0 rounded-lg px-3 py-1.5 text-xs font-medium text-ink-800 transition-colors hover:bg-white/60'
            }
          >
            {CATEGORY_LABELS[cat]}
          </button>
        ))}
      </div>

      {/* Search + price filter bar */}
      <div className="mt-4 flex flex-wrap items-end gap-3">
        <form onSubmit={handleSearchSubmit} className="flex min-w-0 flex-1 items-center gap-2">
          <div className="flex flex-1 items-center gap-2 rounded-xl border border-mist-200 bg-white px-3 py-2 shadow-sm focus-within:border-brand-400 focus-within:ring-2 focus-within:ring-brand-400/30">
            <Search className="h-4 w-4 shrink-0 text-ink-800/40" />
            <input
              type="text"
              placeholder={`Search ${CATEGORY_LABELS[category].toLowerCase()}…`}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-transparent text-sm text-ink-950 placeholder:text-ink-800/40 focus:outline-none"
            />
            {search && (
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
            )}
          </div>
          <Button type="submit" variant="secondary" className="shrink-0 px-3 py-2 text-xs">
            Search
          </Button>
        </form>

        <div className="flex items-center gap-2 text-xs">
          <span className="text-ink-800">Price:</span>
          <input
            type="number"
            min="0"
            step="any"
            placeholder="Min"
            value={minPrice}
            onChange={(e) => setMinPrice(e.target.value)}
            onBlur={handlePriceApply}
            className="w-20 rounded-lg border border-mist-200 bg-white px-2 py-1.5 text-sm shadow-sm focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-400/30"
          />
          <span className="text-ink-800/50">–</span>
          <input
            type="number"
            min="0"
            step="any"
            placeholder="Max"
            value={maxPrice}
            onChange={(e) => setMaxPrice(e.target.value)}
            onBlur={handlePriceApply}
            className="w-20 rounded-lg border border-mist-200 bg-white px-2 py-1.5 text-sm shadow-sm focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-400/30"
          />
        </div>

        {hasFilters ? (
          <button
            onClick={resetFilters}
            className="text-xs text-brand-600 hover:underline"
          >
            Clear filters
          </button>
        ) : null}
      </div>

      {/* Results */}
      <div className="mt-5">
        {catalogQuery.isPending ? (
          <LoadingSkeleton />
        ) : catalogQuery.isError ? (
          <motion.div
            className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
            role="alert"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
          >
            {catalogQuery.error instanceof ApiError
              ? catalogQuery.error.message
              : 'Failed to load catalog.'}
          </motion.div>
        ) : data && data.items.length === 0 ? (
          <div className="py-12 text-center text-sm text-ink-800/60">
            No {CATEGORY_LABELS[category].toLowerCase()} found matching your filters.
          </div>
        ) : data ? (
          <AnimatePresence mode="wait">
            <motion.div
              key={`${category}-${page}-${submittedSearch}-${sortBy}-${order}`}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
            >
              <div className="overflow-x-auto rounded-xl border border-mist-200">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-mist-200 bg-mist-50/60">
                      {columns.map((col) => (
                        <SortableHeader
                          key={col.key}
                          col={col}
                          active={sortBy === col.key}
                          order={order}
                          onSort={toggleSort}
                        />
                      ))}
                    </tr>
                  </thead>
                  <motion.tbody
                    initial="hidden"
                    animate="visible"
                    variants={{ hidden: {}, visible: { transition: { staggerChildren: 0.02 } } }}
                  >
                    {data.items.map((item) => (
                      <motion.tr
                        key={item.id}
                        className="cursor-pointer border-b border-mist-100 transition-colors last:border-b-0 hover:bg-white/70"
                        variants={{
                          hidden: { opacity: 0, x: -6 },
                          visible: { opacity: 1, x: 0 },
                        }}
                        transition={{ duration: 0.2 }}
                        onClick={() => setDetailItem(item)}
                      >
                        {columns.map((col) => (
                          <td key={col.key} className="whitespace-nowrap px-4 py-3 text-ink-900">
                            {col.format
                              ? col.format(item[col.key])
                              : item[col.key] != null
                                ? String(item[col.key])
                                : '—'}
                          </td>
                        ))}
                      </motion.tr>
                    ))}
                  </motion.tbody>
                </table>
              </div>

              {data.pages > 1 ? (
                <div className="mt-4 flex items-center justify-between text-sm text-ink-800">
                  <span>
                    Page {data.page} of {data.pages} ({data.total} items)
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
            </motion.div>
          </AnimatePresence>
        ) : null}
      </div>

      {/* Detail modal */}
      <Modal
        open={detailItem !== null}
        title={detailItem?.name ?? 'Item Detail'}
        onClose={() => setDetailItem(null)}
      >
        {detailItem ? <ItemDetail item={detailItem} columns={columns} /> : null}
      </Modal>
    </div>
  )
}

function SortableHeader({
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
    return (
      <th className="px-4 py-3 font-medium text-ink-800">{col.label}</th>
    )
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

function ItemDetail({ item, columns }: { item: CatalogItem; columns: ColumnDef[] }) {
  const allKeys = Object.keys(item).filter((k) => k !== 'id')

  const columnMap = new Map(columns.map((c) => [c.key, c]))

  return (
    <div className="p-7">
      <h2 className="text-lg font-semibold text-ink-950">{item.name}</h2>
      <dl className="mt-4 grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
        {allKeys.map((key) => {
          const col = columnMap.get(key)
          const label = col?.label ?? key.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
          const value = col?.format
            ? col.format(item[key])
            : item[key] != null
              ? String(item[key])
              : '—'

          return (
            <div key={key}>
              <dt className="text-xs font-medium text-ink-800/70">{label}</dt>
              <dd className="mt-0.5 text-ink-950">{value}</dd>
            </div>
          )
        })}
      </dl>
    </div>
  )
}

function LoadingSkeleton() {
  return (
    <div className="space-y-2">
      <div className="h-10 animate-pulse rounded-xl bg-mist-100" />
      {Array.from({ length: 8 }).map((_, i) => (
        <motion.div
          key={i}
          className="h-12 rounded-xl bg-mist-100"
          initial={{ opacity: 0 }}
          animate={{ opacity: [0.4, 0.7, 0.4] }}
          transition={{ duration: 1.4, repeat: Infinity, delay: i * 0.06 }}
        />
      ))}
    </div>
  )
}
