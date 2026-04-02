import { apiRequest } from '@/lib/api/client'
import {
  buildDetailSchema,
  buildPartDetailSchema,
  buildSummaryListSchema,
  partTypesSchema,
  type BuildDetail,
  type BuildPartDetail,
  type BuildSummary,
  type PartType,
} from './builds.types'

const BASE = '/api/v1/builds'

export function getPartTypes(token: string) {
  return apiRequest<PartType[]>(`${BASE}/part-types`, {
    method: 'GET',
    token,
    schema: partTypesSchema,
  })
}

export function listBuilds(token: string) {
  return apiRequest<BuildSummary[]>(BASE, {
    method: 'GET',
    token,
    schema: buildSummaryListSchema,
  })
}

export function getBuild(token: string, buildId: number) {
  return apiRequest<BuildDetail>(`${BASE}/${buildId}`, {
    method: 'GET',
    token,
    schema: buildDetailSchema,
  })
}

export function createBuild(
  token: string,
  payload: { build_name: string; description?: string },
) {
  return apiRequest<BuildDetail>(BASE, {
    method: 'POST',
    token,
    body: payload,
    schema: buildDetailSchema,
  })
}

export function updateBuild(
  token: string,
  buildId: number,
  payload: { build_name?: string; description?: string },
) {
  return apiRequest<BuildDetail>(`${BASE}/${buildId}`, {
    method: 'PATCH',
    token,
    body: payload,
    schema: buildDetailSchema,
  })
}

export function deleteBuild(token: string, buildId: number) {
  return apiRequest<void>(`${BASE}/${buildId}`, {
    method: 'DELETE',
    token,
  })
}

export function cloneBuild(token: string, buildId: number) {
  return apiRequest<BuildDetail>(`${BASE}/${buildId}/clone`, {
    method: 'POST',
    token,
    schema: buildDetailSchema,
  })
}

export function listBuildParts(token: string, buildId: number) {
  return apiRequest<BuildPartDetail[]>(`${BASE}/${buildId}/parts`, {
    method: 'GET',
    token,
  })
}

export function addBuildPart(
  token: string,
  buildId: number,
  payload: { part_type: string; part_id: number; quantity?: number },
) {
  return apiRequest<BuildPartDetail>(`${BASE}/${buildId}/parts`, {
    method: 'POST',
    token,
    body: payload,
    schema: buildPartDetailSchema,
  })
}

export function updateBuildPart(
  token: string,
  buildId: number,
  partId: number,
  payload: { part_id?: number; quantity?: number },
) {
  return apiRequest<BuildPartDetail>(`${BASE}/${buildId}/parts/${partId}`, {
    method: 'PATCH',
    token,
    body: payload,
    schema: buildPartDetailSchema,
  })
}

export function removeBuildPart(
  token: string,
  buildId: number,
  partId: number,
) {
  return apiRequest<void>(`${BASE}/${buildId}/parts/${partId}`, {
    method: 'DELETE',
    token,
  })
}
