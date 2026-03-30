import { z } from 'zod'

export const roleSchema = z.enum(['user', 'admin'])
export type Role = z.infer<typeof roleSchema>

export const userSchema = z.object({
  id: z.number(),
  email: z.string(),
  first_name: z.string(),
  last_name: z.string(),
  role: roleSchema,
})

export type User = z.infer<typeof userSchema>

export const userOutSchema = userSchema.extend({
  created_at: z.string(),
})

export type UserOut = z.infer<typeof userOutSchema>

export const loginResponseSchema = z.object({
  access_token: z.string(),
  token_type: z.string().default('bearer'),
  user: userSchema,
})

export type LoginResponse = z.infer<typeof loginResponseSchema>
