import Layout from "@/components/Layout";
import HeroSection from "@/components/HeroSection";
import NewArrivals from "@/components/NewArrivals";
import WinterWear from "@/components/WinterWear";
import BestSeller from "@/components/BestSeller";
import Testimonials from "@/components/Testimonials";
import CategorySplit from "@/components/CategorySplit";
import Features from "@/components/Features";

const Index = () => {
  return (
    <Layout>
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
