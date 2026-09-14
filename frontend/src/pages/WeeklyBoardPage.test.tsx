import { StrictMode } from 'react'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { api } from '../api/client'
import type { Recipe } from '../types/recipe'
import type { WeekBoard } from '../types/week'
import { mondayOf, toISODate } from '../lib/weekDate'
import WeeklyBoardPage from './WeeklyBoardPage'

const tags = [
  { id: 1, name: 'weeknight', board_visible: true },
  { id: 2, name: 'batch', board_visible: false }
]

const pasta: Recipe = {
  id: 10,
  name: 'Pasta',
  rating: 'up',
  leftovers: false,
  source_url: null,
  ingredients: [],
  steps: [],
  tags: [tags[0], tags[1]],
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z'
}

const salad: Recipe = {
  id: 11,
  name: 'Salad',
  rating: 'down',
  leftovers: false,
  source_url: null,
  ingredients: [],
  steps: [],
  tags: [{ id: 3, name: 'side', board_visible: true }],
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z'
}

function emptyBoard (weekStart: string): WeekBoard {
  return {
    week_start: weekStart,
    days: [0, 1, 2, 3, 4, 5, 6].map((dayOfWeek) => ({
      day_of_week: dayOfWeek as WeekBoard['days'][number]['day_of_week'],
      recipes: []
    }))
  }
}

function boardWithRecipes (
  weekStart: string,
  day: number,
  recipes: Recipe[]
): WeekBoard {
  const base = emptyBoard(weekStart)
  return {
    ...base,
    days: base.days.map((slot) =>
      slot.day_of_week === day ? { ...slot, recipes } : slot
    )
  }
}

function renderBoard (initialEntry = '/') {
  return render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <WeeklyBoardPage />
    </MemoryRouter>
  )
}

describe('WeeklyBoardPage', () => {
  const currentMonday = toISODate(mondayOf(new Date()))

  beforeEach(() => {
    vi.spyOn(api, 'getWeek').mockResolvedValue(emptyBoard(currentMonday))
    vi.spyOn(api, 'listRecipes').mockResolvedValue([pasta, salad])
  })

  afterEach(() => {
    vi.restoreAllMocks()
    sessionStorage.clear()
  })

  it('loads the current week board', async () => {
    renderBoard()

    expect(screen.getByText('Loading week…')).toBeInTheDocument()
    expect(await screen.findByRole('article', { name: 'Monday' })).toBeInTheDocument()
    expect(api.getWeek).toHaveBeenCalledWith(currentMonday, expect.any(AbortSignal))
    expect(screen.getByRole('link', { name: 'View grocery inventory' })).toHaveAttribute(
      'href',
      `/weeks/${currentMonday}/grocery`
    )
  })

  it('loads a week from the query string', async () => {
    vi.spyOn(api, 'getWeek').mockResolvedValue(emptyBoard('2026-09-07'))
    renderBoard('/?week=2026-09-07')

    await screen.findByRole('article', { name: 'Monday' })
    expect(api.getWeek).toHaveBeenCalledWith('2026-09-07', expect.any(AbortSignal))
    expect(screen.getByRole('heading', { name: /Week of Sep 7/i })).toBeInTheDocument()
  })

  it('navigates to previous and next weeks', async () => {
    const user = userEvent.setup()
    vi.spyOn(api, 'getWeek').mockImplementation(async (weekStart: string) =>
      emptyBoard(weekStart)
    )
    renderBoard('/?week=2026-09-14')
    await screen.findByRole('heading', { name: /Week of Sep 14/i })

    await user.click(screen.getByRole('button', { name: 'Previous week' }))
    await waitFor(() => {
      expect(api.getWeek).toHaveBeenCalledWith('2026-09-07', expect.any(AbortSignal))
    })
    expect(
      await screen.findByRole('heading', { name: /Week of Sep 7/i })
    ).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Next week' }))
    await waitFor(() => {
      expect(api.getWeek).toHaveBeenCalledWith('2026-09-14', expect.any(AbortSignal))
    })
  })

  it('adds a recipe to a day from the picker', async () => {
    const user = userEvent.setup()
    const addSpy = vi
      .spyOn(api, 'addDayRecipe')
      .mockResolvedValue(boardWithRecipes(currentMonday, 0, [pasta]))

    renderBoard(`/?week=${currentMonday}`)
    const monday = await screen.findByRole('article', { name: 'Monday' })
    await user.click(within(monday).getByRole('button', { name: /\+ Add/i }))

    const dialog = await screen.findByRole('dialog')
    expect(
      within(dialog).getByRole('heading', { name: /Add recipe for Monday/i })
    ).toBeInTheDocument()

    await user.click(within(dialog).getByRole('button', { name: 'Pasta' }))

    await waitFor(() => {
      expect(addSpy).toHaveBeenCalledWith(currentMonday, 0, {
        recipe_id: 10
      })
    })
    expect(await screen.findByText('Pasta')).toBeInTheDocument()
    expect(screen.getByText('weeknight')).toBeInTheDocument()
    expect(screen.queryByText('batch')).not.toBeInTheDocument()
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('adds a second recipe without removing the first', async () => {
    const user = userEvent.setup()
    vi.spyOn(api, 'getWeek').mockResolvedValue(
      boardWithRecipes(currentMonday, 0, [pasta])
    )
    const addSpy = vi
      .spyOn(api, 'addDayRecipe')
      .mockResolvedValue(boardWithRecipes(currentMonday, 0, [pasta, salad]))

    renderBoard(`/?week=${currentMonday}`)
    const monday = await screen.findByRole('article', { name: 'Monday' })
    expect(within(monday).getByText('Pasta')).toBeInTheDocument()

    await user.click(within(monday).getByRole('button', { name: /^Add$/i }))
    const dialog = await screen.findByRole('dialog')
    await user.click(within(dialog).getByRole('button', { name: 'Salad' }))

    await waitFor(() => {
      expect(addSpy).toHaveBeenCalledWith(currentMonday, 0, {
        recipe_id: 11
      })
    })
    expect(within(monday).getByText('Pasta')).toBeInTheDocument()
    expect(within(monday).getByText('Salad')).toBeInTheDocument()
    expect(within(monday).getByText('side')).toBeInTheDocument()
  })

  it('removes one recipe from a day', async () => {
    const user = userEvent.setup()
    vi.spyOn(api, 'getWeek').mockResolvedValue(
      boardWithRecipes(currentMonday, 2, [pasta, salad])
    )
    const removeSpy = vi
      .spyOn(api, 'removeDayRecipe')
      .mockResolvedValue(boardWithRecipes(currentMonday, 2, [salad]))

    renderBoard(`/?week=${currentMonday}`)
    const wednesday = await screen.findByRole('article', { name: 'Wednesday' })
    expect(within(wednesday).getByText('Pasta')).toBeInTheDocument()
    expect(within(wednesday).getByText('Salad')).toBeInTheDocument()

    const pastaRow = within(wednesday).getByText('Pasta').closest('li')!
    await user.click(within(pastaRow).getByRole('button', { name: 'Remove' }))

    await waitFor(() => {
      expect(removeSpy).toHaveBeenCalledWith(currentMonday, 2, 10)
    })
    expect(within(wednesday).queryByText('Pasta')).not.toBeInTheDocument()
    expect(within(wednesday).getByText('Salad')).toBeInTheDocument()
  })

  it('clears all recipes on a day', async () => {
    const user = userEvent.setup()
    vi.spyOn(api, 'getWeek').mockResolvedValue(
      boardWithRecipes(currentMonday, 2, [pasta, salad])
    )
    const clearSpy = vi
      .spyOn(api, 'clearDay')
      .mockResolvedValue(emptyBoard(currentMonday))

    renderBoard(`/?week=${currentMonday}`)
    const wednesday = await screen.findByRole('article', { name: 'Wednesday' })
    expect(within(wednesday).getByText('Pasta')).toBeInTheDocument()

    await user.click(within(wednesday).getByRole('button', { name: 'Clear day' }))

    await waitFor(() => {
      expect(clearSpy).toHaveBeenCalledWith(currentMonday, 2)
    })
    expect(within(wednesday).queryByText('Pasta')).not.toBeInTheDocument()
    expect(within(wednesday).queryByText('Salad')).not.toBeInTheDocument()
    expect(
      within(wednesday).getByRole('button', { name: /\+ Add/i })
    ).toBeInTheDocument()
  })

  it('keeps the recipe picker open under StrictMode', async () => {
    const user = userEvent.setup()

    render(
      <StrictMode>
        <MemoryRouter initialEntries={[`/?week=${currentMonday}`]}>
          <WeeklyBoardPage />
        </MemoryRouter>
      </StrictMode>
    )

    const monday = await screen.findByRole('article', { name: 'Monday' })
    await user.click(within(monday).getByRole('button', { name: /\+ Add/i }))

    const dialog = await screen.findByRole('dialog')
    expect(dialog).toBeVisible()
    expect(
      within(dialog).getByRole('heading', { name: /Add recipe for Monday/i })
    ).toBeInTheDocument()

    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeVisible()
    })
  })

  it('shows load error with retry', async () => {
    const user = userEvent.setup()
    vi.spyOn(api, 'getWeek')
      .mockRejectedValueOnce(new Error('Network down'))
      .mockResolvedValueOnce(emptyBoard(currentMonday))

    renderBoard(`/?week=${currentMonday}`)

    expect(await screen.findByRole('alert')).toHaveTextContent('Network down')
    await user.click(screen.getByRole('button', { name: 'Try again' }))
    expect(await screen.findByRole('article', { name: 'Monday' })).toBeInTheDocument()
  })
})
