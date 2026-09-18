import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { ApiError, api, subscribeToAuthErrors } from '../api/client'
import AdminUnlockDialog from '../components/AdminUnlockDialog'
import { AuthContext } from './AuthContext'
import type { AdminAction, AuthContextValue, AuthPhase } from './AuthContext'

interface AuthProviderProps {
  children: ReactNode
}

interface AuthState {
  phase: AuthPhase
  authenticated: boolean
  adminAccess: boolean
}

type UnlockReason = 'intent' | 'expired'

const initialState: AuthState = {
  phase: 'loading',
  authenticated: false,
  adminAccess: false
}

function AuthProvider ({ children }: AuthProviderProps) {
  const [authState, setAuthState] = useState<AuthState>(initialState)
  const [unlockReason, setUnlockReason] = useState<UnlockReason | null>(null)
  const [unlocking, setUnlocking] = useState(false)
  const [unlockError, setUnlockError] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)
  const pendingActionRef = useRef<AdminAction | null>(null)
  const elevatingRef = useRef(false)

  useEffect(() => {
    let cancelled = false

    void api.authMe()
      .then((status) => {
        if (cancelled) return
        setAuthState({
          phase: 'ready',
          authenticated: status.authenticated,
          adminAccess: status.admin_access
        })
      })
      .catch(() => {
        if (cancelled) return
        setAuthState({
          phase: 'ready',
          authenticated: false,
          adminAccess: false
        })
      })

    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    return subscribeToAuthErrors((status) => {
      if (status === 401 && !elevatingRef.current) {
        setAuthState({
          phase: 'ready',
          authenticated: false,
          adminAccess: false
        })
      } else if (status === 403) {
        setAuthState((previous) => ({ ...previous, adminAccess: false }))
      }
    })
  }, [])

  const runAdminAction = useCallback(async (action: AdminAction) => {
    setActionError(null)
    try {
      await action()
    } catch (error) {
      if (error instanceof ApiError && error.status === 403) {
        pendingActionRef.current = action
        setUnlockError(null)
        setUnlockReason('expired')
      } else {
        setActionError(
          error instanceof Error ? error.message : 'Could not complete action.'
        )
      }
    }
  }, [])

  const requireAdmin = useCallback((action: AdminAction) => {
    if (authState.adminAccess) {
      void runAdminAction(action)
      return
    }
    pendingActionRef.current = action
    setActionError(null)
    setUnlockError(null)
    setUnlockReason('intent')
  }, [authState.adminAccess, runAdminAction])

  const login = useCallback(async (pin: string) => {
    const status = await api.login({ pin })
    setAuthState({
      phase: 'ready',
      authenticated: status.authenticated,
      adminAccess: status.admin_access
    })
    return status.authenticated
  }, [])

  const logout = useCallback(async () => {
    try {
      await api.logout()
    } finally {
      pendingActionRef.current = null
      setUnlockReason(null)
      setActionError(null)
      setAuthState({
        phase: 'ready',
        authenticated: false,
        adminAccess: false
      })
    }
  }, [])

  const handleUnlock = useCallback(async (password: string) => {
    setUnlocking(true)
    setUnlockError(null)
    elevatingRef.current = true
    try {
      const status = await api.elevate({ password })
      if (!status.admin_access) {
        setUnlockError('Could not unlock editing.')
        return
      }

      const pendingAction = pendingActionRef.current
      pendingActionRef.current = null
      setAuthState({
        phase: 'ready',
        authenticated: status.authenticated,
        adminAccess: status.admin_access
      })
      setUnlockReason(null)
      if (pendingAction != null) {
        window.setTimeout(() => {
          void runAdminAction(pendingAction)
        }, 0)
      }
    } catch (error) {
      setUnlockError(
        error instanceof Error ? error.message : 'Could not unlock editing.'
      )
    } finally {
      elevatingRef.current = false
      setUnlocking(false)
    }
  }, [runAdminAction])

  const handleUnlockCancel = useCallback(() => {
    pendingActionRef.current = null
    setUnlockReason(null)
    setUnlockError(null)
  }, [])

  const contextValue = useMemo<AuthContextValue>(() => ({
    ...authState,
    login,
    logout,
    requireAdmin
  }), [authState, login, logout, requireAdmin])

  return (
    <AuthContext.Provider value={contextValue}>
      {actionError != null && (
        <div
          role='alert'
          className='fixed top-4 left-1/2 z-[70] flex -translate-x-1/2 items-center gap-3 rounded-lg bg-[var(--color-danger-bg)] px-4 py-3 text-sm text-[var(--color-danger)] shadow-lg'
        >
          <span>{actionError}</span>
          <button
            type='button'
            onClick={() => setActionError(null)}
            className='font-medium underline underline-offset-2'
          >
            Dismiss
          </button>
        </div>
      )}
      {children}
      {unlockReason != null && (
        <AdminUnlockDialog
          expired={unlockReason === 'expired'}
          submitting={unlocking}
          error={unlockError}
          onSubmit={(password) => void handleUnlock(password)}
          onCancel={handleUnlockCancel}
        />
      )}
    </AuthContext.Provider>
  )
}

export default AuthProvider
