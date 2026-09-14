import { useId } from 'react'
import type { Recipe, RecipeRating } from '../../types/recipe'
import { isSafeHttpUrl } from '../../lib/url'
import RatingButtons from './RatingButtons'
import TagBadge from './TagBadge'

interface RecipeCardProps {
  recipe: Recipe
  expanded: boolean
  ratingBusy?: boolean
  deleteBusy?: boolean
  onToggle: () => void
  onRate: (rating: RecipeRating) => void
  onEdit: () => void
  onDelete: () => void
  onSlotIntoNight: () => void
}

function RecipeCard ({
  recipe,
  expanded,
  ratingBusy,
  deleteBusy,
  onToggle,
  onRate,
  onEdit,
  onDelete,
  onSlotIntoNight
}: RecipeCardProps) {
  const contentId = useId()
  const safeSource =
    recipe.source_url != null && isSafeHttpUrl(recipe.source_url)
      ? recipe.source_url
      : null

  return (
    <article
      aria-label={recipe.name}
      className='rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-raised)]'
    >
      <div className='flex items-center gap-2 px-3 py-2.5 sm:px-4'>
        <div
          className='min-w-0 flex-1 cursor-pointer text-left'
          onClick={onToggle}
        >
          <div className='flex flex-wrap items-center gap-x-2 gap-y-1'>
            <span className='font-medium text-[var(--color-ink)]'>
              {recipe.name}
            </span>
            {recipe.tags.map((tag) => (
              <TagBadge key={tag.id} tag={tag} />
            ))}
          </div>
        </div>

        <RatingButtons
          rating={recipe.rating}
          disabled={ratingBusy}
          onChange={onRate}
        />

        <button
          type='button'
          onClick={onToggle}
          aria-label={expanded ? 'Collapse recipe' : 'Expand recipe'}
          aria-expanded={expanded}
          aria-controls={contentId}
          className='rounded-md p-1.5 text-[var(--color-ink-muted)] transition hover:bg-[var(--color-sage-muted)]/70'
        >
          <svg
            viewBox='0 0 24 24'
            className={[
              'h-4 w-4 transition-transform',
              expanded ? 'rotate-180' : ''
            ].join(' ')}
            fill='none'
            stroke='currentColor'
            strokeWidth='2'
            aria-hidden='true'
          >
            <path strokeLinecap='round' strokeLinejoin='round' d='M6 9l6 6 6-6' />
          </svg>
        </button>
      </div>

      <div
        id={contentId}
        hidden={!expanded}
        className={
          expanded
            ? 'space-y-4 border-t border-[var(--color-border)] px-3 py-4 sm:px-4'
            : undefined
        }
      >
        {expanded && (
          <>
            {recipe.leftovers && (
              <span className='inline-flex rounded-md bg-[var(--color-sage-muted)] px-2.5 py-1 text-xs font-medium text-[var(--color-sage-deep)]'>
                Good for leftovers
              </span>
            )}

            <section>
              <h3 className='text-sm font-semibold text-[var(--color-ink)]'>
                Ingredients
              </h3>
              {recipe.ingredients.length === 0
                ? (
                  <p className='mt-1 text-sm text-[var(--color-ink-muted)]'>
                    No ingredients listed.
                  </p>
                  )
                : (
                  <ul className='mt-2 space-y-1 text-sm text-[var(--color-ink)]'>
                    {recipe.ingredients.map((ing) => (
                      <li key={ing.id} className='flex gap-2'>
                        <span className='min-w-0 flex-1'>{ing.name}</span>
                        {ing.quantity
                          ? (
                            <span className='shrink-0 text-[var(--color-ink-muted)]'>
                              {ing.quantity}
                            </span>
                            )
                          : null}
                      </li>
                    ))}
                  </ul>
                  )}
            </section>

            <section>
              <h3 className='text-sm font-semibold text-[var(--color-ink)]'>
                Steps
              </h3>
              {recipe.steps.length === 0
                ? (
                  <p className='mt-1 text-sm text-[var(--color-ink-muted)]'>
                    No steps listed.
                  </p>
                  )
                : (
                  <ol className='mt-2 list-decimal space-y-2 pl-5 text-sm text-[var(--color-ink)]'>
                    {recipe.steps.map((step) => (
                      <li key={step.id}>{step.text}</li>
                    ))}
                  </ol>
                  )}
            </section>

            {safeSource != null && (
              <p className='text-sm'>
                <a
                  href={safeSource}
                  target='_blank'
                  rel='noopener noreferrer'
                  className='text-[var(--color-sage-mid)] underline-offset-2 hover:underline'
                >
                  Source
                </a>
              </p>
            )}

            <div className='flex flex-wrap items-center gap-2 pt-1'>
              <button
                type='button'
                onClick={onEdit}
                className='rounded-lg bg-[var(--color-sage-mid)] px-3 py-1.5 text-sm font-medium text-[var(--color-on-sage)] transition hover:bg-[var(--color-sage-deep)]'
              >
                Edit
              </button>
              <button
                type='button'
                onClick={onDelete}
                disabled={deleteBusy}
                className='rounded-lg px-3 py-1.5 text-sm font-medium text-[var(--color-danger)] transition hover:bg-[var(--color-danger-bg)] disabled:opacity-60'
              >
                {deleteBusy ? 'Deleting…' : 'Delete'}
              </button>
              <button
                type='button'
                onClick={onSlotIntoNight}
                className='rounded-lg px-3 py-1.5 text-sm font-medium text-[var(--color-sage-mid)] transition hover:bg-[var(--color-sage-muted)]/70'
              >
                Slot into night…
              </button>
            </div>
          </>
        )}
      </div>
    </article>
  )
}

export default RecipeCard
