import type { ReactElement } from 'react'
import { render } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { AuthContext } from '../auth/AuthContext'
import type { AuthContextValue } from '../auth/AuthContext'

const defaultAuth: AuthContextValue = {
  phase: 'ready',
  authenticated: true,
  adminAccess: true,
  login: async () => true,
  logout: async () => {},
  requireAdmin: (action) => {
    void action()
  }
}

export function renderWithAuth (
  ui: ReactElement,
  authOverrides: Partial<AuthContextValue> = {},
  initialEntries: string[] = ['/']
) {
  return render(
    <MemoryRouter initialEntries={initialEntries}>
      <AuthContext.Provider value={{ ...defaultAuth, ...authOverrides }}>
        {ui}
      </AuthContext.Provider>
    </MemoryRouter>
  )
}
