import { useState } from 'react'
import type { FormEvent } from 'react'
import { useAuth } from '../auth/AuthContext'

function PinGate () {
  const { login } = useAuth()
  const [pin, setPin] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit (event: FormEvent) {
    event.preventDefault()
    if (!pin.trim()) return

    setSubmitting(true)
    setError(null)
    try {
      const authenticated = await login(pin.trim())
      if (!authenticated) {
        setError('Could not sign in. Check your PIN and try again.')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Invalid PIN')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className='flex min-h-[60vh] items-center justify-center px-4'>
      <div className='w-full max-w-sm'>
        <p className='text-sm font-medium tracking-wide text-[var(--color-sage-mid)]'>
          Mealboard
        </p>
        <h1 className='mt-2 text-2xl font-semibold text-[var(--color-ink)]'>
          Enter household PIN
        </h1>
        <p className='mt-2 text-sm text-[var(--color-ink-muted)]'>
          Sign in to plan meals for the week.
        </p>

        <form onSubmit={(e) => void handleSubmit(e)} className='mt-8 space-y-4'>
          <div>
            <label
              htmlFor='pin'
              className='mb-1 block text-sm text-[var(--color-ink-muted)]'
            >
              PIN
            </label>
            <input
              id='pin'
              type='password'
              inputMode='numeric'
              autoComplete='current-password'
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              className='w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-raised)] px-3 py-2.5 text-[var(--color-ink)] outline-none focus:border-[var(--color-sage-mid)] focus:ring-2 focus:ring-[var(--color-sage-muted)]'
              required
              minLength={4}
              autoFocus
            />
          </div>

          {error && (
            <p
              role='alert'
              className='rounded-lg bg-[var(--color-danger-bg)] px-3 py-2 text-sm text-[var(--color-danger)]'
            >
              {error}
            </p>
          )}

          <button
            type='submit'
            disabled={submitting}
            className='w-full rounded-lg bg-[var(--color-sage-mid)] px-4 py-2.5 text-sm font-semibold text-[var(--color-on-sage)] transition hover:bg-[var(--color-sage-deep)] disabled:cursor-not-allowed disabled:opacity-60'
          >
            {submitting ? 'Checking…' : 'Unlock'}
          </button>
        </form>
      </div>
    </div>
  )
}

export default PinGate
