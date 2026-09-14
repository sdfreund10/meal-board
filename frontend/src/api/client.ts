import type { Item, ItemCreate } from '../types/item'

async function request<T> (path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(path, {
    headers: { 'Content-Type': 'application/json', ...init?.headers },
    ...init
  })

  if (!response.ok) {
    const detail = await response.text()
    throw new Error(detail || `Request failed (${response.status})`)
  }

  if (response.status === 204) {
    return undefined as T
  }

  return await (response.json() as Promise<T>)
}

export const api = {
  health: async () => await request<{ status: string }>('/health'),
  listItems: async () => await request<Item[]>('/api/items'),
  createItem: async (payload: ItemCreate) =>
    await request<Item>('/api/items', {
      method: 'POST',
      body: JSON.stringify(payload)
    }),
  deleteItem: async (id: number) =>
    await request<void>(`/api/items/${id}`, { method: 'DELETE' })
}
