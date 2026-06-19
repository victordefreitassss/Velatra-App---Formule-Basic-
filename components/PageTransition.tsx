import React from 'react';
import { motion } from 'framer-motion';

interface PageTransitionProps {
  children: React.ReactNode;
}

export const PageTransition: React.FC<PageTransitionProps> = ({ children }) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{
        duration: 0.4,
        ease: [0.16, 1, 0.3, 1], // Custom Apple-style ease-out cubic bezier for premium responsiveness
      }}
      className="flex-grow flex flex-col w-full"
      style={{ backfaceVisibility: 'hidden' }}
    >
      {children}
    </motion.div>
  );
};

export default PageTransition;
