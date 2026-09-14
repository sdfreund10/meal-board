import type { DayOfWeek } from '../types/week'

export const DAY_LABELS = [
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
  'Sunday'
] as const

const BOARD_WEEK_STORAGE_KEY = 'mealboard.boardWeek'

/** Local calendar date as YYYY-MM-DD (no timezone shift). */
export function toISODate (date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

/** Parse YYYY-MM-DD as a local calendar date; null if invalid. */
export function parseISODate (iso: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso)
  if (match == null) return null
  const year = Number(match[1])
  const month = Number(match[2])
  const day = Number(match[3])
  const date = new Date(year, month - 1, day)
  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    return null
  }
  return date
}

export function isMonday (date: Date): boolean {
  return date.getDay() === 1
}

/** Monday of the local week containing `date` (weeks start Monday). */
export function mondayOf (date: Date): Date {
  const local = new Date(date.getFullYear(), date.getMonth(), date.getDate())
  const day = local.getDay()
  const diff = day === 0 ? -6 : 1 - day
  local.setDate(local.getDate() + diff)
  return local
}

export function addDays (date: Date, days: number): Date {
  const next = new Date(date.getFullYear(), date.getMonth(), date.getDate())
  next.setDate(next.getDate() + days)
  return next
}

/** e.g. "Sep 8" for week stepper label. */
export function formatWeekOfLabel (monday: Date): string {
  return monday.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

/**
 * Resolve week_start from a URL query value.
 * Invalid / non-Monday values fall back to the Monday of the current local week.
 */
export function resolveWeekStart (weekParam: string | null): string {
  if (weekParam != null) {
    const parsed = parseISODate(weekParam)
    if (parsed != null && isMonday(parsed)) {
      return toISODate(parsed)
    }
  }
  return toISODate(mondayOf(new Date()))
}

export function rememberBoardWeek (weekStart: string): void {
  try {
    sessionStorage.setItem(BOARD_WEEK_STORAGE_KEY, weekStart)
  } catch {
    // Private mode / quota — ignore.
  }
}

/** Last board week from session, else Monday of the current local week. */
export function boardWeekOrCurrent (): string {
  try {
    const stored = sessionStorage.getItem(BOARD_WEEK_STORAGE_KEY)
    if (stored != null) {
      const parsed = parseISODate(stored)
      if (parsed != null && isMonday(parsed)) {
        return toISODate(parsed)
      }
    }
  } catch {
    // ignore
  }
  return toISODate(mondayOf(new Date()))
}

export function dayLabel (dayOfWeek: DayOfWeek): string {
  return DAY_LABELS[dayOfWeek]
}
