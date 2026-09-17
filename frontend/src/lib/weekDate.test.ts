import { describe, expect, it } from 'vitest'
import {
  addDays,
  formatWeekOfLabel,
  isMonday,
  mondayOf,
  parseISODate,
  resolveWeekStart,
  toISODate
} from './weekDate'

describe('weekDate', () => {
  it('formats local ISO dates without timezone shift', () => {
    expect(toISODate(new Date(2026, 8, 14))).toBe('2026-09-14')
  })

  it('parses valid ISO dates and rejects invalid ones', () => {
    expect(toISODate(parseISODate('2026-09-14')!)).toBe('2026-09-14')
    expect(parseISODate('2026-09-31')).toBeNull()
    expect(parseISODate('not-a-date')).toBeNull()
  })

  it('finds Monday of the local week', () => {
    // Sunday Sep 13 2026 → Monday Sep 7
    expect(toISODate(mondayOf(new Date(2026, 8, 13)))).toBe('2026-09-07')
    // Monday Sep 14 2026 → itself
    expect(toISODate(mondayOf(new Date(2026, 8, 14)))).toBe('2026-09-14')
    // Wednesday Sep 16 2026 → Monday Sep 14
    expect(toISODate(mondayOf(new Date(2026, 8, 16)))).toBe('2026-09-14')
  })

  it('detects Mondays and adds days', () => {
    const monday = new Date(2026, 8, 14)
    expect(isMonday(monday)).toBe(true)
    expect(isMonday(addDays(monday, 1))).toBe(false)
    expect(toISODate(addDays(monday, 7))).toBe('2026-09-21')
  })

  it('formats week-of label', () => {
    expect(formatWeekOfLabel(new Date(2026, 8, 8))).toBe('Sep 8')
  })

  it('resolves week query to Monday or falls back to current week Monday', () => {
    expect(resolveWeekStart('2026-09-14')).toBe('2026-09-14')
    // Tuesday — invalid for API
    expect(resolveWeekStart('2026-09-15')).toBe(
      toISODate(mondayOf(new Date()))
    )
    expect(resolveWeekStart(null)).toBe(toISODate(mondayOf(new Date())))
  })
})
