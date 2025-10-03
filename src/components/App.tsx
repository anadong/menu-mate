import { useEffect, useMemo, useState } from 'react'
import { classNames, getTodayKey, pickRandom, uniqueList } from 'utils'

type GroupKey = 'meat' | 'fish' | 'vegetable' | 'side' | 'soup' | 'fruit'

const GROUPS: { key: GroupKey; label: string }[] = [
  { key: 'meat', label: 'Món thịt' },
  { key: 'fish', label: 'Món cá' },
  { key: 'vegetable', label: 'Món rau' },
  { key: 'side', label: 'Món phụ' },
  { key: 'soup', label: 'Món canh' },
  { key: 'fruit', label: 'Hoa quả' }
]

type Categories = Record<GroupKey, string[]>

const DEFAULT_CATEGORIES: Categories = {
  meat: ['Nem', 'Sườn xào chua ngọt', 'Thịt viên sốt cà chua', 'Bò xào mướp đắng', 'Trứng thịt', 'Thịt kho', 'Gà'],
  fish: ['Cá kho', 'Mực luộc', 'Cá sốt cà chua'],
  vegetable: ['Rau muống xào tỏi', 'Cải chíp xào tỏi', 'Khoai tây hầm xương'],
  side: ['Đậu rán', 'Cà', 'Dưa góp (Dưa chuột)'],
  soup: ['Canh mùng tơi', 'Canh cải ngọt', 'Canh rau dền', 'Canh bắp cải cà chua'],
  fruit: ['Dưa hấu', 'Bưởi', 'Lựu']
}

type MealKey = 'lunch' | 'dinner'

type DayMenu = Record<MealKey, Record<GroupKey, string>>

const STORAGE_KEYS = {
  categories: 'menu-categories',
  history: 'menu-history'
}

function readCategories(): Categories {
  const raw = localStorage.getItem(STORAGE_KEYS.categories)
  if (!raw) return DEFAULT_CATEGORIES
  try {
    const parsed = JSON.parse(raw) as Partial<Categories>
    const merged: Categories = { ...DEFAULT_CATEGORIES } as Categories
    for (const g of GROUPS) {
      const list = parsed[g.key] ?? DEFAULT_CATEGORIES[g.key]
      merged[g.key] = uniqueList(list)
    }
    return merged
  } catch {
    return DEFAULT_CATEGORIES
  }
}

function writeCategories(categories: Categories) {
  const clean: Categories = { ...categories }
  for (const g of GROUPS) {
    clean[g.key] = uniqueList(clean[g.key])
  }
  localStorage.setItem(STORAGE_KEYS.categories, JSON.stringify(clean))
}

type HistoryItem = { date: string; menu: DayMenu }

function readHistory(): HistoryItem[] {
  const raw = localStorage.getItem(STORAGE_KEYS.history)
  if (!raw) return []
  try {
    const parsed = JSON.parse(raw) as HistoryItem[]
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function writeHistory(history: HistoryItem[]) {
  localStorage.setItem(STORAGE_KEYS.history, JSON.stringify(history))
}

function trimHistory(history: HistoryItem[]): HistoryItem[] {
  // Giữ tối đa 3 ngày (hôm nay + 2 hôm trước) theo thứ tự mới nhất đầu mảng
  return history.slice(0, 3)
}

function computeTodayMenu(categories: Categories, history: HistoryItem[]): DayMenu {
  const today = getTodayKey()
  const existing = history.find((h) => h.date === today)
  if (existing) return existing.menu

  const recent = history.slice(0, 2) // 2 ngày gần nhất
  const recentSetByGroup: Record<GroupKey, Set<string>> = {
    meat: new Set(),
    fish: new Set(),
    vegetable: new Set(),
    side: new Set(),
    soup: new Set(),
    fruit: new Set()
  }

  for (const h of recent) {
    for (const meal of ['lunch', 'dinner'] as MealKey[]) {
      const groups = h.menu[meal]
      for (const g of GROUPS) {
        const v = groups[g.key]
        if (v) recentSetByGroup[g.key].add(v.toLocaleLowerCase())
      }
    }
  }

  const pickForGroup = (group: GroupKey): string => {
    const pool = uniqueList(categories[group])
    const filtered = pool.filter((x) => !recentSetByGroup[group].has(x.toLocaleLowerCase()))
    const chosen = pickRandom(filtered.length ? filtered : pool)
    return chosen ?? ''
  }

  const makeMeal = (): Record<GroupKey, string> => {
    const res = {} as Record<GroupKey, string>
    for (const g of GROUPS) {
      res[g.key] = pickForGroup(g.key)
    }
    return res
  }

  return {
    lunch: makeMeal(),
    dinner: makeMeal()
  }
}

function useHashRoute(): '#today' | '#admin' {
  const [hash, setHash] = useState<string>(() => window.location.hash || '#today')
  useEffect(() => {
    const onHash = () => setHash(window.location.hash || '#today')
    window.addEventListener('hashchange', onHash)
    return () => window.removeEventListener('hashchange', onHash)
  }, [])
  return hash === '#admin' ? '#admin' : '#today'
}

function AdminScreen({ categories, onSave }: { categories: Categories; onSave: (c: Categories) => void }) {
  const [local, setLocal] = useState<Categories>(categories)

  const handleChange = (key: GroupKey, value: string) => {
    const lines = value.split('\n').map((s) => s.trim())
    setLocal({ ...local, [key]: lines })
  }

  return (
    <div className="mx-auto max-w-2xl p-4">
      <h1 className="mb-4 text-2xl font-semibold">Admin</h1>
      <div className="grid gap-4">
        {GROUPS.map((g) => (
          <div key={g.key} className="flex flex-col">
            <label className="mb-2 text-sm font-medium text-gray-700">{g.label}</label>
            <textarea
              className="min-h-32 w-full rounded border border-gray-300 p-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              value={local[g.key].join('\n')}
              onChange={(e) => handleChange(g.key, e.target.value)}
              placeholder={`Mỗi dòng 1 món cho ${g.label.toLowerCase()}`}
            />
          </div>
        ))}
      </div>
      <div className="mt-6 flex justify-end">
        <button
          className="rounded bg-indigo-600 px-4 py-2 text-white shadow hover:bg-indigo-700"
          onClick={() => onSave(local)}
        >
          Lưu
        </button>
      </div>
    </div>
  )
}

function TodayCard({ title, menu, onRefresh }: { title: string; menu: Record<GroupKey, string>; onRefresh?: () => void }) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-lg font-semibold">{title}</h2>
        {onRefresh ? (
          <button
            className="rounded bg-indigo-100 px-2 py-1 text-xs font-medium text-indigo-700 shadow-sm hover:bg-indigo-200"
            onClick={onRefresh}
          >
            Làm mới
          </button>
        ) : null}
      </div>
      <ul className="space-y-2">
        {GROUPS.map((g) => (
          <li key={g.key} className="flex justify-between gap-4">
            <span className="text-gray-600">{g.label}</span>
            <span className="font-medium">{menu[g.key] || '—'}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

function TodayScreen({ categories }: { categories: Categories }) {
  const [history, setHistory] = useState<HistoryItem[]>(() => {
    const h = readHistory()
    return trimHistory(h)
  })

  const todayKey = useMemo(() => getTodayKey(), [])

  const todayMenu = useMemo(() => {
    const computed = computeTodayMenu(categories, history)
    return computed
  }, [categories, history])

  useEffect(() => {
    // Lưu lại menu hôm nay nếu chưa có + dọn lịch sử
    setHistory((prev) => {
      const existing = prev.find((x) => x.date === todayKey)
      if (existing) return trimHistory(prev)
      const next = [{ date: todayKey, menu: todayMenu }, ...prev]
      const trimmed = trimHistory(next)
      writeHistory(trimmed)
      return trimmed
    })
  }, [todayKey, todayMenu])

  const handleRefresh = () => {
    const todayKey = getTodayKey()
    const withoutToday = history.filter((x) => x.date !== todayKey)
    const newMenu = computeTodayMenu(categories, withoutToday)
    const next = [{ date: todayKey, menu: newMenu }, ...withoutToday]
    const trimmed = trimHistory(next)
    writeHistory(trimmed)
    setHistory(trimmed)
  }

  const generateMeal = (): Record<GroupKey, string> => {
    // Tạo 1 bữa mới, tránh trùng 2 ngày gần nhất (không tính hôm nay)
    const recent = history.filter((x) => x.date !== todayKey).slice(0, 2)
    const recentSetByGroup: Record<GroupKey, Set<string>> = {
      meat: new Set(),
      fish: new Set(),
      vegetable: new Set(),
      side: new Set(),
      soup: new Set(),
      fruit: new Set()
    }
    for (const h of recent) {
      for (const meal of ['lunch', 'dinner'] as MealKey[]) {
        const groups = h.menu[meal]
        for (const g of GROUPS) {
          const v = groups[g.key]
          if (v) recentSetByGroup[g.key].add(v.toLocaleLowerCase())
        }
      }
    }
    const pickForGroup = (group: GroupKey): string => {
      const pool = uniqueList(categories[group])
      const filtered = pool.filter((x) => !recentSetByGroup[group].has(x.toLocaleLowerCase()))
      const chosen = pickRandom(filtered.length ? filtered : pool)
      return chosen ?? ''
    }
    const res = {} as Record<GroupKey, string>
    for (const g of GROUPS) res[g.key] = pickForGroup(g.key)
    return res
  }

  const handleRefreshMeal = (meal: MealKey) => {
    const withoutToday = history.filter((x) => x.date !== todayKey)
    const newMeal = generateMeal()
    const currentToday = history.find((x) => x.date === todayKey)
    const baseMenu = currentToday ? currentToday.menu : computeTodayMenu(categories, withoutToday)
    const newMenu: DayMenu = { ...baseMenu, [meal]: newMeal }
    const next = [{ date: todayKey, menu: newMenu }, ...withoutToday]
    const trimmed = trimHistory(next)
    writeHistory(trimmed)
    setHistory(trimmed)
  }

  return (
    <div className="mx-auto max-w-2xl p-4">
      <h1 className="mb-4 text-2xl font-semibold">Hôm nay</h1>
      <div className="grid gap-4 md:grid-cols-2">
        <TodayCard title="Bữa trưa" menu={todayMenu.lunch} onRefresh={() => handleRefreshMeal('lunch')} />
        <TodayCard title="Bữa tối" menu={todayMenu.dinner} onRefresh={() => handleRefreshMeal('dinner')} />
      </div>
    </div>
  )
}

export default function App() {
  const route = useHashRoute()
  const [categories, setCategories] = useState<Categories>(() => readCategories())

  useEffect(() => {
    writeCategories(categories)
  }, [categories])

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="sticky top-0 z-10 border-b border-gray-200 bg-white/80 backdrop-blur">
        <div className="mx-auto flex max-w-2xl items-center justify-between p-4">
          <a href="#today" className={classNames('px-3 py-2 text-sm font-medium', route === '#today' ? 'text-indigo-600' : 'text-gray-600')}>Hôm nay</a>
          <a href="#admin" className={classNames('px-3 py-2 text-sm font-medium', route === '#admin' ? 'text-indigo-600' : 'text-gray-600')}>Admin</a>
        </div>
      </nav>
      {route === '#admin' ? (
        <AdminScreen
          categories={categories}
          onSave={(c) => setCategories(c)}
        />
      ) : (
        <TodayScreen categories={categories} />)
      }
    </div>
  )
}
