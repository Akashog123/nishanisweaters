import { describe, it, expect, beforeEach, vi } from 'vitest'
import { screen, waitFor, render as rtlRender } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { mockSignedInUser, mockSignedOutUser, createMockUser } from '@/test/test-utils'
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
  },
}))

vi.mock('@clerk/clerk-react', () => ({
  useUser: mockUseUser,
}))

vi.mock('convex/react', () => ({
  useQuery: mockUseQuery,
  useMutation: mockUseMutation,
}))

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  }
})

// Mock the cart context
const mockClearCart = vi.fn()
const mockGetSubtotal = vi.fn()

vi.mock('@/context/CartContext', () => ({
  useCart: () => ({
    items: [
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
    ],
    getSubtotal: mockGetSubtotal,
    clearCart: mockClearCart,
    isLoading: false,
    error: null,
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

// Simple render without providers since we're mocking everything
const render = (component: React.ReactElement) => rtlRender(component)

describe('Checkout Page', () => {
  const mockCreateOrder = vi.fn()
  const mockValidateCart = vi.fn()
  const mockDbUser = createMockUser({ role: 'customer' })

  beforeEach(() => {
    vi.clearAllMocks()
    mockGetSubtotal.mockReturnValue(200)
    mockCreateOrder.mockResolvedValue('order-123')
    mockValidateCart.mockResolvedValue({ isValid: true, errors: [] })

    // Set up default mocks
    mockSignedInUser()
    mockUseQuery.mockReturnValue(mockDbUser)

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
    it('should render checkout form with all sections', () => {
      render(<Checkout />)

      expect(screen.getByText('Checkout')).toBeInTheDocument()
      expect(screen.getByText('Shipping Address')).toBeInTheDocument()
      expect(screen.getByText('Payment Method')).toBeInTheDocument()
      expect(screen.getByText('Order Notes (Optional)')).toBeInTheDocument()
      expect(screen.getByText('Order Summary')).toBeInTheDocument()
    })

    it('should display cart items in order summary', () => {
      render(<Checkout />)

      expect(screen.getByText('Test Jacket')).toBeInTheDocument()
      expect(screen.getByText(/M \/ Black x 2/)).toBeInTheDocument()
    })

    it('should display subtotal in order summary', () => {
      render(<Checkout />)

      expect(screen.getByText(/Subtotal/)).toBeInTheDocument()
      expect(screen.getByText(/₹200.00/)).toBeInTheDocument()
    })

    it('should render all form fields', () => {
      render(<Checkout />)

      expect(screen.getByLabelText('Full Name')).toBeInTheDocument()
      expect(screen.getByLabelText('Phone Number')).toBeInTheDocument()
      expect(screen.getByLabelText('Street Address')).toBeInTheDocument()
      expect(screen.getByLabelText('City')).toBeInTheDocument()
      expect(screen.getByLabelText('State')).toBeInTheDocument()
      expect(screen.getByLabelText('Postal Code')).toBeInTheDocument()
      expect(screen.getByLabelText('Country')).toBeInTheDocument()
    })

    it('should have India as default country', () => {
      render(<Checkout />)

      const countryInput = screen.getByLabelText('Country') as HTMLInputElement
      expect(countryInput.value).toBe('India')
    })
  })

  describe('Address Handling', () => {
    it('should update shipping address fields correctly', async () => {
      const user = userEvent.setup()
      render(<Checkout />)

      const nameInput = screen.getByLabelText('Full Name') as HTMLInputElement
      const phoneInput = screen.getByLabelText('Phone Number') as HTMLInputElement
      const streetInput = screen.getByLabelText('Street Address') as HTMLInputElement

      await user.type(nameInput, 'John Doe')
      await user.type(phoneInput, '9876543210')
      await user.type(streetInput, '123 Main Street')

      expect(nameInput.value).toBe('John Doe')
      expect(phoneInput.value).toBe('9876543210')
      expect(streetInput.value).toBe('123 Main Street')
    })

    it('should allow changing country', async () => {
      const user = userEvent.setup()
      render(<Checkout />)

      const countryInput = screen.getByLabelText('Country') as HTMLInputElement
      await user.clear(countryInput)
      await user.type(countryInput, 'USA')

      expect(countryInput.value).toBe('USA')
    })
  })

  describe('Payment Method Selection', () => {
    it('should have Razorpay selected by default', () => {
      render(<Checkout />)

      const razorpayRadio = screen.getByLabelText(/Pay with Razorpay/i) as HTMLInputElement
      expect(razorpayRadio).toBeChecked()
    })

    it('should not show invoice option for regular customers', () => {
      render(<Checkout />)

      expect(screen.queryByLabelText(/Invoice\/Bank Transfer/i)).not.toBeInTheDocument()
    })

    it('should show invoice option for wholesale customers', () => {
      mockUseQuery.mockReturnValue(createMockUser({ role: 'wholesale' }))
      render(<Checkout />)

      expect(screen.getByLabelText(/Invoice\/Bank Transfer/i)).toBeInTheDocument()
    })

    it('should allow selecting invoice payment for wholesale customers', async () => {
      const user = userEvent.setup()
      mockUseQuery.mockReturnValue(createMockUser({ role: 'wholesale' }))
      render(<Checkout />)

      const invoiceRadio = screen.getByLabelText(/Invoice\/Bank Transfer/i) as HTMLInputElement
      await user.click(invoiceRadio)

      expect(invoiceRadio).toBeChecked()
    })
  })

  describe('Order Submission', () => {
    const fillValidForm = async (user: ReturnType<typeof userEvent.setup>) => {
      await user.type(screen.getByLabelText('Full Name'), 'John Doe')
      await user.type(screen.getByLabelText('Phone Number'), '9876543210')
      await user.type(screen.getByLabelText('Street Address'), '123 Main Street')
      await user.type(screen.getByLabelText('City'), 'Mumbai')
      await user.type(screen.getByLabelText('State'), 'Maharashtra')
      await user.type(screen.getByLabelText('Postal Code'), '400001')
    }

    it('should successfully submit order with valid data', async () => {
      const user = userEvent.setup()
      render(<Checkout />)

      await fillValidForm(user)

      const submitButton = screen.getByRole('button', { name: /Place Order/i })
      await user.click(submitButton)

      await waitFor(() => {
        expect(mockValidateCart).toHaveBeenCalled()
      })

      await waitFor(() => {
        expect(mockCreateOrder).toHaveBeenCalledWith({
          items: [
            {
              productId: 'prod-1',
              variantSku: 'M-Black',
              quantity: 2,
            },
          ],
          shippingAddress: {
            name: 'John Doe',
            phone: '9876543210',
            street: '123 Main Street',
            city: 'Mumbai',
            state: 'Maharashtra',
            postalCode: '400001',
            country: 'India',
          },
          paymentMethod: 'razorpay',
          customerNotes: undefined,
        })
      })
    })

    it('should include customer notes when provided', async () => {
      const user = userEvent.setup()
      render(<Checkout />)

      await fillValidForm(user)

      const notesTextarea = screen.getByPlaceholderText(/Any special instructions/i)
      await user.type(notesTextarea, 'Please deliver in the evening')

      const submitButton = screen.getByRole('button', { name: /Place Order/i })
      await user.click(submitButton)

      await waitFor(() => {
        expect(mockCreateOrder).toHaveBeenCalledWith(
          expect.objectContaining({
            customerNotes: 'Please deliver in the evening',
          })
        )
      })
    })

    it('should clear cart and navigate to confirmation page on success', async () => {
      const user = userEvent.setup()
      render(<Checkout />)

      await fillValidForm(user)

      const submitButton = screen.getByRole('button', { name: /Place Order/i })
      await user.click(submitButton)

      await waitFor(() => {
        expect(mockClearCart).toHaveBeenCalled()
        expect(toast.toast.success).toHaveBeenCalledWith('Order placed successfully!')
        expect(mockNavigate).toHaveBeenCalledWith('/order-confirmation/order-123')
      })
    })

    it('should show error when cart validation fails', async () => {
      const user = userEvent.setup()
      mockValidateCart.mockResolvedValue({
        isValid: false,
        errors: ['Product out of stock', 'Price changed'],
      })

      render(<Checkout />)
      await fillValidForm(user)

      const submitButton = screen.getByRole('button', { name: /Place Order/i })
      await user.click(submitButton)

      await waitFor(() => {
        expect(toast.toast.error).toHaveBeenCalledWith('Product out of stock, Price changed')
        expect(mockCreateOrder).not.toHaveBeenCalled()
      })
    })
  })

  describe('Cart Error Handling', () => {
    it('should redirect to cart if cart is empty', () => {
      vi.mock('@/context/CartContext', () => ({
        useCart: () => ({
          items: [],
          getSubtotal: () => 0,
          clearCart: mockClearCart,
          isLoading: false,
          error: null,
        }),
      }))

      render(<Checkout />)

      expect(mockNavigate).toHaveBeenCalledWith('/cart')
    })
  })

  describe('Accessibility', () => {
    it('should have accessible form labels', () => {
      render(<Checkout />)

      expect(screen.getByLabelText('Full Name')).toBeInTheDocument()
      expect(screen.getByLabelText('Phone Number')).toBeInTheDocument()
      expect(screen.getByLabelText('Street Address')).toBeInTheDocument()
    })

    it('should have accessible submit button', () => {
      render(<Checkout />)

      const submitButton = screen.getByRole('button', { name: /Place Order/i })
      expect(submitButton).toBeInTheDocument()
    })

    it('should have accessible payment options', () => {
      render(<Checkout />)

      const razorpayRadio = screen.getByRole('radio', { name: /Pay with Razorpay/i })
      expect(razorpayRadio).toBeInTheDocument()
    })
  })

  describe('Order Summary', () => {
    it('should display item details correctly', () => {
      render(<Checkout />)

      expect(screen.getByText('Test Jacket')).toBeInTheDocument()
      expect(screen.getByText(/M \/ Black x 2/)).toBeInTheDocument()
    })

    it('should display payment method options', () => {
      render(<Checkout />)

      expect(screen.getByLabelText(/Pay with Razorpay/i)).toBeInTheDocument()
      expect(screen.getByText(/Credit\/Debit Card, UPI, Net Banking/i)).toBeInTheDocument()
    })

    it('should display order notes textarea', () => {
      render(<Checkout />)

      const notesTextarea = screen.getByPlaceholderText(/Any special instructions/i)
      expect(notesTextarea).toBeInTheDocument()
    })
  })
})
