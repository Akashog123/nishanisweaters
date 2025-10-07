import { useState } from "react";

interface ProductGalleryProps {
  images: string[];
  productName: string;
}

const ProductGallery = ({ images, productName }: ProductGalleryProps) => {
  const [selectedImage, setSelectedImage] = useState(0);

  return (
    <div className="flex flex-col lg:flex-row gap-4">
      {/* Thumbnail Column */}
      <div className="flex lg:flex-col gap-2 order-2 lg:order-1">
        {images.map((image, index) => (
          <button
            key={index}
            onClick={() => setSelectedImage(index)}
            className={`w-20 h-20 lg:w-24 lg:h-24 border-2 transition-all ${
              selectedImage === index
                ? "border-primary"
                : "border-border hover:border-primary/50"
            }`}
          >
            <img
              src={image}
              alt={`${productName} view ${index + 1}`}
              className="w-full h-full object-cover"
            />
          </button>
        ))}
      </div>

      {/* Main Image */}
      <div className="flex-1 bg-secondary order-1 lg:order-2">
        <img
          src={images[selectedImage]}
          alt={productName}
          className="w-full h-auto object-cover"
        />
      </div>
    </div>
  );
};

export default ProductGallery;
