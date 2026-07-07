/**
 * Design System Tokens
 * Foundation for consistent, accessible design across Flux-Client
 */

// Color tokens (OKLCH for perceptual uniformity)
export const colors = {
  primary: 'oklch(50% 0.2 250)',    // Blue
  accent: 'oklch(65% 0.25 30)',     // Coral
  success: 'oklch(60% 0.2 142)',    // Green
  warning: 'oklch(70% 0.2 60)',     // Orange
  danger: 'oklch(55% 0.25 15)',     // Red

  neutral: {
    50: 'oklch(98% 0 0)',           // Near white
    100: 'oklch(96% 0 0)',
    200: 'oklch(90% 0 0)',
    300: 'oklch(80% 0 0)',
    400: 'oklch(60% 0 0)',
    500: 'oklch(40% 0 0)',
    900: 'oklch(20% 0 0)',          // Near black
  },
} as const

// Spacing scale (fluid, responsive)
export const space = {
  xs: 'clamp(0.5rem, 0.4rem + 0.5vw, 0.75rem)',
  sm: 'clamp(0.75rem, 0.6rem + 0.75vw, 1.125rem)',
  md: 'clamp(1rem, 0.8rem + 1vw, 1.5rem)',
  lg: 'clamp(1.5rem, 1.2rem + 1.5vw, 2.25rem)',
  xl: 'clamp(2rem, 1.6rem + 2vw, 3rem)',
  '2xl': 'clamp(3rem, 2.4rem + 3vw, 4.5rem)',
} as const

// Typography scale (fluid, responsive)
export const fontSizes = {
  xs: 'clamp(0.75rem, 0.7rem + 0.25vw, 0.875rem)',
  sm: 'clamp(0.875rem, 0.8rem + 0.375vw, 1rem)',
  base: 'clamp(1rem, 0.9rem + 0.5vw, 1.25rem)',
  lg: 'clamp(1.25rem, 1.1rem + 0.75vw, 1.75rem)',
  xl: 'clamp(1.75rem, 1.5rem + 1.25vw, 2.5rem)',
  '2xl': 'clamp(2.5rem, 2rem + 2.5vw, 4rem)',
} as const

export const fontWeights = {
  normal: 400,
  medium: 500,
  semibold: 600,
  bold: 700,
} as const

// Animation tokens
export const animations = {
  durations: {
    fast: '150ms',
    normal: '250ms',
    slow: '400ms',
  },
  easings: {
    inOut: 'cubic-bezier(0.4, 0, 0.2, 1)',
    spring: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
    easeOut: 'cubic-bezier(0, 0, 0.2, 1)',
    easeIn: 'cubic-bezier(0.4, 0, 1, 1)',
  },
} as const

// Shadow/Elevation system
export const shadows = {
  sm: '0 1px 2px rgba(0, 0, 0, 0.05)',
  md: '0 4px 6px rgba(0, 0, 0, 0.07)',
  lg: '0 8px 12px rgba(0, 0, 0, 0.10)',
  xl: '0 16px 24px rgba(0, 0, 0, 0.15)',
} as const

// Border radius
export const borderRadius = {
  sm: '4px',
  md: '8px',
  lg: '12px',
  xl: '16px',
  full: '9999px',
} as const

// Breakpoints for responsive design
export const breakpoints = {
  sm: '640px',
  md: '768px',
  lg: '1024px',
  xl: '1280px',
  '2xl': '1536px',
} as const

// Z-index system
export const zIndex = {
  hide: -1,
  base: 0,
  dropdown: 1000,
  sticky: 1020,
  fixed: 1030,
  modal: 1040,
  popover: 1050,
  tooltip: 1060,
} as const
