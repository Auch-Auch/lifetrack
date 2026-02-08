import SkillList from '../../components/SkillList'
import { getSkills } from '../../lib/skills'
import PageHeader from '@/components/ui/PageHeader'

export default function SkillMapPage() {
  const skills = getSkills()

  return (
    <main className="container mx-auto p-6">
      <PageHeader
        title="Skills"
        description="Browse and manage your skills. Track your learning progress over time."
      />

      <SkillList items={skills} pageSize={6} />
    </main>
  )
}
