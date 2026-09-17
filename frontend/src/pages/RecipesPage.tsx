import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../api/client'
import SlotDayPickerDialog from '../components/board/SlotDayPickerDialog'
import RecipeCard from '../components/recipes/RecipeCard'
import RecipeForm from '../components/recipes/RecipeForm'
import RecipeImportDialog from '../components/recipes/RecipeImportDialog'
import TagManager from '../components/recipes/TagManager'
import { boardWeekOrCurrent } from '../lib/weekDate'
import type { Recipe, RecipeCreate, RecipeRating } from '../types/recipe'
import type { Tag } from '../types/tag'
import type { DayOfWeek } from '../types/week'

type FormMode = { type: 'create' } | { type: 'edit', recipe: Recipe } | null

function RecipesPage () {
  const navigate = useNavigate()
  const [recipes, setRecipes] = useState<Recipe[]>([])
  const [tags, setTags] = useState<Tag[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [expandedIds, setExpandedIds] = useState<ReadonlySet<number>>(
    () => new Set()
  )
  const [ratingBusyId, setRatingBusyId] = useState<number | null>(null)
  const [deleteBusyId, setDeleteBusyId] = useState<number | null>(null)
  const [formMode, setFormMode] = useState<FormMode>(null)
  const [formSubmitting, setFormSubmitting] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [importOpen, setImportOpen] = useState(false)
  const [importSubmitting, setImportSubmitting] = useState(false)
  const [importError, setImportError] = useState<string | null>(null)
  const importControllerRef = useRef<AbortController | null>(null)
  const [tagBusy, setTagBusy] = useState(false)
  const [tagError, setTagError] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)
  const [slotRecipe, setSlotRecipe] = useState<Recipe | null>(null)
  const [slotWeekStart, setSlotWeekStart] = useState(() => boardWeekOrCurrent())
  const [slotSubmitting, setSlotSubmitting] = useState(false)
  const [slotError, setSlotError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    setLoading(true)
    setLoadError(null)
    try {
      const [recipeList, tagList] = await Promise.all([
        api.listRecipes(),
        api.listTags()
      ])
      setRecipes(recipeList)
      setTags(tagList)
    } catch (err) {
      setLoadError(
        err instanceof Error ? err.message : 'Could not load recipes'
      )
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void refresh()
  }, [refresh])

  useEffect(() => {
    return () => importControllerRef.current?.abort()
  }, [])

  function toggleExpanded (id: number) {
    setExpandedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function upsertRecipe (updated: Recipe) {
    setRecipes((prev) => {
      const idx = prev.findIndex((r) => r.id === updated.id)
      if (idx === -1) return [...prev, updated]
      return prev.map((r) => (r.id === updated.id ? updated : r))
    })
  }

  async function handleRate (recipe: Recipe, rating: RecipeRating) {
    setRatingBusyId(recipe.id)
    setActionError(null)
    try {
      const updated = await api.updateRecipe(recipe.id, { rating })
      upsertRecipe(updated)
    } catch (err) {
      setActionError(
        err instanceof Error ? err.message : 'Could not update rating'
      )
    } finally {
      setRatingBusyId(null)
    }
  }

  async function handleDelete (recipe: Recipe) {
    if (!window.confirm(`Delete “${recipe.name}”? This cannot be undone.`)) {
      return
    }
    setDeleteBusyId(recipe.id)
    setActionError(null)
    try {
      await api.deleteRecipe(recipe.id)
      setRecipes((prev) => prev.filter((r) => r.id !== recipe.id))
      setExpandedIds((prev) => {
        const next = new Set(prev)
        next.delete(recipe.id)
        return next
      })
    } catch (err) {
      setActionError(
        err instanceof Error ? err.message : 'Could not delete recipe'
      )
    } finally {
      setDeleteBusyId(null)
    }
  }

  async function handleFormSubmit (payload: RecipeCreate) {
    setFormSubmitting(true)
    setFormError(null)
    try {
      if (formMode?.type === 'edit') {
        const updated = await api.updateRecipe(formMode.recipe.id, payload)
        upsertRecipe(updated)
      } else {
        const created = await api.createRecipe(payload)
        setRecipes((prev) => [...prev, created])
        setExpandedIds((prev) => new Set(prev).add(created.id))
      }
      setFormMode(null)
    } catch (err) {
      setFormError(
        err instanceof Error ? err.message : 'Could not save recipe'
      )
    } finally {
      setFormSubmitting(false)
    }
  }

  async function handleImport (url: string) {
    const controller = new AbortController()
    importControllerRef.current = controller
    setImportSubmitting(true)
    setImportError(null)
    try {
      const imported = await api.importRecipe({ url }, controller.signal)
      upsertRecipe(imported)
      setExpandedIds((prev) => new Set(prev).add(imported.id))
      setImportOpen(false)
    } catch (err) {
      setImportError(
        err instanceof Error ? err.message : 'Could not import recipe'
      )
    } finally {
      if (importControllerRef.current === controller) {
        importControllerRef.current = null
      }
      setImportSubmitting(false)
    }
  }

  async function handleCreateTag (name: string, boardVisible: boolean) {
    setTagBusy(true)
    setTagError(null)
    try {
      const created = await api.createTag({
        name,
        board_visible: boardVisible
      })
      setTags((prev) => [...prev, created])
    } catch (err) {
      setTagError(err instanceof Error ? err.message : 'Could not create tag')
    } finally {
      setTagBusy(false)
    }
  }

  async function handleToggleBoardVisible (tag: Tag) {
    setTagBusy(true)
    setTagError(null)
    try {
      const updated = await api.updateTag(tag.id, {
        board_visible: !tag.board_visible
      })
      setTags((prev) => prev.map((t) => (t.id === updated.id ? updated : t)))
      setRecipes((prev) =>
        prev.map((recipe) => ({
          ...recipe,
          tags: recipe.tags.map((t) => (t.id === updated.id ? updated : t))
        }))
      )
    } catch (err) {
      setTagError(err instanceof Error ? err.message : 'Could not update tag')
    } finally {
      setTagBusy(false)
    }
  }

  async function handleRenameTag (tag: Tag, name: string) {
    setTagBusy(true)
    setTagError(null)
    try {
      const updated = await api.updateTag(tag.id, { name })
      setTags((prev) => prev.map((t) => (t.id === updated.id ? updated : t)))
      setRecipes((prev) =>
        prev.map((recipe) => ({
          ...recipe,
          tags: recipe.tags.map((t) => (t.id === updated.id ? updated : t))
        }))
      )
    } catch (err) {
      setTagError(err instanceof Error ? err.message : 'Could not rename tag')
    } finally {
      setTagBusy(false)
    }
  }

  async function handleDeleteTag (tag: Tag) {
    setTagBusy(true)
    setTagError(null)
    try {
      await api.deleteTag(tag.id)
      setTags((prev) => prev.filter((t) => t.id !== tag.id))
      setRecipes((prev) =>
        prev.map((recipe) => ({
          ...recipe,
          tags: recipe.tags.filter((t) => t.id !== tag.id)
        }))
      )
    } catch (err) {
      setTagError(err instanceof Error ? err.message : 'Could not delete tag')
    } finally {
      setTagBusy(false)
    }
  }

  async function handleSlotDay (dayOfWeek: DayOfWeek) {
    if (slotRecipe == null || slotSubmitting) return
    setSlotSubmitting(true)
    setSlotError(null)
    try {
      await api.addDayRecipe(slotWeekStart, dayOfWeek, {
        recipe_id: slotRecipe.id
      })
      setSlotRecipe(null)
      void navigate(`/?week=${slotWeekStart}`)
    } catch (err) {
      setSlotError(
        err instanceof Error ? err.message : 'Could not slot recipe'
      )
    } finally {
      setSlotSubmitting(false)
    }
  }

  return (
    <section className='space-y-6'>
      <div className='flex flex-wrap items-end justify-between gap-3'>
        <div>
          <h1 className='text-2xl font-semibold text-[var(--color-ink)]'>
            Recipes
          </h1>
          <p className='mt-1 text-sm text-[var(--color-ink-muted)]'>
            Browse, rate, and edit meals for the household.
          </p>
        </div>
        <div className='flex flex-wrap gap-2'>
          <button
            type='button'
            onClick={() => {
              setImportError(null)
              setImportOpen(true)
            }}
            className='rounded-lg border border-[var(--color-border)] px-4 py-2 text-sm font-semibold text-[var(--color-ink)] transition hover:bg-[var(--color-sage-muted)]/50'
          >
            Import from URL
          </button>
          <button
            type='button'
            onClick={() => {
              setFormError(null)
              setFormMode({ type: 'create' })
            }}
            className='rounded-lg bg-[var(--color-sage-mid)] px-4 py-2 text-sm font-semibold text-[var(--color-on-sage)] transition hover:bg-[var(--color-sage-deep)]'
          >
            New recipe
          </button>
        </div>
      </div>

      <TagManager
        tags={tags}
        busy={tagBusy}
        error={tagError}
        onCreate={handleCreateTag}
        onToggleBoardVisible={handleToggleBoardVisible}
        onRename={handleRenameTag}
        onDelete={handleDeleteTag}
      />

      {actionError && (
        <p
          role='alert'
          className='rounded-lg bg-[var(--color-danger-bg)] px-3 py-2 text-sm text-[var(--color-danger)]'
        >
          {actionError}
        </p>
      )}

      {loading && (
        <p className='text-sm text-[var(--color-ink-muted)]'>Loading recipes…</p>
      )}

      {!loading && loadError && (
        <div className='rounded-lg bg-[var(--color-danger-bg)] px-4 py-3'>
          <p role='alert' className='text-sm text-[var(--color-danger)]'>
            {loadError}
          </p>
          <button
            type='button'
            onClick={() => void refresh()}
            className='mt-2 text-sm font-medium text-[var(--color-sage-mid)] hover:text-[var(--color-sage-deep)]'
          >
            Try again
          </button>
        </div>
      )}

      {!loading && !loadError && recipes.length === 0 && (
        <div className='rounded-xl border border-dashed border-[var(--color-border)] px-6 py-10 text-center'>
          <p className='font-medium text-[var(--color-ink)]'>No recipes yet</p>
          <p className='mt-1 text-sm text-[var(--color-ink-muted)]'>
            Add your first meal to start building the catalog.
          </p>
          <button
            type='button'
            onClick={() => {
              setFormError(null)
              setFormMode({ type: 'create' })
            }}
            className='mt-4 rounded-lg bg-[var(--color-sage-mid)] px-4 py-2 text-sm font-semibold text-[var(--color-on-sage)] transition hover:bg-[var(--color-sage-deep)]'
          >
            New recipe
          </button>
        </div>
      )}

      {!loading && !loadError && recipes.length > 0 && (
        <ul className='space-y-3'>
          {recipes.map((recipe) => (
            <li key={recipe.id}>
              <RecipeCard
                recipe={recipe}
                expanded={expandedIds.has(recipe.id)}
                ratingBusy={ratingBusyId === recipe.id}
                deleteBusy={deleteBusyId === recipe.id}
                onToggle={() => toggleExpanded(recipe.id)}
                onRate={(rating) => void handleRate(recipe, rating)}
                onEdit={() => {
                  setFormError(null)
                  setFormMode({ type: 'edit', recipe })
                }}
                onDelete={() => void handleDelete(recipe)}
                onSlotIntoNight={() => {
                  setSlotError(null)
                  setSlotWeekStart(boardWeekOrCurrent())
                  setSlotRecipe(recipe)
                }}
              />
            </li>
          ))}
        </ul>
      )}

      {formMode != null && (
        <RecipeForm
          mode={formMode.type}
          recipe={formMode.type === 'edit' ? formMode.recipe : undefined}
          tags={tags}
          submitting={formSubmitting}
          error={formError}
          onSubmit={(payload) => void handleFormSubmit(payload)}
          onCancel={() => setFormMode(null)}
        />
      )}

      {importOpen && (
        <RecipeImportDialog
          submitting={importSubmitting}
          error={importError}
          onSubmit={(url) => void handleImport(url)}
          onCancel={() => {
            if (importSubmitting) return
            setImportOpen(false)
            setImportError(null)
          }}
        />
      )}

      {slotRecipe != null && (
        <SlotDayPickerDialog
          recipeName={slotRecipe.name}
          weekStart={slotWeekStart}
          submitting={slotSubmitting}
          error={slotError}
          onSelect={(day) => void handleSlotDay(day)}
          onCancel={() => {
            if (slotSubmitting) return
            setSlotRecipe(null)
            setSlotError(null)
          }}
        />
      )}
    </section>
  )
}

export default RecipesPage
