import { StrictMode } from 'react'
import {
  fireEvent,
  render,
  screen,
  waitFor,
  within
} from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { api } from '../api/client'
import type { Recipe } from '../types/recipe'
import type { Tag } from '../types/tag'
import RecipesPage from './RecipesPage'

const tags: Tag[] = [
  { id: 1, name: 'weeknight', board_visible: true },
  { id: 2, name: 'batch', board_visible: false }
]

const recipe: Recipe = {
  id: 10,
  name: 'Tacos',
  rating: null,
  leftovers: true,
  source_url: null,
  ingredients: [
    { id: 1, name: 'tortillas', quantity: '8', position: 0 },
    { id: 2, name: 'salsa', quantity: '', position: 1 }
  ],
  steps: [
    { id: 1, text: 'Warm tortillas', position: 0 },
    { id: 2, text: 'Fill and fold', position: 1 }
  ],
  tags: [tags[0]],
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z'
}

function renderPage (ui: React.ReactElement = <RecipesPage />) {
  return render(<MemoryRouter>{ui}</MemoryRouter>)
}

describe('RecipesPage', () => {
  beforeEach(() => {
    vi.spyOn(api, 'listRecipes').mockResolvedValue([recipe])
    vi.spyOn(api, 'listTags').mockResolvedValue(tags)
  })

  afterEach(() => {
    vi.restoreAllMocks()
    sessionStorage.clear()
  })

  it('loads and lists recipes', async () => {
    renderPage()

    expect(screen.getByText('Loading recipes…')).toBeInTheDocument()
    expect(await screen.findByText('Tacos')).toBeInTheDocument()
    expect(screen.getByText('weeknight')).toBeInTheDocument()
  })

  it('shows empty state when there are no recipes', async () => {
    vi.spyOn(api, 'listRecipes').mockResolvedValue([])
    renderPage()

    expect(await screen.findByText('No recipes yet')).toBeInTheDocument()
    expect(
      screen.getAllByRole('button', { name: 'New recipe' }).length
    ).toBeGreaterThan(0)
  })

  it('expands a recipe to show details and actions', async () => {
    const user = userEvent.setup()
    renderPage()

    await screen.findByRole('heading', { name: 'Recipes' })
    await screen.findByText('Tacos')
    await user.click(screen.getByRole('button', { name: 'Expand recipe' }))

    expect(screen.getByText('Good for leftovers')).toBeInTheDocument()
    expect(screen.getByText('tortillas')).toBeInTheDocument()
    expect(screen.getByText('Warm tortillas')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Edit' })).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: /Slot into night/i })
    ).toBeEnabled()
  })

  it('rates a recipe via PATCH', async () => {
    const user = userEvent.setup()
    const updated: Recipe = { ...recipe, rating: 'up' }
    const updateSpy = vi.spyOn(api, 'updateRecipe').mockResolvedValue(updated)

    renderPage()
    await screen.findByText('Tacos')

    await user.click(screen.getByRole('button', { name: 'Thumbs up' }))

    await waitFor(() => {
      expect(updateSpy).toHaveBeenCalledWith(10, { rating: 'up' })
    })
    expect(screen.getByRole('button', { name: 'Thumbs up' })).toHaveAttribute(
      'aria-pressed',
      'true'
    )
  })

  it('opens New recipe dialog and keeps it open under StrictMode', async () => {
    const user = userEvent.setup()
    vi.spyOn(api, 'listRecipes').mockResolvedValue([])

    renderPage(
      <StrictMode>
        <RecipesPage />
      </StrictMode>
    )
    await screen.findByText('No recipes yet')

    await user.click(screen.getAllByRole('button', { name: 'New recipe' })[0])

    const dialog = await screen.findByRole('dialog')
    expect(dialog).toBeVisible()
    expect(
      within(dialog).getByRole('heading', { name: 'New recipe' })
    ).toBeInTheDocument()

    // Effect cleanup must not treat programmatic close as cancel.
    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeVisible()
    })
  })

  it('keeps the new-recipe dialog open after clicking New recipe', async () => {
    const user = userEvent.setup()
    vi.spyOn(api, 'listRecipes').mockResolvedValue([])
    renderPage()

    await screen.findByText('No recipes yet')
    await user.click(screen.getAllByRole('button', { name: 'New recipe' })[0])

    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(
      within(screen.getByRole('dialog')).getByRole('heading', {
        name: 'New recipe'
      })
    ).toBeInTheDocument()

    // Stay open after a tick (guards StrictMode close → onCancel regression).
    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeInTheDocument()
    })
  })

  it('creates a recipe from the form', async () => {
    const user = userEvent.setup()
    vi.spyOn(api, 'listRecipes').mockResolvedValue([])
    const created: Recipe = {
      ...recipe,
      id: 99,
      name: 'Soup',
      leftovers: false,
      ingredients: [],
      steps: [],
      tags: []
    }
    const createSpy = vi.spyOn(api, 'createRecipe').mockResolvedValue(created)

    renderPage()
    await screen.findByText('No recipes yet')

    await user.click(screen.getAllByRole('button', { name: 'New recipe' })[0])
    const dialog = screen.getByRole('dialog')
    await user.type(within(dialog).getByLabelText('Name'), 'Soup')
    await user.click(
      within(dialog).getByRole('button', { name: 'Create recipe' })
    )

    await waitFor(() => {
      expect(createSpy).toHaveBeenCalledWith(
        expect.objectContaining({ name: 'Soup' })
      )
    })
    expect(await screen.findByText('Soup')).toBeInTheDocument()
  })

  it('imports a recipe from a URL', async () => {
    const user = userEvent.setup()
    const imported: Recipe = {
      ...recipe,
      id: 99,
      name: 'Imported pasta',
      source_url: 'https://example.com/pasta'
    }
    const importSpy = vi.spyOn(api, 'importRecipe').mockResolvedValue(imported)

    renderPage()
    await screen.findByText('Tacos')

    await user.click(screen.getByRole('button', { name: 'Import from URL' }))
    const dialog = await screen.findByRole('dialog')
    await user.type(
      within(dialog).getByLabelText('Recipe URL'),
      'https://example.com/pasta'
    )
    await user.click(
      within(dialog).getByRole('button', { name: 'Import recipe' })
    )

    await waitFor(() => {
      expect(importSpy).toHaveBeenCalledWith(
        { url: 'https://example.com/pasta' },
        expect.any(AbortSignal)
      )
    })
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(await screen.findByText('Imported pasta')).toBeInTheDocument()
  })

  it('keeps the import dialog open and shows API errors', async () => {
    const user = userEvent.setup()
    vi.spyOn(api, 'importRecipe').mockRejectedValue(
      new Error('Could not extract recipe from URL')
    )

    renderPage()
    await screen.findByText('Tacos')

    await user.click(screen.getByRole('button', { name: 'Import from URL' }))
    const dialog = await screen.findByRole('dialog')
    await user.type(
      within(dialog).getByLabelText('Recipe URL'),
      'https://example.com/not-a-recipe'
    )
    await user.click(
      within(dialog).getByRole('button', { name: 'Import recipe' })
    )

    expect(await within(dialog).findByRole('alert')).toHaveTextContent(
      'Could not extract recipe from URL'
    )
    expect(dialog).toBeInTheDocument()
  })

  it('validates the import URL and closes on dialog cancel', async () => {
    const user = userEvent.setup()
    const importSpy = vi.spyOn(api, 'importRecipe')

    renderPage()
    await screen.findByText('Tacos')

    await user.click(screen.getByRole('button', { name: 'Import from URL' }))
    const dialog = await screen.findByRole('dialog')
    const input = within(dialog).getByLabelText('Recipe URL')
    await user.type(input, 'ftp://example.com/recipe')
    await user.click(
      within(dialog).getByRole('button', { name: 'Import recipe' })
    )

    expect(await within(dialog).findByRole('alert')).toHaveTextContent(
      'Recipe URL must start with https:// or http://'
    )
    expect(input).toHaveAttribute('aria-invalid', 'true')
    expect(importSpy).not.toHaveBeenCalled()

    fireEvent(dialog, new Event('cancel', { cancelable: true }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('parses newline ingredients and steps and strips list markers', async () => {
    const user = userEvent.setup()
    vi.spyOn(api, 'listRecipes').mockResolvedValue([])
    const created: Recipe = {
      ...recipe,
      id: 99,
      name: 'Soup',
      leftovers: false,
      ingredients: [
        { id: 1, name: 'flour', quantity: '', position: 0 },
        { id: 2, name: 'salt', quantity: '', position: 1 }
      ],
      steps: [
        { id: 1, text: 'Mix', position: 0 },
        { id: 2, text: 'Bake', position: 1 }
      ],
      tags: []
    }
    const createSpy = vi.spyOn(api, 'createRecipe').mockResolvedValue(created)

    renderPage()
    await screen.findByText('No recipes yet')

    await user.click(screen.getAllByRole('button', { name: 'New recipe' })[0])
    const dialog = screen.getByRole('dialog')
    await user.type(within(dialog).getByLabelText('Name'), 'Soup')
    await user.click(within(dialog).getByLabelText('Ingredients'))
    await user.paste('1. flour\n- salt')
    await user.click(within(dialog).getByLabelText('Steps'))
    await user.paste('1) Mix\n2. Bake')
    await user.click(
      within(dialog).getByRole('button', { name: 'Create recipe' })
    )

    await waitFor(() => {
      expect(createSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Soup',
          ingredients: [
            { name: 'flour', quantity: '' },
            { name: 'salt', quantity: '' }
          ],
          steps: [{ text: 'Mix' }, { text: 'Bake' }]
        })
      )
    })
  })

  it('prefills edit form with newline-joined ingredients and steps', async () => {
    const user = userEvent.setup()
    renderPage()

    await screen.findByText('Tacos')
    await user.click(screen.getByRole('button', { name: 'Expand recipe' }))
    await user.click(screen.getByRole('button', { name: 'Edit' }))

    const dialog = await screen.findByRole('dialog')
    expect(within(dialog).getByLabelText('Ingredients')).toHaveValue(
      '8 tortillas\nsalsa'
    )
    expect(within(dialog).getByLabelText('Steps')).toHaveValue(
      'Warm tortillas\nFill and fold'
    )
  })

  it('deletes a recipe after confirm', async () => {
    const user = userEvent.setup()
    const deleteSpy = vi.spyOn(api, 'deleteRecipe').mockResolvedValue(undefined)
    vi.spyOn(window, 'confirm').mockReturnValue(true)

    renderPage()
    await screen.findByText('Tacos')
    await user.click(screen.getByRole('button', { name: 'Expand recipe' }))
    await user.click(screen.getByRole('button', { name: 'Delete' }))

    await waitFor(() => {
      expect(deleteSpy).toHaveBeenCalledWith(10)
    })
    expect(screen.queryByText('Tacos')).not.toBeInTheDocument()
  })

  it('creates a tag from tag management', async () => {
    const user = userEvent.setup()
    const newTag: Tag = { id: 3, name: 'spicy', board_visible: true }
    const createSpy = vi.spyOn(api, 'createTag').mockResolvedValue(newTag)

    renderPage()
    await screen.findByText('Tacos')

    await user.click(screen.getByRole('button', { name: /Manage/i }))
    await user.type(screen.getByLabelText('New tag'), 'spicy')
    await user.click(screen.getByRole('button', { name: 'Add' }))

    await waitFor(() => {
      expect(createSpy).toHaveBeenCalledWith({
        name: 'spicy',
        board_visible: true
      })
    })
    expect(await screen.findByText('spicy')).toBeInTheDocument()
  })

  it('shows load error with retry', async () => {
    const user = userEvent.setup()
    vi.spyOn(api, 'listRecipes').mockRejectedValueOnce(new Error('Network down'))
    vi.spyOn(api, 'listTags').mockResolvedValue(tags)

    renderPage()

    expect(await screen.findByRole('alert')).toHaveTextContent('Network down')

    vi.spyOn(api, 'listRecipes').mockResolvedValue([recipe])
    await user.click(screen.getByRole('button', { name: 'Try again' }))

    expect(await screen.findByText('Tacos')).toBeInTheDocument()
  })

  it('opens slot-into-night day picker and adds', async () => {
    const user = userEvent.setup()
    sessionStorage.setItem('mealboard.boardWeek', '2026-09-07')
    const addSpy = vi.spyOn(api, 'addDayRecipe').mockResolvedValue({
      week_start: '2026-09-07',
      days: []
    })

    renderPage()
    await screen.findByText('Tacos')
    await user.click(screen.getByRole('button', { name: 'Expand recipe' }))
    await user.click(screen.getByRole('button', { name: /Slot into night/i }))

    const dialog = await screen.findByRole('dialog')
    expect(
      within(dialog).getByRole('heading', { name: 'Slot into night' })
    ).toBeInTheDocument()

    await user.click(within(dialog).getByRole('button', { name: 'Tuesday' }))

    await waitFor(() => {
      expect(addSpy).toHaveBeenCalledWith('2026-09-07', 1, {
        recipe_id: 10
      })
    })
  })
})
