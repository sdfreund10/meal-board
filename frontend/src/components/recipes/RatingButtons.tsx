import type { RecipeRating } from '../../types/recipe'

interface RatingButtonsProps {
  rating: RecipeRating
  disabled?: boolean
  onChange: (rating: RecipeRating) => void
}

function ThumbUpIcon ({ filled }: { filled: boolean }) {
  return (
    <svg
      viewBox='0 0 24 24'
      className='h-4 w-4'
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

function ThumbDownIcon ({ filled }: { filled: boolean }) {
  return (
    <svg
      viewBox='0 0 24 24'
      className='h-4 w-4'
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

function RatingButtons ({ rating, disabled, onChange }: RatingButtonsProps) {
  const base =
    'inline-flex items-center justify-center rounded-md p-1.5 transition disabled:opacity-50'
  const idle = 'text-[var(--color-ink-muted)] hover:bg-[var(--color-sage-muted)]/70'
  const active = 'bg-[var(--color-sage-muted)] text-[var(--color-sage-deep)]'

  return (
    <div className='inline-flex items-center gap-0.5' role='group' aria-label='Rating'>
      <button
        type='button'
        disabled={disabled}
        aria-label='Thumbs up'
        aria-pressed={rating === 'up'}
        className={[base, rating === 'up' ? active : idle].join(' ')}
        onClick={(e) => {
          e.stopPropagation()
          onChange(rating === 'up' ? null : 'up')
        }}
      >
        <ThumbUpIcon filled={rating === 'up'} />
      </button>
      <button
        type='button'
        disabled={disabled}
        aria-label='Thumbs down'
        aria-pressed={rating === 'down'}
        className={[base, rating === 'down' ? active : idle].join(' ')}
        onClick={(e) => {
          e.stopPropagation()
          onChange(rating === 'down' ? null : 'down')
        }}
      >
        <ThumbDownIcon filled={rating === 'down'} />
      </button>
    </div>
  )
}

export default RatingButtons
