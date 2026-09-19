import type { AdminLogin, AuthLogin, AuthStatus } from '../types/auth'
import type {
  Recipe,
  RecipeCreate,
  RecipeImport,
  RecipeUpdate
} from '../types/recipe'
import type { Tag, TagCreate, TagUpdate } from '../types/tag'
import type { DinnerSlotAdd, GroceryItem, WeekBoard } from '../types/week'

const DEFAULT_TIMEOUT_MS = 8_000
const RECIPE_IMPORT_TIMEOUT_MS = 60_000

/** Empty in local dev (Vite proxy). Set VITE_API_BASE_URL for production CDN builds. */
export function resolveApiUrl (
  path: string,
  base: string | undefined = import.meta.env.VITE_API_BASE_URL
): string {
  const normalized = (base ?? '').replace(/\/$/, '')
  return `${normalized}${path}`
}

export class ApiError extends Error {
  status: number

  constructor (message: string, status: number) {
    super(message)
    this.name = 'ApiError'
    this.status = status
  }
}

type AuthErrorHandler = (status: number) => void
const authErrorHandlers = new Set<AuthErrorHandler>()
let legacyAuthErrorHandler: AuthErrorHandler | null = null

export function setAuthErrorHandler (
  handler: AuthErrorHandler | null
) {
  legacyAuthErrorHandler = handler
}

export function subscribeToAuthErrors (handler: AuthErrorHandler) {
  authErrorHandlers.add(handler)
  return () => {
    authErrorHandlers.delete(handler)
  }
}

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

  const response = await fetch(resolveApiUrl(path), {
    ...init,
    credentials: 'include',
    signal: init?.signal ?? AbortSignal.timeout(DEFAULT_TIMEOUT_MS),
    headers
  })

  if (!response.ok) {
    const detail = await response.text()
    if (response.status === 401 || response.status === 403) {
      legacyAuthErrorHandler?.(response.status)
      authErrorHandlers.forEach((handler) => handler(response.status))
    }
    throw new ApiError(parseErrorDetail(detail, response.status), response.status)
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

  elevate: async (payload: AdminLogin) =>
    await request<AuthStatus>('/api/auth/elevate', {
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

  importRecipe: async (
    payload: RecipeImport,
    signal = AbortSignal.timeout(RECIPE_IMPORT_TIMEOUT_MS)
  ) =>
    await request<Recipe>('/api/recipes/import', {
      method: 'POST',
      body: JSON.stringify(payload),
      signal
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
    await request<void>(`/api/tags/${id}`, { method: 'DELETE' }),

  getWeek: async (weekStart: string, signal?: AbortSignal) =>
    await request<WeekBoard>(`/api/weeks/${weekStart}`, { signal }),

  getWeekGrocery: async (weekStart: string, signal?: AbortSignal) =>
    await request<GroceryItem[]>(`/api/weeks/${weekStart}/grocery`, { signal }),

  addDayRecipe: async (
    weekStart: string,
    dayOfWeek: number,
    payload: DinnerSlotAdd
  ) =>
    await request<WeekBoard>(
      `/api/weeks/${weekStart}/days/${dayOfWeek}/recipes`,
      {
        method: 'POST',
        body: JSON.stringify(payload)
      }
    ),

  removeDayRecipe: async (
    weekStart: string,
    dayOfWeek: number,
    recipeId: number
  ) =>
    await request<WeekBoard>(
      `/api/weeks/${weekStart}/days/${dayOfWeek}/recipes/${recipeId}`,
      { method: 'DELETE' }
    ),

  clearDay: async (weekStart: string, dayOfWeek: number) =>
    await request<WeekBoard>(`/api/weeks/${weekStart}/days/${dayOfWeek}`, {
      method: 'DELETE'
    })
}
