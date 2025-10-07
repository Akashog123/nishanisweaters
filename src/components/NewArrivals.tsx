import ProductCard from "./ProductCard";
import { Button } from "@/components/ui/button";
import productHoodie1 from "@/assets/product-hoodie-1.jpg";
import productTshirt1 from "@/assets/product-tshirt-1.jpg";
import productPants1 from "@/assets/product-pants-1.jpg";
import productHoodie2 from "@/assets/product-hoodie-2.jpg";

const NewArrivals = () => {
  const products = [
    {
      image: productHoodie1,
      name: "Block Zipper Hoodie",
      price: "89.00",
      originalPrice: "149.00",
    },
    {
      image: productTshirt1,
      name: "Oversized Block T-Shirt",
      price: "129.00",
    },
    {
      image: productPants1,
      name: "Minimal Sweatpants",
      price: "99.00",
      originalPrice: "149.00",
    },
    {
      image: productHoodie2,
      name: "Electric Blue Hoodie",
      price: "159.00",
    },
  ];

  return (
    <section id="new-arrival" className="py-16 lg:py-24 bg-background">
      <div className="container mx-auto px-4 lg:px-8">
        <div className="flex items-center justify-between mb-12">
          <h2 className="text-3xl lg:text-4xl font-bold">NEW ARRIVAL</h2>
          <Button variant="outline" className="border-2 font-medium">
            Browse All
          </Button>
        </div>
        
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-8">
          {products.map((product, index) => (
            <ProductCard key={index} {...product} />
          ))}
        </div>
      </div>
    </section>
  );
};

export default NewArrivals;
