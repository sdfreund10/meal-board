import { useEffect, useId, useRef, useState } from 'react'
import type { DayOfWeek } from '../../types/week'
import { DAY_LABELS, formatWeekOfLabel, parseISODate } from '../../lib/weekDate'

interface SlotDayPickerDialogProps {
  recipeName: string
  weekStart: string
  submitting: boolean
  error: string | null
  onSelect: (dayOfWeek: DayOfWeek) => void
  onCancel: () => void
}

function SlotDayPickerDialog ({
  recipeName,
  weekStart,
  submitting,
  error,
  onSelect,
  onCancel
}: SlotDayPickerDialogProps) {
  const titleId = useId()
  const dialogRef = useRef<HTMLDialogElement>(null)
  const [busyDay, setBusyDay] = useState<DayOfWeek | null>(null)

  useEffect(() => {
    const dialog = dialogRef.current
    if (dialog == null) return

    // Do not call dialog.close() in cleanup — see RecipeForm / RecipePickerDialog.
    if (typeof dialog.showModal === 'function') {
      if (!dialog.open) {
        dialog.showModal()
      }
    } else {
      dialog.setAttribute('open', '')
    }
  }, [])

  const monday = parseISODate(weekStart)
  const weekLabel =
    monday != null ? formatWeekOfLabel(monday) : weekStart

  function handleSelect (day: DayOfWeek) {
    if (submitting) return
    setBusyDay(day)
    onSelect(day)
  }

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby={titleId}
      className='m-0 max-h-[92vh] w-full max-w-sm overflow-y-auto rounded-t-2xl border border-[var(--color-border)] bg-[var(--color-surface-raised)] p-0 shadow-lg open:fixed open:inset-x-0 open:bottom-0 open:top-auto open:z-50 sm:open:inset-auto sm:open:top-1/2 sm:open:left-1/2 sm:open:-translate-x-1/2 sm:open:-translate-y-1/2 sm:rounded-2xl'
    >
      <div className='space-y-4 p-4 sm:p-6'>
        <div className='flex items-start justify-between gap-3'>
          <h2
            id={titleId}
            className='text-lg font-semibold text-[var(--color-ink)]'
          >
            Slot into night
          </h2>
          <button
            type='button'
            onClick={onCancel}
            className='rounded-md px-2 py-1 text-sm text-[var(--color-ink-muted)] hover:bg-[var(--color-sage-muted)]/60'
          >
            Close
          </button>
        </div>

        <p className='text-sm text-[var(--color-ink-muted)]'>
          Assign <span className='font-medium text-[var(--color-ink)]'>{recipeName}</span>
          {' '}to a night in the week of {weekLabel}.
        </p>

        <ul className='space-y-1' role='listbox' aria-label='Days of the week'>
          {DAY_LABELS.map((label, index) => {
            const day = index as DayOfWeek
            const isBusy = submitting && busyDay === day
            return (
              <li key={label} role='option' aria-selected={false}>
                <button
                  type='button'
                  disabled={submitting}
                  onClick={() => handleSelect(day)}
                  className='flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-left text-sm font-medium text-[var(--color-ink)] transition hover:bg-[var(--color-sage-muted)]/60 disabled:cursor-not-allowed disabled:opacity-60'
                >
                  {label}
                  {isBusy
                    ? (
                      <span className='text-xs font-normal text-[var(--color-ink-muted)]'>
                        Saving…
                      </span>
                      )
                    : null}
                </button>
              </li>
            )
          })}
        </ul>

        {error != null && (
          <p
            role='alert'
            className='rounded-lg bg-[var(--color-danger-bg)] px-3 py-2 text-sm text-[var(--color-danger)]'
          >
            {error}
          </p>
        )}

        <div className='flex justify-end'>
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

export default SlotDayPickerDialog
