'use client'

import { useState, useEffect, useRef } from 'react'
import { useActivityStore } from '@/stores/activityStore'
import { formatDuration } from '@/lib/activities'

type Props = {
  collapsed?: boolean
}

export default function SidebarLiveSession({ collapsed = false }: Props) {
  const activeSession = useActivityStore((state) => state.activeSession)
  const [elapsedTime, setElapsedTime] = useState(0)
  const timerRef = useRef<NodeJS.Timeout | null>(null)

  // Calculate elapsed time
  useEffect(() => {
    if (!activeSession || activeSession.status !== 'ACTIVE') {
      if (timerRef.current) {
        clearInterval(timerRef.current)
        timerRef.current = null
      }
      return
    }

    const updateElapsed = () => {
      if (!activeSession.startedAt) return
      
      const now = Date.now()
      const start = new Date(activeSession.startedAt).getTime()
      const pausedMs = activeSession.pausedDuration || 0
      const elapsed = Math.floor((now - start - pausedMs) / 1000) // seconds
      setElapsedTime(elapsed)
    }

    updateElapsed()
    timerRef.current = setInterval(updateElapsed, 1000)

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current)
        timerRef.current = null
      }
    }
  }, [activeSession])

  const isPaused = activeSession?.status === 'PAUSED'
  const isActive = activeSession?.status === 'ACTIVE'

  if (!activeSession) {
    // Show "off" indicator when no session
    if (collapsed) {
      return (
        <div className="flex justify-center p-2">
          <div className="w-3 h-3 rounded-full bg-gray-400 dark:bg-gray-600" title="No active session" />
        </div>
      )
    }
    
    return (
      <div className="px-3 py-2 flex items-center gap-2">
        <div className="w-2.5 h-2.5 rounded-full bg-gray-400 dark:bg-gray-600" />
        <span className="text-xs text-[hsl(var(--muted-foreground))]">No session</span>
      </div>
    )
  }

  if (collapsed) {
    return (
      <div className="flex flex-col items-center p-2 gap-1">
        <div className="relative">
          <div className={`w-3 h-3 rounded-full ${
            isPaused ? 'bg-yellow-500' : 'bg-red-500'
          }`} />
          {isActive && (
            <>
              <div className="absolute inset-0 w-3 h-3 rounded-full bg-red-500 animate-ping opacity-75" />
              <div className="absolute inset-0 w-3 h-3 rounded-full bg-red-500 animate-pulse" />
            </>
          )}
        </div>
        <span className="text-[10px] font-mono text-[hsl(var(--muted-foreground))]" title={activeSession.name}>
          {formatDuration(Math.floor(elapsedTime / 60))}
        </span>
      </div>
    )
  }

  return (
    <div className="px-3 py-2 bg-[hsl(var(--muted))]/50 rounded-[var(--radius)] border border-[hsl(var(--border))]">
      <div className="flex items-center gap-2 mb-1">
        <div className="relative flex-shrink-0">
          <div className={`w-2.5 h-2.5 rounded-full ${
            isPaused ? 'bg-yellow-500' : 'bg-red-500'
          }`} />
          {isActive && (
            <>
              <div className="absolute inset-0 w-2.5 h-2.5 rounded-full bg-red-500 animate-ping opacity-75" />
              <div className="absolute inset-0 w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse" />
            </>
          )}
        </div>
        <span className="text-[10px] font-semibold text-[hsl(var(--foreground))] uppercase tracking-wide">
          {isPaused ? 'PAUSED' : 'LIVE'}
        </span>
      </div>
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs text-[hsl(var(--foreground))] truncate flex-1">
          {activeSession.name}
        </span>
        <span className="text-xs font-mono text-[hsl(var(--muted-foreground))] flex-shrink-0">
          {formatDuration(Math.floor(elapsedTime / 60))}
        </span>
      </div>
    </div>
  )
}
