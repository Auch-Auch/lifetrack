'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Button from '@/components/ui/Button'
import { getUser, isAuthenticated, logout } from '@/lib/helpers/auth'
import { User as UserIcon, Mail, Key, Calendar, LogOut } from 'lucide-react'
import { format } from 'date-fns'

export default function ProfilePage() {
  const router = useRouter()
  const [user, setUser] = useState(getUser())

  useEffect(() => {
    if (!isAuthenticated()) {
      router.push('/login')
      return
    }

    const currentUser = getUser()
    if (currentUser) {
      setUser(currentUser)
    }
  }, [router])

  const handleLogout = async () => {
    await logout()
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[hsl(var(--primary))]"></div>
      </div>
    )
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-[hsl(var(--foreground))]">Profile</h1>
        <p className="text-[hsl(var(--muted-foreground))] mt-1">
          Manage your account information
        </p>
      </div>

      <div className="bg-[hsl(var(--card))] rounded-[var(--radius)] shadow-lg p-6">
        {/* Profile Header */}
        <div className="flex items-center gap-4 mb-8 pb-6 border-b border-[hsl(var(--border))]">
          <div className="w-20 h-20 rounded-full bg-[hsl(var(--primary))] flex items-center justify-center">
            <UserIcon size={40} className="text-[hsl(var(--primary-foreground))]" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-[hsl(var(--foreground))]">
              {user.name}
            </h2>
            <p className="text-[hsl(var(--muted-foreground))]">
              {user.email}
            </p>
          </div>
        </div>

        {/* Profile Details */}
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm text-[hsl(var(--muted-foreground))]">
                <UserIcon size={16} />
                <span>Name</span>
              </div>
              <p className="text-[hsl(var(--foreground))] font-medium">
                {user.name}
              </p>
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm text-[hsl(var(--muted-foreground))]">
                <Mail size={16} />
                <span>Email</span>
              </div>
              <p className="text-[hsl(var(--foreground))] font-medium">
                {user.email}
              </p>
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm text-[hsl(var(--muted-foreground))]">
                <Key size={16} />
                <span>User ID</span>
              </div>
              <p className="text-[hsl(var(--foreground))] font-mono text-sm">
                {user.id}
              </p>
            </div>

            {user.telegramId && (
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm text-[hsl(var(--muted-foreground))]">
                  <span>Telegram ID</span>
                </div>
                <p className="text-[hsl(var(--foreground))] font-medium">
                  {user.telegramId}
                </p>
              </div>
            )}
          </div>

          {/* Account Status */}
          <div className="pt-6 border-t border-[hsl(var(--border))]">
            <h3 className="text-lg font-semibold mb-4 text-[hsl(var(--foreground))]">
              Account Status
            </h3>
            <div className="flex flex-wrap gap-2">
              <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                user.isActive 
                  ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                  : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
              }`}>
                {user.isActive ? 'Active' : 'Inactive'}
              </span>
              {user.isService && (
                <span className="px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                  Service Account
                </span>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="pt-6 border-t border-[hsl(var(--border))] flex gap-4">
            <Button
              variant="danger"
              onClick={handleLogout}
              className="flex items-center gap-2"
            >
              <LogOut size={16} />
              Logout
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
