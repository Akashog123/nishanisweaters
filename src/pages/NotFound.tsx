import { useLocation, Link } from "react-router-dom";
import { useEffect } from "react";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { logger } from "@/lib/logger";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    logger.warn("404 Error: User attempted to access non-existent route", { path: location.pathname });
  }, [location.pathname]);

  return (
    <Layout showAnnouncement={false}>
      <div className="flex-1 flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <h1 className="mb-4 text-6xl font-bold">404</h1>
          <p className="mb-6 text-xl text-muted-foreground">Oops! Page not found</p>
          <Button asChild>
            <Link to="/">Return to Home</Link>
          </Button>
        </div>
      </div>
    </Layout>
  );
};

export default NotFound;
