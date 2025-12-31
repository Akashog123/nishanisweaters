# Testing Infrastructure

This project uses a production-grade testing infrastructure built with Vitest, React Testing Library, and comprehensive mocking capabilities.

## Overview

- **Test Runner**: Vitest (fast, Vite-native test runner)
- **Testing Library**: @testing-library/react for component testing
- **Coverage**: V8 coverage provider with detailed reporting
- **Mocking**: Comprehensive mocks for Clerk, Convex, and React Router
- **UI**: Vitest UI for interactive test running

## Installation

First, install the required dependencies:

```bash
npm install --save-dev vitest @testing-library/react @testing-library/jest-dom @testing-library/user-event jsdom @vitest/coverage-v8 @vitest/ui
```

## Running Tests

### Available Scripts

```bash
# Run tests in watch mode (interactive)
npm test

# Run tests once and exit
npm run test:run

# Run tests with UI interface
npm run test:ui

# Run tests with coverage report
npm run test:coverage

# Run tests in watch mode (alternative)
npm run test:watch
```

## Project Structure

```
src/
├── test/
│   ├── setup.ts              # Global test setup and configuration
│   ├── test-utils.tsx        # Custom render function with providers
│   └── mocks/
│       ├── clerk.ts          # Clerk authentication mocks
│       ├── convex.ts         # Convex backend mocks
│       └── router.ts         # React Router mocks
├── components/
│   └── auth/
│       └── ProtectedRoute.test.tsx   # Example component test
├── context/
│   └── CartContext.test.tsx  # Example context test
└── lib/
    └── utils.test.ts         # Example utility test
```

## Writing Tests

### Basic Test Structure

```typescript
import { describe, it, expect } from 'vitest'
import { render, screen } from '@/test/test-utils'
import { MyComponent } from './MyComponent'

describe('MyComponent', () => {
  it('should render correctly', () => {
    render(<MyComponent />)
    expect(screen.getByText('Hello World')).toBeInTheDocument()
  })
})
```

### Testing with Providers

The custom `render` function from `@/test/test-utils` automatically wraps your components with necessary providers:

```typescript
import { render } from '@/test/test-utils'

// Render with default providers (CartProvider, BrowserRouter)
render(<MyComponent />)

// Render with custom auth state
render(<MyComponent />, {
  authState: 'signed-in',
  user: customUserObject
})

// Render with mock Convex data
render(<MyComponent />, {
  queryData: {
    'products.list': [{ id: '1', name: 'Product 1' }]
  }
})

// Render with specific route
render(<MyComponent />, {
  initialRoute: '/products/123',
  routeParams: { id: '123' }
})
```

### Testing Authentication

```typescript
import { render, mockSignedInUser, mockSignedOutUser } from '@/test/test-utils'

it('should show content when signed in', () => {
  mockSignedInUser()
  render(<ProtectedComponent />, { authState: 'signed-in' })
  expect(screen.getByText('Protected Content')).toBeInTheDocument()
})

it('should redirect when signed out', () => {
  mockSignedOutUser()
  render(<ProtectedComponent />, { authState: 'signed-out' })
  expect(screen.getByTestId('navigate-redirect')).toBeInTheDocument()
})
```

### Testing with Convex

```typescript
import { render, mockQueryResponse, mockMutationResponse } from '@/test/test-utils'

it('should display data from Convex query', () => {
  const mockProducts = [
    { _id: '1', name: 'Product 1', price: 99.99 }
  ]

  render(<ProductList />, {
    queryData: {
      'products.list': mockProducts
    }
  })

  expect(screen.getByText('Product 1')).toBeInTheDocument()
})

it('should handle mutations', async () => {
  const mockMutation = mockMutationResponse('products.create',
    async (data) => ({ _id: '123', ...data })
  )

  render(<CreateProductForm />)
  // ... interact with form and test mutation
})
```

### Testing User Interactions

```typescript
import { render, screen, userEvent } from '@/test/test-utils'

it('should handle button click', async () => {
  const user = userEvent.setup()
  render(<MyButton />)

  await user.click(screen.getByRole('button', { name: 'Click Me' }))

  expect(screen.getByText('Clicked!')).toBeInTheDocument()
})
```

### Testing Cart Context

```typescript
import { renderHook, act } from '@testing-library/react'
import { CartProvider, useCart } from '@/context/CartContext'
import { createMockCartItem } from '@/test/test-utils'

it('should add item to cart', () => {
  const wrapper = ({ children }) => <CartProvider>{children}</CartProvider>
  const { result } = renderHook(() => useCart(), { wrapper })

  act(() => {
    result.current.addToCart(createMockCartItem())
  })

  expect(result.current.items).toHaveLength(1)
})
```

## Mock Utilities

### Clerk Mocks

```typescript
import {
  mockSignedInUser,
  mockSignedOutUser,
  mockLoadingUser,
  resetClerkMocks
} from '@/test/mocks/clerk'

// Set user as signed in
mockSignedInUser()

// Set user as signed out
mockSignedOutUser()

// Set loading state
mockLoadingUser()

// Reset all mocks
resetClerkMocks()
```

### Convex Mocks

```typescript
import {
  mockQueryResponse,
  mockMutationResponse,
  resetConvexMocks
} from '@/test/mocks/convex'

// Mock a query response
mockQueryResponse('products.list', [{ id: '1', name: 'Product' }])

// Mock a mutation
const mockCreate = mockMutationResponse('products.create',
  async (data) => ({ _id: '123', ...data })
)

// Reset mocks
resetConvexMocks()
```

### Router Mocks

```typescript
import {
  setMockLocation,
  setMockParams,
  mockNavigate,
  resetRouterMocks
} from '@/test/mocks/router'

// Set current location
setMockLocation({ pathname: '/products', search: '?category=jackets' })

// Set route params
setMockParams({ id: '123' })

// Check navigation
expect(mockNavigate).toHaveBeenCalledWith('/cart')

// Reset mocks
resetRouterMocks()
```

## Helper Functions

### Creating Mock Data

```typescript
import {
  createMockCartItem,
  createMockProduct,
  createMockUser
} from '@/test/test-utils'

const cartItem = createMockCartItem({
  productId: 'custom-id',
  price: '199.99',
  quantity: 2
})

const product = createMockProduct({
  name: 'Custom Product',
  category: 'jackets'
})

const user = createMockUser({
  role: 'admin',
  email: 'admin@test.com'
})
```

## Coverage Configuration

The coverage configuration excludes:
- Node modules
- Test files and test utilities
- UI component library (shadcn/ui)
- Type definition files
- Configuration files
- Convex backend code

Coverage thresholds are set at 80% for:
- Lines
- Functions
- Branches
- Statements

View coverage reports:
```bash
npm run test:coverage
open coverage/index.html
```

## Best Practices

1. **Write descriptive test names**: Use "should" statements
   ```typescript
   it('should add item to cart when addToCart is called', () => {})
   ```

2. **Arrange-Act-Assert pattern**:
   ```typescript
   it('should update quantity', () => {
     // Arrange
     const item = createMockCartItem()

     // Act
     updateQuantity(item.productId, 5)

     // Assert
     expect(getQuantity()).toBe(5)
   })
   ```

3. **Test user behavior, not implementation**:
   ```typescript
   // Good - tests what user sees
   expect(screen.getByText('Product added')).toBeInTheDocument()

   // Bad - tests implementation details
   expect(component.state.message).toBe('Product added')
   ```

4. **Use semantic queries**:
   ```typescript
   // Preferred order
   screen.getByRole('button', { name: 'Submit' })
   screen.getByLabelText('Email')
   screen.getByText('Welcome')
   screen.getByTestId('custom-element') // last resort
   ```

5. **Clean up after tests**: The setup file automatically handles cleanup

6. **Mock external dependencies**: Use the provided mocks for Clerk, Convex, and Router

7. **Test edge cases**:
   - Empty states
   - Error states
   - Loading states
   - Permission boundaries

## Continuous Integration

Add this to your CI pipeline:

```yaml
# .github/workflows/test.yml
name: Test

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'

      - name: Install dependencies
        run: npm ci

      - name: Run tests
        run: npm run test:run

      - name: Generate coverage
        run: npm run test:coverage

      - name: Upload coverage
        uses: codecov/codecov-action@v3
        with:
          files: ./coverage/coverage-final.json
```

## Troubleshooting

### Tests are failing with "Cannot find module"

Make sure the path aliases in `vitest.config.ts` match your `tsconfig.json`:

```typescript
resolve: {
  alias: {
    '@': path.resolve(__dirname, './src'),
  },
}
```

### Mock not working

Ensure mocks are set up before rendering:

```typescript
import { mockSignedInUser } from '@/test/test-utils'

// Setup mocks before render
mockSignedInUser()
render(<MyComponent />)
```

### Tests timing out

Increase timeout in test or globally in `vitest.config.ts`:

```typescript
test: {
  testTimeout: 10000,
}
```

### Coverage not accurate

Check the coverage exclusions in `vitest.config.ts` and adjust as needed.

## Resources

- [Vitest Documentation](https://vitest.dev/)
- [React Testing Library](https://testing-library.com/react)
- [Jest DOM Matchers](https://github.com/testing-library/jest-dom)
- [Testing Best Practices](https://kentcdodds.com/blog/common-mistakes-with-react-testing-library)
