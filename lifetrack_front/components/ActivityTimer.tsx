'use client'
import React, { useState, useEffect, useRef } from 'react'
import { Play, Pause, Square } from 'lucide-react'
import { motion } from 'framer-motion'
import Button from './ui/Button'
import Input from './ui/Input'
import { useActivityStore } from '@/stores/activityStore'
import { useToast } from '@/stores/toastStore'
import { calculateDuration, formatDuration } from '@/lib/activities'

type Props = {
  skillId: string
  skillName: string
}

export default function ActivityTimer({ skillId }: Props) {
  const { activeSession, startSession, pauseSession, resumeSession, stopSession } = useActivityStore()
  const toast = useToast()
  const [activityName, setActivityName] = useState('Practice')
  const [notes, setNotes] = useState('')
  const [elapsedTime, setElapsedTime] = useState(0)
  const timerRef = useRef<NodeJS.Timeout | null>(null)
  
  const isActiveForThisSkill = activeSession?.skillId === skillId
  const isActive = activeSession?.status === 'ACTIVE'
  
  // Update elapsed time every second for active session
  useEffect(() => {
    if (activeSession?.status === 'ACTIVE' && activeSession.startedAt) {
      // Update immediately
      const updateTime = () => {
        const duration = calculateDuration(
          activeSession.startedAt!,
          activeSession.pausedDuration || 0
        )
        setElapsedTime(duration)
      }
      
      updateTime()
      timerRef.current = setInterval(updateTime, 1000)
      
      return () => {
        if (timerRef.current) {
          clearInterval(timerRef.current)
          timerRef.current = null
        }
      }
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current)
        timerRef.current = null
      }
    }
  }, [activeSession])
  
  const handleStart = () => {
    if (!activityName.trim()) {
      toast.error('Please enter an activity name')
      return
    }
    
    try {
      startSession(skillId, activityName.trim())
      toast.success('Session started!')
      setNotes('')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to start session')
    }
  }
  
  const handlePause = () => {
    pauseSession()
    toast.info('Session paused')
  }
  
  const handleResume = () => {
    resumeSession()
    toast.success('Session resumed')
  }
  
  const handleStop = () => {
    stopSession(notes.trim() || undefined)
    toast.success(`Session completed! Duration: ${formatDuration(elapsedTime)}`)
    setActivityName('')
    setNotes('')
    setElapsedTime(0)
  }
  
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Practice Session</h3>
        {isActiveForThisSkill && (
          <motion.div
            initial={{ scale: 0.9 }}
            animate={{ scale: 1 }}
            className="flex items-center gap-2"
          >
            <div className={`w-2 h-2 rounded-full ${isActive ? 'bg-[hsl(var(--danger))] animate-pulse' : 'bg-[hsl(var(--warning))]'}`} />
            <span className="text-sm font-medium">
              {isActive ? 'Recording' : 'Paused'}
            </span>
          </motion.div>
        )}
      </div>
      
      {!activeSession || !isActiveForThisSkill ? (
        <div className="space-y-3">
          <Input
            label="Activity Name"
            value={activityName}
            onChange={(e) => setActivityName(e.target.value)}
            placeholder="e.g., Practice React hooks"
            onKeyPress={(e) => e.key === 'Enter' && handleStart()}
          />
          <Button
            onClick={handleStart}
            size="sm"
            disabled={!activityName.trim()}
          >
            <Play size={16} />
            Start Session
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="text-center py-6 bg-[hsl(var(--muted)_/_0.5)] rounded-[var(--radius)]">
            <div className="text-4xl font-bold text-[hsl(var(--primary))] mb-2">
              {formatDuration(elapsedTime)}
            </div>
            <div className="text-sm text-[hsl(var(--muted-foreground))]">
              {activeSession.name}
            </div>
          </div>
          
          <Input
            label="Session Notes (optional)"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="What did you work on?"
            as="textarea"
            rows={2}
          />
          
          <div className="flex gap-2">
            {isActive ? (
              <Button onClick={handlePause} variant="secondary" className="flex-1">
                <Pause size={16} />
                Pause
              </Button>
            ) : (
              <Button onClick={handleResume} variant="primary" className="flex-1">
                <Play size={16} />
                Resume
              </Button>
            )}
            <Button onClick={handleStop} variant="danger" className="flex-1">
              <Square size={16} />
              Stop
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}