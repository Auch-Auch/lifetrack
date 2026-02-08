import React from 'react'

type PageHeaderProps = {
  title: string
  description?: string
  action?: React.ReactNode
}

export default function PageHeader({ title, description, action }: PageHeaderProps) {
  return (
    <div className="flex items-start justify-between mb-8">
      <div>
        <h1 className="text-3xl font-bold text-[hsl(var(--foreground))] mb-2">
          {title}
        </h1>
        {description && (
          <p className="text-lg text-[hsl(var(--muted-foreground))]">
            {description}
          </p>
        )}
      </div>
      {action && (
        <div className="flex items-center gap-2">
          {action}
        </div>
      )}
    </div>
  )
}
