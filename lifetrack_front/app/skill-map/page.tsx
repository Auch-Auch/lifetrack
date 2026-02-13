'use client'
import { useState, useEffect } from 'react'
import SkillList from '../../components/SkillList'
import { getSkills, createSkill, CreateSkillInput } from '../../lib/skills'
import type { Skill } from '../../lib/skills'
import PageHeader from '@/components/ui/PageHeader'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import { Card, CardContent } from '@/components/ui/Card'
import { Plus } from 'lucide-react'
import { useToast } from '@/stores/toastStore'
import { useActivityStore } from '@/stores/activityStore'

export default function SkillMapPage() {
  const [skills, setSkills] = useState<Skill[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [formData, setFormData] = useState({ name: '', level: '', notes: '' })
  const [submitting, setSubmitting] = useState(false)
  const toast = useToast()
  const fetchActiveSession = useActivityStore((state) => state.fetchActiveSession)

  const loadSkills = async () => {
    try {
      const data = await getSkills()
      setSkills(data)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to load skills')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadSkills()
    fetchActiveSession()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.name.trim()) {
      toast.error('Skill name is required')
      return
    }

    setSubmitting(true)
    try {
      const input: CreateSkillInput = {
        name: formData.name.trim(),
        level: formData.level.trim() || undefined,
        notes: formData.notes.trim() || undefined,
      }
      
      await createSkill(input)
      toast.success('Skill created successfully!')
      setFormData({ name: '', level: '', notes: '' })
      setShowForm(false)
      loadSkills()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to create skill')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <main className="container mx-auto p-6">
        <PageHeader
          title="Skills"
          description="Browse and manage your skills. Track your learning progress over time."
        />
        <div className="text-center py-8">Loading...</div>
      </main>
    )
  }

  return (
    <main className="container mx-auto p-6">
      <PageHeader
        title="Skills"
        description="Browse and manage your skills. Track your learning progress over time."
        action={
          <Button onClick={() => setShowForm(!showForm)}>
            <Plus size={16} />
            Add Skill
          </Button>
        }
      />

      {showForm && (
        <Card className="mb-6">
          <CardContent className="pt-6">
            <h2 className="text-xl font-semibold mb-4">Add New Skill</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <Input
                label="Skill Name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., JavaScript, Guitar, Spanish"
                required
              />
              <Input
                label="Level"
                value={formData.level}
                onChange={(e) => setFormData({ ...formData, level: e.target.value })}
                placeholder="e.g., Beginner, Intermediate, Advanced"
              />
              <Input
                label="Notes"
                as="textarea"
                rows={3}
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Any additional notes about this skill..."
              />
              <div className="flex gap-2">
                <Button type="submit" loading={submitting}>
                  Create Skill
                </Button>
                <Button type="button" variant="ghost" onClick={() => {
                  setShowForm(false)
                  setFormData({ name: '', level: '', notes: '' })
                }}>
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <SkillList items={skills} pageSize={6} />
    </main>
  )
}
