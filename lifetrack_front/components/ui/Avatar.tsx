import React from 'react'

type AvatarProps = {
  name: string
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

function getColorFromString(str: string): string {
  // Generate consistent color based on string
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash)
  }
  
  const colors = [
    'hsl(217, 91%, 60%)',  // Primary blue
    'hsl(142, 71%, 45%)',  // Success green
    'hsl(38, 92%, 50%)',   // Warning orange
    'hsl(199, 89%, 48%)',  // Info blue
    'hsl(280, 65%, 60%)',  // Purple
    'hsl(340, 82%, 52%)',  // Pink
  ]
  
  return colors[Math.abs(hash) % colors.length]
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .map(word => word[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

export default function Avatar({ name, size = 'md', className = '' }: AvatarProps) {
  const sizeStyles = {
    sm: 'w-8 h-8 text-xs',
    md: 'w-10 h-10 text-sm',
    lg: 'w-12 h-12 text-base'
  }
  
  const bgColor = getColorFromString(name)
  
  return (
    <div
      className={`
        ${sizeStyles[size]}
        rounded-full
        flex items-center justify-center
        font-semibold text-white
        ${className}
      `}
      style={{ backgroundColor: bgColor }}
      aria-label={`Avatar for ${name}`}
    >
      {getInitials(name)}
    </div>
  )
}
