/**
 * Picture Component
 * Optimized image rendering with AVIF/WebP fallbacks
 * Supports lazy loading and responsive images
 */

import { ImgHTMLAttributes } from 'react'

interface PictureProps extends Omit<ImgHTMLAttributes<HTMLImageElement>, 'src'> {
  /** Base filename without extension (e.g., "hero" for "hero.jpg") */
  src: string
  /** Alt text (required for accessibility) */
  alt: string
  /** Optional srcset for responsive images */
  srcSet?: string
  /** Enable lazy loading (default: true) */
  lazy?: boolean
}

/**
 * Usage:
 * <Picture
 *   src="images/hero"
 *   alt="Hero banner"
 *   lazy={true}
 * />
 *
 * This will render <picture> with AVIF, WebP, and JPG sources
 */
export const Picture = ({
  src,
  alt,
  lazy = true,
  className,
  ...props
}: PictureProps) => {
  return (
    <picture>
      <source srcSet={`${src}.avif`} type="image/avif" />
      <source srcSet={`${src}.webp`} type="image/webp" />
      <img
        src={`${src}.jpg`}
        alt={alt}
        loading={lazy ? 'lazy' : 'eager'}
        className={className}
        {...props}
      />
    </picture>
  )
}
