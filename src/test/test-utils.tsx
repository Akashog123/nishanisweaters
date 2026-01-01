import React from 'react'
import { render, RenderOptions, RenderResult } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import { CartProvider } from '@/context/CartContext'
import {
  mockUseUser,
  mockUseAuth,
  mockSignedInUser,
  mockSignedOutUser,
  mockLoadingUser,
} from './mocks/clerk'
import {
  mockUseQuery,
  mockUseMutation,
  mockQueryResponse,
  mockMutationResponse,
} from './mocks/convex'
import {
  mockNavigate,
  mockUseNavigate,
  mockUseLocation,
  setMockLocation,
  setMockParams,
} from './mocks/router'

// Custom render options
interface CustomRenderOptions extends Omit<RenderOptions, 'wrapper'> {
  // Initial router state
  initialRoute?: string
  routeParams?: Record<string, string>

  // Auth state
  authState?: 'signed-in' | 'signed-out' | 'loading'
  user?: any

  // Convex mock data
  queryData?: Record<string, any>
  mutationHandlers?: Record<string, (...args: any[]) => any>

  // Whether to wrap with providers
  withRouter?: boolean
  withCart?: boolean
  withConvex?: boolean
  withClerk?: boolean
}

/**
 * Custom render function that wraps components with all necessary providers
 * and sets up mocks based on the provided options
 */
export function renderWithProviders(
  ui: React.ReactElement,
  {
    initialRoute = '/',
    routeParams = {},
    authState = 'signed-in',
    user,
    queryData = {},
    mutationHandlers = {},
    withRouter = true,
    withCart = true,
    withConvex = true,
    withClerk = true,
    ...renderOptions
  }: CustomRenderOptions = {}
): RenderResult {
  // Set up router mocks
  if (withRouter && initialRoute !== '/') {
    setMockLocation({ pathname: initialRoute })
  }
  if (withRouter && Object.keys(routeParams).length > 0) {
    setMockParams(routeParams)
  }

  // Set up auth mocks
  if (withClerk) {
    if (authState === 'signed-in') {
      mockSignedInUser(user)
    } else if (authState === 'signed-out') {
      mockSignedOutUser()
    } else if (authState === 'loading') {
      mockLoadingUser()
    }
  }

  // Set up Convex query mocks
  if (withConvex) {
    Object.entries(queryData).forEach(([queryName, response]) => {
      mockQueryResponse(queryName, response)
    })

    Object.entries(mutationHandlers).forEach(([mutationName, handler]) => {
      mockMutationResponse(mutationName, handler)
    })
  }

  // Build wrapper component with selected providers
  const AllProviders = ({ children }: { children: React.ReactNode }) => {
    let wrapped = children

    // Wrap with CartProvider
    if (withCart) {
      wrapped = <CartProvider>{wrapped}</CartProvider>
    }

    // Wrap with BrowserRouter
    if (withRouter) {
      wrapped = <BrowserRouter>{wrapped}</BrowserRouter>
    }

    return <>{wrapped}</>
  }

  return render(ui, { wrapper: AllProviders, ...renderOptions })
}

/**
 * Re-export everything from React Testing Library
 */
export * from '@testing-library/react'
export { default as userEvent } from '@testing-library/user-event'

/**
 * Re-export custom render as render
 */
export { renderWithProviders as render }

/**
 * Export mock utilities for use in tests
 */
export {
  // Clerk mocks
  mockUseUser,
  mockUseAuth,
  mockSignedInUser,
  mockSignedOutUser,
  mockLoadingUser,

  // Convex mocks
  mockUseQuery,
  mockUseMutation,
  mockQueryResponse,
  mockMutationResponse,

  // Router mocks
  mockNavigate,
  mockUseNavigate,
  mockUseLocation,
  setMockLocation,
  setMockParams,
}

/**
 * Helper function to create a mock cart item
 */
export const createMockCartItem = (overrides: Partial<{
  productId: string;
  name: string;
  price: number;
  originalPrice: number;
  image: string;
  size: string;
  color: string;
  quantity: number;
}> = {}) => ({
  productId: 'test-product-1',
  name: 'Test Product',
  price: 99.99,
  originalPrice: 129.99,
  image: '/test-image.jpg',
  size: 'M',
  color: 'Black',
  quantity: 1,
  ...overrides,
})

/**
 * Helper function to create a mock product
 */
export const createMockProduct = (overrides = {}) => ({
  _id: 'test-product-1',
  name: 'Test Product',
  description: 'A test product description',
  price: 99.99,
  originalPrice: 129.99,
  category: 'jackets',
  images: ['/test-image.jpg'],
  sizes: ['S', 'M', 'L', 'XL'],
  colors: ['Black', 'Navy', 'Gray'],
  inStock: true,
  featured: false,
  newArrival: false,
  bestseller: false,
  ...overrides,
})

/**
 * Helper function to create a mock user
 */
export const createMockUser = (overrides = {}) => ({
  _id: 'test-db-user-1',
  clerkId: 'test-user-id',
  email: 'test@example.com',
  firstName: 'Test',
  lastName: 'User',
  role: 'customer' as const,
  createdAt: Date.now(),
  ...overrides,
})

/**
 * Helper function to wait for async updates
 */
export const waitForLoadingToFinish = () =>
  new Promise((resolve) => setTimeout(resolve, 0))
