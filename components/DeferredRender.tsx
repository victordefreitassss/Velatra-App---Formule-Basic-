import React, { useState, useEffect } from 'react';

interface DeferredRenderProps {
  children: React.ReactNode;
  delay?: number;
}

export const DeferredRender: React.FC<DeferredRenderProps> = ({ children, delay = 100 }) => {
  const [shouldRender, setShouldRender] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setShouldRender(true);
    }, delay);

    return () => clearTimeout(timer);
  }, [delay]);

  if (!shouldRender) return null;

  return <>{children}</>;
};
