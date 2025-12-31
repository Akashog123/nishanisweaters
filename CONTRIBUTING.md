# Contributing to Blockhaus Clone Showcase

Thank you for your interest in contributing to this e-commerce platform! This document provides guidelines and standards for contributing to the project.

## Table of Contents

- [Getting Started](#getting-started)
- [Development Workflow](#development-workflow)
- [Code Style Guidelines](#code-style-guidelines)
- [Testing Requirements](#testing-requirements)
- [Convex Backend Guidelines](#convex-backend-guidelines)
- [Security Guidelines](#security-guidelines)
- [Pull Request Process](#pull-request-process)
- [Issue Reporting](#issue-reporting)

## Getting Started

### Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js**: Version 18.x or higher (we recommend using [nvm](https://github.com/nvm-sh/nvm))
- **npm**: Version 9.x or higher (comes with Node.js)
- **Git**: Latest version

Check your versions:
```bash
node --version  # Should be 18.x or higher
npm --version   # Should be 9.x or higher
```

### Initial Setup

1. **Fork and Clone**
   ```bash
   # Fork the repository on GitHub, then clone your fork
   git clone https://github.com/YOUR_USERNAME/blockhaus-clone-showcase.git
   cd blockhaus-clone-showcase
   ```

2. **Install Dependencies**
   ```bash
   npm install
   ```

3. **Set Up Environment Variables**
   ```bash
   cp .env.example .env.local
   ```

   Edit `.env.local` with your development credentials:
   ```env
   # Clerk Authentication (https://dashboard.clerk.dev)
   VITE_CLERK_PUBLISHABLE_KEY=pk_test_your_key_here
   CLERK_SECRET_KEY=sk_test_your_key_here

   # Convex Backend (https://dashboard.convex.dev)
   VITE_CONVEX_URL=https://your-deployment.convex.cloud

   # Razorpay Payments (https://dashboard.razorpay.com)
   VITE_RAZORPAY_KEY_ID=rzp_test_your_key_here
   RAZORPAY_KEY_ID=rzp_test_your_key_here
   RAZORPAY_KEY_SECRET=your_razorpay_secret

   # Resend Email (https://resend.com)
   RESEND_API_KEY=re_your_api_key_here

   # App Configuration
   VITE_APP_URL=http://localhost:8080

   # Optional: Sentry Error Tracking
   VITE_SENTRY_DSN=https://your-sentry-dsn@sentry.io/your-project-id
   ```

4. **Initialize Convex**
   ```bash
   npx convex dev
   ```
   This will prompt you to log in and create/select a Convex project.

5. **Start Development Server**
   ```bash
   npm run dev
   ```
   The application will be available at `http://localhost:8080`

## Development Workflow

### Branch Naming Conventions

Use descriptive branch names that indicate the type and scope of your changes:

- **Features**: `feature/description-of-feature`
  ```bash
  git checkout -b feature/add-product-filtering
  ```

- **Bug Fixes**: `bugfix/description-of-bug`
  ```bash
  git checkout -b bugfix/fix-cart-quantity-update
  ```

- **Hotfixes**: `hotfix/critical-issue`
  ```bash
  git checkout -b hotfix/payment-processing-error
  ```

- **Documentation**: `docs/description-of-changes`
  ```bash
  git checkout -b docs/update-api-documentation
  ```

- **Refactoring**: `refactor/description-of-refactor`
  ```bash
  git checkout -b refactor/optimize-product-queries
  ```

### Commit Message Format

We follow the [Conventional Commits](https://www.conventionalcommits.org/) specification:

```
<type>[optional scope]: <description>

[optional body]

[optional footer(s)]
```

**Types:**
- `feat`: A new feature
- `fix`: A bug fix
- `docs`: Documentation only changes
- `style`: Changes that don't affect code meaning (formatting, missing semicolons)
- `refactor`: Code changes that neither fix bugs nor add features
- `perf`: Performance improvements
- `test`: Adding or updating tests
- `chore`: Changes to build process or auxiliary tools

**Examples:**
```bash
feat(products): add category filtering to product list

fix(cart): resolve quantity update issue when item already in cart

docs(contributing): update environment setup instructions

refactor(auth): optimize user role checking logic

test(cart): add unit tests for cart context reducer
```

### Development Process

1. **Create a new branch** from `main`
   ```bash
   git checkout main
   git pull origin main
   git checkout -b feature/your-feature-name
   ```

2. **Make your changes** following the code style guidelines

3. **Write tests** for your changes (see [Testing Requirements](#testing-requirements))

4. **Run tests locally**
   ```bash
   npm run test:run
   npm run test:e2e
   npm run lint
   ```

5. **Commit your changes** using conventional commit messages
   ```bash
   git add .
   git commit -m "feat(products): add price range filtering"
   ```

6. **Push to your fork**
   ```bash
   git push origin feature/your-feature-name
   ```

7. **Create a Pull Request** on GitHub

## Code Style Guidelines

### TypeScript

- **Use TypeScript strict mode** - All code must compile with strict TypeScript settings
- **No implicit any** - Always explicitly type variables and function parameters
- **Prefer interfaces over types** for object shapes
- **Use type inference** where the type is obvious

```typescript
// Good
interface Product {
  id: string;
  name: string;
  price: number;
}

const getProduct = async (id: string): Promise<Product> => {
  // ...
}

// Bad
const getProduct = async (id: any) => {
  // ...
}
```

### React Components

- **Use functional components** with hooks
- **Prefer named exports** for components
- **Use memo for expensive components** that receive frequent prop updates
- **Extract complex logic** into custom hooks

```typescript
// Good
export function ProductCard({ product }: { product: Product }) {
  const { addToCart } = useCart();

  return (
    <Card>
      <h3>{product.name}</h3>
      <button onClick={() => addToCart(product)}>Add to Cart</button>
    </Card>
  );
}

// Bad
export default ({ product }: any) => {
  return <div>{product.name}</div>;
}
```

### File Naming Conventions

- **Components**: PascalCase - `ProductCard.tsx`, `UserProfile.tsx`
- **Hooks**: camelCase with 'use' prefix - `useCart.ts`, `useAuth.ts`
- **Utilities**: camelCase - `formatPrice.ts`, `validation.ts`
- **Types**: PascalCase - `Product.ts`, `User.ts`
- **Context**: PascalCase with 'Context' suffix - `CartContext.tsx`

### Import Organization

Organize imports in the following order:

1. React and external libraries
2. Internal utilities and hooks
3. Components
4. Types
5. Styles

```typescript
// 1. React and external libraries
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

// 2. Internal utilities and hooks
import { useCart } from '@/context/CartContext';
import { formatPrice } from '@/lib/utils';

// 3. Components
import { Button } from '@/components/ui/button';
import { ProductCard } from '@/components/ProductCard';

// 4. Types
import type { Product } from '@/types';

// 5. Styles (if any)
import './styles.css';
```

### Code Formatting

- **Indentation**: 2 spaces
- **Quotes**: Single quotes for strings (except JSX attributes)
- **Semicolons**: Required
- **Line length**: Maximum 100 characters (soft limit)
- **Trailing commas**: Required in multi-line arrays and objects

Run the linter to check your code:
```bash
npm run lint
```

## Testing Requirements

All new features and bug fixes must include tests. See [TESTING.md](./TESTING.md) for detailed testing documentation.

### Unit Tests (Vitest + React Testing Library)

- **Coverage requirement**: 80% for new code
- **Required for**: Components, hooks, utilities, context providers
- **Test file location**: Same directory as source file with `.test.tsx` or `.test.ts` extension

```typescript
// src/components/ProductCard.test.tsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@/test/test-utils';
import { ProductCard } from './ProductCard';

describe('ProductCard', () => {
  it('should display product name and price', () => {
    const product = {
      _id: '1',
      name: 'Test Product',
      price: 99.99,
      category: 'jackets'
    };

    render(<ProductCard product={product} />);

    expect(screen.getByText('Test Product')).toBeInTheDocument();
    expect(screen.getByText('$99.99')).toBeInTheDocument();
  });
});
```

### E2E Tests (Playwright)

- **Required for**: User flows, critical paths, payment workflows
- **Test file location**: `e2e/` directory with `.spec.ts` extension

```typescript
// e2e/checkout.spec.ts
import { test, expect } from '@playwright/test';

test('should complete checkout process', async ({ page }) => {
  await page.goto('/products');
  await page.click('[data-testid="add-to-cart"]');
  await page.click('[data-testid="checkout-button"]');
  await expect(page).toHaveURL(/.*checkout/);
});
```

### Running Tests

```bash
# Unit tests (watch mode)
npm test

# Unit tests (single run)
npm run test:run

# Unit tests with UI
npm run test:ui

# Coverage report
npm run test:coverage

# E2E tests
npm run test:e2e

# E2E tests with UI
npm run test:e2e:ui

# E2E tests in headed mode (see browser)
npm run test:e2e:headed
```

### Coverage Requirements

- **Minimum coverage**: 80% for lines, functions, branches, and statements
- **Files exempt**: UI components from shadcn/ui, test utilities
- **View coverage**: Open `coverage/index.html` after running `npm run test:coverage`

## Convex Backend Guidelines

### Query vs Mutation vs Action

**Queries** - Read-only operations (cannot modify database):
```typescript
export const getProduct = query({
  args: { id: v.id("products") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});
```

**Mutations** - Database modifications (transactional):
```typescript
export const createProduct = mutation({
  args: {
    name: v.string(),
    price: v.number(),
  },
  handler: async (ctx, args) => {
    const { clerkId } = await requireAdmin(ctx);

    return await ctx.db.insert("products", {
      name: args.name,
      price: args.price,
      createdBy: clerkId,
      createdAt: Date.now(),
    });
  },
});
```

**Actions** - For external API calls, non-deterministic operations:
```typescript
export const processPayment = action({
  args: { orderId: v.id("orders") },
  handler: async (ctx, args) => {
    const { clerkId } = await requireAuth(ctx);

    // Call external Razorpay API
    const response = await fetch("https://api.razorpay.com/...", {
      method: "POST",
      headers: { Authorization: `Bearer ${process.env.RAZORPAY_KEY_SECRET}` },
    });

    // Update database with mutation
    await ctx.runMutation(internal.orders.updatePaymentStatus, {
      orderId: args.orderId,
      status: "paid",
    });
  },
});
```

### Authentication Patterns

**Always verify authentication server-side** - Never trust client-provided user IDs.

```typescript
import { requireAuth, requireAdmin, requireOwnership } from "./lib/auth";

// Require any authenticated user
export const myQuery = query({
  handler: async (ctx) => {
    const { clerkId } = await requireAuth(ctx);
    // ...
  },
});

// Require admin role
export const adminQuery = query({
  handler: async (ctx) => {
    const user = await requireAdmin(ctx);
    // user.role === "admin" is guaranteed
  },
});

// Verify resource ownership
export const updateUserProfile = mutation({
  args: { userId: v.string(), name: v.string() },
  handler: async (ctx, args) => {
    // Verify the authenticated user owns this profile
    await requireOwnership(ctx, args.userId);
    // ...
  },
});
```

### Error Handling

**Use ConvexError for all business logic errors:**

```typescript
import { ConvexError } from "convex/values";

export const purchaseProduct = mutation({
  args: { productId: v.id("products"), quantity: v.number() },
  handler: async (ctx, args) => {
    const { clerkId } = await requireAuth(ctx);

    const product = await ctx.db.get(args.productId);

    if (!product) {
      throw new ConvexError({
        code: "NOT_FOUND",
        message: "Product not found",
      });
    }

    if (product.stock < args.quantity) {
      throw new ConvexError({
        code: "INSUFFICIENT_STOCK",
        message: `Only ${product.stock} items available`,
        details: { available: product.stock, requested: args.quantity },
      });
    }

    // Process purchase...
  },
});
```

### Index Usage

**Always use indexes for queries** - Queries without indexes will fail in production.

```typescript
// schema.ts
export default defineSchema({
  products: defineTable({
    name: v.string(),
    category: v.string(),
    price: v.number(),
  })
    .index("by_category", ["category"])
    .index("by_price", ["price"]),
});

// products.ts
export const listByCategory = query({
  args: { category: v.string() },
  handler: async (ctx, args) => {
    // Good - uses index
    return await ctx.db
      .query("products")
      .withIndex("by_category", (q) => q.eq("category", args.category))
      .collect();
  },
});
```

## Security Guidelines

### Never Trust Client Input

**Always validate and sanitize user input on the server:**

```typescript
// Bad - trusting client-provided user ID
export const updateProfile = mutation({
  args: { userId: v.string(), name: v.string() },
  handler: async (ctx, args) => {
    // DANGEROUS: Client could provide any userId
    await ctx.db.patch(args.userId, { name: args.name });
  },
});

// Good - verify authentication server-side
export const updateProfile = mutation({
  args: { name: v.string() },
  handler: async (ctx, args) => {
    const { clerkId } = await requireAuth(ctx);

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", clerkId))
      .first();

    if (!user) {
      throw new ConvexError({ code: "NOT_FOUND", message: "User not found" });
    }

    await ctx.db.patch(user._id, { name: args.name });
  },
});
```

### Input Validation

**Validate all inputs using Zod schemas:**

```typescript
import { z } from "zod";

const productSchema = z.object({
  name: z.string().min(1).max(100),
  price: z.number().positive().max(1000000),
  description: z.string().max(5000),
  category: z.enum(["jackets", "accessories", "clothing"]),
});

export const createProduct = mutation({
  args: {
    name: v.string(),
    price: v.number(),
    description: v.string(),
    category: v.string(),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);

    // Validate input
    const validatedData = productSchema.parse(args);

    return await ctx.db.insert("products", validatedData);
  },
});
```

### Sensitive Data

**Never commit secrets or API keys:**

- Use environment variables for all sensitive data
- Never log sensitive information (passwords, API keys, tokens)
- Use `.env.local` for local development (git-ignored)
- Sanitize error messages to avoid leaking sensitive details

```typescript
// Bad
const RAZORPAY_KEY = "rzp_live_abc123xyz";

// Good
const RAZORPAY_KEY = process.env.RAZORPAY_KEY_SECRET;

if (!RAZORPAY_KEY) {
  throw new Error("RAZORPAY_KEY_SECRET environment variable is required");
}
```

### Rate Limiting and Abuse Prevention

- Implement rate limiting for expensive operations
- Validate quantity limits for cart and orders
- Set maximum file sizes for uploads
- Implement CAPTCHA for public forms if needed

## Pull Request Process

### Before Submitting

Ensure your PR meets all these requirements:

- [ ] Code follows the style guidelines
- [ ] All tests pass (`npm run test:run` and `npm run test:e2e`)
- [ ] TypeScript compiles without errors (`npm run build`)
- [ ] Coverage meets 80% threshold (`npm run test:coverage`)
- [ ] No `console.log` statements in production code
- [ ] No hardcoded secrets or API keys
- [ ] Documentation updated (if needed)
- [ ] Commit messages follow conventional commits format

### Pull Request Template

Use this template for your PR description:

```markdown
## Description
Brief description of the changes

## Type of Change
- [ ] Bug fix (non-breaking change which fixes an issue)
- [ ] New feature (non-breaking change which adds functionality)
- [ ] Breaking change (fix or feature that would cause existing functionality to not work as expected)
- [ ] Documentation update

## How Has This Been Tested?
Describe the tests you ran to verify your changes

## Screenshots (if applicable)
Add screenshots to help explain your changes

## Checklist
- [ ] My code follows the style guidelines
- [ ] I have performed a self-review of my own code
- [ ] I have commented my code, particularly in hard-to-understand areas
- [ ] I have made corresponding changes to the documentation
- [ ] My changes generate no new warnings
- [ ] I have added tests that prove my fix is effective or that my feature works
- [ ] New and existing unit tests pass locally with my changes
- [ ] Any dependent changes have been merged and published
```

### Review Process

1. **Automated Checks**: GitHub Actions will run tests and linting
2. **Code Review**: At least one maintainer must approve
3. **Testing**: Reviewers will test the changes locally if needed
4. **Merge**: Once approved and all checks pass, your PR will be merged

### After Merge

- Delete your feature branch
- Pull the latest `main` branch
- Close any related issues

## Issue Reporting

### Bug Reports

Use this template when reporting bugs:

```markdown
## Bug Description
A clear and concise description of what the bug is.

## Steps to Reproduce
1. Go to '...'
2. Click on '...'
3. Scroll down to '...'
4. See error

## Expected Behavior
What you expected to happen

## Actual Behavior
What actually happened

## Screenshots
If applicable, add screenshots

## Environment
- OS: [e.g., Windows 11, macOS 13]
- Browser: [e.g., Chrome 120, Firefox 121]
- Node version: [e.g., 18.17.0]

## Additional Context
Any other context about the problem
```

### Feature Requests

Use this template when requesting features:

```markdown
## Feature Description
A clear and concise description of the feature

## Problem Statement
What problem does this feature solve?

## Proposed Solution
How do you think this should work?

## Alternatives Considered
Any alternative solutions or features you've considered

## Additional Context
Any other context, mockups, or examples
```

### Questions and Discussions

For questions about the codebase or discussions:

- Use GitHub Discussions for general questions
- Use issues for specific technical questions
- Tag issues appropriately (`question`, `discussion`, `help wanted`)

## Additional Resources

- [Project README](./README.md) - Project overview and setup
- [Testing Documentation](./TESTING.md) - Detailed testing guide
- [Technical Specifications](./TECHNICAL_SPECS.md) - Architecture documentation
- [Deployment Guide](./DEPLOYMENT.md) - Deployment instructions

## Code of Conduct

- Be respectful and inclusive
- Provide constructive feedback
- Focus on what is best for the project
- Show empathy towards other contributors

## Getting Help

If you need help:

1. Check existing documentation
2. Search closed issues and discussions
3. Ask in GitHub Discussions
4. Create a new issue with the `question` label

## License

By contributing, you agree that your contributions will be licensed under the same license as the project.

---

Thank you for contributing to Blockhaus Clone Showcase!
