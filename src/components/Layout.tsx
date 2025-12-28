import AnnouncementBanner from "@/components/AnnouncementBanner";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

interface LayoutProps {
  children: React.ReactNode;
  showAnnouncement?: boolean;
  showFooter?: boolean;
}

export function Layout({
  children,
  showAnnouncement = true,
  showFooter = true
}: LayoutProps) {
  return (
    <div className="min-h-screen flex flex-col">
      {showAnnouncement && <AnnouncementBanner />}
      <Header />
      <main className="flex-1">{children}</main>
      {showFooter && <Footer />}
    </div>
  );
}

export default Layout;
