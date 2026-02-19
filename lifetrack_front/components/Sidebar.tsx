"use client"
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, Grid3x3, Activity, Calendar, Bell, ChevronLeft, ChevronRight, BarChart3, FileText, Network, FolderOpen } from 'lucide-react'
import Button from './ui/Button'
import UserProfile from './UserProfile'
import SidebarLiveSession from './SidebarLiveSession'

type Props = {
  collapsed?: boolean
  onAction?: () => void
}

type NavItem = {
  href: string
  label: string
  icon: React.ComponentType<{ size?: number; className?: string }>
}

const navItems: NavItem[] = [
  { href: '/', label: 'Home', icon: Home },
  { href: '/skill-map', label: 'Skills', icon: Grid3x3 },
  { href: '/activities', label: 'Activities', icon: Activity },
  { href: '/learning-plans', label: 'Learning Plans', icon: Network },
  { href: '/notes', label: 'Notes', icon: FileText },
  { href: '/files', label: 'Files', icon: FolderOpen },
  { href: '/statistics', label: 'Statistics', icon: BarChart3 },
  { href: '/calendar', label: 'Calendar', icon: Calendar },
  { href: '/reminders', label: 'Reminders', icon: Bell },
]

export default function Sidebar({ collapsed = false, onAction }: Props) {
  const pathname = usePathname() || '/'

  const isActive = (path: string) => {
    if (path === '/') return pathname === '/'
    return pathname.startsWith(path)
  }

  return (
    <nav className="h-full p-2 md:p-2 relative flex flex-col">
      {/* Top section with profile and live session */}
      <div className="mb-3 pb-3 border-b border-[hsl(var(--border))]">
        <div className={`flex items-center ${collapsed ? 'flex-col gap-2' : 'justify-between gap-2 mb-2'}`}>
          {!collapsed && (
            <div className="flex-1 min-w-0">
              <UserProfile collapsed={false} />
            </div>
          )}
          {/* Hide toggle button on mobile since we have hamburger menu */}
          <Button
            variant="ghost"
            size="sm"
            onClick={onAction}
            aria-label="Toggle sidebar"
            className="hidden md:flex w-auto flex-shrink-0"
          >
            {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
          </Button>
        </div>
        {collapsed && <UserProfile collapsed={true} />}
        <SidebarLiveSession collapsed={collapsed} />
      </div>

      {/* Navigation items */}
      <ul className="space-y-1 md:space-y-2 flex-1">
        {navItems.map(({ href, label, icon: Icon }) => (
          <li key={href}>
            <Link
              href={href}
              className={`
                flex items-center rounded-[var(--radius)]
                transition-all duration-[var(--transition-fast)]
                ${collapsed ? 'justify-center h-12 w-12' : 'px-4 py-3 md:px-3 md:py-2'}
                ${isActive(href) 
                  ? 'bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))] font-semibold' 
                  : 'hover:bg-[hsl(var(--muted))] text-[hsl(var(--foreground))]'
                }
              `}
            >
              <Icon size={20} className="md:w-[18px] md:h-[18px]" />
              <span className={collapsed ? 'sr-only' : 'ml-3 text-base md:text-sm'}>{label}</span>
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  )
}


