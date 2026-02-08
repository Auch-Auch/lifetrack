"use client"
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, Grid3x3, Activity, Calendar, ChevronLeft, ChevronRight } from 'lucide-react'
import Button from './ui/Button'

type Props = {
  collapsed?: boolean
  onAction?: () => void
}

type NavItem = {
  href: string
  label: string
  icon: React.ComponentType<{ size?: number }>
}

const navItems: NavItem[] = [
  { href: '/', label: 'Home', icon: Home },
  { href: '/skill-map', label: 'Skills', icon: Grid3x3 },
  { href: '/activities', label: 'Activities', icon: Activity },
  { href: '/calendar', label: 'Calendar', icon: Calendar },
]

export default function Sidebar({ collapsed = false, onAction }: Props) {
  const pathname = usePathname() || '/'

  const isActive = (path: string) => {
    if (path === '/') return pathname === '/'
    return pathname.startsWith(path)
  }

  return (
    <nav className="h-full p-2 relative">
      <div className={`mb-3 ${collapsed ? 'flex justify-center' : 'flex justify-end'}`}>
        <Button
          variant="ghost"
          size="sm"
          onClick={onAction}
          aria-label="Toggle sidebar"
          className="w-auto"
        >
          {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
        </Button>
      </div>
      <ul className="space-y-2">
        {navItems.map(({ href, label, icon: Icon }) => (
          <li key={href}>
            <Link
              href={href}
              className={`
                flex items-center rounded-[var(--radius)]
                transition-all duration-[var(--transition-fast)]
                ${collapsed ? 'justify-center h-12 w-12' : 'px-3 py-2'}
                ${isActive(href) 
                  ? 'bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))] font-semibold' 
                  : 'hover:bg-[hsl(var(--muted))] text-[hsl(var(--foreground))]'
                }
              `}
            >
              <Icon size={18} />
              <span className={collapsed ? 'sr-only' : 'ml-3'}>{label}</span>
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  )
}


