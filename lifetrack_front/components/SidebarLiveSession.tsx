'use client'

import { useState, useEffect, useRef } from 'react'
import { useActivityStore } from '@/stores/activityStore'
import { formatDurationWithSeconds } from '@/lib/activities'
import Button from './ui/Button'
import { Play, Pause, Square } from 'lucide-react'

type Props = {
  collapsed?: boolean
}

export default function SidebarLiveSession({ collapsed = false }: Props) {
  const activeSession = useActivityStore((state) => state.activeSession)
  const pauseSession = useActivityStore((state) => state.pauseSession)
  const resumeSession = useActivityStore((state) => state.resumeSession)
  const stopSession = useActivityStore((state) => state.stopSession)
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
      const elapsed = Math.max(0, Math.floor((now - start - pausedMs) / 1000)) // seconds, ensure non-negative
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
      <div className="flex flex-col items-center p-1.5 gap-0.5">
        <div className="relative">
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
        <span className="text-[9px] font-mono text-[hsl(var(--muted-foreground))]" title={activeSession.name}>
          {formatDurationWithSeconds(elapsedTime)}
        </span>
        <div className="flex gap-0.5">
          {isPaused ? (
            <button
              onClick={handleResume}
              className="w-4 h-4 flex items-center justify-center rounded hover:bg-[hsl(var(--muted))] transition-colors"
              title="Resume"
            >
              <Play size={8} className="fill-current" />
            </button>
          ) : (
            <button
              onClick={handlePause}
              className="w-4 h-4 flex items-center justify-center rounded hover:bg-[hsl(var(--muted))] transition-colors"
              title="Pause"
            >
              <Pause size={8} />
            </button>
          )}
          <button
            onClick={handleStop}
            className="w-4 h-4 flex items-center justify-center rounded hover:bg-red-500/20 text-red-500 transition-colors"
            title="Stop"
          >
            <Square size={8} className="fill-current" />
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="px-2 py-1.5 bg-[hsl(var(--muted))]/50 rounded-[var(--radius)] border border-[hsl(var(--border))]">
      <div className="flex items-center gap-1.5 mb-1">
        <div className="relative flex-shrink-0">
          <div className={`w-2 h-2 rounded-full ${
            isPaused ? 'bg-yellow-500' : 'bg-red-500'
          }`} />
          {isActive && (
            <>
              <div className="absolute inset-0 w-2 h-2 rounded-full bg-red-500 animate-ping opacity-75" />
              <div className="absolute inset-0 w-2 h-2 rounded-full bg-red-500 animate-pulse" />
            </>
          )}
        </div>
        <span className="text-[9px] font-semibold text-[hsl(var(--foreground))] uppercase tracking-wide">
          {isPaused ? 'PAUSED' : 'LIVE'}
        </span>
      </div>
      <div className="flex items-center justify-between gap-1.5 mb-1.5">
        <span className="text-[10px] text-[hsl(var(--foreground))] truncate flex-1">
          {activeSession.name}
        </span>
        <span className="text-[10px] font-mono text-[hsl(var(--muted-foreground))] flex-shrink-0">
          {formatDurationWithSeconds(elapsedTime)}
        </span>
      </div>
      <div className="flex gap-1">
        {isPaused ? (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleResume}
            className="h-5 px-1.5 text-[9px] flex-1"
            title="Resume session"
          >
            <Play size={10} />
            <span className="ml-0.5">Resume</span>
          </Button>
        ) : (
          <Button
            variant="ghost"
            size="sm"
            onClick={handlePause}
            className="h-5 px-1.5 text-[9px] flex-1"
            title="Pause session"
          >
            <Pause size={10} />
            <span className="ml-0.5">Pause</span>
          </Button>
        )}
        <Button
          variant="danger"
          size="sm"
          onClick={handleStop}
          className="h-5 px-1.5 text-[9px] flex-1"
          title="Stop session"
        >
          <Square size={10} className="fill-current" />
          <span className="ml-0.5">Stop</span>
        </Button>
      </div>
    </div>
  )
}
