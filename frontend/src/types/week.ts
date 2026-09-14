import type { Recipe } from './recipe'

/** 0 = Monday … 6 = Sunday */
export type DayOfWeek = 0 | 1 | 2 | 3 | 4 | 5 | 6

export interface DinnerSlot {
  day_of_week: DayOfWeek
  recipes: Recipe[]
}

export interface WeekBoard {
  week_start: string
  days: DinnerSlot[]
}

export interface DinnerSlotAdd {
  recipe_id: number
}
