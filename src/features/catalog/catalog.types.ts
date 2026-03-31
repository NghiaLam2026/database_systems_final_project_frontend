export const CATEGORIES = [
  'cpu',
  'gpu',
  'mobo',
  'memory',
  'psu',
  'case',
  'cpu_cooler',
  'case_fans',
  'storage',
] as const

export type Category = (typeof CATEGORIES)[number]

export const CATEGORY_LABELS: Record<Category, string> = {
  cpu: 'CPUs',
  gpu: 'GPUs',
  mobo: 'Motherboards',
  memory: 'Memory',
  psu: 'Power Supplies',
  case: 'Cases',
  cpu_cooler: 'CPU Coolers',
  case_fans: 'Case Fans',
  storage: 'Storage',
}

export type CatalogItem = {
  id: number
  name: string
  price: number | null
  [key: string]: unknown
}

export type PaginatedCatalog = {
  items: CatalogItem[]
  total: number
  page: number
  size: number
  pages: number
}

export type CatalogQuery = {
  page?: number
  size?: number
  min_price?: number
  max_price?: number
  search?: string
  sort_by?: string
  order?: 'asc' | 'desc'
}

export type ColumnDef = {
  key: string
  label: string
  sortable?: boolean
  format?: (value: unknown) => string
}

const currency = (v: unknown) =>
  v != null ? `$${Number(v).toFixed(2)}` : '—'
const ghz = (v: unknown) => (v != null ? `${v} GHz` : '—')
const mhz = (v: unknown) => (v != null ? `${v} MHz` : '—')
const watts = (v: unknown) => (v != null ? `${v} W` : '—')
const mm = (v: unknown) => (v != null ? `${v} mm` : '—')
const gb = (v: unknown) => (v != null ? `${v} GB` : '—')
const mb = (v: unknown) => (v != null ? `${v} MB` : '—')
const db = (v: unknown) => (v != null ? `${v} dB` : '—')
const cfm = (v: unknown) => (v != null ? `${v} CFM` : '—')
const rpm = (v: unknown) => (v != null ? `${v} RPM` : '—')
const str = (v: unknown) => (v != null ? String(v) : '—')

const priceCol: ColumnDef = {
  key: 'price',
  label: 'Price',
  sortable: true,
  format: currency,
}

export const CATEGORY_COLUMNS: Record<Category, ColumnDef[]> = {
  cpu: [
    { key: 'name', label: 'Name', sortable: true },
    { key: 'core_count', label: 'Cores', sortable: true },
    { key: 'perf_clock', label: 'Base Clock', sortable: true, format: ghz },
    { key: 'boost_clock', label: 'Boost Clock', sortable: true, format: ghz },
    { key: 'microarch', label: 'Microarch', sortable: true, format: str },
    { key: 'tdp', label: 'TDP', sortable: true, format: watts },
    priceCol,
  ],
  gpu: [
    { key: 'name', label: 'Name', sortable: true },
    { key: 'chipset', label: 'Chipset', sortable: true, format: str },
    { key: 'memory', label: 'VRAM', sortable: true, format: gb },
    { key: 'core_clock', label: 'Core Clock', sortable: true, format: mhz },
    { key: 'boost_clock', label: 'Boost Clock', sortable: true, format: mhz },
    { key: 'length', label: 'Length', sortable: true, format: mm },
    priceCol,
  ],
  mobo: [
    { key: 'name', label: 'Name', sortable: true },
    { key: 'socket', label: 'Socket', sortable: true, format: str },
    { key: 'form_factor', label: 'Form Factor', sortable: true, format: str },
    { key: 'max_memory', label: 'Max RAM', sortable: true, format: gb },
    { key: 'memory_slots', label: 'Slots', sortable: true },
    priceCol,
  ],
  memory: [
    { key: 'name', label: 'Name', sortable: true },
    { key: 'speed', label: 'Speed', sortable: true, format: str },
    { key: 'modules', label: 'Modules', sortable: true, format: str },
    { key: 'price_per_gb', label: '$/GB', sortable: true, format: currency },
    { key: 'first_word_latency', label: 'Latency', sortable: true, format: str },
    { key: 'cas_latency', label: 'CAS', sortable: true },
    priceCol,
  ],
  psu: [
    { key: 'name', label: 'Name', sortable: true },
    { key: 'type', label: 'Type', sortable: true, format: str },
    { key: 'efficiency', label: 'Efficiency', sortable: true, format: str },
    { key: 'wattage', label: 'Wattage', sortable: true, format: watts },
    { key: 'modular', label: 'Modular', sortable: true, format: str },
    priceCol,
  ],
  case: [
    { key: 'name', label: 'Name', sortable: true },
    { key: 'type', label: 'Type', sortable: true, format: str },
    { key: 'color', label: 'Color', sortable: true, format: str },
    { key: 'side_panel', label: 'Side Panel', sortable: true, format: str },
    priceCol,
  ],
  cpu_cooler: [
    { key: 'name', label: 'Name', sortable: true },
    { key: 'rpm', label: 'RPM', sortable: true, format: rpm },
    { key: 'noise_level', label: 'Noise', sortable: true, format: db },
    { key: 'color', label: 'Color', sortable: true, format: str },
    priceCol,
  ],
  case_fans: [
    { key: 'name', label: 'Name', sortable: true },
    { key: 'size', label: 'Size', sortable: true, format: mm },
    { key: 'rpm', label: 'RPM', sortable: true, format: rpm },
    { key: 'airflow', label: 'Airflow', sortable: true, format: cfm },
    { key: 'noise_level', label: 'Noise', sortable: true, format: db },
    priceCol,
  ],
  storage: [
    { key: 'name', label: 'Name', sortable: true },
    { key: 'capacity', label: 'Capacity', sortable: true, format: gb },
    { key: 'type', label: 'Type', sortable: true, format: str },
    { key: 'cache', label: 'Cache', sortable: true, format: mb },
    { key: 'form_factor', label: 'Form Factor', sortable: true, format: str },
    { key: 'interface', label: 'Interface', sortable: true, format: str },
    priceCol,
  ],
}
