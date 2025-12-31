# Blockhaus Clone Showcase

A modern e-commerce application built with React, TypeScript, and Convex, featuring wholesale and retail functionality.

## Tech Stack

- **Frontend**: React 18, TypeScript, Vite 5
- **UI**: TailwindCSS, shadcn/ui, Radix UI primitives
- **Backend**: Convex (serverless database with real-time sync)
- **Authentication**: Clerk
- **State Management**: React Context, React Query
- **Testing**: Vitest, React Testing Library
- **Error Tracking**: Sentry (optional)

## Features

- Product catalog with categories and filtering
- Shopping cart with real-time persistence
- User authentication (sign up, sign in, profile)
- Wholesale account applications and tiered pricing
- Order management with status tracking
- Admin dashboard for product, order, and customer management
- Responsive design for mobile and desktop

## Getting Started

### Prerequisites

- Node.js 18+ (recommend using [nvm](https://github.com/nvm-sh/nvm))
- npm or yarn

### Installation

1. Clone the repository:
```sh
git clone <YOUR_GIT_URL>
cd blockhaus-clone-showcase
```

2. Install dependencies:
```sh
npm install
```

3. Set up environment variables:
```sh
cp .env.example .env.local
```

Edit `.env.local` with your configuration:
- `VITE_CONVEX_URL` - Your Convex deployment URL
- `VITE_CLERK_PUBLISHABLE_KEY` - Clerk publishable key
- `VITE_SENTRY_DSN` - (Optional) Sentry DSN for error tracking

4. Start the development server:
```sh
npm run dev
```

The app will be available at `http://localhost:8080`

### Convex Setup

If you haven't set up Convex yet:

```sh
npx convex dev
```

This will prompt you to log in and create a new Convex project.

## Available Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Build for production |
| `npm run preview` | Preview production build |
| `npm run lint` | Run ESLint |
| `npm run test` | Run tests with Vitest |
| `npm run test:ui` | Run tests with UI |
| `npm run test:coverage` | Run tests with coverage |

## Project Structure

```
src/
├── components/       # Reusable UI components
│   ├── admin/       # Admin dashboard components
│   ├── auth/        # Authentication components
│   └── ui/          # shadcn/ui components
├── context/         # React context providers
├── hooks/           # Custom React hooks
├── lib/             # Utility functions and configs
├── pages/           # Page components
│   ├── admin/       # Admin pages
│   └── wholesale/   # Wholesale-specific pages
├── test/            # Test setup and utilities
└── types/           # TypeScript type definitions

convex/              # Convex backend functions
├── schema.ts        # Database schema
├── products.ts      # Product queries/mutations
├── cart.ts          # Cart operations
├── orders.ts        # Order management
└── users.ts         # User management
```

## Testing

Run the test suite:

```sh
npm run test
```

Run tests in watch mode:

```sh
npm run test -- --watch
```

Generate coverage report:

```sh
npm run test:coverage
```

## Build Optimizations

The production build includes:

- Vendor chunk splitting (React, Radix UI, Clerk, Convex, Charts, Forms)
- Image lazy loading with priority hints for LCP
- React.memo for expensive components
- Context value memoization

## Error Handling

The application uses a centralized logging system:

- Development: Console output with structured formatting
- Production: Errors sent to Sentry (if configured)

Use the logger in your code:

```typescript
import { logger } from '@/lib/logger';

logger.debug('Debug message', { context: 'data' });
logger.info('Info message');
logger.warn('Warning message');
logger.error('Error message', error, { context: 'data' });
```

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `VITE_CONVEX_URL` | Yes | Convex deployment URL |
| `VITE_CLERK_PUBLISHABLE_KEY` | Yes | Clerk publishable key |
| `VITE_SENTRY_DSN` | No | Sentry DSN for error tracking |
| `VITE_SENTRY_ENVIRONMENT` | No | Environment name for Sentry |

## Deployment

### Vercel (Recommended)

1. Connect your repository to Vercel
2. Set environment variables in Vercel dashboard
3. Deploy

### Manual Build

```sh
npm run build
```

The output will be in the `dist/` directory, ready for static hosting.

## Contributing

1. Create a feature branch
2. Make your changes
3. Run tests: `npm run test`
4. Run linter: `npm run lint`
5. Submit a pull request

## License

This project is private and not licensed for public use.
