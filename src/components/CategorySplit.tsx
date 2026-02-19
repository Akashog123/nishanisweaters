import { Link } from "react-router-dom";
import { useSiteSettings } from "@/hooks/useSiteSettings";
import productHoodie1 from "@/assets/product-hoodie-1.jpg";
import productHoodie2 from "@/assets/product-hoodie-2.jpg";

// Default categories to show in the split section
const DEFAULT_CATEGORY_SPLIT = [
  { slug: "mens", name: "MENS", image: productHoodie1 },
  { slug: "womens", name: "WOMENS", image: productHoodie2 },
  { slug: "kids", name: "KIDS", image: productHoodie1 },
];

const CategorySplit = () => {
  const { settings } = useSiteSettings();

  // Check if dynamic categories are enabled
  const enableDynamic = settings?.enableDynamic === "true";

  // Get categories to show (for now, use defaults but this could be extended to use settings)
  const categories = enableDynamic
    ? [
        { slug: "mens", name: "MEN'S", image: productHoodie1 },
        { slug: "womens", name: "WOMEN'S", image: productHoodie2 },
        { slug: "kids", name: "KIDS", image: productHoodie1 },
      ]
    : DEFAULT_CATEGORY_SPLIT;

  return (
    <section className="py-16 lg:py-24 bg-background">
      <div className="container mx-auto px-4 lg:px-8">
        <div className="grid md:grid-cols-3 gap-8 lg:gap-12">
          {categories.map((category) => (
            <Link
              key={category.slug}
              to={`/shop/${category.slug}`}
              className="group relative aspect-[3/4] overflow-hidden rounded-lg bg-gray-100"
            >
              <img
                src={category.image}
                alt={`${category.name} Collection`}
                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />
              <div className="absolute top-8 left-8 text-black">
                <h3 className="text-3xl lg:text-4xl font-bold mb-2">{category.name}</h3>
                <p className="text-base lg:text-lg">COLLECTION</p>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
};

export default CategorySplit;
