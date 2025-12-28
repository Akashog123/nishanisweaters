import { Skeleton } from "@/components/ui/skeleton";

interface ProductSkeletonProps {
  count?: number;
}

const ProductSkeletonCard = () => {
  return (
    <div className="group">
      {/* Product Image Skeleton */}
      <Skeleton className="aspect-[3/4] mb-4 bg-secondary" />
      {/* Product Name Skeleton */}
      <Skeleton className="h-4 w-3/4 mb-2" />
      {/* Price Skeleton */}
      <div className="flex items-center gap-2">
        <Skeleton className="h-5 w-16" />
        <Skeleton className="h-4 w-12" />
      </div>
    </div>
  );
};

const ProductSkeleton = ({ count = 4 }: ProductSkeletonProps) => {
  return (
    <>
      {Array.from({ length: count }).map((_, index) => (
        <ProductSkeletonCard key={index} />
      ))}
    </>
  );
};

export { ProductSkeleton, ProductSkeletonCard };
export default ProductSkeleton;
