import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ApiError, api } from './api/client'
import type { Recipe } from './types/recipe'
import App from './App'

describe('App auth routing', () => {
  beforeEach(() => {
    vi.spyOn(api, 'listRecipes').mockResolvedValue([])
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('shows the public recipe catalog without a session', async () => {
    vi.spyOn(api, 'authMe').mockResolvedValue({
      authenticated: false,
      admin_access: false
    })

    render(
      <MemoryRouter initialEntries={['/recipes']}>
        <App />
      </MemoryRouter>
    )

    expect(
      await screen.findByRole('heading', { name: 'Recipes' })
    ).toBeInTheDocument()
    expect(screen.queryByText('Enter household PIN')).not.toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Board' })).not.toBeInTheDocument()
  })

  it('gates the board behind the household PIN', async () => {
    vi.spyOn(api, 'authMe').mockResolvedValue({
      authenticated: false,
      admin_access: false
    })

    render(
      <MemoryRouter initialEntries={['/']}>
        <App />
      </MemoryRouter>
    )

    expect(await screen.findByText('Enter household PIN')).toBeInTheDocument()
  })

  it('shows read-only editing status for a household session', async () => {
    vi.spyOn(api, 'authMe').mockResolvedValue({
      authenticated: true,
      admin_access: false
    })
    vi.spyOn(api, 'getWeek').mockResolvedValue({
      week_start: '2026-09-14',
      days: []
    })

    render(
      <MemoryRouter initialEntries={['/?week=2026-09-14']}>
        <App />
      </MemoryRouter>
    )

    expect(
      await screen.findByRole('button', { name: /Read-only/i })
    ).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Board' })).toBeInTheDocument()
  })

  it('preserves a recipe draft and retries after editing access expires', async () => {
    const user = userEvent.setup()
    vi.spyOn(api, 'authMe').mockResolvedValue({
      authenticated: true,
      admin_access: true
    })
    vi.spyOn(api, 'listRecipes').mockResolvedValue([])
    vi.spyOn(api, 'listTags').mockResolvedValue([])
    const created: Recipe = {
      id: 9,
      name: 'Soup',
      rating: null,
      leftovers: false,
      source_url: null,
      ingredients: [],
      steps: [],
      tags: [],
      created_at: '2026-09-16T00:00:00Z',
      updated_at: '2026-09-16T00:00:00Z'
    }
    const create = vi
      .spyOn(api, 'createRecipe')
      .mockRejectedValueOnce(new ApiError('Admin access required', 403))
      .mockResolvedValueOnce(created)
    vi.spyOn(api, 'elevate').mockResolvedValue({
      authenticated: true,
      admin_access: true
    })

    render(
      <MemoryRouter initialEntries={['/recipes']}>
        <App />
      </MemoryRouter>
    )
    await screen.findByText('No recipes yet')
    await user.click(screen.getAllByRole('button', { name: 'New recipe' })[0])
    await user.type(screen.getByLabelText('Name'), 'Soup')
    await user.click(screen.getByRole('button', { name: 'Create recipe' }))

    const unlockDialog = await screen.findByRole('dialog', {
      name: 'Editing access expired'
    })
    expect(screen.getByLabelText('Name')).toHaveValue('Soup')
    await user.type(
      within(unlockDialog).getByLabelText('Admin password'),
      'secret'
    )
    await user.click(
      within(unlockDialog).getByRole('button', { name: 'Unlock' })
    )

    await waitFor(() => expect(create).toHaveBeenCalledTimes(2))
    expect(create.mock.calls[1]).toEqual(create.mock.calls[0])
    expect(await screen.findByText('Soup')).toBeInTheDocument()
  })
})
