import productHoodie1 from "@/assets/product-hoodie-1.jpg";
import productTshirt1 from "@/assets/product-tshirt-1.jpg";
import productPants1 from "@/assets/product-pants-1.jpg";
import productHoodie2 from "@/assets/product-hoodie-2.jpg";

export interface Product {
  id: string;
  name: string;
  price: string;
  originalPrice?: string;
  images: string[];
  description: string;
  sizes: string[];
  colors: string[];
  category: 'new-arrival' | 'mens' | 'womens';
  gender: 'men' | 'women' | 'unisex';
}

export const products: Product[] = [
  {
    id: "block-zipper-hoodie",
    name: "Block Zipper Hoodie",
    price: "89.00",
    originalPrice: "149.00",
    images: [productHoodie1, productHoodie1, productHoodie1, productHoodie1],
    description: "Cozy up in the Blockhaus Zipper Hoodie. Featuring a smooth zip closure and ultra-soft fabric, this hoodie is designed for laid-back days and chill vibes.",
    sizes: ["S", "M", "L", "XL"],
    colors: ["Black/White", "Blue", "Olive"],
    category: "new-arrival",
    gender: "men",
  },
  {
    id: "oversized-block-tshirt",
    name: "Oversized Block T-Shirt",
    price: "129.00",
    images: [productTshirt1, productTshirt1, productTshirt1, productTshirt1],
    description: "Make a bold statement with the Oversized Block T-Shirt. Featuring geometric block prints and a relaxed fit, this tee brings street style to your everyday wardrobe.",
    sizes: ["S", "M", "L", "XL"],
    colors: ["White", "Black", "Grey"],
    category: "new-arrival",
    gender: "men",
  },
  {
    id: "minimal-sweatpants",
    name: "Minimal Sweatpants",
    price: "99.00",
    originalPrice: "149.00",
    images: [productPants1, productPants1, productPants1, productPants1],
    description: "Comfort meets style with the Minimal Sweatpants. Crafted from premium cotton blend with a subtle block logo, these sweatpants are perfect for lounging or street wear.",
    sizes: ["S", "M", "L", "XL"],
    colors: ["Grey", "Black", "Navy"],
    category: "new-arrival",
    gender: "men",
  },
  {
    id: "electric-blue-hoodie",
    name: "Electric Blue Hoodie",
    price: "159.00",
    images: [productHoodie2, productHoodie2, productHoodie2, productHoodie2],
    description: "Stand out with the Electric Blue Hoodie. This vibrant oversized hoodie features premium fabric and a bold color that defines modern streetwear aesthetics.",
    sizes: ["S", "M", "L", "XL"],
    colors: ["Electric Blue", "Black", "White"],
    category: "new-arrival",
    gender: "women",
  },
];

export const getProductById = (id: string): Product | undefined => {
  return products.find((product) => product.id === id);
};
