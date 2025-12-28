import { useEffect } from 'react';
import Lenis from 'lenis';

export const useSmoothScroll = () => {
  useEffect(() => {
    const lenis = new Lenis({
      duration: 1.2,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
    });

    let rafId: number;

    function raf(time: number) {
      lenis.raf(time);
      rafId = requestAnimationFrame(raf);
    }

    rafId = requestAnimationFrame(raf);

    // Handle route changes for React Router
    const handleRouteChange = () => {
      lenis.scrollTo(0, { immediate: true });
    };

    window.addEventListener('popstate', handleRouteChange);

    return () => {
      // Cancel RAF loop before destroying Lenis
      cancelAnimationFrame(rafId);
      lenis.destroy();
      window.removeEventListener('popstate', handleRouteChange);
    };
  }, []);
};