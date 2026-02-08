'use client'
import React from 'react'
import { motion } from 'framer-motion'

type EmptyStateProps = {
  icon?: React.ReactNode
  title: string
  description?: string
  action?: React.ReactNode
}

export default function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="flex flex-col items-center justify-center py-12 px-4 text-center"
    >
      {icon && (
        <div className="text-[hsl(var(--muted-foreground))] mb-4">
          {icon}
        </div>
      )}
      <h3 className="text-xl font-semibold text-[hsl(var(--foreground))] mb-2">
        {title}
      </h3>
      {description && (
        <p className="text-[hsl(var(--muted-foreground))] mb-6 max-w-md">
          {description}
        </p>
      )}
      {action && (
        <div>
          {action}
        </div>
      )}
    </motion.div>
  )
}
