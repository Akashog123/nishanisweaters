import { vi } from 'vitest'
import React from 'react'

// Mock Convex client
export const mockConvexClient = {
  query: vi.fn(),
  mutation: vi.fn(),
  action: vi.fn(),
}

// Mock useQuery hook
export const mockUseQuery = vi.fn((query, args) => {
  if (args === 'skip') {
    return undefined
  }
  return null
})

// Mock useMutation hook
export const mockUseMutation = vi.fn(() => {
  return vi.fn()
})

// Mock useAction hook
export const mockUseAction = vi.fn(() => {
  return vi.fn()
})

// Mock useConvex hook
export const mockUseConvex = vi.fn(() => mockConvexClient)

// Mock ConvexProvider
export const MockConvexProvider = ({ children }: { children: React.ReactNode }) => {
  return <>{children}</>
}

// Helper to set up mock query responses
export const mockQueryResponse = (queryName: string, response: any) => {
  mockUseQuery.mockImplementation((query, args) => {
    if (args === 'skip') {
      return undefined
    }
    return response
  })
}

// Helper to set up mock mutation
export const mockMutationResponse = (mutationName: string, implementation?: (...args: any[]) => any) => {
  const mockFn = vi.fn(implementation || (() => Promise.resolve()))
  mockUseMutation.mockReturnValue(mockFn)
  return mockFn
}

// Reset all mocks
export const resetConvexMocks = () => {
  mockUseQuery.mockReset()
  mockUseMutation.mockReset()
  mockUseAction.mockReset()
  mockUseConvex.mockReset()
  mockConvexClient.query.mockReset()
  mockConvexClient.mutation.mockReset()
  mockConvexClient.action.mockReset()
}

// Default mock implementation
export const setupConvexMocks = () => {
  vi.mock('convex/react', () => ({
    useQuery: mockUseQuery,
    useMutation: mockUseMutation,
    useAction: mockUseAction,
    useConvex: mockUseConvex,
    ConvexProvider: MockConvexProvider,
  }))
}
