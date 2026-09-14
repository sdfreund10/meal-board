export interface Tag {
  id: number
  name: string
  board_visible: boolean
}

export interface TagCreate {
  name: string
  board_visible?: boolean
}

export interface TagUpdate {
  name?: string
  board_visible?: boolean
}
