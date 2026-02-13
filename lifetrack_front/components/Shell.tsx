"use client"
import React, { useState, useEffect } from 'react'
import Sidebar from './Sidebar'
import { useActivityStore } from '@/stores/activityStore'

export default function Shell({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(true)
  const fetchActiveSession = useActivityStore((state) => state.fetchActiveSession)

  // Fetch active session on mount and periodically
  useEffect(() => {
    fetchActiveSession()
    
    // Poll for active session every 10 seconds (more responsive)
    const interval = setInterval(() => {
      fetchActiveSession()
    }, 10000)

    return () => clearInterval(interval)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div className="min-h-screen flex bg-background text-foreground">
      <aside
        className={`transition-all duration-200 overflow-hidden border-r border-gray-200 dark:border-gray-800 ${
          open ? 'w-64' : 'w-20'
        }`}
      >
        <div className="h-full">
          <Sidebar collapsed={!open} onAction={() => setOpen(prev => !prev)} />
        </div>
      </aside>

      <main className="flex-1">{children}</main>
    </div>
  )
}
