import React, { memo, useState, useCallback } from "react";
import { Link } from "react-router-dom";

interface ProductCardProps {
  id: string;
  image: string;
  hoverImage?: string;
  name: string;
  price: string;
  originalPrice?: string;
}

const ProductCard = memo(({ id, image, hoverImage, name, price, originalPrice }: ProductCardProps) => {
  const [hoverImageLoaded, setHoverImageLoaded] = useState(false);

  // Prefetch hover image on mouse enter for smoother UX
  const handleMouseEnter = useCallback(() => {
    if (hoverImage && !hoverImageLoaded) {
      const img = new Image();
      img.src = hoverImage;
      img.onload = () => setHoverImageLoaded(true);
    }
  }, [hoverImage, hoverImageLoaded]);

  return (
    <Link
      to={`/product/${id}`}
      className="group cursor-pointer"
      onMouseEnter={handleMouseEnter}
    >
      <div className="relative overflow-hidden bg-secondary mb-4 aspect-[3/4]">
        <img
          src={image}
          alt={name}
          loading="lazy"
          decoding="async"
          className="w-full h-full object-cover transition-opacity duration-300 group-hover:opacity-0"
        />
        {hoverImage && (
          <img
            src={hoverImage}
            alt={`${name} alternate view`}
            loading="lazy"
            decoding="async"
            className="w-full h-full object-cover absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100"
          />
        )}
      </div>
      <h3 className="font-medium mb-2 text-sm lg:text-base">{name}</h3>
      <div className="flex items-center gap-2">
        <span className="font-bold text-lg">${price}</span>
        {originalPrice && (
          <span className="text-muted-foreground line-through text-sm">
            ${originalPrice}
          </span>
        )}
      </div>
    </Link>
  );
});

ProductCard.displayName = "ProductCard";

export default ProductCard;
