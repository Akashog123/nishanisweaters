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

// Mock Clerk to avoid ClerkProvider requirement
const mockUseUser = vi.fn()
vi.mock('@clerk/clerk-react', () => ({
  useUser: () => mockUseUser(),
  ClerkProvider: ({ children }: { children: React.ReactNode }) => children,
}))

// Mock the Convex API with a controllable mock function
const mockUseQuery = vi.fn()
vi.mock('convex/react', () => ({
  useQuery: (...args: any[]) => mockUseQuery(...args),
  useConvexAuth: () => ({
    isAuthenticated: true,
    isLoading: false,
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

  beforeEach(() => {
    vi.clearAllMocks()
    // Default to signed in user with loaded state
    mockUseUser.mockReturnValue({
      user: { id: 'test-user-id' },
      isSignedIn: true,
      isLoaded: true,
    })
    // Default Convex query returns a customer user
    mockUseQuery.mockReturnValue(createMockUser({ role: 'customer' }))
  })

  describe('when user is loading', () => {
    it('should show loading spinner', () => {
      // Set Clerk to loading state (isLoaded: false)
      mockUseUser.mockReturnValue({
        user: null,
        isSignedIn: false,
        isLoaded: false,
      })
      // Convex query should not be called when user is not loaded
      mockUseQuery.mockReturnValue(undefined)

      render(
        <ProtectedRoute>
          <TestChild />
        </ProtectedRoute>,
        { withClerk: true, authState: 'loading', withCart: false }
      )

      // Find the loading spinner by its className
      const spinner = document.querySelector('.animate-spin')
      expect(spinner).toBeInTheDocument()
      expect(screen.queryByTestId('protected-content')).not.toBeInTheDocument()
    })
  })

  describe('when user is not signed in', () => {
    it('should redirect to home page', () => {
      // Set Clerk to signed out state
      mockUseUser.mockReturnValue({
        user: null,
        isSignedIn: false,
        isLoaded: true,
      })
      // Convex query should return undefined when not signed in
      mockUseQuery.mockReturnValue(undefined)

      render(
        <ProtectedRoute>
          <TestChild />
        </ProtectedRoute>,
        { withClerk: true, authState: 'signed-out', withCart: false }
      )

      expect(screen.getByTestId('navigate-redirect')).toHaveTextContent('Redirecting to /')
      expect(screen.queryByTestId('protected-content')).not.toBeInTheDocument()
    })
  })

  describe('when user is signed in without role requirement', () => {
    it('should render children', async () => {
      // Set Clerk to signed in state
      mockUseUser.mockReturnValue({
        user: { id: 'test-user-id' },
        isSignedIn: true,
        isLoaded: true,
      })
      // Convex query returns user data (not needed for no role requirement, but component calls it)
      mockUseQuery.mockReturnValue(createMockUser({ role: 'customer' }))

      render(
        <ProtectedRoute>
          <TestChild />
        </ProtectedRoute>,
        { withClerk: true, authState: 'signed-in', withCart: false }
      )

      await waitFor(() => {
        expect(screen.getByTestId('protected-content')).toBeInTheDocument()
      })
    })
  })

  describe('when user is signed in with role requirement', () => {
    it('should render children when user has the required role', async () => {
      const customerUser = createMockUser({ role: 'customer' })
      // Set Clerk to signed in state
      mockUseUser.mockReturnValue({
        user: { id: 'test-user-id' },
        isSignedIn: true,
        isLoaded: true,
      })
      // Convex query returns customer user
      mockUseQuery.mockReturnValue(customerUser)

      render(
        <ProtectedRoute requiredRole="customer">
          <TestChild />
        </ProtectedRoute>,
        { withClerk: true, authState: 'signed-in', withCart: false }
      )

      await waitFor(() => {
        expect(screen.getByTestId('protected-content')).toBeInTheDocument()
      })
    })

    it('should redirect when user does not have the required role', async () => {
      const customerUser = createMockUser({ role: 'customer' })
      // Set Clerk to signed in state
      mockUseUser.mockReturnValue({
        user: { id: 'test-user-id' },
        isSignedIn: true,
        isLoaded: true,
      })
      // Convex query returns customer user (but admin role is required)
      mockUseQuery.mockReturnValue(customerUser)

      render(
        <ProtectedRoute requiredRole="admin">
          <TestChild />
        </ProtectedRoute>,
        { withClerk: true, authState: 'signed-in', withCart: false }
      )

      await waitFor(() => {
        expect(screen.getByTestId('navigate-redirect')).toBeInTheDocument()
        expect(screen.queryByTestId('protected-content')).not.toBeInTheDocument()
      })
    })

    it('should allow admin to access any route', async () => {
      const adminUser = createMockUser({ role: 'admin' })
      // Set Clerk to signed in state
      mockUseUser.mockReturnValue({
        user: { id: 'test-user-id' },
        isSignedIn: true,
        isLoaded: true,
      })
      // Convex query returns admin user
      mockUseQuery.mockReturnValue(adminUser)

      render(
        <ProtectedRoute requiredRole="wholesale">
          <TestChild />
        </ProtectedRoute>,
        { withClerk: true, authState: 'signed-in', withCart: false }
      )

      await waitFor(() => {
        expect(screen.getByTestId('protected-content')).toBeInTheDocument()
      })
    })

    it('should show loading while fetching user data', () => {
      // Set Clerk to signed in state
      mockUseUser.mockReturnValue({
        user: { id: 'test-user-id' },
        isSignedIn: true,
        isLoaded: true,
      })
      // Convex query returns undefined (still loading)
      mockUseQuery.mockReturnValue(undefined)

      render(
        <ProtectedRoute requiredRole="customer">
          <TestChild />
        </ProtectedRoute>,
        { withClerk: true, authState: 'signed-in', withCart: false }
      )

      // Find the loading spinner by its className
      const spinner = document.querySelector('.animate-spin')
      expect(spinner).toBeInTheDocument()
      expect(screen.queryByTestId('protected-content')).not.toBeInTheDocument()
    })
  })

  describe('wholesale role access', () => {
    it('should allow wholesale users to access wholesale routes', async () => {
      const wholesaleUser = createMockUser({ role: 'wholesale' })
      // Set Clerk to signed in state
      mockUseUser.mockReturnValue({
        user: { id: 'test-user-id' },
        isSignedIn: true,
        isLoaded: true,
      })
      // Convex query returns wholesale user
      mockUseQuery.mockReturnValue(wholesaleUser)

      render(
        <ProtectedRoute requiredRole="wholesale">
          <TestChild />
        </ProtectedRoute>,
        { withClerk: true, authState: 'signed-in', withCart: false }
      )

      await waitFor(() => {
        expect(screen.getByTestId('protected-content')).toBeInTheDocument()
      })
    })

    it('should block customer users from accessing wholesale routes', async () => {
      const customerUser = createMockUser({ role: 'customer' })
      // Set Clerk to signed in state
      mockUseUser.mockReturnValue({
        user: { id: 'test-user-id' },
        isSignedIn: true,
        isLoaded: true,
      })
      // Convex query returns customer user (but wholesale role is required)
      mockUseQuery.mockReturnValue(customerUser)

      render(
        <ProtectedRoute requiredRole="wholesale">
          <TestChild />
        </ProtectedRoute>,
        { withClerk: true, authState: 'signed-in', withCart: false }
      )

      await waitFor(() => {
        expect(screen.getByTestId('navigate-redirect')).toBeInTheDocument()
      })
    })
  })
})
