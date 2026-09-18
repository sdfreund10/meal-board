import { useEffect, useId, useRef, useState } from 'react'
import type { FormEvent, SyntheticEvent } from 'react'

interface AdminUnlockDialogProps {
  expired: boolean
  submitting: boolean
  error: string | null
  onSubmit: (password: string) => void
  onCancel: () => void
}

function AdminUnlockDialog ({
  expired,
  submitting,
  error,
  onSubmit,
  onCancel
}: AdminUnlockDialogProps) {
  const titleId = useId()
  const passwordId = useId()
  const dialogRef = useRef<HTMLDialogElement>(null)
  const [password, setPassword] = useState('')

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
    const trimmed = password.trim()
    if (trimmed !== '') onSubmit(trimmed)
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
      onCancel={handleCancel}
      className='m-0 w-full max-w-sm rounded-t-2xl border border-[var(--color-border)] bg-[var(--color-surface-raised)] p-0 shadow-lg backdrop:bg-black/40 backdrop:backdrop-blur-sm open:fixed open:inset-x-0 open:bottom-0 open:top-auto open:z-[60] sm:open:inset-auto sm:open:top-1/2 sm:open:left-1/2 sm:open:-translate-x-1/2 sm:open:-translate-y-1/2 sm:rounded-2xl'
    >
      <form onSubmit={handleSubmit} className='space-y-5 p-4 sm:p-6'>
        <div>
          <h2
            id={titleId}
            className='text-lg font-semibold text-[var(--color-ink)]'
          >
            {expired ? 'Editing access expired' : 'Unlock editing'}
          </h2>
          <p className='mt-1 text-sm text-[var(--color-ink-muted)]'>
            {expired
              ? 'Enter the admin password to finish this action.'
              : 'Enter the admin password to make changes.'}
          </p>
        </div>

        <div>
          <label
            htmlFor={passwordId}
            className='mb-1 block text-sm font-medium text-[var(--color-ink)]'
          >
            Admin password
          </label>
          <input
            id={passwordId}
            type='password'
            autoComplete='current-password'
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            minLength={4}
            required
            autoFocus
            disabled={submitting}
            aria-invalid={error != null}
            aria-describedby={error != null ? `${passwordId}-error` : undefined}
            className='w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-[var(--color-ink)] outline-none focus:border-[var(--color-sage-mid)] focus:ring-2 focus:ring-[var(--color-sage-muted)] disabled:opacity-60'
          />
        </div>

        {error != null && (
          <p
            id={`${passwordId}-error`}
            role='alert'
            className='rounded-lg bg-[var(--color-danger-bg)] px-3 py-2 text-sm text-[var(--color-danger)]'
          >
            {error}
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
            disabled={submitting || password.trim() === ''}
            className='rounded-lg bg-[var(--color-sage-mid)] px-4 py-2 text-sm font-semibold text-[var(--color-on-sage)] transition hover:bg-[var(--color-sage-deep)] disabled:cursor-not-allowed disabled:opacity-60'
          >
            {submitting ? 'Unlocking…' : 'Unlock'}
          </button>
        </div>
      </form>
    </dialog>
  )
}

export default AdminUnlockDialog
