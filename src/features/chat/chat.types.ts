import { z } from 'zod'

export const threadOutSchema = z
  .object({
    id: z.number(),
    thread_name: z.string().nullable().optional(),
    created_at: z.string().optional(),
    updated_at: z.string().optional(),
  })
  .passthrough()

export type ThreadOut = z.infer<typeof threadOutSchema>

export const threadListItemSchema = z
  .object({
    id: z.number(),
    thread_name: z.string().nullable().optional(),
    message_count: z.number(),
    updated_at: z.string(),
  })
  .passthrough()

export type ThreadListItem = z.infer<typeof threadListItemSchema>

export const messageOutSchema = z
  .object({
    id: z.number(),
    thread_id: z.number(),
    build_id: z.number().nullable(),
    user_request: z.string(),
    ai_response: z.string(),
    created_at: z.string(),
  })
  .passthrough()

export type MessageOut = z.infer<typeof messageOutSchema>

export const paginatedThreadsSchema = z.object({
  items: z.array(threadListItemSchema),
  total: z.number(),
  page: z.number(),
  size: z.number(),
  pages: z.number(),
})

export const paginatedMessagesSchema = z.object({
  items: z.array(messageOutSchema),
  total: z.number(),
  page: z.number(),
  size: z.number(),
  pages: z.number(),
})

export type PaginatedThreads = z.infer<typeof paginatedThreadsSchema>
export type PaginatedMessages = z.infer<typeof paginatedMessagesSchema>