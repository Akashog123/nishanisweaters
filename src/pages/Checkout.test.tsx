import { describe, it, expect, beforeEach, vi } from 'vitest'
import { screen, waitFor, render as rtlRender } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { mockSignedInUser, createMockUser } from '@/test/test-utils'
import Checkout from './Checkout'
import { mockUseMutation, mockUseQuery } from '@/test/mocks/convex'
import { mockUseUser } from '@/test/mocks/clerk'
import { mockNavigate } from '@/test/mocks/router'
import * as toast from 'sonner'

// Mock dependencies
vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
  },
}))

vi.mock('@clerk/clerk-react', () => ({
  useUser: mockUseUser,
}))

vi.mock('convex/react', () => ({
  useQuery: mockUseQuery,
  useMutation: mockUseMutation,
  useAction: vi.fn(() => vi.fn()),
}))

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  }
})

// Mock the cart context with a factory function for flexibility
let mockCartItems: any[] = []
let mockCartError: string | null = null
const mockClearCart = vi.fn()
const mockGetSubtotal = vi.fn()

vi.mock('@/context/CartContext', () => ({
  useCart: () => ({
    items: mockCartItems,
    getSubtotal: mockGetSubtotal,
    clearCart: mockClearCart,
    isLoading: false,
    error: mockCartError,
  }),
}))

// Mock Layout component
vi.mock('@/components/Layout', () => ({
  default: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}))

// Mock useConvexError hook
vi.mock('@/hooks/useConvexError', () => ({
  useConvexError: () => ({
    handleError: vi.fn(),
  }),
}))

// Mock CheckoutErrorBoundary
vi.mock('@/components/CheckoutErrorBoundary', () => ({
  CheckoutErrorBoundary: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}))

// Mock Razorpay
vi.mock('@/types/razorpay', () => ({
  loadRazorpayScript: vi.fn().mockResolvedValue(true),
}))

// Simple render without providers since we're mocking everything
const render = (component: React.ReactElement) => rtlRender(component)

describe('Checkout Page', () => {
  const mockCreateOrder = vi.fn()
  const mockValidateCart = vi.fn()
  const mockDbUser = createMockUser({ role: 'customer' })

  beforeEach(() => {
    vi.clearAllMocks()

    // Reset cart items to default
    mockCartItems = [
      {
        productId: 'prod-1',
        _convexProductId: 'prod-1',
        name: 'Test Jacket',
        price: 100,
        image: '/test.jpg',
        size: 'M',
        color: 'Black',
        quantity: 2,
        _variantSku: 'M-Black',
      },
    ]

    // Reset cart error to null (no error by default)
    mockCartError = null

    mockGetSubtotal.mockReturnValue(200)
    mockCreateOrder.mockResolvedValue('order-123')
    mockValidateCart.mockResolvedValue({ isValid: true, errors: [] })

    // Set up default mocks
    mockSignedInUser()

    // Mock useQuery to return a combined object that satisfies all queries
    // This is more robust than counter-based mocking since React may call hooks multiple times
    mockUseQuery.mockReturnValue({
      // User data (for api.users.getUser)
      ...mockDbUser,
      // Cart data (for api.cart.getCart)
      promoDiscount: 0,
      appliedPromoCode: null,
      // Pricing preview (for api.orders.getOrderPreview)
      subtotal: 200,
      shippingCost: 0,
      tax: 36,
      taxRate: 0.18,
      total: 236,
    })

    // Mock useMutation to return different functions for different calls
    let mutationCallCount = 0
    mockUseMutation.mockImplementation(() => {
      mutationCallCount++
      // First call is createOrder, second is validateCart
      if (mutationCallCount === 1) {
        return mockCreateOrder
      }
      return mockValidateCart
    })
  })

  describe('Rendering and Initial State', () => {
    it('should render checkout page with step indicator', () => {
      render(<Checkout />)

      expect(screen.getByText('Checkout')).toBeInTheDocument()
      expect(screen.getByRole('navigation', { name: /checkout progress/i })).toBeInTheDocument()
    })

    it('should render cart review step initially', () => {
      render(<Checkout />)

      expect(screen.getByText('Test Jacket')).toBeInTheDocument()
      expect(screen.getByText(/Size: M \| Color: Black/i)).toBeInTheDocument()
      expect(screen.getByText('Continue to Shipping')).toBeInTheDocument()
    })

    it('should display correct item count and subtotal', () => {
      render(<Checkout />)

      expect(screen.getByText(/Subtotal \(1 items\)/i)).toBeInTheDocument()
      // Use getAllByText since subtotal appears in multiple places (item price and total)
      const priceElements = screen.getAllByText('₹200.00')
      expect(priceElements.length).toBeGreaterThanOrEqual(1)
    })
  })

  describe('Step Navigation', () => {
    it('should navigate from cart review to shipping step', async () => {
      const user = userEvent.setup()
      render(<Checkout />)

      const continueButton = screen.getByText('Continue to Shipping')
      await user.click(continueButton)

      await waitFor(() => {
        expect(screen.getByLabelText(/full name/i)).toBeInTheDocument()
        expect(screen.getByLabelText(/phone number/i)).toBeInTheDocument()
        expect(screen.getByLabelText(/street address/i)).toBeInTheDocument()
      })
    })

    it('should navigate back from shipping to cart review', async () => {
      const user = userEvent.setup()
      render(<Checkout />)

      // Go to shipping step
      await user.click(screen.getByText('Continue to Shipping'))

      await waitFor(() => {
        expect(screen.getByLabelText(/full name/i)).toBeInTheDocument()
      })

      // Go back
      const backButton = screen.getByRole('button', { name: /back/i })
      await user.click(backButton)

      await waitFor(() => {
        expect(screen.getByText('Continue to Shipping')).toBeInTheDocument()
      })
    })

    it('should navigate through all steps to review', async () => {
      const user = userEvent.setup()
      render(<Checkout />)

      // Step 1: Cart Review -> Shipping
      await user.click(screen.getByText('Continue to Shipping'))
      await waitFor(() => expect(screen.getByLabelText(/full name/i)).toBeInTheDocument())

      // Fill shipping form
      await user.type(screen.getByLabelText(/full name/i), 'John Doe')
      await user.type(screen.getByLabelText(/phone number/i), '9876543210')
      await user.type(screen.getByLabelText(/street address/i), '123 Main St')
      await user.type(screen.getByLabelText(/city/i), 'Mumbai')
      await user.type(screen.getByLabelText(/state/i), 'Maharashtra')
      await user.type(screen.getByLabelText(/postal code/i), '400001')

      // Step 2: Shipping -> Payment
      await user.click(screen.getByText('Continue to Payment'))
      await waitFor(() => expect(screen.getByText('Payment Method')).toBeInTheDocument())

      // Step 3: Payment -> Review
      await user.click(screen.getByText('Review Order'))
      await waitFor(() => {
        expect(screen.getByText('Order Items')).toBeInTheDocument()
        expect(screen.getByText('Shipping Address')).toBeInTheDocument()
        expect(screen.getByText('Order Total')).toBeInTheDocument()
      })
    })
  })

  describe('Address Handling', () => {
    it('should update shipping address fields correctly', async () => {
      const user = userEvent.setup()
      render(<Checkout />)

      // Navigate to shipping step
      await user.click(screen.getByText('Continue to Shipping'))
      await waitFor(() => expect(screen.getByLabelText(/full name/i)).toBeInTheDocument())

      // Fill in address fields
      const nameInput = screen.getByLabelText(/full name/i)
      const phoneInput = screen.getByLabelText(/phone number/i)
      const streetInput = screen.getByLabelText(/street address/i)
      const cityInput = screen.getByLabelText(/city/i)
      const stateInput = screen.getByLabelText(/state/i)
      const postalInput = screen.getByLabelText(/postal code/i)

      await user.type(nameInput, 'Jane Smith')
      await user.type(phoneInput, '9123456789')
      await user.type(streetInput, '456 Oak Avenue')
      await user.type(cityInput, 'Delhi')
      await user.type(stateInput, 'Delhi')
      await user.type(postalInput, '110001')

      // Verify values are updated
      expect(nameInput).toHaveValue('Jane Smith')
      expect(phoneInput).toHaveValue('9123456789')
      expect(streetInput).toHaveValue('456 Oak Avenue')
      expect(cityInput).toHaveValue('Delhi')
      expect(stateInput).toHaveValue('Delhi')
      expect(postalInput).toHaveValue('110001')
    })

    it('should validate required shipping fields', async () => {
      const user = userEvent.setup()
      render(<Checkout />)

      // Navigate to shipping step
      await user.click(screen.getByText('Continue to Shipping'))
      await waitFor(() => expect(screen.getByLabelText(/full name/i)).toBeInTheDocument())

      // Try to continue without filling fields
      await user.click(screen.getByText('Continue to Payment'))

      await waitFor(() => {
        expect(toast.toast.error).toHaveBeenCalledWith('Please enter your full name')
      })
    })

    it('should validate phone number format', async () => {
      const user = userEvent.setup()
      render(<Checkout />)

      // Navigate to shipping step
      await user.click(screen.getByText('Continue to Shipping'))
      await waitFor(() => expect(screen.getByLabelText(/full name/i)).toBeInTheDocument())

      // Fill with invalid phone
      await user.type(screen.getByLabelText(/full name/i), 'John Doe')
      await user.type(screen.getByLabelText(/phone number/i), '123')
      await user.type(screen.getByLabelText(/street address/i), '123 Main St')
      await user.type(screen.getByLabelText(/city/i), 'Mumbai')
      await user.type(screen.getByLabelText(/state/i), 'Maharashtra')
      await user.type(screen.getByLabelText(/postal code/i), '400001')

      await user.click(screen.getByText('Continue to Payment'))

      await waitFor(() => {
        expect(toast.toast.error).toHaveBeenCalledWith('Please enter a valid 10-digit phone number')
      })
    })

    it('should validate postal code format', async () => {
      const user = userEvent.setup()
      render(<Checkout />)

      // Navigate to shipping step
      await user.click(screen.getByText('Continue to Shipping'))
      await waitFor(() => expect(screen.getByLabelText(/full name/i)).toBeInTheDocument())

      // Fill with invalid postal code
      await user.type(screen.getByLabelText(/full name/i), 'John Doe')
      await user.type(screen.getByLabelText(/phone number/i), '9876543210')
      await user.type(screen.getByLabelText(/street address/i), '123 Main St')
      await user.type(screen.getByLabelText(/city/i), 'Mumbai')
      await user.type(screen.getByLabelText(/state/i), 'Maharashtra')
      await user.type(screen.getByLabelText(/postal code/i), '123')

      await user.click(screen.getByText('Continue to Payment'))

      await waitFor(() => {
        expect(toast.toast.error).toHaveBeenCalledWith('Please enter a valid 6-digit postal code')
      })
    })
  })

  describe('Payment Method Selection', () => {
    it('should have Razorpay selected by default', async () => {
      const user = userEvent.setup()
      render(<Checkout />)

      // Navigate to payment step
      await user.click(screen.getByText('Continue to Shipping'))
      await waitFor(() => expect(screen.getByLabelText(/full name/i)).toBeInTheDocument())

      // Fill shipping
      await user.type(screen.getByLabelText(/full name/i), 'John Doe')
      await user.type(screen.getByLabelText(/phone number/i), '9876543210')
      await user.type(screen.getByLabelText(/street address/i), '123 Main St')
      await user.type(screen.getByLabelText(/city/i), 'Mumbai')
      await user.type(screen.getByLabelText(/state/i), 'Maharashtra')
      await user.type(screen.getByLabelText(/postal code/i), '400001')
      await user.click(screen.getByText('Continue to Payment'))

      await waitFor(() => {
        const razorpayRadio = screen.getByRole('radio', { name: /pay with razorpay/i })
        expect(razorpayRadio).toBeChecked()
      })
    })

    it('should allow adding customer notes', async () => {
      const user = userEvent.setup()
      render(<Checkout />)

      // Navigate to payment step
      await user.click(screen.getByText('Continue to Shipping'))
      await waitFor(() => expect(screen.getByLabelText(/full name/i)).toBeInTheDocument())

      // Fill shipping
      await user.type(screen.getByLabelText(/full name/i), 'John Doe')
      await user.type(screen.getByLabelText(/phone number/i), '9876543210')
      await user.type(screen.getByLabelText(/street address/i), '123 Main St')
      await user.type(screen.getByLabelText(/city/i), 'Mumbai')
      await user.type(screen.getByLabelText(/state/i), 'Maharashtra')
      await user.type(screen.getByLabelText(/postal code/i), '400001')
      await user.click(screen.getByText('Continue to Payment'))

      await waitFor(() => {
        expect(screen.getByPlaceholderText(/any special instructions/i)).toBeInTheDocument()
      })

      const notesTextarea = screen.getByPlaceholderText(/any special instructions/i)
      await user.type(notesTextarea, 'Please deliver after 6 PM')

      expect(notesTextarea).toHaveValue('Please deliver after 6 PM')
    })
  })

  describe('Order Submission', () => {
    it('should display order summary in review step', async () => {
      const user = userEvent.setup()
      render(<Checkout />)

      // Navigate through all steps
      await user.click(screen.getByText('Continue to Shipping'))
      await waitFor(() => expect(screen.getByLabelText(/full name/i)).toBeInTheDocument())

      await user.type(screen.getByLabelText(/full name/i), 'John Doe')
      await user.type(screen.getByLabelText(/phone number/i), '9876543210')
      await user.type(screen.getByLabelText(/street address/i), '123 Main St')
      await user.type(screen.getByLabelText(/city/i), 'Mumbai')
      await user.type(screen.getByLabelText(/state/i), 'Maharashtra')
      await user.type(screen.getByLabelText(/postal code/i), '400001')
      await user.click(screen.getByText('Continue to Payment'))

      await waitFor(() => expect(screen.getByText('Payment Method')).toBeInTheDocument())
      await user.click(screen.getByText('Review Order'))

      await waitFor(() => {
        // Check order items
        expect(screen.getByText('Order Items')).toBeInTheDocument()
        expect(screen.getByText('Test Jacket')).toBeInTheDocument()
        expect(screen.getByText(/M \/ Black x 2/i)).toBeInTheDocument()

        // Check shipping address
        expect(screen.getByText('Shipping Address')).toBeInTheDocument()
        expect(screen.getByText('John Doe')).toBeInTheDocument()
        expect(screen.getByText('123 Main St')).toBeInTheDocument()
        expect(screen.getByText(/Mumbai, Maharashtra 400001/i)).toBeInTheDocument()

        // Check payment method
        expect(screen.getByText('Razorpay (Card/UPI/NetBanking)')).toBeInTheDocument()

        // Check order total section - use getAllByText for elements that appear multiple times
        // "Shipping" appears in both StepIndicator and ReviewStep pricing breakdown
        expect(screen.getByText('Order Total')).toBeInTheDocument()
        const subtotalElements = screen.getAllByText('Subtotal')
        expect(subtotalElements.length).toBeGreaterThanOrEqual(1)
        const shippingElements = screen.getAllByText('Shipping')
        expect(shippingElements.length).toBeGreaterThanOrEqual(1)
        expect(screen.getByText(/Tax \(\d+% GST\)/i)).toBeInTheDocument()
      })
    })

    it('should display customer notes in review step if provided', async () => {
      const user = userEvent.setup()
      render(<Checkout />)

      // Navigate through steps with notes
      await user.click(screen.getByText('Continue to Shipping'))
      await waitFor(() => expect(screen.getByLabelText(/full name/i)).toBeInTheDocument())

      await user.type(screen.getByLabelText(/full name/i), 'John Doe')
      await user.type(screen.getByLabelText(/phone number/i), '9876543210')
      await user.type(screen.getByLabelText(/street address/i), '123 Main St')
      await user.type(screen.getByLabelText(/city/i), 'Mumbai')
      await user.type(screen.getByLabelText(/state/i), 'Maharashtra')
      await user.type(screen.getByLabelText(/postal code/i), '400001')
      await user.click(screen.getByText('Continue to Payment'))

      await waitFor(() => expect(screen.getByPlaceholderText(/any special instructions/i)).toBeInTheDocument())
      await user.type(screen.getByPlaceholderText(/any special instructions/i), 'Fragile items')
      await user.click(screen.getByText('Review Order'))

      await waitFor(() => {
        expect(screen.getByText('Order Notes:')).toBeInTheDocument()
        expect(screen.getByText('Fragile items')).toBeInTheDocument()
      })
    })

    it('should show loading state when submitting order', async () => {
      const user = userEvent.setup()

      // Make order creation slow - use a longer delay to ensure we can see loading state
      mockCreateOrder.mockImplementation(() => new Promise(resolve => setTimeout(() => resolve('order-123'), 2000)))

      render(<Checkout />)

      // Navigate to review step
      await user.click(screen.getByText('Continue to Shipping'))
      await waitFor(() => expect(screen.getByLabelText(/full name/i)).toBeInTheDocument())

      await user.type(screen.getByLabelText(/full name/i), 'John Doe')
      await user.type(screen.getByLabelText(/phone number/i), '9876543210')
      await user.type(screen.getByLabelText(/street address/i), '123 Main St')
      await user.type(screen.getByLabelText(/city/i), 'Mumbai')
      await user.type(screen.getByLabelText(/state/i), 'Maharashtra')
      await user.type(screen.getByLabelText(/postal code/i), '400001')
      await user.click(screen.getByText('Continue to Payment'))

      await waitFor(() => expect(screen.getByText('Review Order')).toBeInTheDocument())
      await user.click(screen.getByText('Review Order'))

      await waitFor(() => expect(screen.getByText('Place Order')).toBeInTheDocument())

      // Click place order - don't await so we can check loading state
      user.click(screen.getByText('Place Order'))

      // Should show loading state - use findByText which has built-in retries
      expect(await screen.findByText('Processing...', {}, { timeout: 3000 })).toBeInTheDocument()
    })
  })

  describe('Cart Error Handling', () => {
    it('should redirect to cart if cart is empty', () => {
      // Set empty cart
      mockCartItems = []

      render(<Checkout />)

      expect(mockNavigate).toHaveBeenCalledWith('/cart')
    })

    it('should display cart error if present', () => {
      // Set cart error using the mock variable (instead of calling vi.mock() again)
      mockCartError = 'Failed to load cart'

      render(<Checkout />)

      expect(screen.getByText('Failed to load cart')).toBeInTheDocument()
    })
  })

  describe('Accessibility', () => {
    it('should have accessible form labels in shipping step', async () => {
      const user = userEvent.setup()
      render(<Checkout />)

      // Navigate to shipping step
      await user.click(screen.getByText('Continue to Shipping'))

      await waitFor(() => {
        // Check all form fields have labels
        expect(screen.getByLabelText(/full name/i)).toBeInTheDocument()
        expect(screen.getByLabelText(/phone number/i)).toBeInTheDocument()
        expect(screen.getByLabelText(/street address/i)).toBeInTheDocument()
        expect(screen.getByLabelText(/city/i)).toBeInTheDocument()
        expect(screen.getByLabelText(/state/i)).toBeInTheDocument()
        expect(screen.getByLabelText(/postal code/i)).toBeInTheDocument()
        expect(screen.getByLabelText(/country/i)).toBeInTheDocument()
      })
    })

    it('should have accessible payment method labels', async () => {
      const user = userEvent.setup()
      render(<Checkout />)

      // Navigate to payment step
      await user.click(screen.getByText('Continue to Shipping'))
      await waitFor(() => expect(screen.getByLabelText(/full name/i)).toBeInTheDocument())

      await user.type(screen.getByLabelText(/full name/i), 'John Doe')
      await user.type(screen.getByLabelText(/phone number/i), '9876543210')
      await user.type(screen.getByLabelText(/street address/i), '123 Main St')
      await user.type(screen.getByLabelText(/city/i), 'Mumbai')
      await user.type(screen.getByLabelText(/state/i), 'Maharashtra')
      await user.type(screen.getByLabelText(/postal code/i), '400001')
      await user.click(screen.getByText('Continue to Payment'))

      await waitFor(() => {
        expect(screen.getByLabelText(/pay with razorpay/i)).toBeInTheDocument()
      })
    })

    it('should have accessible step indicator navigation', () => {
      render(<Checkout />)

      const stepNav = screen.getByRole('navigation', { name: /checkout progress/i })
      expect(stepNav).toBeInTheDocument()
    })
  })

  describe('Order Summary Display', () => {
    it('should display item details correctly in cart review', () => {
      render(<Checkout />)

      // Check item details
      expect(screen.getByText('Test Jacket')).toBeInTheDocument()
      expect(screen.getByText(/Size: M \| Color: Black/i)).toBeInTheDocument()
      expect(screen.getByText(/Qty: 2/i)).toBeInTheDocument()
      // Price appears in multiple places (item price and subtotal)
      const priceElements = screen.getAllByText('₹200.00')
      expect(priceElements.length).toBeGreaterThanOrEqual(1)
    })

    it('should display multiple items correctly', () => {
      mockCartItems = [
        {
          productId: 'prod-1',
          _convexProductId: 'prod-1',
          name: 'Test Jacket',
          price: 100,
          image: '/test1.jpg',
          size: 'M',
          color: 'Black',
          quantity: 2,
          _variantSku: 'M-Black',
        },
        {
          productId: 'prod-2',
          _convexProductId: 'prod-2',
          name: 'Test Sweater',
          price: 80,
          image: '/test2.jpg',
          size: 'L',
          color: 'Blue',
          quantity: 1,
          _variantSku: 'L-Blue',
        },
      ]
      mockGetSubtotal.mockReturnValue(280)

      // Also update the useQuery mock to return the correct subtotal from server
      mockUseQuery.mockReturnValue({
        _id: 'test-db-user-1',
        clerkId: 'test-user-id',
        email: 'test@example.com',
        role: 'customer',
        promoDiscount: 0,
        appliedPromoCode: null,
        subtotal: 280,
        shippingCost: 0,
        tax: 50.4,
        taxRate: 0.18,
        total: 330.4,
      })

      render(<Checkout />)

      expect(screen.getByText('Test Jacket')).toBeInTheDocument()
      expect(screen.getByText('Test Sweater')).toBeInTheDocument()
      expect(screen.getByText(/Subtotal \(2 items\)/i)).toBeInTheDocument()
      expect(screen.getByText('₹280.00')).toBeInTheDocument()
    })

    it('should display pricing breakdown in review step', async () => {
      const user = userEvent.setup()
      render(<Checkout />)

      // Navigate to review step
      await user.click(screen.getByText('Continue to Shipping'))
      await waitFor(() => expect(screen.getByLabelText(/full name/i)).toBeInTheDocument())

      await user.type(screen.getByLabelText(/full name/i), 'John Doe')
      await user.type(screen.getByLabelText(/phone number/i), '9876543210')
      await user.type(screen.getByLabelText(/street address/i), '123 Main St')
      await user.type(screen.getByLabelText(/city/i), 'Mumbai')
      await user.type(screen.getByLabelText(/state/i), 'Maharashtra')
      await user.type(screen.getByLabelText(/postal code/i), '400001')
      await user.click(screen.getByText('Continue to Payment'))

      await waitFor(() => expect(screen.getByText('Review Order')).toBeInTheDocument())
      await user.click(screen.getByText('Review Order'))

      await waitFor(() => {
        // Use getAllByText for elements that appear in multiple places
        // (StepIndicator has "Shipping" as step 2 label, ReviewStep has "Shipping" in pricing)
        const subtotalElements = screen.getAllByText('Subtotal')
        expect(subtotalElements.length).toBeGreaterThanOrEqual(1)
        const shippingElements = screen.getAllByText('Shipping')
        expect(shippingElements.length).toBeGreaterThanOrEqual(1)
        expect(screen.getByText(/Tax \(\d+% GST\)/i)).toBeInTheDocument()
        expect(screen.getByText('Total')).toBeInTheDocument()
      })
    })
  })
})
