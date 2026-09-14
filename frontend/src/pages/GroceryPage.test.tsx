import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { api } from '../api/client'
import type { GroceryItem } from '../types/week'
import GroceryPage from './GroceryPage'

const sampleItems: GroceryItem[] = [
  { name: 'Onion', quantities: ['2', '1'] },
  { name: 'Cilantro', quantities: ['1 bunch'] },
  { name: 'Salt', quantities: [] }
]

function renderGrocery (weekStart = '2026-09-07') {
  return render(
    <MemoryRouter initialEntries={[`/weeks/${weekStart}/grocery`]}>
      <Routes>
        <Route path='/weeks/:weekStart/grocery' element={<GroceryPage />} />
      </Routes>
    </MemoryRouter>
  )
}

describe('GroceryPage', () => {
  beforeEach(() => {
    vi.spyOn(api, 'getWeekGrocery').mockResolvedValue(sampleItems)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('loads grocery inventory for the week', async () => {
    renderGrocery('2026-09-07')

    expect(screen.getByText('Loading grocery inventory…')).toBeInTheDocument()
    expect(await screen.findByText('Onion — 2, 1')).toBeInTheDocument()
    expect(screen.getByText('Cilantro — 1 bunch')).toBeInTheDocument()
    expect(screen.getByText('Salt')).toBeInTheDocument()
    expect(api.getWeekGrocery).toHaveBeenCalledWith(
      '2026-09-07',
      expect.any(AbortSignal)
    )
    expect(
      screen.getByRole('link', { name: 'Back to board' })
    ).toHaveAttribute('href', '/?week=2026-09-07')
  })

  it('shows empty state when there are no ingredients', async () => {
    vi.spyOn(api, 'getWeekGrocery').mockResolvedValue([])
    renderGrocery('2026-09-07')

    expect(
      await screen.findByText('No ingredients this week')
    ).toBeInTheDocument()
    expect(
      screen.getByText(
        'Slot recipes on the board and their ingredients will show up here.'
      )
    ).toBeInTheDocument()
    const links = screen.getAllByRole('link', { name: 'Back to board' })
    expect(links.length).toBeGreaterThanOrEqual(1)
    expect(links[0]).toHaveAttribute('href', '/?week=2026-09-07')
  })

  it('shows load error with retry', async () => {
    const user = userEvent.setup()
    vi.spyOn(api, 'getWeekGrocery')
      .mockRejectedValueOnce(new Error('Network down'))
      .mockResolvedValueOnce(sampleItems)

    renderGrocery('2026-09-07')

    expect(await screen.findByRole('alert')).toHaveTextContent('Network down')
    await user.click(screen.getByRole('button', { name: 'Try again' }))
    expect(await screen.findByText('Onion — 2, 1')).toBeInTheDocument()
  })
})
