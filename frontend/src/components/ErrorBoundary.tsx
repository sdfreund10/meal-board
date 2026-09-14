import { Component } from 'react'
import type { ErrorInfo, ReactNode } from 'react'

interface Props {
  children: ReactNode
}

interface State {
  error: Error | null
}

export default class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null }

  static getDerivedStateFromError (error: Error): State {
    return { error }
  }

  override componentDidCatch (error: Error, info: ErrorInfo): void {
    console.error('Mealboard UI error', error, info.componentStack)
  }

  override render (): ReactNode {
    if (this.state.error != null) {
      return (
        <div className='mx-auto flex min-h-screen max-w-lg flex-col items-center justify-center gap-4 px-4 text-center'>
          <h1 className='text-xl font-semibold text-[var(--color-ink)]'>
            Something went wrong
          </h1>
          <p className='text-sm text-[var(--color-ink-muted)]'>
            {this.state.error.message || 'An unexpected error occurred.'}
          </p>
          <button
            type='button'
            className='rounded-lg bg-[var(--color-sage-mid)] px-4 py-2 text-sm font-medium text-[var(--color-on-sage)]'
            onClick={() => {
              this.setState({ error: null })
              window.location.assign('/')
            }}
          >
            Reload
          </button>
        </div>
      )
    }

    return this.props.children
  }
}
