/**
 * Accessibility Utilities
 * Hooks and helpers for WCAG compliance and keyboard navigation
 */

import { useEffect, useRef, useCallback } from 'react'

/**
 * useFocusTrap
 * Traps keyboard focus within a container (useful for modals, dropdowns)
 */
export const useFocusTrap = (isActive: boolean = true) => {
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!isActive || !containerRef.current) return

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return

      const focusableElements = containerRef.current?.querySelectorAll(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      )
      if (!focusableElements || focusableElements.length === 0) return

      const firstElement = focusableElements[0] as HTMLElement
      const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement
      const activeElement = document.activeElement

      if (e.shiftKey) {
        // Shift + Tab
        if (activeElement === firstElement) {
          e.preventDefault()
          lastElement.focus()
        }
      } else {
        // Tab
        if (activeElement === lastElement) {
          e.preventDefault()
          firstElement.focus()
        }
      }
    }

    containerRef.current.addEventListener('keydown', handleKeyDown)
    return () => containerRef.current?.removeEventListener('keydown', handleKeyDown)
  }, [isActive])

  return containerRef
}

/**
 * useAriaLive
 * Announces dynamic content changes to screen readers
 */
export const useAriaLive = () => {
  const announcerRef = useRef<HTMLDivElement>(null)

  const announce = useCallback((message: string, priority: 'polite' | 'assertive' = 'polite') => {
    if (!announcerRef.current) return

    // Clear previous message
    announcerRef.current.textContent = ''

    // Set ARIA live region priority
    announcerRef.current.setAttribute('aria-live', priority)
    announcerRef.current.setAttribute('aria-atomic', 'true')

    // Announce message with slight delay to ensure screen reader picks it up
    setTimeout(() => {
      if (announcerRef.current) {
        announcerRef.current.textContent = message
      }
    }, 100)
  }, [])

  return { announcerRef, announce }
}

/**
 * useKeyboardNavigation
 * Generic keyboard navigation handler
 */
export const useKeyboardNavigation = (
  items: HTMLElement[],
  onSelect?: (index: number) => void
) => {
  const currentIndexRef = useRef(0)

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    switch (e.key) {
      case 'ArrowDown':
      case 'ArrowRight':
        e.preventDefault()
        currentIndexRef.current = (currentIndexRef.current + 1) % items.length
        items[currentIndexRef.current]?.focus()
        onSelect?.(currentIndexRef.current)
        break

      case 'ArrowUp':
      case 'ArrowLeft':
        e.preventDefault()
        currentIndexRef.current = (currentIndexRef.current - 1 + items.length) % items.length
        items[currentIndexRef.current]?.focus()
        onSelect?.(currentIndexRef.current)
        break

      case 'Home':
        e.preventDefault()
        currentIndexRef.current = 0
        items[0]?.focus()
        onSelect?.(0)
        break

      case 'End':
        e.preventDefault()
        currentIndexRef.current = items.length - 1
        items[currentIndexRef.current]?.focus()
        onSelect?.(currentIndexRef.current)
        break

      default:
        break
    }
  }, [items, onSelect])

  return { handleKeyDown }
}

/**
 * useSkipTo
 * Skip link functionality - skip to main content
 */
export const useSkipTo = () => {
  const mainRef = useRef<HTMLElement>(null)

  const handleSkip = useCallback(() => {
    mainRef.current?.focus()
  }, [])

  return { mainRef, handleSkip }
}
