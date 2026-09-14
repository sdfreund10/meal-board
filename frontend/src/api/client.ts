import type { AuthLogin, AuthStatus } from '../types/auth'
import type { Recipe, RecipeCreate, RecipeUpdate } from '../types/recipe'
import type { Tag, TagCreate, TagUpdate } from '../types/tag'

const DEFAULT_TIMEOUT_MS = 8_000

function parseErrorDetail (raw: string, status: number): string {
  if (!raw) return `Request failed (${status})`
  try {
    const parsed = JSON.parse(raw) as { detail?: unknown }
    if (typeof parsed.detail === 'string') return parsed.detail
  } catch {
    // Not JSON — use the raw body.
  }
  return raw
}

async function request<T> (path: string, init?: RequestInit): Promise<T> {
  const headers = new Headers(init?.headers)
  if (init?.body != null && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json')
  }

  const response = await fetch(path, {
    ...init,
    credentials: 'include',
    signal: init?.signal ?? AbortSignal.timeout(DEFAULT_TIMEOUT_MS),
    headers
  })

  if (!response.ok) {
    const detail = await response.text()
    throw new Error(parseErrorDetail(detail, response.status))
  }

  if (response.status === 204) {
    return undefined as T
  }

  return await (response.json() as Promise<T>)
}

export const api = {
  health: async () => await request<{ status: string }>('/health'),

  authMe: async () => await request<AuthStatus>('/api/auth/me'),

  login: async (payload: AuthLogin) =>
    await request<AuthStatus>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify(payload)
    }),

  logout: async () =>
    await request<AuthStatus>('/api/auth/logout', {
      method: 'POST'
    }),

  listRecipes: async () => await request<Recipe[]>('/api/recipes'),

  createRecipe: async (payload: RecipeCreate) =>
    await request<Recipe>('/api/recipes', {
      method: 'POST',
      body: JSON.stringify(payload)
    }),

  getRecipe: async (id: number) =>
    await request<Recipe>(`/api/recipes/${id}`),

  updateRecipe: async (id: number, payload: RecipeUpdate) =>
    await request<Recipe>(`/api/recipes/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(payload)
    }),

  deleteRecipe: async (id: number) =>
    await request<void>(`/api/recipes/${id}`, { method: 'DELETE' }),

  listTags: async () => await request<Tag[]>('/api/tags'),

  createTag: async (payload: TagCreate) =>
    await request<Tag>('/api/tags', {
      method: 'POST',
      body: JSON.stringify(payload)
    }),

  updateTag: async (id: number, payload: TagUpdate) =>
    await request<Tag>(`/api/tags/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(payload)
    }),

  deleteTag: async (id: number) =>
    await request<void>(`/api/tags/${id}`, { method: 'DELETE' })
}
