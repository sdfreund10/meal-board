import { afterEach, describe, expect, it, vi } from 'vitest'
import { api } from './client'

describe('api client', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('loads health status', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ status: 'ok' })
      })
    )

    await expect(api.health()).resolves.toEqual({ status: 'ok' })
  })

  it('throws when the response is not ok', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
        text: async () => 'Server error'
      })
    )

    await expect(api.listItems()).rejects.toThrow('Server error')
  })
})
