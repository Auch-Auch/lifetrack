'use client'
import { useState, useEffect } from 'react'
import { getSkillById } from '../../../lib/skills'
import type { Skill } from '../../../lib/skills'
import ActivityTimer from '../../../components/ActivityTimer'
import ActivityHeatmap from '../../../components/ActivityHeatmap'
import PageHeader from '@/components/ui/PageHeader'
import { Card, CardContent } from '@/components/ui/Card'
import Badge from '@/components/ui/Badge'
import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'
import { use } from 'react'

type Props = {
  params: Promise<{ id: string }>
}

export default function SkillPage({ params }: Props) {
  const { id } = use(params)
  const [skill, setSkill] = useState<Skill | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getSkillById(id).then((data) => {
      setSkill(data)
      setLoading(false)
    })
  }, [id])

  if (loading) {
    return (
      <main className="container mx-auto p-6">
        <div className="text-center py-8">Loading...</div>
      </main>
    )
  }

  if (!skill) {
    return (
      <main className="container mx-auto p-6">
        <PageHeader title="Skill not found" />
        <Link 
          href="/skill-map" 
          className="inline-flex items-center gap-2 text-[hsl(var(--primary))] hover:underline"
        >
          <ChevronLeft size={16} />
          Back to skills
        </Link>
      </main>
    )
  }

  return (
    <main className="container mx-auto p-6">
      <Link 
        href="/skill-map" 
        className="inline-flex items-center gap-1 text-sm text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] mb-4"
      >
        <ChevronLeft size={16} />
        Back to skills
      </Link>
      
      <PageHeader
        title={skill.name}
        description={skill.notes}
      />
      
      {skill.level && (
        <div className="mb-6">
          <Badge variant="default">{skill.level}</Badge>
        </div>
      )}

      <div className="space-y-6">
        <Card>
          <CardContent className="pt-6">
            <ActivityTimer skillId={skill.id} skillName={skill.name} />
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <ActivityHeatmap skillId={skill.id} />
          </CardContent>
        </Card>
      </div>
    </main>
  )
}
