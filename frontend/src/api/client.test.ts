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
})
