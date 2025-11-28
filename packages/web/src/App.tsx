import React, { useState, useEffect } from 'react';
import { DesktopApp } from './DesktopApp.js';
import { MobileApp } from './MobileApp.js';

function useIsMobile() {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      // Simple check for mobile width or user agent
      const isMobileWidth = window.innerWidth < 768;
      const isMobileUA = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
        navigator.userAgent
      );
      setIsMobile(isMobileWidth || isMobileUA);
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  return isMobile;
}

export const App: React.FC = () => {
  const isMobile = useIsMobile();

  return isMobile ? <MobileApp /> : <DesktopApp />;
};
