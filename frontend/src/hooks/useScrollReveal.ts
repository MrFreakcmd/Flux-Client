import { useInView } from 'react-intersection-observer'
import { Variants } from 'framer-motion'

/**
 * useScrollReveal Hook
 * Detects when element comes into view and returns ref + inView state
 * Used with Framer Motion for scroll-triggered animations
 */
export const useScrollReveal = () => {
  const { ref, inView } = useInView({
    triggerOnce: true,
    threshold: 0.1,
    rootMargin: '0px 0px -100px 0px', // Trigger slightly before visible
  })

  return { ref, inView }
}

/**
 * Scroll Reveal Variants
 * Use with Framer Motion for staggered reveals
 */
export const scrollRevealVariants: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: {
      delay: i * 0.1,
      duration: 0.4,
      ease: 'easeOut',
    },
  }),
}

/**
 * Stagger Container Variants
 * Wrap multiple items for coordinated animations
 */
export const staggerContainerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.2,
    },
  },
}

/**
 * Stagger Item Variants
 * Individual item animations within stagger container
 */
export const staggerItemVariants: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.4,
    },
  },
}
