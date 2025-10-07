import AnnouncementBanner from "@/components/AnnouncementBanner";
import Header from "@/components/Header";
import HeroSection from "@/components/HeroSection";
import NewArrivals from "@/components/NewArrivals";
import NewsletterSignup from "@/components/NewsletterSignup";
import Footer from "@/components/Footer";

const Index = () => {
  return (
    <div className="min-h-screen">
      <AnnouncementBanner />
      <Header />
      <main>
        <HeroSection />
        <NewArrivals />
        <NewsletterSignup />
      </main>
      <Footer />
    </div>
  );
};

export default Index;
