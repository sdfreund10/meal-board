import { createContext, useContext } from 'react'

export type AuthPhase = 'loading' | 'ready'
export type AdminAction = () => void | Promise<void>

export interface AuthContextValue {
  phase: AuthPhase
  authenticated: boolean
  adminAccess: boolean
  login: (pin: string) => Promise<boolean>
  logout: () => Promise<void>
  requireAdmin: (action: AdminAction) => void
}

export const AuthContext = createContext<AuthContextValue | null>(null)

export function useAuth (): AuthContextValue {
  const value = useContext(AuthContext)
  if (value == null) {
    throw new Error('useAuth must be used within AuthProvider')
  }
  return value
}
