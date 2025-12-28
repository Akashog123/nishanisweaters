import React from 'react'
import { vi } from 'vitest'

// Mock location object
export const mockLocation = {
  pathname: '/',
  search: '',
  hash: '',
  state: null,
  key: 'default',
}

// Mock navigate function
export const mockNavigate = vi.fn()

// Mock useNavigate hook
export const mockUseNavigate = vi.fn(() => mockNavigate)

// Mock useLocation hook
export const mockUseLocation = vi.fn(() => mockLocation)

// Mock useParams hook
export const mockUseParams = vi.fn(() => ({}))

// Mock useSearchParams hook
export const mockUseSearchParams = vi.fn(() => [new URLSearchParams(), vi.fn()])

// Mock Link component
export const MockLink = ({ to, children, ...props }: any) => {
  return (
    <a href={to} {...props}>
      {children}
    </a>
  )
}

// Mock Navigate component
export const MockNavigate = ({ to, replace, state }: any) => {
  return <div data-testid="navigate" data-to={to} data-replace={replace} data-state={state} />
}

// Mock BrowserRouter
export const MockBrowserRouter = ({ children }: { children: React.ReactNode }) => {
  return <>{children}</>
}

// Mock Routes
export const MockRoutes = ({ children }: { children: React.ReactNode }) => {
  return <>{children}</>
}

// Mock Route
export const MockRoute = ({ element }: { element: React.ReactNode }) => {
  return <>{element}</>
}

// Helper to set current location
export const setMockLocation = (location: Partial<typeof mockLocation>) => {
  Object.assign(mockLocation, location)
  mockUseLocation.mockReturnValue({ ...mockLocation })
}

// Helper to set route params
export const setMockParams = (params: Record<string, string>) => {
  mockUseParams.mockReturnValue(params)
}

// Helper to set search params
export const setMockSearchParams = (params: Record<string, string>) => {
  const searchParams = new URLSearchParams(params)
  const setSearchParams = vi.fn((newParams) => {
    if (typeof newParams === 'function') {
      const updated = newParams(searchParams)
      Object.keys(updated).forEach((key) => {
        searchParams.set(key, updated[key])
      })
    } else {
      Object.keys(newParams).forEach((key) => {
        searchParams.set(key, newParams[key])
      })
    }
  })
  mockUseSearchParams.mockReturnValue([searchParams, setSearchParams])
}

// Reset all mocks
export const resetRouterMocks = () => {
  mockNavigate.mockReset()
  mockUseNavigate.mockReset()
  mockUseLocation.mockReset()
  mockUseParams.mockReset()
  mockUseSearchParams.mockReset()

  // Reset to defaults
  Object.assign(mockLocation, {
    pathname: '/',
    search: '',
    hash: '',
    state: null,
    key: 'default',
  })
  mockUseNavigate.mockReturnValue(mockNavigate)
  mockUseLocation.mockReturnValue(mockLocation)
  mockUseParams.mockReturnValue({})
  mockUseSearchParams.mockReturnValue([new URLSearchParams(), vi.fn()])
}

// Setup router mocks
export const setupRouterMocks = () => {
  vi.mock('react-router-dom', async () => {
    const actual = await vi.importActual('react-router-dom')
    return {
      ...actual,
      useNavigate: mockUseNavigate,
      useLocation: mockUseLocation,
      useParams: mockUseParams,
      useSearchParams: mockUseSearchParams,
      Link: MockLink,
      Navigate: MockNavigate,
      BrowserRouter: MockBrowserRouter,
      Routes: MockRoutes,
      Route: MockRoute,
    }
  })
}
