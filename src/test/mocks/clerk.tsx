import { vi } from 'vitest'
import React from 'react'

// Mock user object
export const mockUser = {
  id: 'test-user-id',
  firstName: 'Test',
  lastName: 'User',
  emailAddresses: [
    {
      emailAddress: 'test@example.com',
      id: 'email-1',
    },
  ],
  primaryEmailAddress: {
    emailAddress: 'test@example.com',
    id: 'email-1',
  },
  imageUrl: 'https://example.com/avatar.jpg',
  fullName: 'Test User',
  username: 'testuser',
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
}

// Mock session object
export const mockSession = {
  id: 'test-session-id',
  user: mockUser,
  status: 'active' as const,
  lastActiveAt: new Date(),
  abandonAt: new Date(),
  expireAt: new Date(),
}

// Mock useUser hook
export const mockUseUser = vi.fn(() => ({
  isLoaded: true,
  isSignedIn: true,
  user: mockUser,
}))

// Mock useAuth hook
export const mockUseAuth = vi.fn(() => ({
  isLoaded: true,
  isSignedIn: true,
  userId: mockUser.id,
  sessionId: mockSession.id,
  signOut: vi.fn(() => Promise.resolve()),
  getToken: vi.fn(() => Promise.resolve('mock-token')),
}))

// Mock useClerk hook
export const mockUseClerk = vi.fn(() => ({
  user: mockUser,
  session: mockSession,
  signOut: vi.fn(() => Promise.resolve()),
  openSignIn: vi.fn(),
  openSignUp: vi.fn(),
  openUserProfile: vi.fn(),
}))

// Mock useSignIn hook
export const mockUseSignIn = vi.fn(() => ({
  isLoaded: true,
  signIn: {
    create: vi.fn(() => Promise.resolve()),
    prepareFirstFactor: vi.fn(() => Promise.resolve()),
    attemptFirstFactor: vi.fn(() => Promise.resolve()),
  },
  setActive: vi.fn(() => Promise.resolve()),
}))

// Mock useSignUp hook
export const mockUseSignUp = vi.fn(() => ({
  isLoaded: true,
  signUp: {
    create: vi.fn(() => Promise.resolve()),
    prepareEmailAddressVerification: vi.fn(() => Promise.resolve()),
    attemptEmailAddressVerification: vi.fn(() => Promise.resolve()),
  },
  setActive: vi.fn(() => Promise.resolve()),
}))

// Mock ClerkProvider
export const MockClerkProvider = ({ children }: { children: React.ReactNode }) => {
  return <>{children}</>
}

// Mock SignedIn component
export const MockSignedIn = ({ children }: { children: React.ReactNode }) => {
  const { isSignedIn } = mockUseAuth()
  return isSignedIn ? <>{children}</> : null
}

// Mock SignedOut component
export const MockSignedOut = ({ children }: { children: React.ReactNode }) => {
  const { isSignedIn } = mockUseAuth()
  return !isSignedIn ? <>{children}</> : null
}

// Mock RedirectToSignIn component
export const MockRedirectToSignIn = () => {
  return <div data-testid="redirect-to-signin">Redirecting to sign in...</div>
}

// Helper to set user as signed in
export const mockSignedInUser = (user = mockUser) => {
  mockUseUser.mockReturnValue({
    isLoaded: true,
    isSignedIn: true,
    user,
  })
  mockUseAuth.mockReturnValue({
    isLoaded: true,
    isSignedIn: true,
    userId: user.id,
    sessionId: mockSession.id,
    signOut: vi.fn(() => Promise.resolve()),
    getToken: vi.fn(() => Promise.resolve('mock-token')),
  })
}

// Helper to set user as signed out
export const mockSignedOutUser = () => {
  mockUseUser.mockReturnValue({
    isLoaded: true,
    isSignedIn: false,
    user: null,
  })
  mockUseAuth.mockReturnValue({
    isLoaded: true,
    isSignedIn: false,
    userId: null,
    sessionId: null,
    signOut: vi.fn(() => Promise.resolve()),
    getToken: vi.fn(() => Promise.resolve(null)),
  })
}

// Helper to set user as loading
export const mockLoadingUser = () => {
  mockUseUser.mockReturnValue({
    isLoaded: false,
    isSignedIn: false,
    user: null,
  })
  mockUseAuth.mockReturnValue({
    isLoaded: false,
    isSignedIn: false,
    userId: null,
    sessionId: null,
    signOut: vi.fn(() => Promise.resolve()),
    getToken: vi.fn(() => Promise.resolve(null)),
  })
}

// Reset all mocks
export const resetClerkMocks = () => {
  mockUseUser.mockReset()
  mockUseAuth.mockReset()
  mockUseClerk.mockReset()
  mockUseSignIn.mockReset()
  mockUseSignUp.mockReset()
  // Set default to signed in
  mockSignedInUser()
}

// Setup Clerk mocks
export const setupClerkMocks = () => {
  vi.mock('@clerk/clerk-react', () => ({
    useUser: mockUseUser,
    useAuth: mockUseAuth,
    useClerk: mockUseClerk,
    useSignIn: mockUseSignIn,
    useSignUp: mockUseSignUp,
    ClerkProvider: MockClerkProvider,
    SignedIn: MockSignedIn,
    SignedOut: MockSignedOut,
    RedirectToSignIn: MockRedirectToSignIn,
  }))
}
