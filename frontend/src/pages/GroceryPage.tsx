import { useParams } from 'react-router-dom'

function GroceryPage () {
  const { weekStart } = useParams<{ weekStart: string }>()

  return (
    <section>
      <h1 className='text-2xl font-semibold text-[var(--color-ink)]'>
        Grocery list
      </h1>
      <p className='mt-2 max-w-xl text-[var(--color-ink-muted)]'>
        Grocery UI comes next for week{' '}
        <span className='font-medium text-[var(--color-ink)]'>
          {weekStart ?? 'unknown'}
        </span>
        .
      </p>
    </section>
  )
}

export default GroceryPage
