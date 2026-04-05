import { apiRequest } from '@/lib/api/client'
import {
  messageOutSchema,
  paginatedMessagesSchema,
  paginatedThreadsSchema,
  threadOutSchema,
  type MessageOut,
  type PaginatedMessages,
  type PaginatedThreads,
  type ThreadOut,
} from './chat.types'

const BASE = '/api/v1/threads'

export function createThread(token: string, body: { thread_name?: string } = {}) {
  return apiRequest<ThreadOut>(BASE, {
    method: 'POST',
    token,
    body,
    schema: threadOutSchema,
  })
}

export function listThreads(
  token: string,
  params: { page?: number; size?: number } = {},
) {
  const q = new URLSearchParams()
  if (params.page != null) q.set('page', String(params.page))
  if (params.size != null) q.set('size', String(params.size))
  const qs = q.toString()
  return apiRequest<PaginatedThreads>(`${BASE}${qs ? `?${qs}` : ''}`, {
    method: 'GET',
    token,
    schema: paginatedThreadsSchema,
  })
}

export function getThread(token: string, threadId: number) {
  return apiRequest<ThreadOut>(`${BASE}/${threadId}`, {
    method: 'GET',
    token,
    schema: threadOutSchema,
  })
}

export function patchThread(
  token: string,
  threadId: number,
  body: { thread_name?: string | null },
) {
  return apiRequest<ThreadOut>(`${BASE}/${threadId}`, {
    method: 'PATCH',
    token,
    body,
    schema: threadOutSchema,
  })
}

export function deleteThread(token: string, threadId: number) {
  return apiRequest<void>(`${BASE}/${threadId}`, {
    method: 'DELETE',
    token,
  })
}

export function postMessage(
  token: string,
  threadId: number,
  body: { user_request: string; build_id?: number },
) {
  return apiRequest<MessageOut>(`${BASE}/${threadId}/messages`, {
    method: 'POST',
    token,
    body,
    schema: messageOutSchema,
  })
}

export function listMessages(
  token: string,
  threadId: number,
  params: { page?: number; size?: number; order?: 'asc' | 'desc' } = {},
) {
  const q = new URLSearchParams()
  if (params.page != null) q.set('page', String(params.page))
  if (params.size != null) q.set('size', String(params.size))
  if (params.order) q.set('order', params.order)
  const qs = q.toString()
  return apiRequest<PaginatedMessages>(`${BASE}/${threadId}/messages${qs ? `?${qs}` : ''}`, {
    method: 'GET',
    token,
    schema: paginatedMessagesSchema,
  })
}

export function getMessage(token: string, threadId: number, messageId: number) {
  return apiRequest<MessageOut>(`${BASE}/${threadId}/messages/${messageId}`, {
    method: 'GET',
    token,
    schema: messageOutSchema,
  })
}

/** Fetches every page (order asc) and concatenates so the full thread history is available. */
export async function listAllMessages(token: string, threadId: number, pageSize = 200) {
  const first = await listMessages(token, threadId, { page: 1, size: pageSize, order: 'asc' })
  const items = [...first.items]
  for (let p = 2; p <= first.pages; p++) {
    const next = await listMessages(token, threadId, { page: p, size: pageSize, order: 'asc' })
    items.push(...next.items)
  }
  return items
}