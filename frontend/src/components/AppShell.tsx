import { NavLink, Outlet } from 'react-router-dom'

interface AppShellProps {
  onLogout: () => void
  loggingOut: boolean
}

const navClass = ({ isActive }: { isActive: boolean }) =>
  [
    'rounded-md px-3 py-1.5 text-sm font-medium transition',
    isActive
      ? 'bg-[var(--color-sage-muted)] text-[var(--color-sage-deep)]'
      : 'text-[var(--color-ink-muted)] hover:bg-[var(--color-sage-muted)]/60 hover:text-[var(--color-ink)]'
  ].join(' ')

function AppShell ({ onLogout, loggingOut }: AppShellProps) {
  return (
    <div className='min-h-screen'>
      <header className='border-b border-[var(--color-border)] bg-[var(--color-surface-raised)]'>
        <div className='mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-3 sm:px-6'>
          <div className='flex items-center gap-6'>
            <span className='text-base font-semibold tracking-tight text-[var(--color-sage-deep)]'>
              Mealboard
            </span>
            <nav className='flex items-center gap-1' aria-label='Main'>
              <NavLink to='/' end className={navClass}>
                Board
              </NavLink>
              <NavLink to='/recipes' className={navClass}>
                Recipes
              </NavLink>
            </nav>
          </div>
          <button
            type='button'
            onClick={onLogout}
            disabled={loggingOut}
            className='rounded-md px-3 py-1.5 text-sm text-[var(--color-ink-muted)] transition hover:bg-[var(--color-sage-muted)]/60 hover:text-[var(--color-ink)] disabled:opacity-60'
          >
            {loggingOut ? 'Signing out…' : 'Log out'}
          </button>
        </div>
      </header>

      <main className='mx-auto max-w-5xl px-4 py-8 sm:px-6'>
        <Outlet />
      </main>
    </div>
  )
}

export default AppShell
