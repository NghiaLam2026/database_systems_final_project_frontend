import { z } from 'zod'
import { roleSchema, userOutSchema } from '@/features/auth/auth.types'

export const paginatedUsersSchema = z.object({
  items: z.array(userOutSchema),
  total: z.number(),
  page: z.number(),
  size: z.number(),
  pages: z.number(),
})

export type PaginatedUsers = z.infer<typeof paginatedUsersSchema>

export type CreateUserPayload = {
  email: string
  password: string
  first_name: string
  last_name: string
  role?: z.infer<typeof roleSchema>
}

export type UpdateProfilePayload = {
  first_name?: string
  last_name?: string
}
