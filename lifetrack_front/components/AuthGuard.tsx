'use client'

import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { isAuthenticated } from '@/lib/helpers/auth'
import Shell from './Shell'

type AuthGuardProps = {
  children: React.ReactNode
}

const PUBLIC_ROUTES = ['/login']

export default function AuthGuard({ children }: AuthGuardProps) {
  const router = useRouter()
  const pathname = usePathname()
  const [isChecking, setIsChecking] = useState(true)

  useEffect(() => {
    const checkAuth = () => {
      const isPublicRoute = PUBLIC_ROUTES.includes(pathname)
      const authenticated = isAuthenticated()

      if (!authenticated && !isPublicRoute) {
        router.push('/login')
      } else if (authenticated && pathname === '/login') {
        router.push('/')
      }
      
      setIsChecking(false)
    }

    checkAuth()
  }, [pathname, router])

  // Show loading state while checking auth
  if (isChecking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[hsl(var(--background))]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[hsl(var(--primary))]"></div>
      </div>
    )
  }

  // Public routes (like login) don't need Shell
  const isPublicRoute = PUBLIC_ROUTES.includes(pathname)
  
  if (isPublicRoute) {
    return <>{children}</>
  }

  // Protected routes get wrapped in Shell
  return <Shell>{children}</Shell>
}
