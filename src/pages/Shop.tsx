import { useParams } from "react-router-dom";
import AnnouncementBanner from "@/components/AnnouncementBanner";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import ProductCard from "@/components/ProductCard";
import { products } from "@/data/products";

const Shop = () => {
  const { category } = useParams<{ category: string }>();

  const categoryTitles: Record<string, string> = {
    "new-arrival": "NEW ARRIVAL",
    "mens": "MEN'S COLLECTION",
    "womens": "WOMEN'S COLLECTION",
  };

  const categoryFilters: Record<string, (product: any) => boolean> = {
    "new-arrival": () => true, // Show all products for new arrivals
    "mens": (product) => ["block-zipper-hoodie", "oversized-block-tshirt", "minimal-sweatpants"].includes(product.id),
    "womens": (product) => ["electric-blue-hoodie"].includes(product.id),
  };

  const filteredProducts = category && categoryFilters[category]
    ? products.filter(categoryFilters[category])
    : products;

  const title = category ? categoryTitles[category] || "SHOP" : "SHOP";

  return (
    <div className="min-h-screen">
      <AnnouncementBanner />
      <Header />
      
      <main className="container mx-auto px-4 lg:px-8 py-12 lg:py-20">
        <h1 className="text-4xl lg:text-6xl font-bold mb-12 text-center">{title}</h1>
        
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-8">
          {filteredProducts.map((product) => (
            <ProductCard
              key={product.id}
              id={product.id}
              image={product.images[0]}
              name={product.name}
              price={product.price}
              originalPrice={product.originalPrice}
            />
          ))}
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default Shop;
