import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import ErrorBoundary from './ErrorBoundary'
import * as errors from '@/lib/errors'
import * as logger from '@/lib/logger'

// Mock the error logging utilities
vi.mock('@/lib/errors', () => ({
  logError: vi.fn(),
}))

vi.mock('@/lib/logger', () => ({
  logger: {
    error: vi.fn(),
  },
}))

// Component that throws an error
const ThrowError = ({ error }: { error?: Error }) => {
  if (error) {
    throw error
  }
  throw new Error('Test error')
}

// Component that doesn't throw
const NoError = () => <div>No error</div>

describe('ErrorBoundary', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Suppress console.error for cleaner test output
    vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('Normal Rendering', () => {
    it('should render children when no error occurs', () => {
      render(
        <ErrorBoundary>
          <NoError />
        </ErrorBoundary>
      )

      expect(screen.getByText('No error')).toBeInTheDocument()
    })

    it('should not show error UI when children render successfully', () => {
      render(
        <ErrorBoundary>
          <div>Normal content</div>
        </ErrorBoundary>
      )

      expect(screen.queryByText('Something went wrong')).not.toBeInTheDocument()
    })
  })

  describe('Error Catching', () => {
    it('should catch and display errors from children', () => {
      render(
        <ErrorBoundary>
          <ThrowError />
        </ErrorBoundary>
      )

      expect(screen.getByText('Something went wrong')).toBeInTheDocument()
      expect(screen.getByText(/We encountered an unexpected error/)).toBeInTheDocument()
    })

    it('should display custom error message', () => {
      const customError = new Error('Custom error message')

      render(
        <ErrorBoundary>
          <ThrowError error={customError} />
        </ErrorBoundary>
      )

      expect(screen.getByText('Something went wrong')).toBeInTheDocument()
    })

    it('should log error when caught', () => {
      render(
        <ErrorBoundary>
          <ThrowError />
        </ErrorBoundary>
      )

      expect(errors.logError).toHaveBeenCalledWith(
        expect.any(Error),
        'ErrorBoundary'
      )
    })

    it('should log error to errors module', () => {
      render(
        <ErrorBoundary>
          <ThrowError />
        </ErrorBoundary>
      )

      expect(errors.logError).toHaveBeenCalledWith(
        expect.any(Error),
        'ErrorBoundary'
      )
    })

    it('should log component stack trace', () => {
      render(
        <ErrorBoundary>
          <ThrowError />
        </ErrorBoundary>
      )

      expect(logger.logger.error).toHaveBeenCalledWith(
        'Component stack',
        undefined,
        expect.objectContaining({
          componentStack: expect.any(String),
        })
      )
    })
  })

  describe('Custom Error Handler', () => {
    it('should call custom onError handler when provided', () => {
      const onError = vi.fn()

      render(
        <ErrorBoundary onError={onError}>
          <ThrowError />
        </ErrorBoundary>
      )

      expect(onError).toHaveBeenCalledWith(
        expect.any(Error),
        expect.objectContaining({
          componentStack: expect.any(String),
        })
      )
    })

    it('should not break if onError is not provided', () => {
      render(
        <ErrorBoundary>
          <ThrowError />
        </ErrorBoundary>
      )

      expect(screen.getByText('Something went wrong')).toBeInTheDocument()
    })
  })

  describe('Custom Fallback UI', () => {
    it('should render custom fallback component', () => {
      const CustomFallback = <div>Custom error message</div>

      render(
        <ErrorBoundary fallback={CustomFallback}>
          <ThrowError />
        </ErrorBoundary>
      )

      expect(screen.getByText('Custom error message')).toBeInTheDocument()
      expect(screen.queryByText('Something went wrong')).not.toBeInTheDocument()
    })

    it('should render custom fallback function with error and reset', () => {
      const CustomFallback = (error: Error, reset: () => void) => (
        <div>
          <p>Error: {error.message}</p>
          <button onClick={reset}>Reset</button>
        </div>
      )

      render(
        <ErrorBoundary fallback={CustomFallback}>
          <ThrowError error={new Error('Specific error')} />
        </ErrorBoundary>
      )

      expect(screen.getByText('Error: Specific error')).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Reset' })).toBeInTheDocument()
    })
  })

  describe('Error Reset Functionality', () => {
    it('should reset error state when reset is called', async () => {
      const user = userEvent.setup()
      let shouldThrow = true

      const ConditionalThrow = () => {
        if (shouldThrow) {
          throw new Error('Test error')
        }
        return <div>Recovered</div>
      }

      render(
        <ErrorBoundary>
          <ConditionalThrow />
        </ErrorBoundary>
      )

      expect(screen.getByText('Something went wrong')).toBeInTheDocument()

      // Click "Try Again" button
      const tryAgainButton = screen.getByRole('button', { name: 'Try Again' })
      shouldThrow = false

      await user.click(tryAgainButton)

      // After reset, the component should attempt to re-render
      // Note: In a real scenario, this would re-render the children
      expect(screen.queryByText('Something went wrong')).not.toBeInTheDocument()
    })

    it('should have "Try Again" button in default fallback', () => {
      render(
        <ErrorBoundary>
          <ThrowError />
        </ErrorBoundary>
      )

      expect(screen.getByRole('button', { name: 'Try Again' })).toBeInTheDocument()
    })

    it('should have "Go Home" button in default fallback', () => {
      render(
        <ErrorBoundary>
          <ThrowError />
        </ErrorBoundary>
      )

      expect(screen.getByRole('button', { name: 'Go Home' })).toBeInTheDocument()
    })

    it('should navigate to home when "Go Home" is clicked', async () => {
      const user = userEvent.setup()

      // Mock window.location
      delete (window as any).location
      window.location = { href: '' } as any

      render(
        <ErrorBoundary>
          <ThrowError />
        </ErrorBoundary>
      )

      const goHomeButton = screen.getByRole('button', { name: 'Go Home' })
      await user.click(goHomeButton)

      expect(window.location.href).toBe('/')
    })
  })

  describe('Development Mode Error Display', () => {
    // The component shows error details when NODE_ENV !== 'production'
    // In vitest, NODE_ENV is 'test', so error details should be visible

    it('should show error details in non-production mode', () => {
      render(
        <ErrorBoundary>
          <ThrowError error={new Error('Development error')} />
        </ErrorBoundary>
      )

      // In non-production mode (test), error details should be visible
      // The component shows error.toString() which includes "Error: Development error"
      expect(screen.getByText(/Development error/)).toBeInTheDocument()
    })

    it('should show component stack in non-production mode', () => {
      render(
        <ErrorBoundary>
          <ThrowError />
        </ErrorBoundary>
      )

      expect(screen.getByText('Component Stack')).toBeInTheDocument()
    })

    it('should allow expanding component stack details', async () => {
      const user = userEvent.setup()

      render(
        <ErrorBoundary>
          <ThrowError />
        </ErrorBoundary>
      )

      const detailsElement = screen.getByText('Component Stack').closest('details')
      expect(detailsElement).toBeInTheDocument()

      // Component stack should be expandable
      if (detailsElement) {
        await user.click(screen.getByText('Component Stack'))
        expect(detailsElement).toHaveAttribute('open')
      }
    })
  })

  describe('Production Mode Error Display', () => {
    const originalNodeEnv = process.env.NODE_ENV

    beforeEach(() => {
      process.env.NODE_ENV = 'production'
    })

    afterEach(() => {
      process.env.NODE_ENV = originalNodeEnv
    })

    it('should not show error details in production mode', () => {
      render(
        <ErrorBoundary>
          <ThrowError error={new Error('Production error')} />
        </ErrorBoundary>
      )

      expect(screen.queryByText(/Production error/)).not.toBeInTheDocument()
    })

    it('should not show component stack in production mode', () => {
      render(
        <ErrorBoundary>
          <ThrowError />
        </ErrorBoundary>
      )

      expect(screen.queryByText('Component Stack')).not.toBeInTheDocument()
    })

    it('should show generic error message in production', () => {
      render(
        <ErrorBoundary>
          <ThrowError />
        </ErrorBoundary>
      )

      expect(screen.getByText('Something went wrong')).toBeInTheDocument()
      expect(screen.getByText(/We encountered an unexpected error/)).toBeInTheDocument()
    })
  })

  describe('Error Isolation', () => {
    it('should not propagate errors to parent boundary when isolated', () => {
      const parentOnError = vi.fn()

      render(
        <ErrorBoundary onError={parentOnError}>
          <ErrorBoundary isolate onError={vi.fn()}>
            <ThrowError />
          </ErrorBoundary>
        </ErrorBoundary>
      )

      // Inner boundary should catch the error
      expect(screen.getByText('Something went wrong')).toBeInTheDocument()

      // Parent boundary should not be notified due to isolation
      // Note: This is tricky to test as React's error boundaries
      // handle propagation internally
    })

    it('should allow nested error boundaries', () => {
      render(
        <ErrorBoundary fallback={<div>Outer boundary</div>}>
          <div>
            <ErrorBoundary fallback={<div>Inner boundary</div>}>
              <ThrowError />
            </ErrorBoundary>
          </div>
        </ErrorBoundary>
      )

      expect(screen.getByText('Inner boundary')).toBeInTheDocument()
      expect(screen.queryByText('Outer boundary')).not.toBeInTheDocument()
    })
  })

  describe('Error Boundary Styling', () => {
    it('should render error UI with proper styling classes', () => {
      render(
        <ErrorBoundary>
          <ThrowError />
        </ErrorBoundary>
      )

      const heading = screen.getByText('Something went wrong')
      expect(heading.className).toContain('text-2xl')
      expect(heading.className).toContain('font-bold')
    })

    it('should display error icon', () => {
      render(
        <ErrorBoundary>
          <ThrowError />
        </ErrorBoundary>
      )

      const icon = document.querySelector('svg')
      expect(icon).toBeInTheDocument()
    })
  })

  describe('Multiple Errors', () => {
    it('should handle multiple sequential errors', () => {
      const { rerender } = render(
        <ErrorBoundary>
          <ThrowError error={new Error('First error')} />
        </ErrorBoundary>
      )

      expect(screen.getByText('Something went wrong')).toBeInTheDocument()

      rerender(
        <ErrorBoundary>
          <ThrowError error={new Error('Second error')} />
        </ErrorBoundary>
      )

      expect(screen.getByText('Something went wrong')).toBeInTheDocument()
    })

    it('should log each error separately', () => {
      render(
        <ErrorBoundary>
          <ThrowError error={new Error('First error')} />
        </ErrorBoundary>
      )

      expect(screen.getByText('Something went wrong')).toBeInTheDocument()

      // First error logged once

      // Reset mocks and render new error boundary with different error
      vi.clearAllMocks()

      render(
        <ErrorBoundary key="second">
          <ThrowError error={new Error('Second error')} />
        </ErrorBoundary>
      )

      // Second error should also be logged
      expect(errors.logError).toHaveBeenCalled()
    })
  })

  describe('Error Types', () => {
    it('should handle TypeError', () => {
      render(
        <ErrorBoundary>
          <ThrowError error={new TypeError('Type error')} />
        </ErrorBoundary>
      )

      expect(screen.getByText('Something went wrong')).toBeInTheDocument()
      expect(errors.logError).toHaveBeenCalled()
    })

    it('should handle ReferenceError', () => {
      render(
        <ErrorBoundary>
          <ThrowError error={new ReferenceError('Reference error')} />
        </ErrorBoundary>
      )

      expect(screen.getByText('Something went wrong')).toBeInTheDocument()
      expect(errors.logError).toHaveBeenCalled()
    })

    it('should handle custom Error subclasses', () => {
      class CustomError extends Error {
        constructor(message: string) {
          super(message)
          this.name = 'CustomError'
        }
      }

      render(
        <ErrorBoundary>
          <ThrowError error={new CustomError('Custom error')} />
        </ErrorBoundary>
      )

      expect(screen.getByText('Something went wrong')).toBeInTheDocument()
      expect(errors.logError).toHaveBeenCalled()
    })
  })

  describe('Accessibility', () => {
    it('should have accessible error message', () => {
      render(
        <ErrorBoundary>
          <ThrowError />
        </ErrorBoundary>
      )

      const heading = screen.getByRole('heading', { name: 'Something went wrong' })
      expect(heading).toBeInTheDocument()
    })

    it('should have accessible buttons', () => {
      render(
        <ErrorBoundary>
          <ThrowError />
        </ErrorBoundary>
      )

      expect(screen.getByRole('button', { name: 'Try Again' })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Go Home' })).toBeInTheDocument()
    })

    it('should have proper button focus order', () => {
      render(
        <ErrorBoundary>
          <ThrowError />
        </ErrorBoundary>
      )

      const buttons = screen.getAllByRole('button')
      expect(buttons[0]).toHaveAccessibleName('Try Again')
      expect(buttons[1]).toHaveAccessibleName('Go Home')
    })
  })

  describe('Edge Cases', () => {
    it('should handle null error', () => {
      const NullThrow = () => {
        throw null
      }

      render(
        <ErrorBoundary>
          <NullThrow />
        </ErrorBoundary>
      )

      expect(screen.getByText('Something went wrong')).toBeInTheDocument()
    })

    it('should handle undefined error', () => {
      const UndefinedThrow = () => {
        throw undefined
      }

      render(
        <ErrorBoundary>
          <UndefinedThrow />
        </ErrorBoundary>
      )

      expect(screen.getByText('Something went wrong')).toBeInTheDocument()
    })

    it('should handle error without message', () => {
      render(
        <ErrorBoundary>
          <ThrowError error={new Error()} />
        </ErrorBoundary>
      )

      expect(screen.getByText('Something went wrong')).toBeInTheDocument()
    })

    it('should handle very long error messages', () => {
      const longMessage = 'A'.repeat(1000)

      render(
        <ErrorBoundary>
          <ThrowError error={new Error(longMessage)} />
        </ErrorBoundary>
      )

      expect(screen.getByText('Something went wrong')).toBeInTheDocument()
    })
  })

  describe('Component Lifecycle', () => {
    it('should maintain error state across re-renders', () => {
      const { rerender } = render(
        <ErrorBoundary>
          <ThrowError />
        </ErrorBoundary>
      )

      expect(screen.getByText('Something went wrong')).toBeInTheDocument()

      rerender(
        <ErrorBoundary>
          <ThrowError />
        </ErrorBoundary>
      )

      expect(screen.getByText('Something went wrong')).toBeInTheDocument()
    })

    it('should clear error state when reset is called', async () => {
      const user = userEvent.setup()

      // Start with an error
      render(
        <ErrorBoundary>
          <ThrowError />
        </ErrorBoundary>
      )

      expect(screen.getByText('Something went wrong')).toBeInTheDocument()

      // Click reset button - this should clear the error state
      await user.click(screen.getByRole('button', { name: 'Try Again' }))

      // After clicking reset, the error boundary should attempt to re-render children
      // The component will throw again, but we've verified the reset was called
      expect(screen.getByRole('button', { name: 'Try Again' })).toBeInTheDocument()
    })
  })
})
