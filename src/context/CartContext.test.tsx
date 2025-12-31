import { describe, it, expect, beforeEach, vi } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { CartProvider, useCart, CartItem } from '@/context/CartContext'
import { createMockCartItem } from '@/test/test-utils'

// Mock Clerk to avoid ClerkProvider requirement
vi.mock('@clerk/clerk-react', () => ({
  useUser: () => ({
    user: { id: 'test-user-id' },
    isSignedIn: true,
    isLoaded: true,
  }),
  ClerkProvider: ({ children }: { children: React.ReactNode }) => children,
}))

// Mock Convex auth
vi.mock('convex/react', () => ({
  useConvexAuth: () => ({
    isAuthenticated: true,
    isLoading: false,
  }),
  useMutation: () => vi.fn(),
  useQuery: () => null,
}))

describe('CartContext', () => {
  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <CartProvider>{children}</CartProvider>
  )

  describe('addToCart', () => {
    it('should add a new item to the cart', () => {
      const { result } = renderHook(() => useCart(), { wrapper })
      const item = createMockCartItem()

      act(() => {
        result.current.addToCart(item)
      })

      expect(result.current.items).toHaveLength(1)
      expect(result.current.items[0]).toMatchObject(item)
      expect(result.current.totalItems).toBe(1)
    })

    it('should increase quantity if item already exists in cart', () => {
      const { result } = renderHook(() => useCart(), { wrapper })
      const item = createMockCartItem({ quantity: 2 })

      act(() => {
        result.current.addToCart(item)
      })

      expect(result.current.items[0].quantity).toBe(2)

      act(() => {
        result.current.addToCart({ ...item, quantity: 3 })
      })

      expect(result.current.items).toHaveLength(1)
      expect(result.current.items[0].quantity).toBe(5)
      expect(result.current.totalItems).toBe(5)
    })

    it('should treat items with different sizes as separate items', () => {
      const { result } = renderHook(() => useCart(), { wrapper })
      const itemM = createMockCartItem({ size: 'M' })
      const itemL = createMockCartItem({ size: 'L' })

      act(() => {
        result.current.addToCart(itemM)
        result.current.addToCart(itemL)
      })

      expect(result.current.items).toHaveLength(2)
      expect(result.current.totalItems).toBe(2)
    })

    it('should treat items with different colors as separate items', () => {
      const { result } = renderHook(() => useCart(), { wrapper })
      const itemBlack = createMockCartItem({ color: 'Black' })
      const itemNavy = createMockCartItem({ color: 'Navy' })

      act(() => {
        result.current.addToCart(itemBlack)
        result.current.addToCart(itemNavy)
      })

      expect(result.current.items).toHaveLength(2)
      expect(result.current.totalItems).toBe(2)
    })
  })

  describe('removeFromCart', () => {
    it('should remove an item from the cart', () => {
      const { result } = renderHook(() => useCart(), { wrapper })
      const item = createMockCartItem()

      act(() => {
        result.current.addToCart(item)
      })

      expect(result.current.items).toHaveLength(1)

      act(() => {
        result.current.removeFromCart(item.productId, item.size, item.color)
      })

      expect(result.current.items).toHaveLength(0)
      expect(result.current.totalItems).toBe(0)
    })

    it('should only remove the matching item variant', () => {
      const { result } = renderHook(() => useCart(), { wrapper })
      const itemM = createMockCartItem({ size: 'M' })
      const itemL = createMockCartItem({ size: 'L' })

      act(() => {
        result.current.addToCart(itemM)
        result.current.addToCart(itemL)
      })

      expect(result.current.items).toHaveLength(2)

      act(() => {
        result.current.removeFromCart(itemM.productId, itemM.size, itemM.color)
      })

      expect(result.current.items).toHaveLength(1)
      expect(result.current.items[0].size).toBe('L')
    })
  })

  describe('updateQuantity', () => {
    it('should update the quantity of an item', () => {
      const { result } = renderHook(() => useCart(), { wrapper })
      const item = createMockCartItem({ quantity: 1 })

      act(() => {
        result.current.addToCart(item)
      })

      expect(result.current.items[0].quantity).toBe(1)

      act(() => {
        result.current.updateQuantity(item.productId, item.size, item.color, 5)
      })

      expect(result.current.items[0].quantity).toBe(5)
      expect(result.current.totalItems).toBe(5)
    })

    it('should remove item when quantity is set to 0', () => {
      const { result } = renderHook(() => useCart(), { wrapper })
      const item = createMockCartItem()

      act(() => {
        result.current.addToCart(item)
      })

      expect(result.current.items).toHaveLength(1)

      act(() => {
        result.current.updateQuantity(item.productId, item.size, item.color, 0)
      })

      expect(result.current.items).toHaveLength(0)
    })

    it('should remove item when quantity is negative', () => {
      const { result } = renderHook(() => useCart(), { wrapper })
      const item = createMockCartItem()

      act(() => {
        result.current.addToCart(item)
      })

      expect(result.current.items).toHaveLength(1)

      act(() => {
        result.current.updateQuantity(item.productId, item.size, item.color, -1)
      })

      expect(result.current.items).toHaveLength(0)
    })
  })

  describe('clearCart', () => {
    it('should remove all items from the cart', () => {
      const { result } = renderHook(() => useCart(), { wrapper })
      const item1 = createMockCartItem({ productId: '1' })
      const item2 = createMockCartItem({ productId: '2' })

      act(() => {
        result.current.addToCart(item1)
        result.current.addToCart(item2)
      })

      expect(result.current.items).toHaveLength(2)

      act(() => {
        result.current.clearCart()
      })

      expect(result.current.items).toHaveLength(0)
      expect(result.current.totalItems).toBe(0)
      expect(result.current.subtotal).toBe(0)
    })
  })

  describe('subtotal calculation', () => {
    it('should calculate subtotal correctly', () => {
      const { result } = renderHook(() => useCart(), { wrapper })
      const item1 = createMockCartItem({ price: '50.00', quantity: 2 })
      const item2 = createMockCartItem({
        productId: '2',
        price: '25.00',
        quantity: 3,
        size: 'L'
      })

      act(() => {
        result.current.addToCart(item1)
        result.current.addToCart(item2)
      })

      // (50 * 2) + (25 * 3) = 100 + 75 = 175
      expect(result.current.subtotal).toBe(175)
    })

    it('should update subtotal when quantity changes', () => {
      const { result } = renderHook(() => useCart(), { wrapper })
      const item = createMockCartItem({ price: '100.00', quantity: 1 })

      act(() => {
        result.current.addToCart(item)
      })

      expect(result.current.subtotal).toBe(100)

      act(() => {
        result.current.updateQuantity(item.productId, item.size, item.color, 3)
      })

      expect(result.current.subtotal).toBe(300)
    })
  })

  describe('totalItems calculation', () => {
    it('should calculate total items correctly', () => {
      const { result } = renderHook(() => useCart(), { wrapper })
      const item1 = createMockCartItem({ quantity: 2 })
      const item2 = createMockCartItem({
        productId: '2',
        quantity: 3,
        size: 'L'
      })

      act(() => {
        result.current.addToCart(item1)
        result.current.addToCart(item2)
      })

      expect(result.current.totalItems).toBe(5)
    })
  })

  describe('useCart hook', () => {
    it('should throw error when used outside CartProvider', () => {
      // Suppress console.error for this test
      const originalError = console.error
      console.error = () => {}

      expect(() => {
        renderHook(() => useCart())
      }).toThrow('useCart must be used within a CartProvider')

      console.error = originalError
    })
  })
})
