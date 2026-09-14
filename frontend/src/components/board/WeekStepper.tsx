interface WeekStepperProps {
  weekStart: string
  weekLabel: string
  onPrevious: () => void
  onNext: () => void
}

function WeekStepper ({
  weekStart,
  weekLabel,
  onPrevious,
  onNext
}: WeekStepperProps) {
  return (
    <div
      className='flex items-center justify-center gap-2 sm:justify-start'
      role='group'
      aria-label='Week navigation'
    >
      <button
        type='button'
        onClick={onPrevious}
        aria-label='Previous week'
        className='rounded-lg px-2.5 py-1.5 text-lg leading-none text-[var(--color-ink-muted)] transition hover:bg-[var(--color-sage-muted)]/70 hover:text-[var(--color-ink)]'
      >
        ‹
      </button>
      <h1
        className='min-w-0 text-center text-xl font-semibold text-[var(--color-ink)] sm:text-2xl'
        id='week-heading'
      >
        Week of {weekLabel}
        <span className='sr-only'> starting {weekStart}</span>
      </h1>
      <button
        type='button'
        onClick={onNext}
        aria-label='Next week'
        className='rounded-lg px-2.5 py-1.5 text-lg leading-none text-[var(--color-ink-muted)] transition hover:bg-[var(--color-sage-muted)]/70 hover:text-[var(--color-ink)]'
      >
        ›
      </button>
    </div>
  )
}

export default WeekStepper
