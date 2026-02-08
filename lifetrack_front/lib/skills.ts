export type Skill = {
  id: string
  name: string
  level?: 'Beginner' | 'Intermediate' | 'Advanced'
  notes?: string
}

export const skills: Skill[] = Array.from({ length: 23 }).map((_, i) => ({
  id: String(i + 1),
  name: `Skill ${i + 1}`,
  level: i % 3 === 0 ? 'Advanced' : i % 3 === 1 ? 'Intermediate' : 'Beginner',
  notes: `Short note for Skill ${i + 1}`,
}))

export function getSkills() {
  return skills
}

export function getSkillById(id: string) {
  return skills.find(s => s.id === id)
}
