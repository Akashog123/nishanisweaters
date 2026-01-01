import { describe, it, expect } from 'vitest'
import { cn } from '@/lib/utils'

describe('Utils', () => {
  describe('cn (className merge utility)', () => {
    it('should merge class names correctly', () => {
      const result = cn('px-4 py-2', 'bg-blue-500')
      expect(result).toBe('px-4 py-2 bg-blue-500')
    })

    it('should handle conditional classes', () => {
      const isActive = true
      const result = cn('base-class', isActive && 'active-class')
      expect(result).toBe('base-class active-class')
    })

    it('should ignore falsy values', () => {
      const shouldHide = false
      const result = cn('base-class', shouldHide && 'hidden-class', null, undefined, '')
      expect(result).toBe('base-class')
    })

    it('should handle Tailwind class conflicts', () => {
      // twMerge should resolve conflicts, keeping the last value
      const result = cn('px-2 px-4')
      expect(result).toBe('px-4')
    })

    it('should merge responsive classes correctly', () => {
      const result = cn('text-sm md:text-base', 'lg:text-lg')
      expect(result).toBe('text-sm md:text-base lg:text-lg')
    })

    it('should handle array inputs', () => {
      const result = cn(['px-4', 'py-2'], 'bg-blue-500')
      expect(result).toBe('px-4 py-2 bg-blue-500')
    })

    it('should handle object inputs with conditional values', () => {
      const result = cn({
        'base-class': true,
        'conditional-class': true,
        'hidden-class': false,
      })
      expect(result).toContain('base-class')
      expect(result).toContain('conditional-class')
      expect(result).not.toContain('hidden-class')
    })

    it('should handle complex class combinations', () => {
      const variant: string = 'primary'
      const size: string = 'lg'
      const isDisabled = false

      const result = cn(
        'button',
        variant === 'primary' && 'bg-blue-500 text-white',
        variant === 'secondary' && 'bg-gray-500 text-white',
        size === 'sm' && 'px-2 py-1 text-sm',
        size === 'lg' && 'px-6 py-3 text-lg',
        isDisabled && 'opacity-50 cursor-not-allowed'
      )

      expect(result).toContain('button')
      expect(result).toContain('bg-blue-500')
      expect(result).toContain('text-white')
      expect(result).toContain('px-6')
      expect(result).toContain('py-3')
      expect(result).toContain('text-lg')
      expect(result).not.toContain('opacity-50')
    })

    it('should override conflicting Tailwind utilities', () => {
      const result = cn('text-center text-left')
      expect(result).toBe('text-left')
    })

    it('should handle empty inputs', () => {
      const result = cn()
      expect(result).toBe('')
    })

    it('should handle multiple object and string combinations', () => {
      const result = cn(
        'base-class',
        { 'conditional-1': true, 'conditional-2': false },
        'additional-class',
        { 'conditional-3': true }
      )

      expect(result).toContain('base-class')
      expect(result).toContain('conditional-1')
      expect(result).toContain('additional-class')
      expect(result).toContain('conditional-3')
      expect(result).not.toContain('conditional-2')
    })

    it('should handle spacing utilities correctly', () => {
      const result = cn('m-2 mx-4')
      // mx-4 should override the horizontal margin from m-2
      expect(result).toContain('mx-4')
    })

    it('should handle color variations', () => {
      const result = cn('text-blue-500 hover:text-blue-700')
      expect(result).toBe('text-blue-500 hover:text-blue-700')
    })

    it('should handle pseudo-class variants', () => {
      const result = cn(
        'bg-white',
        'hover:bg-gray-100',
        'focus:ring-2',
        'active:bg-gray-200'
      )

      expect(result).toContain('bg-white')
      expect(result).toContain('hover:bg-gray-100')
      expect(result).toContain('focus:ring-2')
      expect(result).toContain('active:bg-gray-200')
    })

    it('should handle dark mode classes', () => {
      const result = cn('bg-white text-black', 'dark:bg-black dark:text-white')
      expect(result).toContain('bg-white')
      expect(result).toContain('text-black')
      expect(result).toContain('dark:bg-black')
      expect(result).toContain('dark:text-white')
    })

    it('should properly merge border utilities', () => {
      const result = cn('border border-gray-300', 'border-blue-500')
      expect(result).toContain('border')
      expect(result).toBe('border border-blue-500')
    })
  })
})
