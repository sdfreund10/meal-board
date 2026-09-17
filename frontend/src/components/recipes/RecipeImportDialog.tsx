import { useEffect, useId, useRef, useState } from 'react'
import type { FormEvent, SyntheticEvent } from 'react'
import { isSafeHttpUrl } from '../../lib/url'

interface RecipeImportDialogProps {
  submitting: boolean
  error: string | null
  onSubmit: (url: string) => void
  onCancel: () => void
}

function RecipeImportDialog ({
  submitting,
  error,
  onSubmit,
  onCancel
}: RecipeImportDialogProps) {
  const titleId = useId()
  const urlInputId = useId()
  const dialogRef = useRef<HTMLDialogElement>(null)
  const [url, setUrl] = useState('')
  const [localError, setLocalError] = useState<string | null>(null)
  const displayError = localError ?? error

  useEffect(() => {
    const dialog = dialogRef.current
    if (dialog == null) return
    if (typeof dialog.showModal === 'function') {
      if (!dialog.open) dialog.showModal()
    } else {
      dialog.setAttribute('open', '')
    }
  }, [])

  function handleSubmit (event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const trimmedUrl = url.trim()
    if (!isSafeHttpUrl(trimmedUrl)) {
      setLocalError('Recipe URL must start with https:// or http://')
      return
    }
    setLocalError(null)
    onSubmit(trimmedUrl)
  }

  function handleCancel (event: SyntheticEvent<HTMLDialogElement>) {
    if (submitting) {
      event.preventDefault()
      return
    }
    onCancel()
  }

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby={titleId}
      aria-modal='true'
      onCancel={handleCancel}
      className='m-0 w-full max-w-md rounded-t-2xl border border-[var(--color-border)] bg-[var(--color-surface-raised)] p-0 shadow-lg open:fixed open:inset-x-0 open:bottom-0 open:top-auto open:z-50 sm:open:inset-auto sm:open:top-1/2 sm:open:left-1/2 sm:open:-translate-x-1/2 sm:open:-translate-y-1/2 sm:rounded-2xl'
    >
      <form onSubmit={handleSubmit} className='space-y-5 p-4 sm:p-6'>
        <div className='flex items-start justify-between gap-3'>
          <div>
            <h2
              id={titleId}
              className='text-lg font-semibold text-[var(--color-ink)]'
            >
              Import recipe from URL
            </h2>
            <p className='mt-1 text-sm text-[var(--color-ink-muted)]'>
              Paste a recipe page and Mealboard will add it to your catalog.
            </p>
          </div>
          <button
            type='button'
            onClick={onCancel}
            disabled={submitting}
            className='rounded-md px-2 py-1 text-sm text-[var(--color-ink-muted)] hover:bg-[var(--color-sage-muted)]/60 disabled:opacity-60'
          >
            Close
          </button>
        </div>

        <div>
          <label
            htmlFor={urlInputId}
            className='mb-1 block text-sm font-medium text-[var(--color-ink)]'
          >
            Recipe URL
          </label>
          <input
            id={urlInputId}
            type='url'
            value={url}
            onChange={(event) => {
              setUrl(event.target.value)
              setLocalError(null)
            }}
            aria-invalid={displayError != null}
            aria-describedby={displayError != null ? `${urlInputId}-error` : undefined}
            placeholder='https://example.com/recipe'
            required
            autoFocus
            disabled={submitting}
            className='w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-[var(--color-ink)] outline-none focus:border-[var(--color-sage-mid)] focus:ring-2 focus:ring-[var(--color-sage-muted)] disabled:opacity-60'
          />
        </div>

        {displayError != null && (
          <p
            id={`${urlInputId}-error`}
            role='alert'
            className='rounded-lg bg-[var(--color-danger-bg)] px-3 py-2 text-sm text-[var(--color-danger)]'
          >
            {displayError}
          </p>
        )}

        {submitting && (
          <p className='text-sm text-[var(--color-ink-muted)]'>
            This may take a moment while the recipe is extracted.
          </p>
        )}

        <div className='flex justify-end gap-2'>
          <button
            type='button'
            onClick={onCancel}
            disabled={submitting}
            className='rounded-lg px-4 py-2 text-sm text-[var(--color-ink-muted)] hover:bg-[var(--color-sage-muted)]/60 disabled:opacity-60'
          >
            Cancel
          </button>
          <button
            type='submit'
            disabled={submitting || url.trim() === ''}
            className='rounded-lg bg-[var(--color-sage-mid)] px-4 py-2 text-sm font-semibold text-[var(--color-on-sage)] transition hover:bg-[var(--color-sage-deep)] disabled:cursor-not-allowed disabled:opacity-60'
          >
            {submitting ? 'Importing…' : 'Import recipe'}
          </button>
        </div>
      </form>
    </dialog>
  )
}

export default RecipeImportDialog
