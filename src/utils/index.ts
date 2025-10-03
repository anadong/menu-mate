export function classNames(...classes: unknown[]): string {
  return classes.filter(Boolean).join(' ')
}

export function getTodayKey(): string {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function normalizeDishName(name: string): string {
  return name.trim()
}

export function uniqueList(items: string[]): string[] {
  const seen = new Set<string>()
  const result: string[] = []
  for (const item of items) {
    const norm = normalizeDishName(item)
    if (!norm) continue
    const key = norm.toLocaleLowerCase()
    if (!seen.has(key)) {
      seen.add(key)
      result.push(norm)
    }
  }
  return result
}

export function pickRandom<T>(list: T[]): T | undefined {
  if (!list.length) return undefined
  const idx = Math.floor(Math.random() * list.length)
  return list[idx]
}
