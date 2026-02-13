'use client'
import React, { useState, useEffect, useRef } from 'react'
import { useActivityStore } from '@/stores/activityStore'
import { formatDuration } from '@/lib/activities'
import Button from './ui/Button'
import { Pause, Square, Play } from 'lucide-react'

export default function LiveIndicator() {
  const { activeSession, pauseSession, resumeSession, stopSession } = useActivityStore()
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

  if (!activeSession) {
    return null
  }

  const isPaused = activeSession.status === 'PAUSED'

  const handlePause = async () => {
    try {
      await pauseSession()
    } catch (error) {
      console.error('Failed to pause session:', error)
    }
  }

  const handleResume = async () => {
    try {
      await resumeSession()
    } catch (error) {
      console.error('Failed to resume session:', error)
    }
  }

  const handleStop = async () => {
    try {
      await stopSession()
    } catch (error) {
      console.error('Failed to stop session:', error)
    }
  }

  return (
    <div className="flex items-center gap-2 sm:gap-3 px-3 sm:px-4 py-2 bg-[hsl(var(--card))] border-b border-[hsl(var(--border))] shadow-sm">
      {/* Live indicator with pulsing animation */}
      <div className="flex items-center gap-1.5 sm:gap-2">
        <div className="relative flex-shrink-0">
          <div className={`w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full ${isPaused ? 'bg-yellow-500' : 'bg-red-500'}`} />
          {!isPaused && (
            <>
              <div className="absolute inset-0 w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-red-500 animate-ping opacity-75" />
              <div className="absolute inset-0 w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-red-500 animate-pulse" />
            </>
          )}
        </div>
        <span className="text-xs sm:text-sm font-semibold text-[hsl(var(--foreground))] uppercase tracking-wide">
          {isPaused ? 'PAUSED' : 'LIVE'}
        </span>
      </div>

      {/* Session info */}
      <div className="flex-1 flex items-center gap-2 sm:gap-3 min-w-0">
        <span className="text-xs sm:text-sm font-medium text-[hsl(var(--foreground))] truncate">
          {activeSession.name}
        </span>
        <span className="text-xs sm:text-sm font-mono text-[hsl(var(--muted-foreground))] flex-shrink-0">
          {formatDuration(Math.floor(elapsedTime / 60))}
        </span>
      </div>

      {/* Controls */}
      <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
        {isPaused ? (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleResume}
            className="h-7 sm:h-8 px-2 sm:px-3 text-xs sm:text-sm"
            title="Resume session"
          >
            <Play size={14} className="sm:w-4 sm:h-4" />
            <span className="hidden sm:inline ml-1">Resume</span>
          </Button>
        ) : (
          <Button
            variant="ghost"
            size="sm"
            onClick={handlePause}
            className="h-7 sm:h-8 px-2 sm:px-3 text-xs sm:text-sm"
            title="Pause session"
          >
            <Pause size={14} className="sm:w-4 sm:h-4" />
            <span className="hidden sm:inline ml-1">Pause</span>
          </Button>
        )}
        <Button
          variant="danger"
          size="sm"
          onClick={handleStop}
          className="h-7 sm:h-8 px-2 sm:px-3 text-xs sm:text-sm"
          title="Stop and complete session"
        >
          <Square size={14} className="sm:w-4 sm:h-4" />
          <span className="hidden sm:inline ml-1">Stop</span>
        </Button>
      </div>
    </div>
  )
}
