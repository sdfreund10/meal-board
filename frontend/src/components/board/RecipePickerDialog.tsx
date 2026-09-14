import { useEffect, useId, useMemo, useRef, useState } from 'react'
import type { Recipe } from '../../types/recipe'

interface RecipePickerDialogProps {
  recipes: Recipe[]
  loading: boolean
  loadError: string | null
  submitting: boolean
  assignError: string | null
  dayLabel: string
  onSelect: (recipeId: number) => void
  onCancel: () => void
  onRetryLoad: () => void
}

function RecipePickerDialog ({
  recipes,
  loading,
  loadError,
  submitting,
  assignError,
  dayLabel,
  onSelect,
  onCancel,
  onRetryLoad
}: RecipePickerDialogProps) {
  const titleId = useId()
  const searchId = useId()
  const dialogRef = useRef<HTMLDialogElement>(null)
  const [query, setQuery] = useState('')

  useEffect(() => {
    const dialog = dialogRef.current
    if (dialog == null) return

    // Do not call dialog.close() in cleanup: under React StrictMode that fires
    // the native `close` event → onClose/onCancel → parent clears picker state and
    // the dialog never stays open. Unmount removes the element from the top layer.
    if (typeof dialog.showModal === 'function') {
      if (!dialog.open) {
        dialog.showModal()
      }
    } else {
      dialog.setAttribute('open', '')
    }
  }, [])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return recipes
    return recipes.filter((r) => r.name.toLowerCase().includes(q))
  }, [recipes, query])

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby={titleId}
      className='m-0 max-h-[92vh] w-full max-w-md overflow-y-auto rounded-t-2xl border border-[var(--color-border)] bg-[var(--color-surface-raised)] p-0 shadow-lg open:fixed open:inset-x-0 open:bottom-0 open:top-auto open:z-50 sm:open:inset-auto sm:open:top-1/2 sm:open:left-1/2 sm:open:-translate-x-1/2 sm:open:-translate-y-1/2 sm:rounded-2xl'
    >
      <div className='space-y-4 p-4 sm:p-6'>
        <div className='flex items-start justify-between gap-3'>
          <h2
            id={titleId}
            className='text-lg font-semibold text-[var(--color-ink)]'
          >
            Add recipe for {dayLabel}
          </h2>
          <button
            type='button'
            onClick={onCancel}
            className='rounded-md px-2 py-1 text-sm text-[var(--color-ink-muted)] hover:bg-[var(--color-sage-muted)]/60'
          >
            Close
          </button>
        </div>

        <div>
          <label
            htmlFor={searchId}
            className='mb-1 block text-sm text-[var(--color-ink-muted)]'
          >
            Search recipes
          </label>
          <input
            id={searchId}
            type='search'
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder='Filter by name…'
            autoFocus
            disabled={loading || recipes.length === 0}
            className='w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm text-[var(--color-ink)] outline-none focus:border-[var(--color-sage-mid)] focus:ring-2 focus:ring-[var(--color-sage-muted)] disabled:opacity-60'
          />
        </div>

        {loading && (
          <p className='text-sm text-[var(--color-ink-muted)]'>
            Loading recipes…
          </p>
        )}

        {loadError != null && (
          <div
            role='alert'
            className='space-y-2 rounded-lg bg-[var(--color-danger-bg)] px-3 py-2 text-sm text-[var(--color-danger)]'
          >
            <p>{loadError}</p>
            <button
              type='button'
              onClick={onRetryLoad}
              className='rounded-md bg-[var(--color-surface-raised)] px-2.5 py-1 text-[var(--color-ink)]'
            >
              Try again
            </button>
          </div>
        )}

        {!loading && loadError == null && recipes.length === 0 && (
          <p className='text-sm text-[var(--color-ink-muted)]'>
            No recipes yet. Add some in the catalog first.
          </p>
        )}

        {!loading && loadError == null && recipes.length > 0 && filtered.length === 0 && (
          <p className='text-sm text-[var(--color-ink-muted)]'>
            No recipes match “{query.trim()}”.
          </p>
        )}

        {loadError == null && filtered.length > 0 && (
          <ul
            className='max-h-64 space-y-1 overflow-y-auto'
            role='listbox'
            aria-label='Recipes'
          >
            {filtered.map((recipe) => (
              <li key={recipe.id} role='option' aria-selected={false}>
                <button
                  type='button'
                  disabled={submitting}
                  onClick={() => onSelect(recipe.id)}
                  className='flex w-full items-center justify-between gap-2 rounded-lg px-3 py-2.5 text-left text-sm text-[var(--color-ink)] transition hover:bg-[var(--color-sage-muted)]/60 disabled:cursor-not-allowed disabled:opacity-60'
                >
                  <span className='font-medium'>{recipe.name}</span>
                  {submitting
                    ? (
                      <span className='text-xs text-[var(--color-ink-muted)]'>
                        Saving…
                      </span>
                      )
                    : null}
                </button>
              </li>
            ))}
          </ul>
        )}

        {assignError != null && (
          <p
            role='alert'
            className='rounded-lg bg-[var(--color-danger-bg)] px-3 py-2 text-sm text-[var(--color-danger)]'
          >
            {assignError}
          </p>
        )}

        <div className='flex justify-end pt-1'>
          <button
            type='button'
            onClick={onCancel}
            disabled={submitting}
            className='rounded-lg px-4 py-2 text-sm text-[var(--color-ink-muted)] hover:bg-[var(--color-sage-muted)]/60 disabled:opacity-60'
          >
            Cancel
          </button>
        </div>
      </div>
    </dialog>
  )
}

export default RecipePickerDialog
