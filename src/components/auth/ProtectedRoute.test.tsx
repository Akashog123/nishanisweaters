import { describe, it, expect, beforeEach, vi } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import { ProtectedRoute } from '@/components/auth/ProtectedRoute'
import {
  render,
  mockSignedInUser,
  mockSignedOutUser,
  mockLoadingUser,
  createMockUser,
  mockQueryResponse,
} from '@/test/test-utils'

// Mock the Convex API
vi.mock('convex/react', () => ({
  useQuery: vi.fn((query, args) => {
    if (args === 'skip') {
      return undefined
    }
    // Return mock user data by default
    return createMockUser()
  }),
}))

// Mock react-router-dom Navigate component
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return {
    ...actual,
    Navigate: ({ to }: { to: string }) => (
      <div data-testid="navigate-redirect">Redirecting to {to}</div>
    ),
    useLocation: () => ({ pathname: '/test' }),
  }
})

describe('ProtectedRoute', () => {
  const TestChild = () => <div data-testid="protected-content">Protected Content</div>

  describe('when user is loading', () => {
    it('should show loading spinner', () => {
      mockLoadingUser()

      render(
        <ProtectedRoute>
          <TestChild />
        </ProtectedRoute>,
        { withClerk: true, authState: 'loading' }
      )

      expect(screen.getByRole('status', { hidden: true })).toBeInTheDocument()
      expect(screen.queryByTestId('protected-content')).not.toBeInTheDocument()
    })
  })

  describe('when user is not signed in', () => {
    it('should redirect to home page', () => {
      mockSignedOutUser()

      render(
        <ProtectedRoute>
          <TestChild />
        </ProtectedRoute>,
        { withClerk: true, authState: 'signed-out' }
      )

      expect(screen.getByTestId('navigate-redirect')).toHaveTextContent('Redirecting to /')
      expect(screen.queryByTestId('protected-content')).not.toBeInTheDocument()
    })
  })

  describe('when user is signed in without role requirement', () => {
    it('should render children', async () => {
      mockSignedInUser()

      render(
        <ProtectedRoute>
          <TestChild />
        </ProtectedRoute>,
        { withClerk: true, authState: 'signed-in' }
      )

      await waitFor(() => {
        expect(screen.getByTestId('protected-content')).toBeInTheDocument()
      })
    })
  })

  describe('when user is signed in with role requirement', () => {
    it('should render children when user has the required role', async () => {
      const customerUser = createMockUser({ role: 'customer' })
      mockSignedInUser()
      mockQueryResponse('users.getCurrentUser', customerUser)

      const { useQuery } = await import('convex/react')
      vi.mocked(useQuery).mockReturnValue(customerUser)

      render(
        <ProtectedRoute requiredRole="customer">
          <TestChild />
        </ProtectedRoute>,
        { withClerk: true, authState: 'signed-in' }
      )

      await waitFor(() => {
        expect(screen.getByTestId('protected-content')).toBeInTheDocument()
      })
    })

    it('should redirect when user does not have the required role', async () => {
      const customerUser = createMockUser({ role: 'customer' })
      mockSignedInUser()

      const { useQuery } = await import('convex/react')
      vi.mocked(useQuery).mockReturnValue(customerUser)

      render(
        <ProtectedRoute requiredRole="admin">
          <TestChild />
        </ProtectedRoute>,
        { withClerk: true, authState: 'signed-in' }
      )

      await waitFor(() => {
        expect(screen.getByTestId('navigate-redirect')).toBeInTheDocument()
        expect(screen.queryByTestId('protected-content')).not.toBeInTheDocument()
      })
    })

    it('should allow admin to access any route', async () => {
      const adminUser = createMockUser({ role: 'admin' })
      mockSignedInUser()

      const { useQuery } = await import('convex/react')
      vi.mocked(useQuery).mockReturnValue(adminUser)

      render(
        <ProtectedRoute requiredRole="wholesale">
          <TestChild />
        </ProtectedRoute>,
        { withClerk: true, authState: 'signed-in' }
      )

      await waitFor(() => {
        expect(screen.getByTestId('protected-content')).toBeInTheDocument()
      })
    })

    it('should show loading while fetching user data', async () => {
      mockSignedInUser()

      const { useQuery } = await import('convex/react')
      vi.mocked(useQuery).mockReturnValue(undefined)

      render(
        <ProtectedRoute requiredRole="customer">
          <TestChild />
        </ProtectedRoute>,
        { withClerk: true, authState: 'signed-in' }
      )

      expect(screen.getByRole('status', { hidden: true })).toBeInTheDocument()
      expect(screen.queryByTestId('protected-content')).not.toBeInTheDocument()
    })
  })

  describe('wholesale role access', () => {
    it('should allow wholesale users to access wholesale routes', async () => {
      const wholesaleUser = createMockUser({ role: 'wholesale' })
      mockSignedInUser()

      const { useQuery } = await import('convex/react')
      vi.mocked(useQuery).mockReturnValue(wholesaleUser)

      render(
        <ProtectedRoute requiredRole="wholesale">
          <TestChild />
        </ProtectedRoute>,
        { withClerk: true, authState: 'signed-in' }
      )

      await waitFor(() => {
        expect(screen.getByTestId('protected-content')).toBeInTheDocument()
      })
    })

    it('should block customer users from accessing wholesale routes', async () => {
      const customerUser = createMockUser({ role: 'customer' })
      mockSignedInUser()

      const { useQuery } = await import('convex/react')
      vi.mocked(useQuery).mockReturnValue(customerUser)

      render(
        <ProtectedRoute requiredRole="wholesale">
          <TestChild />
        </ProtectedRoute>,
        { withClerk: true, authState: 'signed-in' }
      )

      await waitFor(() => {
        expect(screen.getByTestId('navigate-redirect')).toBeInTheDocument()
      })
    })
  })
})
