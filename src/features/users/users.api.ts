import { apiRequest } from '@/lib/api/client'
import { userOutSchema, type Role } from '@/features/auth/auth.types'
import { paginatedUsersSchema } from './users.types'
import type { CreateUserPayload, UpdateProfilePayload } from './users.types'

export function updateProfile(token: string, payload: UpdateProfilePayload) {
  return apiRequest('/api/v1/users/me', {
    method: 'PATCH',
    token,
    body: payload,
    schema: userOutSchema,
  })
}

export function listUsers(
  token: string,
  params: { page?: number; size?: number } = {},
) {
  const query = new URLSearchParams()
  if (params.page != null) query.set('page', String(params.page))
  if (params.size != null) query.set('size', String(params.size))
  const qs = query.toString()

  return apiRequest(`/api/v1/users${qs ? `?${qs}` : ''}`, {
    method: 'GET',
    token,
    schema: paginatedUsersSchema,
  })
}

export function createUser(token: string, payload: CreateUserPayload) {
  return apiRequest('/api/v1/users', {
    method: 'POST',
    token,
    body: payload,
    schema: userOutSchema,
  })
}

export function changeUserRole(
  token: string,
  userId: number,
  role: Role,
) {
  return apiRequest(`/api/v1/users/${userId}/role?role=${role}`, {
    method: 'PATCH',
    token,
    schema: userOutSchema,
  })
}
