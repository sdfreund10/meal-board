import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { ApiError, api } from '../api/client'
import { useAuth } from '../auth/AuthContext'
import DayCard from '../components/board/DayCard'
import RecipePickerDialog from '../components/board/RecipePickerDialog'
import WeekStepper from '../components/board/WeekStepper'
import {
  addDays,
  dayLabel,
  formatWeekOfLabel,
  parseISODate,
  rememberBoardWeek,
  resolveWeekStart,
  toISODate
} from '../lib/weekDate'
import type { Recipe } from '../types/recipe'
import type { DayOfWeek, WeekBoard } from '../types/week'

function emptyBoard (weekStart: string): WeekBoard {
  return {
    week_start: weekStart,
    days: [0, 1, 2, 3, 4, 5, 6].map((dayOfWeek) => ({
      day_of_week: dayOfWeek as DayOfWeek,
      recipes: []
    }))
  }
}

function WeeklyBoardPage () {
  const { requireAdmin } = useAuth()
  const [searchParams, setSearchParams] = useSearchParams()
  const weekStart = useMemo(
    () => resolveWeekStart(searchParams.get('week')),
    [searchParams]
  )

  const monday = useMemo(() => parseISODate(weekStart)!, [weekStart])
  const weekLabel = formatWeekOfLabel(monday)

  const [board, setBoard] = useState<WeekBoard | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)

  const [pickerDay, setPickerDay] = useState<DayOfWeek | null>(null)
  const [recipes, setRecipes] = useState<Recipe[]>([])
  const [recipesLoading, setRecipesLoading] = useState(false)
  const [recipesError, setRecipesError] = useState<string | null>(null)
  const [assignBusy, setAssignBusy] = useState(false)
  const [assignError, setAssignError] = useState<string | null>(null)
  const [busyDay, setBusyDay] = useState<DayOfWeek | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)

  // Keep URL normalized to a Monday week_start.
  useEffect(() => {
    const current = searchParams.get('week')
    if (current !== weekStart) {
      setSearchParams({ week: weekStart }, { replace: true })
    }
    rememberBoardWeek(weekStart)
  }, [weekStart, searchParams, setSearchParams])

  const loadBoard = useCallback(async (start: string, signal?: AbortSignal) => {
    setLoading(true)
    setLoadError(null)
    setActionError(null)
    try {
      const next = await api.getWeek(start, signal)
      setBoard(next)
    } catch (err) {
      if (signal?.aborted) return
      if (err instanceof DOMException && err.name === 'AbortError') return
      if (err instanceof Error && err.name === 'AbortError') return
      setBoard(null)
      setLoadError(
        err instanceof Error ? err.message : 'Could not load week board'
      )
    } finally {
      if (!signal?.aborted) {
        setLoading(false)
      }
    }
  }, [])

  useEffect(() => {
    const controller = new AbortController()
    void loadBoard(weekStart, controller.signal)
    return () => {
      controller.abort()
    }
  }, [weekStart, loadBoard])

  function goToWeek (nextMonday: Date) {
    setSearchParams({ week: toISODate(nextMonday) })
  }

  async function loadRecipesForPicker () {
    setRecipesLoading(true)
    setRecipesError(null)
    try {
      const list = await api.listRecipes()
      setRecipes(list)
    } catch (err) {
      setRecipesError(
        err instanceof Error ? err.message : 'Could not load recipes'
      )
    } finally {
      setRecipesLoading(false)
    }
  }

  function openPicker (day: DayOfWeek) {
    if (busyDay != null || assignBusy) return
    setPickerDay(day)
    setAssignError(null)
    void loadRecipesForPicker()
  }

  function closePicker () {
    if (assignBusy) return
    setPickerDay(null)
    setAssignError(null)
  }

  async function handleAdd (recipeId: number) {
    if (pickerDay == null || assignBusy || busyDay != null) return
    setAssignBusy(true)
    setAssignError(null)
    setBusyDay(pickerDay)
    try {
      const next = await api.addDayRecipe(weekStart, pickerDay, {
        recipe_id: recipeId
      })
      setBoard(next)
      setPickerDay(null)
    } catch (err) {
      if (err instanceof ApiError && err.status === 403) throw err
      setAssignError(
        err instanceof Error ? err.message : 'Could not add recipe'
      )
    } finally {
      setAssignBusy(false)
      setBusyDay(null)
    }
  }

  async function handleRemove (day: DayOfWeek, recipeId: number) {
    if (busyDay != null || assignBusy) return
    setBusyDay(day)
    setActionError(null)
    try {
      const next = await api.removeDayRecipe(weekStart, day, recipeId)
      setBoard(next)
    } catch (err) {
      if (err instanceof ApiError && err.status === 403) throw err
      setActionError(
        err instanceof Error ? err.message : 'Could not remove recipe'
      )
    } finally {
      setBusyDay(null)
    }
  }

  async function handleClear (day: DayOfWeek) {
    if (busyDay != null || assignBusy) return
    setBusyDay(day)
    setActionError(null)
    try {
      const next = await api.clearDay(weekStart, day)
      setBoard(next)
    } catch (err) {
      if (err instanceof ApiError && err.status === 403) throw err
      setActionError(
        err instanceof Error ? err.message : 'Could not clear day'
      )
    } finally {
      setBusyDay(null)
    }
  }

  const days = board?.days ?? emptyBoard(weekStart).days

  return (
    <section aria-labelledby='week-heading'>
      <WeekStepper
        weekStart={weekStart}
        weekLabel={weekLabel}
        onPrevious={() => goToWeek(addDays(monday, -7))}
        onNext={() => goToWeek(addDays(monday, 7))}
      />

      {loading && (
        <p className='mt-8 text-sm text-[var(--color-ink-muted)]'>
          Loading week…
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
            onClick={() => void loadBoard(weekStart)}
            className='rounded-lg bg-[var(--color-sage-mid)] px-3 py-1.5 text-sm font-medium text-[var(--color-on-sage)] hover:bg-[var(--color-sage-deep)]'
          >
            Try again
          </button>
        </div>
      )}

      {actionError != null && (
        <p
          role='alert'
          className='mt-4 rounded-lg bg-[var(--color-danger-bg)] px-3 py-2 text-sm text-[var(--color-danger)]'
        >
          {actionError}
        </p>
      )}

      {!loading && loadError == null && (
        <>
          <div className='mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4'>
            {days.map((slot) => {
              const day = slot.day_of_week as DayOfWeek
              return (
                <DayCard
                  key={day}
                  dayOfWeek={day}
                  recipes={slot.recipes}
                  busy={busyDay === day}
                  onAdd={() => requireAdmin(() => openPicker(day))}
                  onRemove={(recipeId) =>
                    requireAdmin(async () => await handleRemove(day, recipeId))}
                  onClear={() => requireAdmin(async () => await handleClear(day))}
                />
              )
            })}
          </div>

          <p className='mt-6'>
            <Link
              to={`/weeks/${weekStart}/grocery`}
              className='text-sm font-medium text-[var(--color-sage-mid)] underline-offset-2 hover:underline'
            >
              View grocery inventory
            </Link>
          </p>
        </>
      )}

      {pickerDay != null && (
        <RecipePickerDialog
          recipes={recipes}
          loading={recipesLoading}
          loadError={recipesError}
          submitting={assignBusy}
          assignError={assignError}
          dayLabel={dayLabel(pickerDay)}
          onSelect={(id) => requireAdmin(async () => await handleAdd(id))}
          onCancel={closePicker}
          onRetryLoad={() => void loadRecipesForPicker()}
        />
      )}
    </section>
  )
}

export default WeeklyBoardPage
