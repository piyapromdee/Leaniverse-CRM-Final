'use client'

import { useState, useEffect, useRef } from 'react'
import AdminLayout from '@/components/admin-layout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { createClient } from '@/lib/supabase/client'
import { User, Mail, Shield, Building2, Calendar, Loader2, Camera, Upload } from 'lucide-react'
import { format } from 'date-fns'

interface Profile {
  id: string
  email: string
  first_name: string | null
  last_name: string | null
  role: string
  created_at: string
  last_sign_in_at: string | null
  org_id: string | null
  avatar_url: string | null
}

interface Organization {
  id: string
  name: string
  plan: string
}

export default function AdminProfilePage() {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [organization, setOrganization] = useState<Organization | null>(null)
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState(false)
  const [uploadingAvatar, setUploadingAvatar] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const supabase = createClient()

  useEffect(() => {
    fetchProfile()
  }, [])

  const fetchProfile = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // Get profile data
      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()

      if (profileData) {
        setProfile({
          ...profileData,
          email: user.email || profileData.email,
          last_sign_in_at: user.last_sign_in_at
        })

        // Get organization data
        if (profileData.org_id) {
          const { data: orgData } = await supabase
            .from('organizations')
            .select('*')
            .eq('id', profileData.org_id)
            .single()

          if (orgData) {
            setOrganization(orgData)
          }
        }
      }
    } catch (error) {
      console.error('Error fetching profile:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleUpdateProfile = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!profile) return
    
    setUpdating(true)
    try {
      const formData = new FormData(e.currentTarget)
      const firstName = formData.get('first_name') as string
      const lastName = formData.get('last_name') as string

      const { error } = await supabase
        .from('profiles')
        .update({
          first_name: firstName || null,
          last_name: lastName || null,
          updated_at: new Date().toISOString()
        })
        .eq('id', profile.id)

      if (error) throw error

      setProfile(prev => prev ? {
        ...prev,
        first_name: firstName || null,
        last_name: lastName || null
      } : null)

      alert('Profile updated successfully!')
    } catch (error) {
      console.error('Error updating profile:', error)
      alert('Error updating profile. Please try again.')
    } finally {
      setUpdating(false)
    }
  }

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !profile) return

    // Validate file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      alert('File too large. Please select an image under 2MB.')
      return
    }

    // Validate file type
    if (!file.type.startsWith('image/')) {
      alert('Please select a valid image file.')
      return
    }

    setUploadingAvatar(true)
    try {
      // Convert image to base64 for now (can be upgraded to proper storage later)
      const reader = new FileReader()
      reader.onload = async (event) => {
        try {
          const base64String = event.target?.result as string
          
          // Update profile with base64 image
          const { error: updateError } = await supabase
            .from('profiles')
            .update({
              avatar_url: base64String,
              updated_at: new Date().toISOString()
            })
            .eq('id', profile.id)

          if (updateError) throw updateError

          setProfile(prev => prev ? {
            ...prev,
            avatar_url: base64String
          } : null)

          alert('Avatar updated successfully!')
        } catch (error) {
          console.error('Error saving avatar:', error)
          alert('Error saving avatar. Please try again.')
        } finally {
          setUploadingAvatar(false)
        }
      }

      reader.onerror = () => {
        alert('Error reading file. Please try again.')
        setUploadingAvatar(false)
      }

      reader.readAsDataURL(file)
    } catch (error) {
      console.error('Error processing avatar:', error)
      alert('Error processing avatar. Please try again.')
      setUploadingAvatar(false)
    }
  }

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center min-h-96">
          <div className="text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
            <p>Loading profile...</p>
          </div>
        </div>
      </AdminLayout>
    )
  }

  const userInitials = (profile?.first_name?.[0] || '') + (profile?.last_name?.[0] || '') || profile?.email?.[0]?.toUpperCase() || 'A'
  const fullName = profile?.first_name && profile?.last_name 
    ? `${profile.first_name} ${profile.last_name}`
    : profile?.email?.split('@')[0] || 'Admin User'

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <p className="text-gray-600">Manage your admin account settings and information</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Profile Overview */}
          <Card className="lg:col-span-1">
            <CardHeader className="text-center">
              <div className="flex justify-center relative">
                <div className="relative">
                  <Avatar className="w-20 h-20">
                    <AvatarImage src={profile?.avatar_url || ''} alt="Profile" />
                    <AvatarFallback className="text-2xl bg-blue-100 text-blue-600">
                      {userInitials}
                    </AvatarFallback>
                  </Avatar>
                  <Button
                    size="sm"
                    variant="outline"
                    className="absolute -bottom-2 -right-2 h-8 w-8 rounded-full p-0"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploadingAvatar}
                  >
                    {uploadingAvatar ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                      <Camera className="h-3 w-3" />
                    )}
                  </Button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleAvatarUpload}
                    className="hidden"
                  />
                </div>
              </div>
              <CardTitle className="mt-4">{fullName}</CardTitle>
              <CardDescription className="flex items-center justify-center space-x-2">
                <Mail className="h-4 w-4" />
                <span>{profile?.email}</span>
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Role</span>
                <Badge className="bg-blue-100 text-blue-800">
                  <Shield className="h-3 w-3 mr-1" />
                  {profile?.role}
                </Badge>
              </div>
              
              {organization && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Organization</span>
                  <div className="flex items-center space-x-1">
                    <Building2 className="h-3 w-3 text-gray-400" />
                    <span className="text-sm">{organization.name}</span>
                  </div>
                </div>
              )}

              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Member Since</span>
                <div className="flex items-center space-x-1">
                  <Calendar className="h-3 w-3 text-gray-400" />
                  <span className="text-sm">
                    {profile?.created_at ? format(new Date(profile.created_at), 'MMM dd, yyyy') : 'Unknown'}
                  </span>
                </div>
              </div>

              {profile?.last_sign_in_at && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Last Sign In</span>
                  <span className="text-sm">
                    {format(new Date(profile.last_sign_in_at), 'MMM dd, yyyy HH:mm')}
                  </span>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Edit Profile Form */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>Edit Profile</CardTitle>
              <CardDescription>
                Update your personal information and preferences
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleUpdateProfile} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="first_name">First Name</Label>
                    <Input
                      id="first_name"
                      name="first_name"
                      defaultValue={profile?.first_name || ''}
                      placeholder="Enter your first name"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="last_name">Last Name</Label>
                    <Input
                      id="last_name"
                      name="last_name"
                      defaultValue={profile?.last_name || ''}
                      placeholder="Enter your last name"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">Email Address</Label>
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    value={profile?.email || ''}
                    disabled
                    className="bg-gray-50"
                  />
                  <p className="text-xs text-gray-500">Email cannot be changed from this panel</p>
                </div>

                <div className="pt-4">
                  <Button type="submit" disabled={updating} className="bg-blue-600 hover:bg-blue-700">
                    {updating ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        Updating...
                      </>
                    ) : (
                      'Update Profile'
                    )}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </AdminLayout>
  )
}