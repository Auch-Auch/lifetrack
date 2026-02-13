'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import { login, register, LoginInput, RegisterInput } from '@/lib/auth'
import { useToastStore } from '@/stores/toastStore'

type Mode = 'login' | 'register'

export default function LoginPage() {
  const router = useRouter()
  const addToast = useToastStore((state) => state.addToast)
  
  const [mode, setMode] = useState<Mode>('login')
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    name: '',
  })
  const [errors, setErrors] = useState({
    email: '',
    password: '',
    name: '',
  })

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
    // Clear error when user starts typing
    setErrors((prev) => ({ ...prev, [name]: '' }))
  }

  const validate = (): boolean => {
    const newErrors = {
      email: '',
      password: '',
      name: '',
    }

    if (!formData.email) {
      newErrors.email = 'Email is required'
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Email is invalid'
    }

    if (!formData.password) {
      newErrors.password = 'Password is required'
    } else if (formData.password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters'
    }

    if (mode === 'register' && !formData.name) {
      newErrors.name = 'Name is required'
    }

    setErrors(newErrors)
    return !Object.values(newErrors).some((error) => error)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validate()) return

    setLoading(true)

    try {
      if (mode === 'login') {
        const input: LoginInput = {
          email: formData.email,
          password: formData.password,
        }
        await login(input)
        addToast('Login successful!', 'success')
        router.push('/')
      } else {
        const input: RegisterInput = {
          email: formData.email,
          password: formData.password,
          name: formData.name,
        }
        await register(input)
        addToast('Registration successful!', 'success')
        router.push('/')
      }
    } catch (error) {
      addToast(
        error instanceof Error ? error.message : 'Authentication failed',
        'error'
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[hsl(var(--primary))] to-[hsl(var(--secondary))] p-4">
      <div className="w-full max-w-md">
        <div className="bg-[hsl(var(--card))] rounded-[var(--radius)] shadow-lg p-8">
          <div className="text-center mb-6">
            <h1 className="text-3xl font-bold text-[hsl(var(--foreground))] mb-2">
              LifeTrack
            </h1>
            <p className="text-[hsl(var(--muted-foreground))]">
              Track your learning journey
            </p>
          </div>

          <div className="flex gap-2 mb-6">
            <Button
              variant={mode === 'login' ? 'primary' : 'ghost'}
              onClick={() => setMode('login')}
              className="flex-1"
            >
              Login
            </Button>
            <Button
              variant={mode === 'register' ? 'primary' : 'ghost'}
              onClick={() => setMode('register')}
              className="flex-1"
            >
              Register
            </Button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === 'register' && (
              <Input
                label="Name"
                name="name"
                type="text"
                value={formData.name}
                onChange={handleChange}
                error={errors.name}
                placeholder="Your name"
                required
              />
            )}

            <Input
              label="Email"
              name="email"
              type="email"
              value={formData.email}
              onChange={handleChange}
              error={errors.email}
              placeholder="your.email@example.com"
              required
            />

            <Input
              label="Password"
              name="password"
              type="password"
              value={formData.password}
              onChange={handleChange}
              error={errors.password}
              placeholder="••••••••"
              required
            />

            <Button
              type="submit"
              loading={loading}
              className="w-full"
            >
              {mode === 'login' ? 'Login' : 'Register'}
            </Button>
          </form>
        </div>
      </div>
    </div>
  )
}
