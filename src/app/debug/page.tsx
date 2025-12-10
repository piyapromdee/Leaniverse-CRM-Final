'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

export default function DebugPage() {
  const [user, setUser] = useState<any>(null)
  const [profile, setProfile] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const supabase = createClient()

  useEffect(() => {
    checkAuth()
  }, [])

  const checkAuth = async () => {
    try {
      console.log('Checking auth...')
      
      // Get current user
      const { data: { user }, error: userError } = await supabase.auth.getUser()
      console.log('User data:', user)
      console.log('User error:', userError)
      
      setUser(user)
      
      if (user) {
        // Get profile
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single()
          
        console.log('Profile data:', profile)
        console.log('Profile error:', profileError)
        
        setProfile(profile)
        
        if (profileError) {
          setError(`Profile error: ${profileError.message}`)
        }
      }
      
    } catch (err) {
      console.error('Debug check error:', err)
      setError(`Check error: ${err}`)
    } finally {
      setLoading(false)
    }
  }

  const signOut = async () => {
    await supabase.auth.signOut()
    setUser(null)
    setProfile(null)
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        <h1 className="text-3xl font-bold">Debug Information</h1>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Authentication Status</CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <p>Loading...</p>
              ) : (
                <div className="space-y-2">
                  <p><strong>Authenticated:</strong> {user ? 'Yes' : 'No'}</p>
                  {user && (
                    <>
                      <p><strong>User ID:</strong> {user.id}</p>
                      <p><strong>Email:</strong> {user.email}</p>
                      <p><strong>Email Confirmed:</strong> {user.email_confirmed_at ? 'Yes' : 'No'}</p>
                    </>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Profile Information</CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <p>Loading...</p>
              ) : profile ? (
                <div className="space-y-2">
                  <p><strong>Role:</strong> {profile.role || 'Not set'}</p>
                  <p><strong>First Name:</strong> {profile.first_name || 'Not set'}</p>
                  <p><strong>Last Name:</strong> {profile.last_name || 'Not set'}</p>
                  <p><strong>Created:</strong> {profile.created_at}</p>
                </div>
              ) : (
                <p>No profile found</p>
              )}
            </CardContent>
          </Card>
        </div>

        {error && (
          <Card>
            <CardHeader>
              <CardTitle className="text-red-600">Error Information</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-red-600">{error}</p>
            </CardContent>
          </Card>
        )}

        <div className="space-x-4">
          <Button onClick={checkAuth}>Refresh Debug Info</Button>
          {user && <Button onClick={signOut} variant="outline">Sign Out</Button>}
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Environment Information</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <p><strong>Supabase URL:</strong> {process.env.NEXT_PUBLIC_SUPABASE_URL ? 'Set' : 'Not set'}</p>
              <p><strong>Supabase Anon Key:</strong> {process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? 'Set' : 'Not set'}</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}