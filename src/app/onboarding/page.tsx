'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { toast } from 'sonner'
import { Leaf, ArrowRight, Loader2 } from 'lucide-react'

export default function OnboardingPage() {
  const [name, setName] = useState('')
  const [age, setAge] = useState('')
  const [occupation, setOccupation] = useState('')
  const [orgSlug, setOrgSlug] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      // Check if org exists
      let targetOrgId = null;
      if (orgSlug) {
        const { data: org, error: orgError } = await supabase
          .from('orgs')
          .select('id')
          .eq('slug', orgSlug)
          .single()

        if (orgError || !org) {
          toast.error('Organization not found. Please check the slug or leave it empty.')
          setLoading(false)
          return
        }
        targetOrgId = org.id
      }

      const { error } = await supabase
        .from('profiles')
        .upsert({
          id: user.id,
          email: user.email,
          name: name || null,
          age: age ? parseInt(age) : null,
          occupation: occupation || null,
          org_id: targetOrgId
        })

      if (error) throw error

      toast.success('Welcome to EcoTrack!')
      router.push('/dashboard')
      router.refresh()
    } catch (error: any) {
      toast.error(error.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4 relative overflow-hidden">
      <div className="absolute top-0 -left-4 w-72 h-72 bg-primary/10 rounded-full blur-3xl" />
      <div className="absolute bottom-0 -right-4 w-72 h-72 bg-accent/10 rounded-full blur-3xl" />

      <Card className="w-full max-w-md border-border bg-card/50 backdrop-blur-sm relative z-10">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <div className="p-3 bg-primary/10 rounded-xl">
              <Leaf className="h-8 w-8 text-primary" />
            </div>
          </div>
          <CardTitle className="text-2xl font-bold">Complete your profile</CardTitle>
          <CardDescription>Tell us a bit more about yourself to get started.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Full Name</label>
              <Input
                placeholder="John Doe"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Age</label>
                <Input
                  type="number"
                  placeholder="25"
                  value={age}
                  onChange={(e) => setAge(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Role</label>
                <Select value={occupation} onValueChange={(value) => setOccupation(value ?? '')} required>
                  <SelectTrigger>
                    <SelectValue placeholder="Select..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="student">Student</SelectItem>
                    <SelectItem value="job">Working Professional</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Organization Slug</label>
              <Input
                placeholder="e.g. your-college-slug"
                value={orgSlug}
                onChange={(e) => setOrgSlug(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">Preferred but optional: add your college or company to join its leaderboard (example: ait-pune).</p>
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <>Finish Setup <ArrowRight className="ml-2 h-4 w-4" /></>}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
