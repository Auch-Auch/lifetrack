"use client"
import React, { useState } from 'react'
import Sidebar from './Sidebar'

export default function Shell({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(true)

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground">

      <div className="flex flex-1">
        <aside
          className={`hidden md:block transition-all duration-200 overflow-hidden border-r border-gray-200 dark:border-gray-800 ${
            open ? 'w-64' : 'w-20'
          }`}
        >
          <div className="h-full">
            <Sidebar collapsed={!open} onAction={() => setOpen(prev => !prev)} />
          </div>
        </aside>

        <main className="flex-1">{children}</main>
      </div>
    </div>
  )
}
