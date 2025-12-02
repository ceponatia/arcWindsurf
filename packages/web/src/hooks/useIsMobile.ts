import { useEffect, useState } from 'react';

const MOBILE_UA_REGEX = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i;

// Watches viewport width + user agent to decide if we should render the mobile layout.
export function useIsMobile(breakpoint = 768): boolean {
  const [isMobile, setIsMobile] = useState(() => detectIsMobile(breakpoint));

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const handleResize = () => setIsMobile(detectIsMobile(breakpoint));

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [breakpoint]);

  return isMobile;
}

function detectIsMobile(breakpoint: number): boolean {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') {
    return false;
  }

  const isMobileWidth = window.innerWidth < breakpoint;
  const isMobileUA = MOBILE_UA_REGEX.test(navigator.userAgent);
  return isMobileWidth || isMobileUA;
}
