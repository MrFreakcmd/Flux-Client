/**
 * Animation Variants & Transitions
 * Reusable Framer Motion animation definitions for consistent micro-interactions
 * All animations respect prefers-reduced-motion via design tokens
 */

import { Variants, VariantLabels } from 'framer-motion'

/* === PAGE TRANSITIONS === */

/**
 * Page entrance animation - smooth fade and slide up
 * Used on route changes and lazy-loaded pages
 */
export const pageEnterVariants: Variants = {
  hidden: {
    opacity: 0,
    y: 20,
  },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.4,
      ease: 'easeOut',
    },
  },
  exit: {
    opacity: 0,
    y: -10,
    transition: {
      duration: 0.3,
      ease: 'easeIn',
    },
  },
}

/**
 * Staggered container for animating children in sequence
 * Children animate with slight delays for cascade effect
 */
export const staggerContainerVariants: Variants = {
  hidden: {
    opacity: 0,
  },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.1,
    },
  },
}

/**
 * Staggered item - child element that animates within staggered container
 */
export const staggerItemVariants: Variants = {
  hidden: {
    opacity: 0,
    y: 10,
  },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.3,
      ease: 'easeOut',
    },
  },
}

/* === COMPONENT ANIMATIONS === */

/**
 * Card entrance - scale + fade for dialog/modal appearance
 */
export const cardEnterVariants: Variants = {
  hidden: {
    opacity: 0,
    scale: 0.95,
  },
  visible: {
    opacity: 1,
    scale: 1,
    transition: {
      type: 'spring',
      stiffness: 100,
      damping: 15,
      duration: 0.3,
    },
  },
}

/**
 * Button hover animation - subtle scale and elevation
 */
export const buttonHoverVariants: Variants = {
  initial: {
    scale: 1,
    y: 0,
  },
  hover: {
    scale: 1.02,
    y: -2,
    transition: {
      type: 'spring',
      stiffness: 350,
      damping: 25,
    },
  },
  tap: {
    scale: 0.98,
    y: 0,
  },
}

/**
 * Badge entrance - spring scale for status badges
 */
export const badgeEnterVariants: Variants = {
  hidden: {
    opacity: 0,
    scale: 0.85,
  },
  visible: {
    opacity: 1,
    scale: 1,
    transition: {
      type: 'spring',
      stiffness: 300,
      damping: 25,
    },
  },
}

/**
 * Modal backdrop - fade in with faster timing
 */
export const backdropVariants: Variants = {
  hidden: {
    opacity: 0,
  },
  visible: {
    opacity: 1,
    transition: {
      duration: 0.2,
      ease: 'easeOut',
    },
  },
  exit: {
    opacity: 0,
    transition: {
      duration: 0.2,
      ease: 'easeIn',
    },
  },
}

/**
 * Success checkmark animation - rotation + scale
 */
export const successCheckVariants: Variants = {
  hidden: {
    opacity: 0,
    scale: 0,
    rotate: -90,
  },
  visible: {
    opacity: 1,
    scale: 1,
    rotate: 0,
    transition: {
      type: 'spring',
      stiffness: 200,
      damping: 15,
      delay: 0.1,
    },
  },
}

/**
 * Error shake animation - side-to-side motion for validation errors
 */
export const errorShakeVariants: Variants = {
  hidden: {
    x: 0,
  },
  shake: {
    x: [-5, 5, -5, 5, 0],
    transition: {
      duration: 0.4,
      times: [0, 0.2, 0.4, 0.6, 1],
    },
  },
}

/**
 * Loading spinner - continuous rotation
 */
export const spinnerVariants: Variants = {
  spin: {
    rotate: 360,
    transition: {
      duration: 1,
      repeat: Infinity,
      ease: 'linear',
    },
  },
}

/**
 * Pulse effect - subtle opacity change for attention
 */
export const pulseVariants: Variants = {
  pulse: {
    opacity: [1, 0.6, 1],
    transition: {
      duration: 2,
      repeat: Infinity,
      ease: 'easeInOut',
    },
  },
}

/* === LAYOUT ANIMATIONS === */

/**
 * Slide in from left - sidebar or drawer entrance
 */
export const slideInLeftVariants: Variants = {
  hidden: {
    x: -300,
    opacity: 0,
  },
  visible: {
    x: 0,
    opacity: 1,
    transition: {
      duration: 0.3,
      ease: 'easeOut',
    },
  },
  exit: {
    x: -300,
    opacity: 0,
    transition: {
      duration: 0.2,
      ease: 'easeIn',
    },
  },
}

/**
 * Slide in from right - panel or notification entrance
 */
export const slideInRightVariants: Variants = {
  hidden: {
    x: 300,
    opacity: 0,
  },
  visible: {
    x: 0,
    opacity: 1,
    transition: {
      duration: 0.3,
      ease: 'easeOut',
    },
  },
  exit: {
    x: 300,
    opacity: 0,
    transition: {
      duration: 0.2,
      ease: 'easeIn',
    },
  },
}

/**
 * Expand animation - grow from center for content reveal
 */
export const expandVariants: Variants = {
  hidden: {
    opacity: 0,
    scaleY: 0,
    originY: 0,
  },
  visible: {
    opacity: 1,
    scaleY: 1,
    transition: {
      duration: 0.3,
      ease: 'easeOut',
    },
  },
}

/* === TRANSITION CONFIGS === */

/**
 * Fast transition - for micro-interactions (120-250ms)
 */
export const fastTransition = {
  duration: 0.15,
  ease: 'easeOut',
}

/**
 * Normal transition - default animations (250-400ms)
 */
export const normalTransition = {
  duration: 0.25,
  ease: 'easeInOut',
}

/**
 * Slow transition - emphasis animations (400-600ms)
 */
export const slowTransition = {
  duration: 0.4,
  ease: 'easeInOut',
}

/**
 * Spring transition - bouncy animations
 */
export const springTransition = {
  type: 'spring' as const,
  stiffness: 100,
  damping: 15,
}

/**
 * Tight spring - snappier spring animation
 */
export const tightSpringTransition = {
  type: 'spring' as const,
  stiffness: 300,
  damping: 25,
}
