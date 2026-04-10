import { useCallback, useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { AnimatePresence, motion } from 'framer-motion'
import {
  MessageSquarePlus,
  MoreHorizontal,
  Pencil,
  Send,
  Sparkles,
  Trash2,
} from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { ApiError } from '@/lib/api/client'
import { cn } from '@/lib/utils/cn'
import { Button } from '@/components/ui/Button'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { Modal } from '@/components/ui/Modal'
import { TextField } from '@/components/ui/TextField'
import { listBuilds } from '@/features/builds/builds.api'
import type { BuildSummary } from '@/features/builds/builds.types'
import {
  createThread,
  deleteThread,
  listAllMessages,
  listThreads,
  patchThread,
  postMessage,
} from '@/features/chat/chat.api'
import type { ThreadListItem } from '@/features/chat/chat.types'
import { deriveThreadTitle } from '@/features/chat/threadTitle'
import { AiMarkdown } from '@/components/chat/AiMarkdown'

const THREADS_PAGE_SIZE = 50

const AI_STATUS_MESSAGES = [
  'Calling API…',
  'Sending your message…',
  'Waiting for the assistant…',
  'Retrieving response from the AI…',
] as const

type SendPayload = { user_request: string; build_id?: number }

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
  const [deleteThreadId, setDeleteThreadId] = useState<number | null>(null)
  /** With no `?thread=`, start in new-chat draft; "New" sets this true; picking a thread clears it. */
  const [wantsNewChatDraft, setWantsNewChatDraft] = useState(() => threadParam == null)
  const isDraftNewChat = wantsNewChatDraft && validSelectedId == null
  const endRef = useRef<HTMLDivElement>(null)
  /** Shown after submit until the server responds (user bubble + loading assistant). */
  const [optimisticSend, setOptimisticSend] = useState<{
    userText: string
    buildId?: number
  } | null>(null)
  const [statusTick, setStatusTick] = useState(0)

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
  }, [validSelectedId, messagesQuery.dataUpdatedAt, optimisticSend, statusTick])

  const invalidateThreads = useCallback(() => {
    void qc.invalidateQueries({ queryKey: ['threads'] })
  }, [qc])

  const startDraftNewChat = useCallback(() => {
    setWantsNewChatDraft(true)
    setSearchParams({})
    setDraft('')
    setMenuOpenId(null)
  }, [setSearchParams])

  const sendMutation = useMutation({
    mutationFn: async (payload: SendPayload): Promise<{ threadId: number; mode: 'new' | 'existing' }> => {
      if (validSelectedId != null) {
        await postMessage(token, validSelectedId, payload)
        return { threadId: validSelectedId, mode: 'existing' }
      }
      if (isDraftNewChat) {
        const thread = await createThread(token, {})
        try {
          try {
            await patchThread(token, thread.id, {
              thread_name: deriveThreadTitle(payload.user_request),
            })
          } catch {
            /* title is best-effort */
          }
          await postMessage(token, thread.id, payload)
          return { threadId: thread.id, mode: 'new' }
        } catch (e) {
          try {
            await deleteThread(token, thread.id)
          } catch {
            /* ignore cleanup failure */
          }
          throw e
        }
      }
      throw new Error('No chat selected')
    },
    onSuccess: (result) => {
      setOptimisticSend(null)
      setDraft('')
      if (result.mode === 'new') {
        setWantsNewChatDraft(false)
        setSearchParams({ thread: String(result.threadId) })
      }
      void qc.invalidateQueries({ queryKey: ['messages', 'all', result.threadId] })
      invalidateThreads()
    },
    onError: (_err, variables) => {
      setOptimisticSend(null)
      if (variables) setDraft(variables.user_request)
    },
  })

  const pendingAssistant = Boolean(optimisticSend && sendMutation.isPending)
  useEffect(() => {
    if (!pendingAssistant) return
    const id = window.setInterval(() => setStatusTick((t) => t + 1), 2200)
    return () => window.clearInterval(id)
  }, [pendingAssistant])

  const statusLine = AI_STATUS_MESSAGES[statusTick % AI_STATUS_MESSAGES.length]

  const submitSend = useCallback(() => {
    const text = draft.trim()
    if (!text || sendMutation.isPending) return
    const payload: SendPayload = {
      user_request: text,
      ...(buildId !== '' ? { build_id: Number(buildId) } : {}),
    }
    setStatusTick(0)
    setOptimisticSend({
      userText: text,
      buildId: buildId === '' ? undefined : Number(buildId),
    })
    setDraft('')
    sendMutation.mutate(payload)
  }, [draft, buildId, sendMutation])

  const deleteMutation = useMutation({
    mutationFn: (id: number) => deleteThread(token, id),
    onSuccess: (_, deletedId) => {
      setDeleteThreadId(null)
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
    setDeleteThreadId(id)
    setMenuOpenId(null)
  }

  const selectThread = (id: number) => {
    setWantsNewChatDraft(false)
    setSearchParams({ thread: String(id) })
  }

  if (!token) {
    return (
      <div className="rounded-2xl border border-mist-200 bg-white p-8 shadow-sm">
        <p className="text-sm text-ink-800">Sign in to use chat.</p>
      </div>
    )
  }

  const greetName =
    state.status === 'authenticated' && state.user.first_name?.trim()
      ? state.user.first_name.trim()
      : 'there'

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
            onClick={startDraftNewChat}
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
                        validSelectedId === t.id && !isDraftNewChat
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
      <section className="flex min-h-[320px] flex-1 flex-col overflow-hidden rounded-2xl border border-mist-200 bg-white shadow-sm">
        {validSelectedId == null && !isDraftNewChat ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-3 p-8 text-center">
            <p className="text-sm text-ink-800/80">Select a chat or start a new one.</p>
            <Button type="button" onClick={startDraftNewChat}>
              New chat
            </Button>
          </div>
        ) : isDraftNewChat ? (
          <DraftNewChatLayout
            greetName={greetName}
            draft={draft}
            setDraft={setDraft}
            buildId={buildId}
            setBuildId={setBuildId}
            builds={buildsQuery.data ?? []}
            isSending={sendMutation.isPending}
            optimisticSend={optimisticSend}
            statusLine={statusLine}
            onSend={submitSend}
          />
        ) : (
          <>
            <div className="border-b border-mist-100 px-4 py-3">
              <h1 className="text-lg font-semibold text-ink-950">
                {threads.find((x) => x.id === validSelectedId)?.thread_name?.trim() ||
                  `Chat ${validSelectedId}`}
              </h1>
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
                            <div className="max-w-[90%] rounded-2xl rounded-bl-md border border-mist-200 bg-mist-50 px-4 py-3 text-ink-900 shadow-sm">
                              <AiMarkdown content={m.ai_response} />
                              <p className="mt-3 text-[10px] text-ink-800/50">
                                {formatTime(m.created_at)}
                              </p>
                            </div>
                          </div>
                        </motion.div>
                      ))}
                      {optimisticSend && sendMutation.isPending ? (
                        <motion.div
                          key="optimistic"
                          initial={{ opacity: 0, y: 8 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="flex flex-col gap-2"
                        >
                          <div className="flex justify-end">
                            <div className="max-w-[85%] rounded-2xl rounded-br-md bg-brand-600 px-4 py-2.5 text-sm text-white shadow-sm">
                              <p className="whitespace-pre-wrap break-words">{optimisticSend.userText}</p>
                              {optimisticSend.buildId != null ? (
                                <p className="mt-1 text-[10px] font-medium text-white/80">
                                  Build #{optimisticSend.buildId}
                                </p>
                              ) : null}
                            </div>
                          </div>
                          <div className="flex justify-start">
                            <div className="flex max-w-[90%] items-start gap-3 rounded-2xl rounded-bl-md border border-dashed border-mist-300 bg-mist-50/80 px-4 py-3 text-sm text-ink-800">
                              <span
                                className="mt-0.5 h-2 w-2 shrink-0 animate-pulse rounded-full bg-brand-500"
                                aria-hidden
                              />
                              <div>
                                <p className="font-medium text-ink-900">{statusLine}</p>
                              </div>
                            </div>
                          </div>
                        </motion.div>
                      ) : null}
                    </AnimatePresence>
                  </div>
                  <div ref={endRef} />
                </>
              )}
            </div>

            <ChatComposer
              draft={draft}
              setDraft={setDraft}
              buildId={buildId}
              setBuildId={setBuildId}
              builds={buildsQuery.data ?? []}
              isPending={sendMutation.isPending}
              onSend={submitSend}
              variant="thread"
            />
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

      <ConfirmDialog
        open={deleteThreadId !== null}
        onClose={() => setDeleteThreadId(null)}
        title="Delete chat?"
        description="This will remove this chat and all of its messages. This action cannot be undone."
        loading={deleteMutation.isPending}
        onConfirm={() => {
          if (deleteThreadId == null) return
          deleteMutation.mutate(deleteThreadId)
        }}
      />
    </div>
  )
}

function DraftNewChatLayout({
  greetName,
  draft,
  setDraft,
  buildId,
  setBuildId,
  builds,
  isSending,
  optimisticSend,
  statusLine,
  onSend,
}: {
  greetName: string
  draft: string
  setDraft: (v: string) => void
  buildId: number | ''
  setBuildId: (v: number | '') => void
  builds: BuildSummary[]
  isSending: boolean
  optimisticSend: { userText: string; buildId?: number } | null
  statusLine: string
  onSend: () => void
}) {
  const showName = greetName !== 'there'
  const quickPrompts = [
    'Help me pick parts for a $1,200 gaming PC',
    'Is my PSU wattage enough for this build?',
    'Explain the difference between two similar GPUs',
  ]

  return (
    <div className="flex min-h-[min(520px,calc(100dvh-14rem))] flex-1 flex-col bg-gradient-to-b from-mist-50/90 via-white to-white">
      <div className="flex flex-1 flex-col items-center justify-center px-4 pb-8 pt-10 sm:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
          className="flex w-full max-w-3xl flex-col items-center text-center"
        >
          <div className="mb-3 flex items-center justify-center gap-2 text-brand-600">
            <Sparkles className="h-7 w-7 sm:h-8 sm:w-8" strokeWidth={1.5} aria-hidden />
          </div>
          <h2 className="max-w-xl text-balance font-serif text-3xl font-semibold tracking-tight text-ink-950 sm:text-4xl">
            {showName ? (
              <>
                Hi <span className="text-brand-700">{greetName}</span>! How can I help?
              </>
            ) : (
              "What's on the agenda today?"
            )}
          </h2>
          {optimisticSend && isSending ? (
            <div className="mt-10 w-full max-w-3xl space-y-3 text-left">
              <div className="flex justify-end">
                <div className="max-w-[85%] rounded-2xl rounded-br-md bg-brand-600 px-4 py-2.5 text-sm text-white shadow-sm">
                  <p className="whitespace-pre-wrap break-words">{optimisticSend.userText}</p>
                  {optimisticSend.buildId != null ? (
                    <p className="mt-1 text-[10px] font-medium text-white/80">
                      Build #{optimisticSend.buildId}
                    </p>
                  ) : null}
                </div>
              </div>
              <div className="flex justify-start">
                <div className="flex max-w-[90%] items-start gap-3 rounded-2xl rounded-bl-md border border-dashed border-mist-300 bg-white px-4 py-3 text-sm shadow-sm">
                  <span
                    className="mt-0.5 h-2 w-2 shrink-0 animate-pulse rounded-full bg-brand-500"
                    aria-hidden
                  />
                  <p className="font-medium text-ink-900">{statusLine}</p>
                </div>
              </div>
            </div>
          ) : null}

          <div className="mt-12 w-full">
            <ChatComposer
              draft={draft}
              setDraft={setDraft}
              buildId={buildId}
              setBuildId={setBuildId}
              builds={builds}
              isPending={isSending}
              onSend={onSend}
              variant="draft"
            />
          </div>

          {!isSending ? (
            <div className="mt-6 flex max-w-2xl flex-wrap items-center justify-center gap-2">
              {quickPrompts.map((label) => (
                <button
                  key={label}
                  type="button"
                  onClick={() => setDraft(label)}
                  className="rounded-full border border-mist-200 bg-white/90 px-3 py-1.5 text-left text-xs font-medium text-ink-800 shadow-sm transition hover:border-mist-300 hover:bg-mist-50 sm:text-sm"
                >
                  {label}
                </button>
              ))}
            </div>
          ) : null}
        </motion.div>
      </div>
    </div>
  )
}

function ChatComposer({
  draft,
  setDraft,
  buildId,
  setBuildId,
  builds,
  isPending,
  onSend,
  variant,
}: {
  draft: string
  setDraft: (v: string) => void
  buildId: number | ''
  setBuildId: (v: number | '') => void
  builds: BuildSummary[]
  isPending: boolean
  onSend: () => void
  variant: 'draft' | 'thread'
}) {
  const isDraft = variant === 'draft'

  return (
    <div
      className={cn(
        isDraft ? '' : 'border-t border-mist-100 bg-white/80 p-4 backdrop-blur-sm',
      )}
    >
      <div className={cn('mb-3 flex flex-wrap items-center gap-2', isDraft && 'justify-center')}>
        <label className="text-xs font-medium text-ink-800/80">Attach build</label>
        <select
          value={buildId === '' ? '' : String(buildId)}
          onChange={(e) => setBuildId(e.target.value === '' ? '' : Number(e.target.value))}
          className="max-w-[min(100%,280px)] rounded-full border border-mist-200 bg-white px-3 py-1.5 text-xs shadow-sm focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-400/25 sm:text-sm"
        >
          <option value="">None</option>
          {builds.map((b) => (
            <option key={b.id} value={b.id}>
              {b.build_name}
            </option>
          ))}
        </select>
      </div>

      <div
        className={cn(
          'flex gap-2',
          isDraft &&
            'rounded-[1.75rem] border border-mist-200 bg-white p-2 pl-4 shadow-lg shadow-mist-200/40 ring-1 ring-black/[0.03]',
        )}
      >
        <textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="How can I help you today?"
          rows={isDraft ? 1 : 3}
          maxLength={32000}
          className={cn(
            'min-h-0 flex-1 resize-none bg-transparent text-ink-950 placeholder:text-ink-800/45 focus:outline-none',
            isDraft
              ? 'max-h-[200px] min-h-[52px] py-3.5 text-base leading-relaxed sm:min-h-[56px] sm:py-4 sm:text-[17px]'
              : 'min-h-[88px] resize-y rounded-xl border border-mist-200 bg-white px-4 py-3 text-sm shadow-sm focus:border-brand-400 focus:ring-2 focus:ring-brand-400/30',
          )}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault()
              if (draft.trim() && !isPending) onSend()
            }
          }}
          disabled={isPending}
        />
        <Button
          type="button"
          className={cn(
            'shrink-0',
            isDraft ? 'h-11 w-11 self-end rounded-full p-0 sm:h-12 sm:w-12' : 'self-end px-4',
          )}
          loading={isPending}
          disabled={!draft.trim() || isPending}
          onClick={onSend}
          aria-label="Send message"
        >
          <Send className={cn('h-4 w-4', isDraft && 'sm:h-[18px] sm:w-[18px]')} />
        </Button>
      </div>
      <p className={cn('mt-2 text-[10px] text-ink-800/45', isDraft && 'text-center')}>
        {draft.length.toLocaleString()} / 32,000 · Shift+Enter for new line
      </p>
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