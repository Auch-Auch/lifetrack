'use client'
import React from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import Button from './Button'

type PaginationProps = {
  currentPage: number
  totalPages: number
  onPageChange: (page: number) => void
  maxVisible?: number
}

export default function Pagination({ 
  currentPage, 
  totalPages, 
  onPageChange,
  maxVisible = 5 
}: PaginationProps) {
  const getPageNumbers = () => {
    const pages: (number | string)[] = []
    
    if (totalPages <= maxVisible) {
      return Array.from({ length: totalPages }, (_, i) => i + 1)
    }
    
    // Always show first page
    pages.push(1)
    
    // Calculate range around current page
    let start = Math.max(2, currentPage - 1)
    let end = Math.min(totalPages - 1, currentPage + 1)
    
    // Adjust if at start
    if (currentPage <= 3) {
      end = Math.min(maxVisible - 1, totalPages - 1)
    }
    
    // Adjust if at end
    if (currentPage >= totalPages - 2) {
      start = Math.max(2, totalPages - (maxVisible - 2))
    }
    
    // Add ellipsis after first page if needed
    if (start > 2) {
      pages.push('...')
    }
    
    // Add middle pages
    for (let i = start; i <= end; i++) {
      pages.push(i)
    }
    
    // Add ellipsis before last page if needed
    if (end < totalPages - 1) {
      pages.push('...')
    }
    
    // Always show last page (if more than 1 page)
    if (totalPages > 1) {
      pages.push(totalPages)
    }
    
    return pages
  }
  
  const pages = getPageNumbers()
  
  return (
    <div className="flex items-center justify-between">
      <div className="text-sm text-[hsl(var(--muted-foreground))]">
        Page {currentPage} of {totalPages}
      </div>
      
      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          aria-label="Previous page"
        >
          <ChevronLeft size={16} />
          Prev
        </Button>
        
        {pages.map((page, index) => {
          if (page === '...') {
            return (
              <span 
                key={`ellipsis-${index}`}
                className="px-2 text-[hsl(var(--muted-foreground))]"
              >
                ...
              </span>
            )
          }
          
          return (
            <Button
              key={page}
              variant={page === currentPage ? 'primary' : 'ghost'}
              size="sm"
              onClick={() => onPageChange(page as number)}
              aria-label={`Page ${page}`}
              aria-current={page === currentPage ? 'page' : undefined}
            >
              {page}
            </Button>
          )
        })}
        
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          aria-label="Next page"
        >
          Next
          <ChevronRight size={16} />
        </Button>
      </div>
    </div>
  )
}
