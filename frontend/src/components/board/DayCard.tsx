import type { Recipe } from '../../types/recipe'
import type { DayOfWeek } from '../../types/week'
import { dayLabel } from '../../lib/weekDate'
import TagBadge from '../recipes/TagBadge'

interface DayCardProps {
  dayOfWeek: DayOfWeek
  recipes: Recipe[]
  busy: boolean
  onAdd: () => void
  onRemove: (recipeId: number) => void
  onClear: () => void
}

function RatingIcon ({ rating }: { rating: 'up' | 'down' }) {
  const filled = true
  if (rating === 'up') {
    return (
      <svg
        viewBox='0 0 24 24'
        className='h-4 w-4 text-[var(--color-sage-deep)]'
        fill={filled ? 'currentColor' : 'none'}
        stroke='currentColor'
        strokeWidth='2'
        aria-hidden='true'
      >
        <path
          strokeLinecap='round'
          strokeLinejoin='round'
          d='M7 10v10M14 21h4.28a2 2 0 0 0 1.95-1.54l1.5-6A2 2 0 0 0 19.78 11H14V6a3 3 0 0 0-3-3l-2 7H7'
        />
      </svg>
    )
  }
  return (
    <svg
      viewBox='0 0 24 24'
      className='h-4 w-4 text-[var(--color-ink-muted)]'
      fill={filled ? 'currentColor' : 'none'}
      stroke='currentColor'
      strokeWidth='2'
      aria-hidden='true'
    >
      <path
        strokeLinecap='round'
        strokeLinejoin='round'
        d='M17 14V4M10 3H5.72a2 2 0 0 0-1.95 1.54l-1.5 6A2 2 0 0 0 4.22 13H10v5a3 3 0 0 0 3 3l2-7h2'
      />
    </svg>
  )
}

function RecipeSlot ({
  recipe,
  busy,
  onRemove
}: {
  recipe: Recipe
  busy: boolean
  onRemove: () => void
}) {
  const boardTags = recipe.tags.filter((tag) => tag.board_visible)

  return (
    <div className='flex flex-col gap-2 rounded-lg border border-[var(--color-border)]/70 bg-[var(--color-surface)]/50 px-2.5 py-2'>
      <div className='flex items-start justify-between gap-2'>
        <p className='font-medium text-[var(--color-ink)]'>{recipe.name}</p>
        {recipe.rating != null && (
          <span
            className='inline-flex shrink-0'
            title={recipe.rating === 'up' ? 'Thumbs up' : 'Thumbs down'}
            aria-label={
              recipe.rating === 'up' ? 'Rated thumbs up' : 'Rated thumbs down'
            }
          >
            <RatingIcon rating={recipe.rating} />
          </span>
        )}
      </div>
      {boardTags.length > 0 && (
        <div className='flex flex-wrap gap-1.5'>
          {boardTags.map((tag) => (
            <TagBadge key={tag.id} tag={tag} />
          ))}
        </div>
      )}
      <div className='pt-0.5'>
        <button
          type='button'
          onClick={onRemove}
          disabled={busy}
          className='rounded-lg px-2.5 py-1 text-xs font-medium text-[var(--color-danger)] transition hover:bg-[var(--color-danger-bg)] disabled:opacity-60'
        >
          Remove
        </button>
      </div>
    </div>
  )
}

function DayCard ({
  dayOfWeek,
  recipes,
  busy,
  onAdd,
  onRemove,
  onClear
}: DayCardProps) {
  const label = dayLabel(dayOfWeek)
  const empty = recipes.length === 0

  return (
    <article
      aria-label={label}
      className='flex min-h-[7.5rem] flex-col rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-raised)] p-3 sm:p-4'
    >
      <header className='mb-2 flex items-center justify-between gap-2'>
        <h2 className='text-sm font-semibold text-[var(--color-sage-deep)]'>
          {label}
        </h2>
      </header>

      {empty
        ? (
          <button
            type='button'
            onClick={onAdd}
            disabled={busy}
            className='flex flex-1 flex-col items-center justify-center gap-1 rounded-lg border border-dashed border-[var(--color-border)] bg-[var(--color-surface)]/60 px-3 py-4 text-sm text-[var(--color-ink-muted)] transition hover:border-[var(--color-sage-mid)] hover:bg-[var(--color-sage-muted)]/40 hover:text-[var(--color-sage-deep)] disabled:cursor-not-allowed disabled:opacity-60'
          >
            <span className='text-base font-medium'>+ Add</span>
            <span className='text-xs'>Pick a recipe</span>
          </button>
          )
        : (
          <div className='flex flex-1 flex-col gap-2'>
            <ul className='flex flex-col gap-2'>
              {recipes.map((recipe) => (
                <li key={recipe.id}>
                  <RecipeSlot
                    recipe={recipe}
                    busy={busy}
                    onRemove={() => onRemove(recipe.id)}
                  />
                </li>
              ))}
            </ul>
            <div className='mt-auto flex flex-wrap gap-2 pt-2'>
              <button
                type='button'
                onClick={onAdd}
                disabled={busy}
                className='rounded-lg px-2.5 py-1 text-xs font-medium text-[var(--color-sage-mid)] transition hover:bg-[var(--color-sage-muted)]/70 disabled:opacity-60'
              >
                Add
              </button>
              <button
                type='button'
                onClick={onClear}
                disabled={busy}
                className='rounded-lg px-2.5 py-1 text-xs font-medium text-[var(--color-danger)] transition hover:bg-[var(--color-danger-bg)] disabled:opacity-60'
              >
                {busy ? 'Clearing…' : 'Clear day'}
              </button>
            </div>
          </div>
          )}
    </article>
  )
}

export default DayCard
