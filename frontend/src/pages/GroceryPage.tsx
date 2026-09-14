import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { api } from '../api/client'
import {
  formatWeekOfLabel,
  mondayOf,
  parseISODate,
  toISODate
} from '../lib/weekDate'
import type { GroceryItem } from '../types/week'

function formatQuantities (quantities: string[]): string | null {
  if (quantities.length === 0) return null
  return quantities.join(', ')
}

function GroceryPage () {
  const { weekStart: weekParam } = useParams<{ weekStart: string }>()
  const weekStart = useMemo(() => {
    if (weekParam != null && parseISODate(weekParam) != null) {
      return weekParam
    }
    return toISODate(mondayOf(new Date()))
  }, [weekParam])
  const monday = useMemo(() => parseISODate(weekStart)!, [weekStart])
  const weekLabel = formatWeekOfLabel(monday)

  const [items, setItems] = useState<GroceryItem[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)

  const loadGrocery = useCallback(async (start: string, signal?: AbortSignal) => {
    setLoading(true)
    setLoadError(null)
    try {
      const next = await api.getWeekGrocery(start, signal)
      setItems(next)
    } catch (err) {
      if (signal?.aborted) return
      if (err instanceof DOMException && err.name === 'AbortError') return
      if (err instanceof Error && err.name === 'AbortError') return
      setItems([])
      setLoadError(
        err instanceof Error ? err.message : 'Could not load grocery inventory'
      )
    } finally {
      if (!signal?.aborted) {
        setLoading(false)
      }
    }
  }, [])

  useEffect(() => {
    const controller = new AbortController()
    void loadGrocery(weekStart, controller.signal)
    return () => {
      controller.abort()
    }
  }, [weekStart, loadGrocery])

  return (
    <section>
      <div className='flex flex-wrap items-baseline justify-between gap-3'>
        <div>
          <h1 className='text-2xl font-semibold text-[var(--color-ink)]'>
            Grocery inventory
          </h1>
          <p className='mt-1 text-sm text-[var(--color-ink-muted)]'>
            Ingredients needed for week of {weekLabel}
          </p>
        </div>
        <Link
          to={`/?week=${weekStart}`}
          className='text-sm font-medium text-[var(--color-sage-mid)] underline-offset-2 hover:underline'
        >
          Back to board
        </Link>
      </div>

      {loading && (
        <p className='mt-8 text-sm text-[var(--color-ink-muted)]'>
          Loading grocery inventory…
        </p>
      )}

      {loadError != null && !loading && (
        <div
          role='alert'
          className='mt-8 space-y-3 rounded-xl border border-[var(--color-danger)]/30 bg-[var(--color-danger-bg)] px-4 py-3'
        >
          <p className='text-sm text-[var(--color-danger)]'>{loadError}</p>
          <button
            type='button'
            onClick={() => void loadGrocery(weekStart)}
            className='rounded-lg bg-[var(--color-sage-mid)] px-3 py-1.5 text-sm font-medium text-[var(--color-on-sage)] hover:bg-[var(--color-sage-deep)]'
          >
            Try again
          </button>
        </div>
      )}

      {!loading && loadError == null && items.length === 0 && (
        <div className='mt-8 rounded-xl border border-dashed border-[var(--color-border)] px-6 py-10 text-center'>
          <p className='font-medium text-[var(--color-ink)]'>
            No ingredients this week
          </p>
          <p className='mt-1 text-sm text-[var(--color-ink-muted)]'>
            Slot recipes on the board and their ingredients will show up here.
          </p>
          <Link
            to={`/?week=${weekStart}`}
            className='mt-4 inline-block rounded-lg bg-[var(--color-sage-mid)] px-4 py-2 text-sm font-semibold text-[var(--color-on-sage)] transition hover:bg-[var(--color-sage-deep)]'
          >
            Back to board
          </Link>
        </div>
      )}

      {!loading && loadError == null && items.length > 0 && (
        <ul className='mt-8 divide-y divide-[var(--color-border)] rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-raised)]'>
          {items.map((item) => {
            const qty = formatQuantities(item.quantities)
            const label =
              qty != null ? `${item.name} — ${qty}` : item.name
            return (
              <li
                key={item.name}
                className='px-4 py-3 text-[var(--color-ink)]'
              >
                {label}
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}

export default GroceryPage
