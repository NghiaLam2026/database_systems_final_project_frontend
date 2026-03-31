import { apiRequest } from '@/lib/api/client'
import type { CatalogItem, CatalogQuery, Category, PaginatedCatalog } from './catalog.types'

export function listCatalog(category: Category, params: CatalogQuery = {}) {
  const query = new URLSearchParams()

  if (params.page != null) query.set('page', String(params.page))
  if (params.size != null) query.set('size', String(params.size))
  if (params.min_price != null) query.set('min_price', String(params.min_price))
  if (params.max_price != null) query.set('max_price', String(params.max_price))
  if (params.search) query.set('search', params.search)
  if (params.sort_by) query.set('sort_by', params.sort_by)
  if (params.order) query.set('order', params.order)

  const qs = query.toString()
  return apiRequest<PaginatedCatalog>(`/api/v1/catalog/${category}${qs ? `?${qs}` : ''}`, {
    method: 'GET',
  })
}

export function getCatalogItem(category: Category, id: number) {
  return apiRequest<CatalogItem>(`/api/v1/catalog/${category}/${id}`, {
    method: 'GET',
  })
}