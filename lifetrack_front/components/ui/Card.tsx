import React from 'react'

type CardProps = React.HTMLAttributes<HTMLDivElement> & {
  children: React.ReactNode
  hoverable?: boolean
}

export function Card({ children, hoverable = false, className = '', ...props }: CardProps) {
  return (
    <div
      className={`
        bg-[hsl(var(--card))] text-[hsl(var(--card-foreground))]
        border border-[hsl(var(--border))]
        rounded-[var(--radius)]
        transition-all duration-[var(--transition-base)]
        ${hoverable ? 'hover:shadow-lg hover:scale-[1.01]' : ''}
        ${className}
      `}
      {...props}
    >
      {children}
    </div>
  )
}

export function CardHeader({ children, className = '', ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={`p-6 ${className}`} {...props}>
      {children}
    </div>
  )
}

export function CardContent({ children, className = '', ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={`px-6 pb-6 ${className}`} {...props}>
      {children}
    </div>
  )
}

export function CardFooter({ children, className = '', ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={`px-6 pb-6 pt-0 ${className}`} {...props}>
      {children}
    </div>
  )
}
