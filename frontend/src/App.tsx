import { useCallback, useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { api } from './api/client'
import type { Item } from './types/item'

function App () {
  const [items, setItems] = useState<Item[]>([])
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [apiStatus, setApiStatus] = useState<'checking' | 'ok' | 'error'>('checking')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const loadItems = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await api.listItems()
      setItems(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load items')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void api
      .health()
      .then(() => setApiStatus('ok'))
      .catch(() => setApiStatus('error'))
    void loadItems()
  }, [loadItems])

  async function handleSubmit (event: FormEvent) {
    event.preventDefault()
    if (!title.trim()) return

    setSubmitting(true)
    setError(null)
    try {
      const created = await api.createItem({
        title: title.trim(),
        description: description.trim() || null
      })
      setItems((prev) => [created, ...prev])
      setTitle('')
      setDescription('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create item')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleDelete (id: number) {
    setError(null)
    try {
      await api.deleteItem(id)
      setItems((prev) => prev.filter((item) => item.id !== id))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete item')
    }
  }

  return (
    <div className='mx-auto flex min-h-screen max-w-3xl flex-col px-4 py-10 sm:px-6'>
      <header className='mb-10'>
        <p className='text-sm font-medium uppercase tracking-widest text-emerald-400'>
          Mealboard
        </p>
        <h1 className='mt-2 text-3xl font-semibold tracking-tight text-white sm:text-4xl'>
          Plan meals with a simple API-backed board
        </h1>
        <p className='mt-3 max-w-xl text-slate-400'>
          FastAPI + PostgreSQL on the backend, React and Tailwind on the frontend.
        </p>
        <div className='mt-4 inline-flex items-center gap-2 rounded-full border border-slate-800 bg-slate-900/80 px-3 py-1 text-xs text-slate-300'>
          <span
            className={`h-2 w-2 rounded-full ${
              apiStatus === 'ok'
                ? 'bg-emerald-400'
                : apiStatus === 'error'
                  ? 'bg-rose-400'
                  : 'bg-amber-400 animate-pulse'
            }`}
          />
          API {apiStatus === 'ok' ? 'connected' : apiStatus === 'error' ? 'offline' : 'checking…'}
        </div>
      </header>

      <section className='rounded-2xl border border-slate-800 bg-slate-900/60 p-6 shadow-xl shadow-black/20'>
        <h2 className='text-lg font-medium text-white'>Add item</h2>
        <form onSubmit={handleSubmit} className='mt-4 space-y-4'>
          <div>
            <label htmlFor='title' className='mb-1 block text-sm text-slate-400'>
              Title
            </label>
            <input
              id='title'
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder='Tuesday tacos'
              className='w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-white placeholder:text-slate-600 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/30'
              required
            />
          </div>
          <div>
            <label htmlFor='description' className='mb-1 block text-sm text-slate-400'>
              Description (optional)
            </label>
            <textarea
              id='description'
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              placeholder='Notes, ingredients, or prep steps'
              className='w-full resize-y rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-white placeholder:text-slate-600 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/30'
            />
          </div>
          <button
            type='submit'
            disabled={submitting}
            className='rounded-lg bg-emerald-500 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-60'
          >
            {submitting ? 'Saving…' : 'Save item'}
          </button>
        </form>
      </section>

      <section className='mt-8 flex-1'>
        <div className='mb-4 flex items-center justify-between'>
          <h2 className='text-lg font-medium text-white'>Items</h2>
          <button
            type='button'
            onClick={() => void loadItems()}
            className='text-sm text-slate-400 underline-offset-4 hover:text-emerald-400 hover:underline'
          >
            Refresh
          </button>
        </div>

        {error && (
          <p className='mb-4 rounded-lg border border-rose-900/50 bg-rose-950/40 px-3 py-2 text-sm text-rose-200'>
            {error}
          </p>
        )}

        {loading
          ? (
            <p className='text-slate-500'>Loading…</p>
            )
          : items.length === 0
            ? (
              <p className='rounded-xl border border-dashed border-slate-800 px-4 py-10 text-center text-slate-500'>
                No items yet. Add your first meal or plan above.
              </p>
              )
            : (
              <ul className='space-y-3'>
                {items.map((item) => (
                  <li
                    key={item.id}
                    className='flex items-start justify-between gap-4 rounded-xl border border-slate-800 bg-slate-900/40 px-4 py-3'
                  >
                    <div className='min-w-0 text-left'>
                      <p className='font-medium text-white'>{item.title}</p>
                      {item.description && (
                        <p className='mt-1 text-sm text-slate-400'>{item.description}</p>
                      )}
                      <p className='mt-2 text-xs text-slate-600'>
                        {new Date(item.created_at).toLocaleString()}
                      </p>
                    </div>
                    <button
                      type='button'
                      onClick={() => void handleDelete(item.id)}
                      className='shrink-0 rounded-md border border-slate-700 px-2 py-1 text-xs text-slate-400 transition hover:border-rose-800 hover:text-rose-300'
                    >
                      Delete
                    </button>
                  </li>
                ))}
              </ul>
              )}
      </section>
    </div>
  )
}

export default App
