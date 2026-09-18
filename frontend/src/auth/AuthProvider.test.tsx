import { useState } from 'react'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ApiError, api } from '../api/client'
import AuthProvider from './AuthProvider'
import { useAuth } from './AuthContext'

function AuthHarness ({
  action = async () => {}
}: {
  action?: (value: string) => Promise<void>
}) {
  const auth = useAuth()
  const [value, setValue] = useState('kept value')

  return (
    <>
      <p>{auth.phase}</p>
      <p>{auth.authenticated ? 'signed in' : 'anonymous'}</p>
      <p>{auth.adminAccess ? 'admin' : 'read only'}</p>
      <input
        aria-label='Draft'
        value={value}
        onChange={(event) => setValue(event.target.value)}
      />
      <button
        type='button'
        onClick={() => auth.requireAdmin(async () => await action(value))}
      >
        Mutate
      </button>
    </>
  )
}

describe('AuthProvider', () => {
  beforeEach(() => {
    vi.spyOn(api, 'authMe').mockResolvedValue({
      authenticated: true,
      admin_access: false
    })
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('unlocks on intent and then runs the pending action', async () => {
    const user = userEvent.setup()
    const action = vi.fn().mockResolvedValue(undefined)
    const elevate = vi.spyOn(api, 'elevate').mockResolvedValue({
      authenticated: true,
      admin_access: true
    })

    render(
      <AuthProvider>
        <AuthHarness action={action} />
      </AuthProvider>
    )
    await screen.findByText('read only')

    await user.click(screen.getByRole('button', { name: 'Mutate' }))
    expect(action).not.toHaveBeenCalled()

    const dialog = screen.getByRole('dialog', { name: 'Unlock editing' })
    await user.type(within(dialog).getByLabelText('Admin password'), 'secret')
    await user.click(within(dialog).getByRole('button', { name: 'Unlock' }))

    await waitFor(() => {
      expect(elevate).toHaveBeenCalledWith({ password: 'secret' })
      expect(action).toHaveBeenCalledWith('kept value')
    })
    expect(await screen.findByText('admin')).toBeInTheDocument()
  })

  it('cancels without running the pending action', async () => {
    const user = userEvent.setup()
    const action = vi.fn().mockResolvedValue(undefined)

    render(
      <AuthProvider>
        <AuthHarness action={action} />
      </AuthProvider>
    )
    await screen.findByText('read only')
    await user.click(screen.getByRole('button', { name: 'Mutate' }))
    await user.click(screen.getByRole('button', { name: 'Cancel' }))

    expect(action).not.toHaveBeenCalled()
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('keeps the unlock dialog open and shows an invalid-password error', async () => {
    const user = userEvent.setup()
    const action = vi.fn().mockResolvedValue(undefined)
    vi.spyOn(api, 'elevate').mockRejectedValue(
      new ApiError('Invalid password', 401)
    )

    render(
      <AuthProvider>
        <AuthHarness action={action} />
      </AuthProvider>
    )
    await screen.findByText('read only')
    await user.click(screen.getByRole('button', { name: 'Mutate' }))

    const dialog = screen.getByRole('dialog', { name: 'Unlock editing' })
    await user.type(within(dialog).getByLabelText('Admin password'), 'wrong')
    await user.click(within(dialog).getByRole('button', { name: 'Unlock' }))

    expect(await within(dialog).findByRole('alert')).toHaveTextContent(
      'Invalid password'
    )
    expect(action).not.toHaveBeenCalled()
    expect(dialog).toBeInTheDocument()
  })

  it('surfaces unexpected errors from admin actions', async () => {
    vi.mocked(api.authMe).mockResolvedValue({
      authenticated: true,
      admin_access: true
    })
    const user = userEvent.setup()
    const action = vi.fn().mockRejectedValue(new Error('Unexpected failure'))

    render(
      <AuthProvider>
        <AuthHarness action={action} />
      </AuthProvider>
    )
    await screen.findByText('admin')
    await user.click(screen.getByRole('button', { name: 'Mutate' }))

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Unexpected failure'
    )
  })

  it('re-prompts and retries the same action after admin access expires', async () => {
    vi.mocked(api.authMe).mockResolvedValue({
      authenticated: true,
      admin_access: true
    })
    const user = userEvent.setup()
    const action = vi
      .fn()
      .mockRejectedValueOnce(new ApiError('Admin access required', 403))
      .mockResolvedValueOnce(undefined)
    vi.spyOn(api, 'elevate').mockResolvedValue({
      authenticated: true,
      admin_access: true
    })

    render(
      <AuthProvider>
        <AuthHarness action={action} />
      </AuthProvider>
    )
    await screen.findByText('admin')
    await user.clear(screen.getByLabelText('Draft'))
    await user.type(screen.getByLabelText('Draft'), 'preserved draft')
    await user.click(screen.getByRole('button', { name: 'Mutate' }))

    const dialog = await screen.findByRole('dialog', {
      name: 'Editing access expired'
    })
    expect(screen.getByLabelText('Draft')).toHaveValue('preserved draft')
    await user.type(within(dialog).getByLabelText('Admin password'), 'secret')
    await user.click(within(dialog).getByRole('button', { name: 'Unlock' }))

    await waitFor(() => {
      expect(action).toHaveBeenCalledTimes(2)
    })
    expect(action).toHaveBeenNthCalledWith(1, 'preserved draft')
    expect(action).toHaveBeenNthCalledWith(2, 'preserved draft')
  })

  it('falls back to anonymous access when the session check fails', async () => {
    vi.mocked(api.authMe).mockRejectedValue(new Error('Network down'))

    render(
      <AuthProvider>
        <AuthHarness />
      </AuthProvider>
    )

    expect(await screen.findByText('anonymous')).toBeInTheDocument()
    expect(screen.getByText('ready')).toBeInTheDocument()
  })
})
