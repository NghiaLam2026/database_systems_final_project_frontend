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
const yesNo = (v: unknown) => (v != null ? (v ? 'Yes' : 'No') : '—')
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
    { key: 'perf_clock', label: 'Base Clock', sortable: true, format: str },
    { key: 'boost_clock', label: 'Boost Clock', sortable: true, format: str },
    { key: 'microarch', label: 'Microarch', sortable: true, format: str },
    { key: 'tdp', label: 'TDP', sortable: true, format: str },
    { key: 'graphics', label: 'Graphics', sortable: true, format: str },
    priceCol,
  ],
  gpu: [
    { key: 'name', label: 'Name', sortable: true },
    { key: 'chipset', label: 'Chipset', sortable: true, format: str },
    { key: 'memory', label: 'VRAM', sortable: true, format: str },
    { key: 'core_clock', label: 'Core Clock', sortable: true, format: str },
    { key: 'boost_clock', label: 'Boost Clock', sortable: true, format: str },
    { key: 'color', label: 'Color', sortable: true, format: str },
    { key: 'length', label: 'Length', sortable: true, format: str },
    priceCol,
  ],
  mobo: [
    { key: 'name', label: 'Name', sortable: true },
    { key: 'socket', label: 'Socket', sortable: true, format: str },
    { key: 'form_factor', label: 'Form Factor', sortable: true, format: str },
    { key: 'memory_max', label: 'Max RAM', sortable: true, format: str },
    { key: 'memory_slot', label: 'Slots', sortable: true },
    { key: 'color', label: 'Color', sortable: true, format: str },
    priceCol,
  ],
  memory: [
    { key: 'name', label: 'Name', sortable: true },
    { key: 'speed', label: 'Speed', sortable: true, format: str },
    { key: 'modules', label: 'Modules', sortable: true, format: str },
    { key: 'color', label: 'Color', sortable: true, format: str },
    { key: 'first_word_latency', label: 'Latency', sortable: true, format: str },
    { key: 'cas_latency', label: 'CAS', sortable: true },
    priceCol,
  ],
  psu: [
    { key: 'name', label: 'Name', sortable: true },
    { key: 'type', label: 'Type', sortable: true, format: str },
    { key: 'efficiency_rating', label: 'Efficiency', sortable: true, format: str },
    { key: 'wattage', label: 'Wattage', sortable: true, format: str },
    { key: 'modular', label: 'Modular', sortable: true, format: str },
    { key: 'color', label: 'Color', sortable: true, format: str },
    priceCol,
  ],
  case: [
    { key: 'name', label: 'Name', sortable: true },
    { key: 'type', label: 'Type', sortable: true, format: str },
    { key: 'color', label: 'Color', sortable: true, format: str },
    { key: 'power_supply', label: 'PSU', sortable: true, format: str },
    { key: 'side_panel', label: 'Side Panel', sortable: true, format: str },
    { key: 'external_volume', label: 'Volume', sortable: true, format: str },
    { key: 'internal_bays', label: 'Internal Bays', sortable: true, format: str },
    priceCol,
  ],
  cpu_cooler: [
    { key: 'name', label: 'Name', sortable: true },
    { key: 'fan_rpm', label: 'Fan RPM', sortable: true, format: str },
    { key: 'noise_level', label: 'Noise', sortable: true, format: str },
    { key: 'color', label: 'Color', sortable: true, format: str },
    { key: 'radiator_size', label: 'Radiator', sortable: true, format: str },
    priceCol,
  ],
  case_fans: [
    { key: 'name', label: 'Name', sortable: true },
    { key: 'size', label: 'Size', sortable: true, format: str },
    { key: 'color', label: 'Color', sortable: true, format: str },
    { key: 'rpm', label: 'RPM', sortable: true, format: str },
    { key: 'airflow', label: 'Airflow', sortable: true, format: str },
    { key: 'noise_level', label: 'Noise', sortable: true, format: str },
    { key: 'pwm', label: 'PWM', sortable: true, format: yesNo },
    priceCol,
  ],
  storage: [
    { key: 'name', label: 'Name', sortable: true },
    { key: 'capacity', label: 'Capacity', sortable: true, format: str },
    { key: 'type', label: 'Type', sortable: true, format: str },
    { key: 'cache', label: 'Cache', sortable: true, format: str },
    { key: 'form_factor', label: 'Form Factor', sortable: true, format: str },
    { key: 'interface', label: 'Interface', sortable: true, format: str },
    priceCol,
  ],
}
