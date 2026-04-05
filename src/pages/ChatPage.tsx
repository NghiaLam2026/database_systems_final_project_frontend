import { useCallback, useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { AnimatePresence, motion } from 'framer-motion'
import { MessageSquarePlus, MoreHorizontal, Pencil, Trash2, Send } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { ApiError } from '@/lib/api/client'
import { cn } from '@/lib/utils/cn'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { TextField } from '@/components/ui/TextField'
import { listBuilds } from '@/features/builds/builds.api'
import {
  createThread,
  deleteThread,
  listAllMessages,
  listThreads,
  patchThread,
  postMessage,
} from '@/features/chat/chat.api'
import type { ThreadListItem } from '@/features/chat/chat.types'

const THREADS_PAGE_SIZE = 50

export function ChatPage() {
  const { state } = useAuth()
  const token = state.status === 'authenticated' ? state.token : ''
  const qc = useQueryClient()
  const [searchParams, setSearchParams] = useSearchParams()
  const threadParam = searchParams.get('thread')
  const selectedId = threadParam ? Number(threadParam) : null
  const validSelectedId = selectedId != null && !Number.isNaN(selectedId) ? selectedId : null
  const [draft, setDraft] = useState('')
  const [buildId, setBuildId] = useState<number | ''>('')
  const [renameOpen, setRenameOpen] = useState(false)
  const [renameValue, setRenameValue] = useState('')
  const [renameTargetId, setRenameTargetId] = useState<number | null>(null)
  const [menuOpenId, setMenuOpenId] = useState<number | null>(null)
  const endRef = useRef<HTMLDivElement>(null)

  const threadsQuery = useQuery({
    queryKey: ['threads', THREADS_PAGE_SIZE],
    queryFn: () => listThreads(token, { page: 1, size: THREADS_PAGE_SIZE }),
    enabled: !!token,
  })

  const buildsQuery = useQuery({
    queryKey: ['builds'],
    queryFn: () => listBuilds(token),
    enabled: !!token,
  })

  const messagesQuery = useQuery({
    queryKey: ['messages', 'all', validSelectedId],
    queryFn: () => listAllMessages(token, validSelectedId!),
    enabled: !!token && validSelectedId != null,
  })

  const messages = messagesQuery.data ?? []

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [validSelectedId, messagesQuery.dataUpdatedAt])

  const invalidateThreads = useCallback(() => {
    void qc.invalidateQueries({ queryKey: ['threads'] })
  }, [qc])

  const createMutation = useMutation({
    mutationFn: () => createThread(token, {}),
    onSuccess: (thread) => {
      invalidateThreads()
      setSearchParams({ thread: String(thread.id) })
    },
  })

  const sendMutation = useMutation({
    mutationFn: () =>
      postMessage(token, validSelectedId!, {
        user_request: draft.trim(),
        ...(buildId !== '' ? { build_id: buildId } : {}),
      }),
    onSuccess: () => {
      setDraft('')
      void qc.invalidateQueries({ queryKey: ['messages', 'all', validSelectedId] })
      invalidateThreads()
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (id: number) => deleteThread(token, id),
    onSuccess: (_, deletedId) => {
      invalidateThreads()
      void qc.invalidateQueries({ queryKey: ['messages'] })
      if (validSelectedId === deletedId) {
        setSearchParams({})
      }
    },
  })

  const renameMutation = useMutation({
    mutationFn: ({ id, name }: { id: number; name: string | null }) =>
      patchThread(token, id, { thread_name: name }),
    onSuccess: () => {
      invalidateThreads()
      setRenameOpen(false)
      setRenameTargetId(null)
    },
  })

  const threads = threadsQuery.data?.items ?? []

  const openRename = (t: ThreadListItem) => {
    setRenameTargetId(t.id)
    setRenameValue(t.thread_name ?? '')
    setRenameOpen(true)
    setMenuOpenId(null)
  }

  const submitRename = () => {
    if (renameTargetId == null) return
    const trimmed = renameValue.trim()
    renameMutation.mutate({
      id: renameTargetId,
      name: trimmed.length ? trimmed : null,
    })
  }

  const confirmDelete = (id: number) => {
    if (!window.confirm('Delete this chat and all its messages?')) return
    deleteMutation.mutate(id)
    setMenuOpenId(null)
  }

  const selectThread = (id: number) => {
    setSearchParams({ thread: String(id) })
  }

  if (!token) {
    return (
      <div className="rounded-2xl border border-mist-200 bg-white p-8 shadow-sm">
        <p className="text-sm text-ink-800">Sign in to use chat.</p>
      </div>
    )
  }

  return (
    <div className="flex min-h-[min(720px,calc(100dvh-10rem))] flex-col gap-4 lg:flex-row lg:gap-6">
      {/* Thread list */}
      <aside className="flex w-full shrink-0 flex-col rounded-2xl border border-mist-200 bg-white shadow-sm lg:w-72">
        <div className="flex items-center justify-between border-b border-mist-100 px-4 py-3">
          <h2 className="text-sm font-semibold text-ink-950">Chats</h2>
          <Button
            type="button"
            variant="secondary"
            className="gap-1.5 px-3 py-2 text-xs"
            loading={createMutation.isPending}
            onClick={() => createMutation.mutate()}
          >
            <MessageSquarePlus className="h-4 w-4" />
            New
          </Button>
        </div>
        <div className="max-h-[40vh] flex-1 overflow-y-auto lg:max-h-none">
          {threadsQuery.isPending ? (
            <div className="space-y-2 p-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="h-14 animate-pulse rounded-xl bg-mist-100" />
              ))}
            </div>
          ) : threadsQuery.isError ? (
            <div className="p-4 text-sm text-red-600" role="alert">
              {threadsQuery.error instanceof ApiError
                ? threadsQuery.error.message
                : 'Failed to load chats.'}
            </div>
          ) : threads.length === 0 ? (
            <div className="p-6 text-center text-sm text-ink-800/70">
              No chats yet. Start a new one.
            </div>
          ) : (
            <ul className="p-2">
              <AnimatePresence initial={false}>
                {threads.map((t) => (
                  <motion.li
                    key={t.id}
                    layout
                    initial={{ opacity: 0, x: -6 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0 }}
                    className="relative"
                  >
                    <div
                      className={cn(
                        'group flex w-full items-start gap-2 rounded-xl px-3 py-2.5 text-left transition-colors',
                        validSelectedId === t.id
                          ? 'bg-mist-100 font-medium text-brand-700'
                          : 'hover:bg-mist-50',
                      )}
                    >
                      <button
                        type="button"
                        className="min-w-0 flex-1 text-left"
                        onClick={() => selectThread(t.id)}
                      >
                        <div className="truncate text-sm text-ink-950">
                          {t.thread_name?.trim() || `Chat ${t.id}`}
                        </div>
                        <div className="mt-0.5 text-xs text-ink-800/60">
                          {t.message_count} msg{t.message_count === 1 ? '' : 's'} ·{' '}
                          {formatShortDate(t.updated_at)}
                        </div>
                      </button>
                      <button
                        type="button"
                        className="rounded-lg p-1 text-ink-800/40 opacity-0 transition-opacity hover:bg-white hover:text-ink-900 group-hover:opacity-100"
                        aria-label="Thread options"
                        onClick={() => setMenuOpenId(menuOpenId === t.id ? null : t.id)}
                      >
                        <MoreHorizontal className="h-4 w-4" />
                      </button>
                    </div>
                    {menuOpenId === t.id ? (
                      <div className="absolute right-2 top-10 z-10 min-w-[140px] rounded-xl border border-mist-200 bg-white py-1 shadow-lg">
                        <button
                          type="button"
                          className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-mist-50"
                          onClick={() => openRename(t)}
                        >
                          <Pencil className="h-3.5 w-3.5" /> Rename
                        </button>
                        <button
                          type="button"
                          className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50"
                          onClick={() => confirmDelete(t.id)}
                        >
                          <Trash2 className="h-3.5 w-3.5" /> Delete
                        </button>
                      </div>
                    ) : null}
                  </motion.li>
                ))}
              </AnimatePresence>
            </ul>
          )}
        </div>
      </aside>

      {/* Conversation */}
      <section className="flex min-h-[320px] flex-1 flex-col rounded-2xl border border-mist-200 bg-white shadow-sm">
        {validSelectedId == null ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-3 p-8 text-center">
            <p className="text-sm text-ink-800/80">Select a chat or start a new one.</p>
            <Button
              type="button"
              loading={createMutation.isPending}
              onClick={() => createMutation.mutate()}
            >
              New chat
            </Button>
          </div>
        ) : (
          <>
            <div className="border-b border-mist-100 px-4 py-3">
              <h1 className="text-lg font-semibold text-ink-950">
                {threads.find((x) => x.id === validSelectedId)?.thread_name?.trim() ||
                  `Chat ${validSelectedId}`}
              </h1>
              <p className="text-xs text-ink-800/60">Assistant replies are generated on the server.</p>
            </div>

            <div className="flex-1 overflow-y-auto px-4 py-4">
              {messagesQuery.isPending ? (
                <div className="space-y-3">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <div key={i} className="h-16 animate-pulse rounded-xl bg-mist-100" />
                  ))}
                </div>
              ) : messagesQuery.isError ? (
                <div className="text-sm text-red-600" role="alert">
                  {messagesQuery.error instanceof ApiError
                    ? messagesQuery.error.message
                    : 'Failed to load messages.'}
                </div>
              ) : (
                <>
                  <div className="flex flex-col gap-4">
                    <AnimatePresence initial={false}>
                      {messages.map((m) => (
                        <motion.div
                          key={m.id}
                          initial={{ opacity: 0, y: 8 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="flex flex-col gap-2"
                        >
                          <div className="flex justify-end">
                            <div className="max-w-[85%] rounded-2xl rounded-br-md bg-brand-600 px-4 py-2.5 text-sm text-white shadow-sm">
                              <p className="whitespace-pre-wrap break-words">{m.user_request}</p>
                              {m.build_id != null ? (
                                <p className="mt-1 text-[10px] font-medium text-white/80">
                                  Build #{m.build_id}
                                </p>
                              ) : null}
                            </div>
                          </div>
                          <div className="flex justify-start">
                            <div className="max-w-[90%] rounded-2xl rounded-bl-md border border-mist-200 bg-mist-50 px-4 py-2.5 text-sm text-ink-900">
                              <p className="whitespace-pre-wrap break-words leading-relaxed">
                                {m.ai_response}
                              </p>
                              <p className="mt-2 text-[10px] text-ink-800/50">
                                {formatTime(m.created_at)}
                              </p>
                            </div>
                          </div>
                        </motion.div>
                      ))}
                    </AnimatePresence>
                  </div>
                  <div ref={endRef} />
                </>
              )}
            </div>

            <div className="border-t border-mist-100 p-4">
              <div className="mb-3 flex flex-wrap items-center gap-2">
                <label className="text-xs font-medium text-ink-800">Attach build (optional)</label>
                <select
                  value={buildId === '' ? '' : String(buildId)}
                  onChange={(e) =>
                    setBuildId(e.target.value === '' ? '' : Number(e.target.value))
                  }
                  className="rounded-lg border border-mist-200 bg-white px-3 py-2 text-sm shadow-sm focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-400/30"
                >
                  <option value="">None</option>
                  {(buildsQuery.data ?? []).map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.build_name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex gap-2">
                <textarea
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  placeholder="Ask about your build, parts, or compatibility…"
                  rows={3}
                  maxLength={32000}
                  className="min-h-[88px] flex-1 resize-y rounded-xl border border-mist-200 bg-white px-4 py-3 text-sm text-ink-950 shadow-sm placeholder:text-ink-800/40 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-400/30"
                />
                <Button
                  type="button"
                  className="self-end px-4"
                  loading={sendMutation.isPending}
                  disabled={!draft.trim()}
                  onClick={() => sendMutation.mutate()}
                >
                  <Send className="h-4 w-4" />
                </Button>
              </div>
              <p className="mt-2 text-[10px] text-ink-800/50">
                {draft.length.toLocaleString()} / 32,000 characters
              </p>
            </div>
          </>
        )}
      </section>

      <Modal open={renameOpen} title="Rename chat" onClose={() => setRenameOpen(false)}>
        <div className="p-6">
          <TextField label="Name" value={renameValue} onChange={setRenameValue} placeholder="Chat name" />
          <div className="mt-4 flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setRenameOpen(false)}>
              Cancel
            </Button>
            <Button loading={renameMutation.isPending} onClick={submitRename}>
              Save
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}

function formatShortDate(iso: string) {
  try {
    const d = new Date(iso)
    const now = new Date()
    const sameDay =
      d.getFullYear() === now.getFullYear() &&
      d.getMonth() === now.getMonth() &&
      d.getDate() === now.getDate()
    if (sameDay) return d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
  } catch {
    return iso
  }
}

function formatTime(iso: string) {
  try {
    return new Date(iso).toLocaleString()
  } catch {
    return iso
  }
}