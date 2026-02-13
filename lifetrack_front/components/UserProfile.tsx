'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { getUser, isAuthenticated, logout } from '@/lib/helpers/auth'
import { User as UserIcon, LogOut, Settings } from 'lucide-react'
import Button from './ui/Button'

type UserProfileProps = {
  collapsed?: boolean
}

export default function UserProfile({ collapsed = false }: UserProfileProps) {
  const router = useRouter()
  const [user, setUser] = useState(getUser())
  const [showMenu, setShowMenu] = useState(false)

  useEffect(() => {
    const currentUser = getUser()
    setUser(currentUser)
  }, [])

  const handleLogout = async () => {
    await logout()
  }

  if (!isAuthenticated() || !user) {
    if (collapsed) {
      return (
        <div className="p-2 flex justify-center">
          <Link href="/login">
            <Button variant="primary" size="sm" className="w-auto px-2" title="Login">
              <UserIcon size={16} />
            </Button>
          </Link>
        </div>
      )
    }
    
    return (
      <Link href="/login">
        <Button variant="primary" size="sm" className="w-full">
          Login
        </Button>
      </Link>
    )
  }

  if (collapsed) {
    return (
      <div className="p-2 flex justify-center">
        <Link
          href="/profile"
          className="w-10 h-10 rounded-full bg-[hsl(var(--primary))] flex items-center justify-center hover:opacity-80 transition-opacity"
          title={user.name}
        >
          <UserIcon size={18} className="text-[hsl(var(--primary-foreground))]" />
        </Link>
      </div>
    )
  }

  return (
    <div className="relative">
      <button
        onClick={() => setShowMenu(!showMenu)}
        className="w-full flex items-center gap-2 p-2 rounded-[var(--radius)] hover:bg-[hsl(var(--muted))] transition-colors"
      >
        <div className="w-8 h-8 rounded-full bg-[hsl(var(--primary))] flex items-center justify-center flex-shrink-0">
          <UserIcon size={16} className="text-[hsl(var(--primary-foreground))]" />
        </div>
        <div className="flex-1 text-left overflow-hidden">
          <p className="text-xs font-medium text-[hsl(var(--foreground))] truncate">
            {user.name}
          </p>
        </div>
      </button>

      {showMenu && (
        <>
          <div
            className="fixed inset-0 z-10"
            onClick={() => setShowMenu(false)}
          />
          <div className="absolute top-full left-0 right-0 mt-2 bg-[hsl(var(--card))] rounded-[var(--radius)] shadow-lg border border-[hsl(var(--border))] overflow-hidden z-20">
            <Link
              href="/profile"
              onClick={() => setShowMenu(false)}
              className="flex items-center gap-3 px-4 py-3 hover:bg-[hsl(var(--muted))] transition-colors"
            >
              <Settings size={16} />
              <span className="text-sm">Profile Settings</span>
            </Link>
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-3 px-4 py-3 hover:bg-[hsl(var(--danger))] hover:text-[hsl(var(--danger-foreground))] transition-colors text-left"
            >
              <LogOut size={16} />
              <span className="text-sm">Logout</span>
            </button>
          </div>
        </>
      )}
    </div>
  )
}
