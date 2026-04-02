import { z } from 'zod'

export const partTypeSchema = z.object({
  key: z.string(),
  label: z.string(),
  allow_multiple: z.boolean(),
})

export type PartType = z.infer<typeof partTypeSchema>

export const partTypesSchema = z.array(partTypeSchema)

const componentSchema = z.object({
  id: z.number(),
  name: z.string(),
  price: z.string().nullable(),
})

export type PartComponent = z.infer<typeof componentSchema>

export const buildPartDetailSchema = z.object({
  id: z.number(),
  build_id: z.number(),
  part_type: z.string(),
  part_id: z.number(),
  quantity: z.number(),
  component: componentSchema,
  line_total: z.string().nullable(),
  created_at: z.string(),
})

export type BuildPartDetail = z.infer<typeof buildPartDetailSchema>

export const buildSummarySchema = z.object({
  id: z.number(),
  user_id: z.number(),
  build_name: z.string(),
  description: z.string().nullable(),
  parts_count: z.number(),
  total_price: z.string().nullable(),
  created_at: z.string(),
  updated_at: z.string(),
})

export type BuildSummary = z.infer<typeof buildSummarySchema>

export const buildDetailSchema = z.object({
  id: z.number(),
  user_id: z.number(),
  build_name: z.string(),
  description: z.string().nullable(),
  parts: z.array(buildPartDetailSchema),
  total_price: z.string().nullable(),
  created_at: z.string(),
  updated_at: z.string(),
})

export type BuildDetail = z.infer<typeof buildDetailSchema>

export const buildSummaryListSchema = z.array(buildSummarySchema)
