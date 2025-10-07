import { Link } from "react-router-dom";

interface ProductCardProps {
  id: string;
  image: string;
  hoverImage?: string;
  name: string;
  price: string;
  originalPrice?: string;
}

const ProductCard = ({ id, image, hoverImage, name, price, originalPrice }: ProductCardProps) => {
  return (
    <Link to={`/product/${id}`} className="group cursor-pointer">
      <div className="relative overflow-hidden bg-secondary mb-4 aspect-[3/4]">
        <img
          src={image}
          alt={name}
          className="w-full h-full object-cover transition-opacity duration-300 group-hover:opacity-0"
        />
        {hoverImage && (
          <img
            src={hoverImage}
            alt={`${name} alternate view`}
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
};

export default ProductCard;
