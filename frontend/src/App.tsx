import type { ReactNode } from 'react'
import { Route, Routes } from 'react-router-dom'
import { useAuth } from './auth/AuthContext'
import AuthProvider from './auth/AuthProvider'
import AppShell from './components/AppShell'
import PinGate from './components/PinGate'
import GroceryPage from './pages/GroceryPage'
import RecipesPage from './pages/RecipesPage'
import WeeklyBoardPage from './pages/WeeklyBoardPage'

function ProtectedContent ({ children }: { children: ReactNode }) {
  const { phase, authenticated } = useAuth()
  if (phase === 'loading') {
    return (
      <div className='flex min-h-[60vh] items-center justify-center px-4'>
        <p className='text-sm text-[var(--color-ink-muted)]'>
          Checking session…
        </p>
      </div>
    )
  }

  if (!authenticated) return <PinGate />
  return <>{children}</>
}

function AppRoutes () {
  return (
    <Routes>
      <Route element={<AppShell />}>
        <Route
          path='/'
          element={
            <ProtectedContent>
              <WeeklyBoardPage />
            </ProtectedContent>
          }
        />
        <Route path='/recipes' element={<RecipesPage />} />
        <Route
          path='/weeks/:weekStart/grocery'
          element={
            <ProtectedContent>
              <GroceryPage />
            </ProtectedContent>
          }
        />
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

function App () {
  return (
    <AuthProvider>
      <AppRoutes />
    </AuthProvider>
  )
}

export default App
