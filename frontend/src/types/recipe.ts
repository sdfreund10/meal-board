import type { Tag } from './tag'

export type RecipeRating = 'up' | 'down' | null

export interface IngredientInput {
  name: string
  quantity?: string
}

export interface Ingredient extends IngredientInput {
  id: number
  position: number
  quantity: string
}

export interface StepInput {
  text: string
}

export interface Step extends StepInput {
  id: number
  position: number
}

export interface Recipe {
  id: number
  name: string
  rating: RecipeRating
  leftovers: boolean
  source_url: string | null
  ingredients: Ingredient[]
  steps: Step[]
  tags: Tag[]
  created_at: string
  updated_at: string
}

export interface RecipeCreate {
  name: string
  rating?: RecipeRating
  leftovers?: boolean
  source_url?: string | null
  ingredients?: IngredientInput[]
  steps?: StepInput[]
  tag_ids?: number[]
}

export interface RecipeImport {
  url: string
}

export interface RecipeUpdate {
  name?: string
  rating?: RecipeRating
  leftovers?: boolean
  source_url?: string | null
  ingredients?: IngredientInput[]
  steps?: StepInput[]
  tag_ids?: number[]
}
