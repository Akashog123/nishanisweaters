/**
 * Page Loader Component
 *
 * Simple spinner loader for lazy-loaded pages
 */
import { useSiteSettings } from "@/hooks/useSiteSettings";

export function PageLoader({ fullScreen = false }: { fullScreen?: boolean }) {
  const { logoUrl, siteName } = useSiteSettings();

  return (
    <div className={`flex flex-col items-center justify-center gap-4 ${fullScreen ? 'min-h-screen' : 'min-h-[60vh]'}`}>
      <div className="relative flex items-center justify-center w-24 h-24 sm:w-32 sm:h-32">
        <div className="absolute inset-0 bg-primary/10 rounded-full animate-ping opacity-75"></div>
        <img
          src={logoUrl || "/Logo.png"}
          alt={`${siteName || 'Nidhi Clothing'} Loading`}
          className="w-full h-full object-contain animate-pulse relative z-10 drop-shadow-md"
        />
      </div>
      <p className="text-sm font-medium text-muted-foreground animate-pulse tracking-widest uppercase">
        Loading
      </p>
    </div>
  );
}
