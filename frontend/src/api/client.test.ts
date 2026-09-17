import { afterEach, describe, expect, it, vi } from 'vitest'
import { api } from './client'

function mockJsonResponse (body: unknown, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
    text: async () => JSON.stringify(body)
  }
}

describe('api client', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('loads health status with credentials included', async () => {
    const fetchMock = vi.fn().mockResolvedValue(mockJsonResponse({ status: 'ok' }))
    vi.stubGlobal('fetch', fetchMock)

    await expect(api.health()).resolves.toEqual({ status: 'ok' })
    expect(fetchMock).toHaveBeenCalledWith(
      '/health',
      expect.objectContaining({ credentials: 'include' })
    )
    const init = fetchMock.mock.calls[0][1] as RequestInit
    const headers = new Headers(init.headers)
    expect(headers.has('Content-Type')).toBe(false)
    expect(init.signal).toBeInstanceOf(AbortSignal)
  })

  it('checks auth session', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      mockJsonResponse({ authenticated: true })
    )
    vi.stubGlobal('fetch', fetchMock)

    await expect(api.authMe()).resolves.toEqual({ authenticated: true })
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/auth/me',
      expect.objectContaining({ credentials: 'include' })
    )
  })

  it('logs in with a PIN', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      mockJsonResponse({ authenticated: true })
    )
    vi.stubGlobal('fetch', fetchMock)

    await expect(api.login({ pin: '1234' })).resolves.toEqual({
      authenticated: true
    })
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/auth/login',
      expect.objectContaining({
        method: 'POST',
        credentials: 'include',
        body: JSON.stringify({ pin: '1234' })
      })
    )
    const init = fetchMock.mock.calls[0][1] as RequestInit
    const headers = new Headers(init.headers)
    expect(headers.get('Content-Type')).toBe('application/json')
  })

  it('lists recipes', async () => {
    const recipes = [{ id: 1, name: 'Tacos' }]
    const fetchMock = vi.fn().mockResolvedValue(mockJsonResponse(recipes))
    vi.stubGlobal('fetch', fetchMock)

    await expect(api.listRecipes()).resolves.toEqual(recipes)
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/recipes',
      expect.objectContaining({ credentials: 'include' })
    )
  })

  it('imports a recipe with a longer timeout', async () => {
    const recipe = { id: 2, name: 'Imported pasta' }
    const fetchMock = vi.fn().mockResolvedValue(mockJsonResponse(recipe, 201))
    const timeoutSpy = vi.spyOn(AbortSignal, 'timeout')
    vi.stubGlobal('fetch', fetchMock)

    await expect(
      api.importRecipe({ url: 'https://example.com/pasta' })
    ).resolves.toEqual(recipe)

    expect(fetchMock).toHaveBeenCalledWith(
      '/api/recipes/import',
      expect.objectContaining({
        method: 'POST',
        credentials: 'include',
        body: JSON.stringify({ url: 'https://example.com/pasta' }),
        signal: expect.any(AbortSignal)
      })
    )
    expect(timeoutSpy).toHaveBeenCalledWith(60_000)
  })

  it('creates a tag', async () => {
    const tag = { id: 1, name: 'quick', board_visible: true }
    const fetchMock = vi.fn().mockResolvedValue(mockJsonResponse(tag, 201))
    vi.stubGlobal('fetch', fetchMock)

    await expect(
      api.createTag({ name: 'quick', board_visible: true })
    ).resolves.toEqual(tag)
  })

  it('throws when the response is not ok', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        status: 401,
        text: async () => JSON.stringify({ detail: 'Invalid PIN' })
      })
    )

    await expect(api.login({ pin: '0000' })).rejects.toThrow('Invalid PIN')
  })

  it('handles 204 delete responses', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 204,
      text: async () => ''
    })
    vi.stubGlobal('fetch', fetchMock)

    await expect(api.deleteRecipe(3)).resolves.toBeUndefined()
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/recipes/3',
      expect.objectContaining({
        method: 'DELETE',
        credentials: 'include'
      })
    )
  })

  it('loads a week board with credentials', async () => {
    const board = {
      week_start: '2026-09-14',
      days: Array.from({ length: 7 }, (_, dayOfWeek) => ({
        day_of_week: dayOfWeek,
        recipes: []
      }))
    }
    const fetchMock = vi.fn().mockResolvedValue(mockJsonResponse(board))
    vi.stubGlobal('fetch', fetchMock)

    await expect(api.getWeek('2026-09-14')).resolves.toEqual(board)
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/weeks/2026-09-14',
      expect.objectContaining({ credentials: 'include' })
    )

    const controller = new AbortController()
    await api.getWeek('2026-09-14', controller.signal)
    expect(fetchMock).toHaveBeenLastCalledWith(
      '/api/weeks/2026-09-14',
      expect.objectContaining({
        credentials: 'include',
        signal: controller.signal
      })
    )
  })

  it('loads week grocery inventory with credentials', async () => {
    const items = [
      { name: 'Onion', quantities: ['2', '1'] },
      { name: 'Salt', quantities: [] }
    ]
    const fetchMock = vi.fn().mockResolvedValue(mockJsonResponse(items))
    vi.stubGlobal('fetch', fetchMock)

    await expect(api.getWeekGrocery('2026-09-14')).resolves.toEqual(items)
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/weeks/2026-09-14/grocery',
      expect.objectContaining({ credentials: 'include' })
    )

    const controller = new AbortController()
    await api.getWeekGrocery('2026-09-14', controller.signal)
    expect(fetchMock).toHaveBeenLastCalledWith(
      '/api/weeks/2026-09-14/grocery',
      expect.objectContaining({
        credentials: 'include',
        signal: controller.signal
      })
    )
  })

  it('adds a recipe to a day via POST', async () => {
    const board = {
      week_start: '2026-09-14',
      days: Array.from({ length: 7 }, (_, dayOfWeek) => ({
        day_of_week: dayOfWeek,
        recipes: dayOfWeek === 2 ? [{ id: 10, name: 'Pasta' }] : []
      }))
    }
    const fetchMock = vi.fn().mockResolvedValue(mockJsonResponse(board))
    vi.stubGlobal('fetch', fetchMock)

    await expect(
      api.addDayRecipe('2026-09-14', 2, { recipe_id: 10 })
    ).resolves.toEqual(board)
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/weeks/2026-09-14/days/2/recipes',
      expect.objectContaining({
        method: 'POST',
        credentials: 'include',
        body: JSON.stringify({ recipe_id: 10 })
      })
    )
  })

  it('removes a recipe from a day via DELETE', async () => {
    const board = {
      week_start: '2026-09-14',
      days: Array.from({ length: 7 }, (_, dayOfWeek) => ({
        day_of_week: dayOfWeek,
        recipes: []
      }))
    }
    const fetchMock = vi.fn().mockResolvedValue(mockJsonResponse(board))
    vi.stubGlobal('fetch', fetchMock)

    await expect(
      api.removeDayRecipe('2026-09-14', 2, 10)
    ).resolves.toEqual(board)
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/weeks/2026-09-14/days/2/recipes/10',
      expect.objectContaining({
        method: 'DELETE',
        credentials: 'include'
      })
    )
  })

  it('clears a day via DELETE', async () => {
    const board = {
      week_start: '2026-09-14',
      days: Array.from({ length: 7 }, (_, dayOfWeek) => ({
        day_of_week: dayOfWeek,
        recipes: []
      }))
    }
    const fetchMock = vi.fn().mockResolvedValue(mockJsonResponse(board))
    vi.stubGlobal('fetch', fetchMock)

    await expect(api.clearDay('2026-09-14', 1)).resolves.toEqual(board)
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/weeks/2026-09-14/days/1',
      expect.objectContaining({
        method: 'DELETE',
        credentials: 'include'
      })
    )
  })
})
