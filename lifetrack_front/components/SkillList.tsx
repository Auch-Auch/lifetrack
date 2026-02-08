"use client"
import React, { useMemo, useState } from 'react'
import type { Skill } from '../lib/skills'
import Link from 'next/link'
import { Card } from './ui/Card'
import Avatar from './ui/Avatar'
import Badge from './ui/Badge'
import Pagination from './ui/Pagination'
import EmptyState from './ui/EmptyState'
import { BookOpen } from 'lucide-react'

type Props = {
  items: Skill[]
  pageSize?: number
  linkToSkill?: boolean
}

export default function SkillList({ items, pageSize = 6, linkToSkill = true }: Props) {
  const [page, setPage] = useState(1)

  const totalPages = Math.max(1, Math.ceil(items.length / pageSize))

  const pageItems = useMemo(() => {
    const start = (page - 1) * pageSize
    return items.slice(start, start + pageSize)
  }, [items, page, pageSize])

  if (items.length === 0) {
    return (
      <EmptyState
        icon={<BookOpen size={48} />}
        title="No skills yet"
        description="Start your learning journey by adding your first skill."
      />
    )
  }

  return (
    <section className="p-4">
      <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
        {pageItems.map(skill => {
          const cardContent = (
            <Card hoverable className="p-4 h-full">
              <div className="flex items-center gap-3 mb-3">
                <Avatar name={skill.name} size="md" />
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-[hsl(var(--foreground))] truncate">
                    {skill.name}
                  </div>
                  {skill.level && (
                    <Badge variant="default" className="mt-1">
                      {skill.level}
                    </Badge>
                  )}
                </div>
              </div>
              {skill.notes && (
                <p className="text-sm text-[hsl(var(--muted-foreground))] line-clamp-2">
                  {skill.notes}
                </p>
              )}
            </Card>
          )

          return (
            <div key={skill.id}>
              {linkToSkill ? (
                <Link href={`/skill-map/${skill.id}`} className="block">
                  {cardContent}
                </Link>
              ) : (
                cardContent
              )}
            </div>
          )
        })}
      </div>

      {totalPages > 1 && (
        <div className="mt-6">
          <Pagination
            currentPage={page}
            totalPages={totalPages}
            onPageChange={setPage}
          />
        </div>
      )}
    </section>
  )
}
