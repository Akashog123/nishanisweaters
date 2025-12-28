import { Link, useNavigate } from 'react-router-dom';
import { FileQuestion, Home, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface NotFoundErrorProps {
  resourceType?: 'product' | 'order' | 'page' | 'user';
  resourceId?: string;
  message?: string;
  showSearch?: boolean;
}

export default function NotFoundError({
  resourceType = 'page',
  resourceId,
  message,
  showSearch = false,
}: NotFoundErrorProps) {
  const navigate = useNavigate();

  const getTitle = () => {
    switch (resourceType) {
      case 'product':
        return 'Product Not Found';
      case 'order':
        return 'Order Not Found';
      case 'user':
        return 'User Not Found';
      default:
        return 'Page Not Found';
    }
  };

  const getDescription = () => {
    if (message) return message;

    switch (resourceType) {
      case 'product':
        return resourceId
          ? `The product "${resourceId}" could not be found. It may have been removed or is no longer available.`
          : 'The product you are looking for could not be found.';
      case 'order':
        return resourceId
          ? `Order #${resourceId} could not be found. Please check your order number and try again.`
          : 'The order you are looking for could not be found.';
      case 'user':
        return 'The user profile you are looking for does not exist.';
      default:
        return 'The page you are looking for does not exist or has been moved.';
    }
  };

  const getSuggestions = () => {
    switch (resourceType) {
      case 'product':
        return [
          { label: 'Browse All Products', href: '/shop' },
          { label: 'New Arrivals', href: '/shop/new-arrival' },
          { label: 'Best Sellers', href: '/shop/best-seller' },
        ];
      case 'order':
        return [
          { label: 'View Order History', href: '/orders' },
          { label: 'My Account', href: '/account' },
        ];
      default:
        return [
          { label: 'Shop Now', href: '/shop' },
          { label: 'New Arrivals', href: '/shop/new-arrival' },
        ];
    }
  };

  return (
    <div className="min-h-[600px] flex items-center justify-center p-4">
      <div className="max-w-2xl w-full text-center space-y-8">
        {/* 404 Illustration */}
        <div className="flex justify-center">
          <div className="w-32 h-32 bg-muted rounded-full flex items-center justify-center">
            <FileQuestion className="w-16 h-16 text-muted-foreground" />
          </div>
        </div>

        {/* Error Message */}
        <div className="space-y-3">
          <h1 className="text-4xl font-bold">{getTitle()}</h1>
          <p className="text-lg text-muted-foreground max-w-md mx-auto">
            {getDescription()}
          </p>
        </div>

        {/* Resource ID */}
        {resourceId && (
          <div className="inline-block bg-muted px-4 py-2 rounded-lg">
            <p className="text-sm font-mono text-muted-foreground">
              {resourceType === 'order' ? 'Order #' : 'ID: '}
              {resourceId}
            </p>
          </div>
        )}

        {/* Search Bar (Optional) */}
        {showSearch && (
          <div className="max-w-md mx-auto">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search for products..."
                className="w-full pl-10 pr-4 py-3 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    const query = e.currentTarget.value;
                    if (query) {
                      navigate(`/shop?search=${encodeURIComponent(query)}`);
                    }
                  }
                }}
              />
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link to="/">
            <Button size="lg" className="gap-2">
              <Home className="w-5 h-5" />
              Go to Homepage
            </Button>
          </Link>

          {getSuggestions().map((suggestion) => (
            <Link key={suggestion.href} to={suggestion.href}>
              <Button variant="outline" size="lg">
                {suggestion.label}
              </Button>
            </Link>
          ))}
        </div>

        {/* Help Text */}
        <div className="pt-8 border-t border-border">
          <p className="text-sm text-muted-foreground">
            Need help? Contact our support team at{' '}
            <a
              href="mailto:support@blockhaus.com"
              className="text-primary hover:underline"
            >
              support@blockhaus.com
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
