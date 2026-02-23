import Layout from "@/components/Layout";
import HeroSection from "@/components/HeroSection";
import NewArrivals from "@/components/NewArrivals";
import WinterWear from "@/components/WinterWear";
import BestSeller from "@/components/BestSeller";
import Testimonials from "@/components/Testimonials";
import CategorySplit from "@/components/CategorySplit";
import Features from "@/components/Features";
import { SEO, getOrganizationSchema, getWebSiteSchema, getLocalBusinessSchema } from "@/components/SEO";

const Index = () => {
  return (
    <Layout>
      <SEO
        canonicalPath="/"
        description="Shop premium knitwear sweaters, hoodies & winter wear for men, women & kids at Nidhi Clothing Co. Affordable aesthetic clothing with free shipping across India. New arrivals & best sellers."
        keywords="knitwear sweater, knitwear women, knitwear men, winter wear online India, hoodie, sweater online, budget clothing, aesthetic clothing, knitwear tops, buy knitwear online, affordable winter wear, black knitwear, unique knitwear, Nidhi Clothing"
        jsonLd={[getOrganizationSchema(), getWebSiteSchema(), getLocalBusinessSchema()]}
      />
      <HeroSection />
      <NewArrivals />
      <WinterWear />
      <BestSeller />
      <Testimonials />
      <CategorySplit />
      <Features />
    </Layout>
  );
};

export default Index;
