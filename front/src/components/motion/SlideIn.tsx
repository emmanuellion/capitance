'use client';

import { motion, useReducedMotion } from 'framer-motion';

interface SlideInProps {
  children: React.ReactNode;
  direction?: 'left' | 'right' | 'up' | 'down';
  delay?: number;
  className?: string;
}

export function SlideIn({
  children,
  direction = 'up',
  delay = 0,
  className,
}: SlideInProps) {
  const shouldReduceMotion = useReducedMotion();

  const directions = {
    left: { x: shouldReduceMotion ? 0 : -20, y: 0 },
    right: { x: shouldReduceMotion ? 0 : 20, y: 0 },
    up: { x: 0, y: shouldReduceMotion ? 0 : 20 },
    down: { x: 0, y: shouldReduceMotion ? 0 : -20 },
  };

  return (
    <motion.div
      initial={{ opacity: 0, ...directions[direction] }}
      animate={{ opacity: 1, x: 0, y: 0 }}
      transition={{
        duration: shouldReduceMotion ? 0 : 0.3,
        delay: shouldReduceMotion ? 0 : delay,
        ease: 'easeOut',
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
}
