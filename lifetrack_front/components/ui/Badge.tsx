import React from 'react'

type BadgeVariant = 'default' | 'success' | 'warning' | 'info' | 'danger'

type BadgeProps = React.HTMLAttributes<HTMLSpanElement> & {
  variant?: BadgeVariant
  children: React.ReactNode
}

export default function Badge({ variant = 'default', children, className = '', ...props }: BadgeProps) {
  const variantStyles = {
    default: 'bg-[hsl(var(--muted))] text-[hsl(var(--foreground))]',
    success: 'bg-[hsl(var(--success-light))] text-[hsl(var(--success))]',
    warning: 'bg-[hsl(var(--warning)_/_0.2)] text-[hsl(var(--warning))]',
    info: 'bg-[hsl(var(--info)_/_0.2)] text-[hsl(var(--info))]',
    danger: 'bg-[hsl(var(--danger)_/_0.2)] text-[hsl(var(--danger))]'
  }
  
  return (
    <span
      className={`
        inline-flex items-center px-2.5 py-0.5 
        rounded-[var(--radius-full)]
        text-xs font-medium
        ${variantStyles[variant]}
        ${className}
      `}
      {...props}
    >
      {children}
    </span>
  )
}
