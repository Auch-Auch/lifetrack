"use client"
import React, { useState, useEffect } from 'react'
import { Menu, X } from 'lucide-react'
import Sidebar from './Sidebar'
import { useActivityStore } from '@/stores/activityStore'

export default function Shell({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(true)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
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

  // Close mobile menu when clicking outside
  useEffect(() => {
    if (mobileMenuOpen) {
      const handleClick = () => setMobileMenuOpen(false)
      document.addEventListener('click', handleClick)
      return () => document.removeEventListener('click', handleClick)
    }
  }, [mobileMenuOpen])

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-background text-foreground">
      {/* Mobile overlay */}
      {mobileMenuOpen && (
        <div className="md:hidden fixed inset-0 bg-black/50 z-30" onClick={() => setMobileMenuOpen(false)} />
      )}

      {/* Desktop sidebar - always visible, collapsible */}
      <aside
        className={`hidden md:block transition-all duration-200 overflow-hidden border-r border-gray-200 dark:border-gray-800 ${
          open ? 'w-64' : 'w-20'
        }`}
      >
        <div className="h-full">
          <Sidebar collapsed={!open} onAction={() => setOpen(prev => !prev)} />
        </div>
      </aside>

      {/* Mobile sidebar - hidden by default, shows as overlay */}
      <aside
        className={`md:hidden fixed top-0 left-0 h-full w-64 z-40 bg-[hsl(var(--background))] border-r border-gray-200 dark:border-gray-800 transform transition-transform duration-200 ${
          mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="h-full">
          <Sidebar collapsed={false} onAction={() => {}} />
        </div>
      </aside>

      <div className="flex-1 flex flex-col w-full md:w-auto">
        {/* Mobile header with hamburger button */}
        <header className="md:hidden sticky top-0 z-20 bg-[hsl(var(--background))] border-b border-[hsl(var(--border))] px-3 py-2 flex items-center">
          <button
            onClick={(e) => {
              e.stopPropagation()
              setMobileMenuOpen(!mobileMenuOpen)
            }}
            className="p-1.5 rounded-md hover:bg-[hsl(var(--muted))] transition-colors"
            aria-label="Toggle menu"
          >
            {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
          <h1 className="ml-3 text-sm font-semibold">LifeTrack</h1>
        </header>

        <main className="flex-1">{children}</main>
      </div>
    </div>
  )
}
