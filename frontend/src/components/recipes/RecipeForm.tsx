import { useEffect, useId, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import type {
  Recipe,
  RecipeCreate,
  RecipeRating
} from '../../types/recipe'
import type { Tag } from '../../types/tag'
import { parseListLines } from '../../lib/parseListLines'
import { isSafeHttpUrl } from '../../lib/url'
import RatingButtons from './RatingButtons'

export interface RecipeFormValues {
  name: string
  leftovers: boolean
  source_url: string
  rating: RecipeRating
  ingredientsText: string
  stepsText: string
  tag_ids: number[]
}

interface RecipeFormProps {
  mode: 'create' | 'edit'
  recipe?: Recipe
  tags: Tag[]
  submitting: boolean
  error: string | null
  onSubmit: (values: RecipeCreate) => void
  onCancel: () => void
}

function formatIngredientLine (name: string, quantity: string): string {
  const qty = quantity.trim()
  if (!qty) return name
  return `${qty} ${name}`
}

function fromRecipe (recipe: Recipe): RecipeFormValues {
  return {
    name: recipe.name,
    leftovers: recipe.leftovers,
    source_url: recipe.source_url ?? '',
    rating: recipe.rating,
    ingredientsText: recipe.ingredients
      .map((ing) => formatIngredientLine(ing.name, ing.quantity))
      .join('\n'),
    stepsText: recipe.steps.map((step) => step.text).join('\n'),
    tag_ids: recipe.tags.map((t) => t.id)
  }
}

function defaultValues (): RecipeFormValues {
  return {
    name: '',
    leftovers: false,
    source_url: '',
    rating: null,
    ingredientsText: '',
    stepsText: '',
    tag_ids: []
  }
}

function RecipeForm ({
  mode,
  recipe,
  tags,
  submitting,
  error,
  onSubmit,
  onCancel
}: RecipeFormProps) {
  const titleId = useId()
  const nameInputId = useId()
  const sourceInputId = useId()
  const ingredientsInputId = useId()
  const ingredientsHintId = useId()
  const stepsInputId = useId()
  const stepsHintId = useId()
  const dialogRef = useRef<HTMLDialogElement>(null)
  const [values, setValues] = useState<RecipeFormValues>(() =>
    recipe != null ? fromRecipe(recipe) : defaultValues()
  )
  const [localError, setLocalError] = useState<string | null>(null)

  useEffect(() => {
    setValues(recipe != null ? fromRecipe(recipe) : defaultValues())
    setLocalError(null)
  }, [recipe, mode])

  useEffect(() => {
    const dialog = dialogRef.current
    if (dialog == null) return

    // Do not call dialog.close() in cleanup: under React StrictMode that fires
    // the native `close` event → onClose/onCancel → parent clears formMode and
    // the dialog never stays open. Unmount removes the element from the top layer.
    if (typeof dialog.showModal === 'function') {
      if (!dialog.open) {
        dialog.showModal()
      }
    } else {
      dialog.setAttribute('open', '')
    }
  }, [])

  function handleSubmit (event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const name = values.name.trim()
    if (!name) return

    const ingredients = parseListLines(values.ingredientsText).map((line) => ({
      name: line,
      quantity: ''
    }))

    const steps = parseListLines(values.stepsText).map((text) => ({ text }))

    const source = values.source_url.trim()
    if (source !== '' && !isSafeHttpUrl(source)) {
      setLocalError('Source URL must start with https:// or http://')
      return
    }
    setLocalError(null)

    onSubmit({
      name,
      leftovers: values.leftovers,
      rating: values.rating,
      source_url: source === '' ? null : source,
      ingredients,
      steps,
      tag_ids: values.tag_ids
    })
  }

  const displayError = localError ?? error

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby={titleId}
      // onClose={handleDialogClose}
      className='m-0 max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-t-2xl border border-[var(--color-border)] bg-[var(--color-surface-raised)] p-0 shadow-lg open:fixed open:inset-x-0 open:bottom-0 open:top-auto open:z-50 sm:open:inset-auto sm:open:top-1/2 sm:open:left-1/2 sm:open:-translate-x-1/2 sm:open:-translate-y-1/2 sm:rounded-2xl'
    >
      <form onSubmit={handleSubmit} className='space-y-5 p-4 sm:p-6'>
        <div className='flex items-start justify-between gap-3'>
          <h2
            id={titleId}
            className='text-lg font-semibold text-[var(--color-ink)]'
          >
            {mode === 'create' ? 'New recipe' : 'Edit recipe'}
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
            htmlFor={nameInputId}
            className='mb-1 block text-sm text-[var(--color-ink-muted)]'
          >
            Name
          </label>
          <input
            id={nameInputId}
            value={values.name}
            onChange={(e) =>
              setValues((prev) => ({ ...prev, name: e.target.value }))}
            required
            autoFocus
            className='w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-[var(--color-ink)] outline-none focus:border-[var(--color-sage-mid)] focus:ring-2 focus:ring-[var(--color-sage-muted)]'
          />
        </div>

        <div>
          <label
            htmlFor={ingredientsInputId}
            className='mb-1 block text-sm font-medium text-[var(--color-ink)]'
          >
            Ingredients
          </label>
          <p
            id={ingredientsHintId}
            className='mb-2 text-xs text-[var(--color-ink-muted)]'
          >
            One ingredient per line.
          </p>
          <textarea
            id={ingredientsInputId}
            aria-describedby={ingredientsHintId}
            rows={6}
            spellCheck={false}
            value={values.ingredientsText}
            onChange={(e) =>
              setValues((prev) => ({
                ...prev,
                ingredientsText: e.target.value
              }))}
            placeholder={'1 cup flour\n2 eggs\n- salt'}
            className='w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm outline-none focus:border-[var(--color-sage-mid)] focus:ring-2 focus:ring-[var(--color-sage-muted)]'
          />
        </div>

        <div>
          <label
            htmlFor={stepsInputId}
            className='mb-1 block text-sm font-medium text-[var(--color-ink)]'
          >
            Steps
          </label>
          <p
            id={stepsHintId}
            className='mb-2 text-xs text-[var(--color-ink-muted)]'
          >
            One step per line.
          </p>
          <textarea
            id={stepsInputId}
            aria-describedby={stepsHintId}
            rows={6}
            spellCheck={false}
            value={values.stepsText}
            onChange={(e) =>
              setValues((prev) => ({
                ...prev,
                stepsText: e.target.value
              }))}
            placeholder={'1. Mix dry ingredients\n2) Add eggs\n- Bake'}
            className='w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm outline-none focus:border-[var(--color-sage-mid)] focus:ring-2 focus:ring-[var(--color-sage-muted)]'
          />
        </div>

        <fieldset>
          <legend className='mb-2 text-sm font-medium text-[var(--color-ink)]'>
            Tags
          </legend>
          {tags.length === 0
            ? (
              <p className='text-sm text-[var(--color-ink-muted)]'>
                No tags yet — create some in Tag management below.
              </p>
              )
            : (
              <div className='flex flex-wrap gap-2'>
                {tags.map((tag) => {
                  const selected = values.tag_ids.includes(tag.id)
                  return (
                    <label
                      key={tag.id}
                      className={[
                        'inline-flex cursor-pointer items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium transition',
                        selected
                          ? 'bg-[var(--color-sage-mid)] text-[var(--color-on-sage)]'
                          : 'border border-[var(--color-border)] text-[var(--color-ink-muted)] hover:bg-[var(--color-sage-muted)]/50'
                      ].join(' ')}
                    >
                      <input
                        type='checkbox'
                        className='sr-only'
                        checked={selected}
                        onChange={() => {
                          setValues((prev) => ({
                            ...prev,
                            tag_ids: selected
                              ? prev.tag_ids.filter((id) => id !== tag.id)
                              : [...prev.tag_ids, tag.id]
                          }))
                        }}
                      />
                      {tag.name}
                    </label>
                  )
                })}
              </div>
              )}
        </fieldset>

        <div className='flex flex-wrap items-center gap-4'>
          <label className='inline-flex items-center gap-2 text-sm text-[var(--color-ink)]'>
            <input
              type='checkbox'
              checked={values.leftovers}
              onChange={(e) =>
                setValues((prev) => ({
                  ...prev,
                  leftovers: e.target.checked
                }))}
              className='rounded border-[var(--color-border)]'
            />
            Good for leftovers
          </label>
          <div className='flex items-center gap-2'>
            <span className='text-sm text-[var(--color-ink-muted)]'>Rating</span>
            <RatingButtons
              rating={values.rating}
              onChange={(rating) =>
                setValues((prev) => ({ ...prev, rating }))}
            />
          </div>
        </div>

        <div>
          <label
            htmlFor={sourceInputId}
            className='mb-1 block text-sm text-[var(--color-ink-muted)]'
          >
            Source URL (optional)
          </label>
          <input
            id={sourceInputId}
            type='url'
            placeholder='https://…'
            value={values.source_url}
            onChange={(e) =>
              setValues((prev) => ({ ...prev, source_url: e.target.value }))}
            className='w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm outline-none focus:border-[var(--color-sage-mid)] focus:ring-2 focus:ring-[var(--color-sage-muted)]'
          />
        </div>

        {displayError && (
          <p
            role='alert'
            className='rounded-lg bg-[var(--color-danger-bg)] px-3 py-2 text-sm text-[var(--color-danger)]'
          >
            {displayError}
          </p>
        )}

        <div className='flex flex-wrap justify-end gap-2 pt-1'>
          <button
            type='button'
            onClick={onCancel}
            className='rounded-lg px-4 py-2 text-sm text-[var(--color-ink-muted)] hover:bg-[var(--color-sage-muted)]/60'
          >
            Cancel
          </button>
          <button
            type='submit'
            disabled={submitting || !values.name.trim()}
            className='rounded-lg bg-[var(--color-sage-mid)] px-4 py-2 text-sm font-semibold text-[var(--color-on-sage)] transition hover:bg-[var(--color-sage-deep)] disabled:cursor-not-allowed disabled:opacity-60'
          >
            {submitting
              ? 'Saving…'
              : mode === 'create'
                ? 'Create recipe'
                : 'Save changes'}
          </button>
        </div>
      </form>
    </dialog>
  )
}

export default RecipeForm
