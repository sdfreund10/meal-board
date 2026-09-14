import { useId, useState } from 'react'
import type { FormEvent } from 'react'
import type { Tag } from '../../types/tag'
import TagBadge from './TagBadge'

interface TagManagerProps {
  tags: Tag[]
  busy: boolean
  error: string | null
  onCreate: (name: string, boardVisible: boolean) => Promise<void>
  onToggleBoardVisible: (tag: Tag) => Promise<void>
  onRename: (tag: Tag, name: string) => Promise<void>
  onDelete: (tag: Tag) => Promise<void>
}

function TagManager ({
  tags,
  busy,
  error,
  onCreate,
  onToggleBoardVisible,
  onRename,
  onDelete
}: TagManagerProps) {
  const panelId = useId()
  const [open, setOpen] = useState(false)
  const [name, setName] = useState('')
  const [boardVisible, setBoardVisible] = useState(true)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [editName, setEditName] = useState('')

  async function handleCreate (event: FormEvent) {
    event.preventDefault()
    const trimmed = name.trim()
    if (!trimmed) return
    await onCreate(trimmed, boardVisible)
    setName('')
  }

  async function handleRename (tag: Tag) {
    const trimmed = editName.trim()
    if (!trimmed || trimmed === tag.name) {
      setEditingId(null)
      return
    }
    await onRename(tag, trimmed)
    setEditingId(null)
  }

  return (
    <section className='rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-raised)]'>
      <button
        type='button'
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-controls={panelId}
        className='flex w-full items-center justify-between gap-3 px-4 py-3 text-left'
      >
        <div>
          <h2 className='text-sm font-semibold text-[var(--color-ink)]'>
            Tags
          </h2>
          <p className='text-xs text-[var(--color-ink-muted)]'>
            Manage shared tags · filled badges appear on the board later
          </p>
        </div>
        <span className='text-sm text-[var(--color-sage-mid)]'>
          {open ? 'Hide' : 'Manage'}
        </span>
      </button>

      {open && (
        <div
          id={panelId}
          className='space-y-4 border-t border-[var(--color-border)] px-4 py-4'
        >
          <form
            onSubmit={(e) => void handleCreate(e)}
            className='flex flex-col gap-2 sm:flex-row sm:items-end'
          >
            <div className='min-w-0 flex-1'>
              <label
                htmlFor='new-tag-name'
                className='mb-1 block text-xs text-[var(--color-ink-muted)]'
              >
                New tag
              </label>
              <input
                id='new-tag-name'
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder='e.g. weeknight'
                className='w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm outline-none focus:border-[var(--color-sage-mid)] focus:ring-2 focus:ring-[var(--color-sage-muted)]'
              />
            </div>
            <label className='inline-flex items-center gap-2 pb-2 text-sm text-[var(--color-ink)]'>
              <input
                type='checkbox'
                checked={boardVisible}
                onChange={(e) => setBoardVisible(e.target.checked)}
              />
              Board visible
            </label>
            <button
              type='submit'
              disabled={busy || !name.trim()}
              className='rounded-lg bg-[var(--color-sage-mid)] px-3 py-2 text-sm font-medium text-[var(--color-on-sage)] hover:bg-[var(--color-sage-deep)] disabled:opacity-60'
            >
              Add
            </button>
          </form>

          {error && (
            <p
              role='alert'
              className='rounded-lg bg-[var(--color-danger-bg)] px-3 py-2 text-sm text-[var(--color-danger)]'
            >
              {error}
            </p>
          )}

          {tags.length === 0
            ? (
              <p className='text-sm text-[var(--color-ink-muted)]'>
                No tags yet.
              </p>
              )
            : (
              <ul className='space-y-2'>
                {tags.map((tag) => (
                  <li
                    key={tag.id}
                    className='flex flex-wrap items-center gap-2 rounded-lg bg-[var(--color-surface)] px-3 py-2'
                  >
                    {editingId === tag.id
                      ? (
                        <form
                          className='flex min-w-0 flex-1 flex-wrap items-center gap-2'
                          onSubmit={(e) => {
                            e.preventDefault()
                            void handleRename(tag)
                          }}
                        >
                          <input
                            value={editName}
                            onChange={(e) => setEditName(e.target.value)}
                            aria-label={`Rename ${tag.name}`}
                            className='min-w-0 flex-1 rounded-md border border-[var(--color-border)] px-2 py-1 text-sm outline-none focus:border-[var(--color-sage-mid)]'
                            autoFocus
                          />
                          <button
                            type='submit'
                            disabled={busy}
                            className='text-sm font-medium text-[var(--color-sage-mid)]'
                          >
                            Save
                          </button>
                          <button
                            type='button'
                            onClick={() => setEditingId(null)}
                            className='text-sm text-[var(--color-ink-muted)]'
                          >
                            Cancel
                          </button>
                        </form>
                        )
                      : (
                        <>
                          <TagBadge tag={tag} />
                          <div className='ml-auto flex flex-wrap items-center gap-2'>
                            <button
                              type='button'
                              disabled={busy}
                              onClick={() => void onToggleBoardVisible(tag)}
                              className='text-xs text-[var(--color-ink-muted)] hover:text-[var(--color-ink)]'
                            >
                              {tag.board_visible
                                ? 'Hide from board'
                                : 'Show on board'}
                            </button>
                            <button
                              type='button'
                              disabled={busy}
                              onClick={() => {
                                setEditingId(tag.id)
                                setEditName(tag.name)
                              }}
                              className='text-xs text-[var(--color-sage-mid)] hover:text-[var(--color-sage-deep)]'
                            >
                              Rename
                            </button>
                            <button
                              type='button'
                              disabled={busy}
                              onClick={() => {
                                if (
                                  window.confirm(
                                    `Delete tag “${tag.name}”? It will be removed from recipes.`
                                  )
                                ) {
                                  void onDelete(tag)
                                }
                              }}
                              className='text-xs text-[var(--color-danger)] hover:underline'
                            >
                              Delete
                            </button>
                          </div>
                        </>
                        )}
                  </li>
                ))}
              </ul>
              )}
        </div>
      )}
    </section>
  )
}

export default TagManager
