export interface Item {
  id: number
  title: string
  description: string | null
  created_at: string
}

export interface ItemCreate {
  title: string
  description?: string | null
}
