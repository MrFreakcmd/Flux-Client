/**
 * Gesture Interactions
 * Reusable gesture definitions for hover, tap, and drag interactions
 * Coordinates with spring transitions for smooth feel
 */

import { TargetAndTransition } from 'framer-motion'

/* === HOVER STATES === */

/**
 * Subtle hover lift - used for cards and interactive elements
 */
export const hoverLift: TargetAndTransition = {
  y: -4,
  transition: {
    type: 'spring',
    stiffness: 100,
    damping: 15,
  },
}

/**
 * Scale hover - used for buttons and clickable elements
 */
export const hoverScale: TargetAndTransition = {
  scale: 1.02,
  transition: {
    type: 'spring',
    stiffness: 350,
    damping: 25,
  },
}

/**
 * Glow hover - used for badges and highlights
 */
export const hoverGlow: TargetAndTransition = {
  filter: 'drop-shadow(0 0 8px rgba(100, 240, 200, 0.5))',
  transition: {
    duration: 0.3,
  },
}

/**
 * Brightness hover - used for images and media
 */
export const hoverBrightness: TargetAndTransition = {
  filter: 'brightness(1.1)',
  transition: {
    duration: 0.2,
  },
}

/* === TAP STATES === */

/**
 * Scale down on tap - tactile feedback
 */
export const tapScale: TargetAndTransition = {
  scale: 0.98,
  transition: {
    type: 'spring',
    stiffness: 400,
    damping: 20,
  },
}

/**
 * Press down on tap - button press effect
 */
export const tapPress: TargetAndTransition = {
  y: 2,
  transition: {
    duration: 0.1,
  },
}

/**
 * Opacity change on tap - toggle effect
 */
export const tapOpacity: TargetAndTransition = {
  opacity: 0.8,
  transition: {
    duration: 0.1,
  },
}

/* === DRAG STATES === */

/**
 * Drag cursor style - indicates element is draggable
 */
export const dragActive: TargetAndTransition = {
  cursor: 'grabbing',
  scale: 1.05,
  opacity: 0.8,
  transition: {
    type: 'spring',
    stiffness: 200,
    damping: 20,
  },
}

/**
 * Drag hover - shows element is draggable
 */
export const dragHover: TargetAndTransition = {
  cursor: 'grab',
  scale: 1.02,
  transition: {
    duration: 0.2,
  },
}

/* === FOCUS STATES === */

/**
 * Keyboard focus ring - visible outline on focus
 */
export const focusRing: TargetAndTransition = {
  outline: '3px solid var(--color-accent)',
  outlineOffset: '2px',
  transition: {
    duration: 0.1,
  },
}

/**
 * Focus scale - subtle indication of focus
 */
export const focusScale: TargetAndTransition = {
  scale: 1.01,
  transition: {
    type: 'spring',
    stiffness: 200,
    damping: 15,
  },
}

/* === GESTURE CONFIGS === */

/**
 * Standard interactive element gestures
 * Used on buttons, cards, and clickable items
 */
export const interactiveGestures = {
  whileHover: hoverScale,
  whileTap: tapScale,
  whileFocus: focusScale,
}

/**
 * Card gestures - subtle lift with no scale
 * Used on card containers and panels
 */
export const cardGestures = {
  whileHover: hoverLift,
  whileFocus: hoverLift,
}

/**
 * Draggable element gestures
 * Used on draggable items and sortable lists
 */
export const draggableGestures = {
  whileHover: dragHover,
  whileDrag: dragActive,
}

/**
 * Link gestures - hover underline effect
 */
export const linkGestures = {
  whileHover: {
    textDecoration: 'underline',
    transition: { duration: 0.2 },
  },
  whileFocus: focusRing,
}

/**
 * Badge gestures - glow on hover
 */
export const badgeGestures = {
  whileHover: hoverGlow,
  whileFocus: hoverGlow,
}

/**
 * Image gestures - brightness on hover
 */
export const imageGestures = {
  whileHover: hoverBrightness,
}

/**
 * Icon button gestures - rotate on hover
 */
export const iconButtonGestures = {
  whileHover: {
    rotate: 10,
    scale: 1.1,
    transition: {
      type: 'spring',
      stiffness: 300,
      damping: 20,
    },
  },
  whileTap: tapScale,
}

/**
 * Input field gestures - border color on focus
 */
export const inputGestures = {
  whileFocus: {
    borderColor: 'var(--color-primary)',
    boxShadow: '0 0 0 3px rgba(var(--color-primary), 0.1)',
    transition: { duration: 0.2 },
  },
}

/**
 * Slider gestures - scale on drag
 */
export const sliderGestures = {
  whileDrag: {
    scale: 1.1,
    transition: { type: 'spring', stiffness: 300 },
  },
}
