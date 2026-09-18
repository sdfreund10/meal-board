import { useState } from 'react'
import { Link, NavLink, Outlet } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'

const navClass = ({ isActive }: { isActive: boolean }) =>
  [
    'rounded-md px-3 py-1.5 text-sm font-medium transition',
    isActive
      ? 'bg-[var(--color-sage-muted)] text-[var(--color-sage-deep)]'
      : 'text-[var(--color-ink-muted)] hover:bg-[var(--color-sage-muted)]/60 hover:text-[var(--color-ink)]'
  ].join(' ')

function LockIcon () {
  return (
    <svg
      viewBox='0 0 24 24'
      className='h-3.5 w-3.5'
      fill='none'
      stroke='currentColor'
      strokeWidth='2'
      aria-hidden='true'
    >
      <rect x='5' y='11' width='14' height='10' rx='2' />
      <path
        strokeLinecap='round'
        strokeLinejoin='round'
        d='M8 11V8a4 4 0 0 1 8 0v3'
      />
    </svg>
  )
}

function UnlockIcon () {
  return (
    <svg
      viewBox='0 0 24 24'
      className='h-3.5 w-3.5'
      fill='none'
      stroke='currentColor'
      strokeWidth='2'
      aria-hidden='true'
    >
      <rect x='5' y='11' width='14' height='10' rx='2' />
      <path
        strokeLinecap='round'
        strokeLinejoin='round'
        d='M8 11V8a4 4 0 0 1 7.5-1.9'
      />
    </svg>
  )
}

function AppShell () {
  const { authenticated, adminAccess, logout, requireAdmin } = useAuth()
  const [loggingOut, setLoggingOut] = useState(false)

  async function handleLogout () {
    setLoggingOut(true)
    try {
      await logout()
    } catch {
      // AuthProvider clears local access even if the server request fails.
    } finally {
      setLoggingOut(false)
    }
  }

  return (
    <div className='min-h-screen'>
      <header className='border-b border-[var(--color-border)] bg-[var(--color-surface-raised)]'>
        <div className='mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-3 sm:px-6'>
          <div className='flex items-center gap-6'>
            <span className='text-base font-semibold tracking-tight text-[var(--color-sage-deep)]'>
              Mealboard
            </span>
            <nav className='flex items-center gap-1' aria-label='Main'>
              {authenticated && (
                <NavLink to='/' end className={navClass}>
                  Board
                </NavLink>
              )}
              <NavLink to='/recipes' className={navClass}>
                Recipes
              </NavLink>
            </nav>
          </div>
          <div className='flex items-center gap-2'>
            {!authenticated && (
              <Link
                to='/'
                className='rounded-md px-3 py-1.5 text-sm font-medium text-[var(--color-sage-mid)] transition hover:bg-[var(--color-sage-muted)]/60'
              >
                Sign in
              </Link>
            )}
            {authenticated && !adminAccess && (
              <button
                type='button'
                onClick={() => requireAdmin(() => {})}
                className='inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium text-[var(--color-ink-muted)] transition hover:bg-[var(--color-sage-muted)]/60 hover:text-[var(--color-ink)]'
              >
                <LockIcon />
                Read-only
              </button>
            )}
            {authenticated && adminAccess && (
              <span className='inline-flex items-center gap-1.5 text-sm font-medium text-[var(--color-sage-deep)]'>
                <UnlockIcon />
                Admin
              </span>
            )}
            {authenticated && (
              <button
                type='button'
                onClick={() => void handleLogout()}
                disabled={loggingOut}
                className='rounded-md px-3 py-1.5 text-sm text-[var(--color-ink-muted)] transition hover:bg-[var(--color-sage-muted)]/60 hover:text-[var(--color-ink)] disabled:opacity-60'
              >
                {loggingOut ? 'Signing out…' : 'Log out'}
              </button>
            )}
          </div>
        </div>
      </header>

      <main className='mx-auto max-w-5xl px-4 py-8 sm:px-6'>
        <Outlet />
      </main>
    </div>
  )
}

export default AppShell
