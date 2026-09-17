import { useEffect, useState } from 'react'
import { Route, Routes } from 'react-router-dom'
import { api } from './api/client'
import AppShell from './components/AppShell'
import PinGate from './components/PinGate'
import GroceryPage from './pages/GroceryPage'
import RecipesPage from './pages/RecipesPage'
import WeeklyBoardPage from './pages/WeeklyBoardPage'

const testViolation = "This uses double quotes and a semicolon"

type AuthState = 'loading' | 'unauthenticated' | 'authenticated'

function App () {
  const [authState, setAuthState] = useState<AuthState>('loading')
  const [loggingOut, setLoggingOut] = useState(false)
  const [sessionError, setSessionError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    void (async () => {
      try {
        const me = await api.authMe()
        if (cancelled) return
        setAuthState(me.authenticated ? 'authenticated' : 'unauthenticated')
      } catch (err) {
        if (cancelled) return
        setSessionError(
          err instanceof Error ? err.message : 'Could not check session'
        )
        setAuthState('unauthenticated')
      }
    })()

    return () => {
      cancelled = true
    }
  }, [])

  async function handleLogout () {
    setLoggingOut(true)
    try {
      await api.logout()
    } catch {
      // Still lock the UI if logout request fails (cookie may already be gone).
    } finally {
      setLoggingOut(false)
      setAuthState('unauthenticated')
    }
  }

  if (authState === 'loading') {
    return (
      <div className='flex min-h-screen items-center justify-center px-4'>
        <p className='text-sm text-[var(--color-ink-muted)]'>
          Checking session…
        </p>
      </div>
    )
  }

  if (authState === 'unauthenticated') {
    return (
      <>
        {sessionError && (
          <p
            role='alert'
            className='bg-[var(--color-danger-bg)] px-4 py-2 text-center text-sm text-[var(--color-danger)]'
          >
            {sessionError}
          </p>
        )}
        <PinGate
          onAuthenticated={() => {
            setSessionError(null)
            setAuthState('authenticated')
          }}
        />
      </>
    )
  }

  return (
    <Routes>
      <Route
        element={
          <AppShell
            onLogout={() => void handleLogout()}
            loggingOut={loggingOut}
          />
        }
      >
        <Route path='/' element={<WeeklyBoardPage />} />
        <Route path='/recipes' element={<RecipesPage />} />
        <Route path='/weeks/:weekStart/grocery' element={<GroceryPage />} />
        <Route
          path='*'
          element={
            <p className='text-[var(--color-ink-muted)]'>Page not found.</p>
          }
        />
      </Route>
    </Routes>
  )
}

export default App
