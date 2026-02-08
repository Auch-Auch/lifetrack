import Link from 'next/link'
import PageHeader from '@/components/ui/PageHeader'
import { Card, CardContent, CardHeader } from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import { BookOpen, Activity, Target } from 'lucide-react'

export default function Home() {
  return (
    <main className="container mx-auto p-6">
      <PageHeader
        title="Welcome to LifeTrack"
        description="Your personal hub for tracking self-development and learning activities."
      />
      
      <div className="grid gap-6 md:grid-cols-3 mb-8">
        <Card hoverable>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="p-3 bg-[hsl(var(--primary)_/_0.1)] rounded-[var(--radius)] text-[hsl(var(--primary))]">
                <BookOpen size={24} />
              </div>
              <div>
                <h3 className="font-semibold text-lg">Skills</h3>
                <p className="text-sm text-[hsl(var(--muted-foreground))]">Track your learning</p>
              </div>
            </div>
          </CardHeader>
        </Card>
        
        <Card hoverable>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="p-3 bg-[hsl(var(--success)_/_0.1)] rounded-[var(--radius)] text-[hsl(var(--success))]">
                <Activity size={24} />
              </div>
              <div>
                <h3 className="font-semibold text-lg">Activities</h3>
                <p className="text-sm text-[hsl(var(--muted-foreground))]">Log practice sessions</p>
              </div>
            </div>
          </CardHeader>
        </Card>
        
        <Card hoverable>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="p-3 bg-[hsl(var(--warning)_/_0.1)] rounded-[var(--radius)] text-[hsl(var(--warning))]">
                <Target size={24} />
              </div>
              <div>
                <h3 className="font-semibold text-lg">Progress</h3>
                <p className="text-sm text-[hsl(var(--muted-foreground))]">Visualize your growth</p>
              </div>
            </div>
          </CardHeader>
        </Card>
      </div>
      
      <Card>
        <CardContent className="py-8 text-center">
          <h2 className="text-2xl font-semibold mb-3">Ready to start tracking?</h2>
          <p className="text-[hsl(var(--muted-foreground))] mb-6 max-w-2xl mx-auto">
            Explore your skills, log practice sessions with our timer, and watch your progress grow over time.
          </p>
          <div className="flex items-center justify-center gap-4">
            <Link href="/skill-map">
              <Button size="lg">View Skills</Button>
            </Link>
            <Link href="/activities">
              <Button variant="secondary" size="lg">Browse Activities</Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </main>
  )
}
