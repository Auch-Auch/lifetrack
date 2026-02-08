import React from 'react'

type SkeletonProps = {
  className?: string
  variant?: 'text' | 'circular' | 'rectangular'
}

export default function Skeleton({ className = '', variant = 'rectangular' }: SkeletonProps) {
  const variantStyles = {
    text: 'h-4 rounded',
    circular: 'rounded-full',
    rectangular: 'rounded-[var(--radius)]'
  }
  
  return (
    <div
      className={`
        animate-pulse bg-[hsl(var(--muted))]
        ${variantStyles[variant]}
        ${className}
      `}
      aria-label="Loading..."
    />
  )
}
