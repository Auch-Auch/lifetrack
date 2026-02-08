export type Project = {
  slug: string
  title: string
  summary: string
  details?: string
}

export const projects: Project[] = [
  {
    slug: 'habit-tracker',
    title: 'Habit Tracker',
    summary: 'Track and reinforce daily habits using simple streaks and reminders.',
    details:
      'A minimal habit-tracking app focusing on streaks, daily check-ins, and simple analytics to build positive routines.'
  },
  {
    slug: 'skill-map',
    title: 'Skill Map',
    summary: 'Visualize and plan skill development over time with milestones.',
    details:
      'Create a roadmap for learning skills with milestones, practice sessions, and progress checkpoints.'
  }
]

export function getProjectBySlug(slug: string) {
  return projects.find(p => p.slug === slug)
}
