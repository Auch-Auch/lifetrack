'use client'
import React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, CheckCircle2, AlertCircle, Info, AlertTriangle } from 'lucide-react'
import { useToastStore } from '@/stores/toastStore'
import Button from './Button'

export default function ToastContainer() {
  const toasts = useToastStore(state => state.toasts)
  const removeToast = useToastStore(state => state.removeToast)
  
  const iconMap = {
    success: <CheckCircle2 size={20} />,
    error: <AlertCircle size={20} />,
    info: <Info size={20} />,
    warning: <AlertTriangle size={20} />,
  }
  
  const colorMap = {
    success: 'bg-[hsl(var(--success))] text-[hsl(var(--success-foreground))]',
    error: 'bg-[hsl(var(--danger))] text-[hsl(var(--danger-foreground))]',
    info: 'bg-[hsl(var(--info))] text-[hsl(var(--info-foreground))]',
    warning: 'bg-[hsl(var(--warning))] text-[hsl(var(--warning-foreground))]',
  }
  
  return (
    <div className="fixed top-4 right-4 z-50 flex flex-col gap-2 pointer-events-none">
      <AnimatePresence>
        {toasts.map(toast => (
          <motion.div
            key={toast.id}
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, x: 100, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className={`
              ${colorMap[toast.type]}
              rounded-[var(--radius)]
              shadow-lg
              p-4
              flex items-center gap-3
              min-w-[300px]
              max-w-[400px]
              pointer-events-auto
            `}
          >
            <div className="flex-shrink-0">
              {iconMap[toast.type]}
            </div>
            <div className="flex-1 text-sm font-medium">
              {toast.message}
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => removeToast(toast.id)}
              className="flex-shrink-0 hover:bg-white/20 text-current"
              aria-label="Close notification"
            >
              <X size={16} />
            </Button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  )
}