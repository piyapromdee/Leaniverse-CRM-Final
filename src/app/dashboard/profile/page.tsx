'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Separator } from '@/components/ui/separator'
import { User, Mail, Calendar, Upload } from 'lucide-react'

interface UserProfile {
  id: string
  email?: string
  user_metadata?: {
    first_name?: string
    last_name?: string
    nickname?: string
  }
  created_at?: string
}

interface ProfileData {
  id: string
  first_name?: string
  last_name?: string
  nickname?: string
  email?: string
}

export default function Profile() {
  const [user, setUser] = useState<UserProfile | null>(null)
  const [profileData, setProfileData] = useState<ProfileData | null>(null)
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [nickname, setNickname] = useState('')
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const supabase = createClient()

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        setUser(user)
        setEmail(user.email || '')
        
        // Fetch profile data from profiles table
        const { data: profile } = await supabase
          .from('profiles')
          .select('id, first_name, last_name, nickname, email, avatar_url')
          .eq('id', user.id)
          .single()
        
        if (profile) {
          setProfileData(profile)
          setFirstName(profile.first_name || '')
          setLastName(profile.last_name || '')
          setNickname(profile.nickname || '')
          setAvatarUrl(profile.avatar_url || null)
        } else {
          // Fallback to auth metadata if no profile found
          setFirstName(user.user_metadata?.first_name || '')
          setLastName(user.user_metadata?.last_name || '')
          setNickname(user.user_metadata?.nickname || '')
        }
      }
    }

    getUser()
  }, [supabase])

  const parseFullName = (name: string) => {
    const trimmed = name.trim()
    if (!trimmed) return { firstName: '', lastName: '' }
    
    const parts = trimmed.split(/\s+/)
    if (parts.length === 1) {
      return { firstName: parts[0], lastName: '' }
    }
    
    const firstName = parts[0]
    const lastName = parts.slice(1).join(' ')
    return { firstName, lastName }
  }

  const handleFirstNameChange = (value: string) => {
    setFirstName(value)
    
    // Parse if contains spaces
    if (value.includes(' ') && value.trim().split(/\s+/).length > 1) {
      const { firstName, lastName } = parseFullName(value)
      setFirstName(firstName)
      setLastName(lastName)
      
      // Focus nickname field after parsing
      setTimeout(() => {
        const nicknameField = document.getElementById('nickname')
        nicknameField?.focus()
      }, 0)
    }
  }

  const handleLastNameChange = (value: string) => {
    setLastName(value)
    
    // Parse if contains spaces and first name is empty
    if (value.includes(' ') && value.trim().split(/\s+/).length > 1 && !firstName.trim()) {
      const { firstName, lastName } = parseFullName(value)
      setFirstName(firstName)
      setLastName(lastName)
      
      // Focus nickname field after parsing
      setTimeout(() => {
        const nicknameField = document.getElementById('nickname')
        nicknameField?.focus()
      }, 0)
    }
  }

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    setMessage('')

    try {
      if (!user) {
        setError('User not found')
        return
      }

      // Use upsert approach for profile updates to handle missing profiles
      const { error: profileError } = await supabase
        .from('profiles')
        .upsert({
          id: user.id,
          email: user.email,
          first_name: firstName.trim() || null,
          last_name: lastName.trim() || null,
          nickname: nickname.trim() || null,
          role: 'sales', // Default role for new profiles
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'id'
        })

      if (profileError) {
        console.error('Database upsert error:', profileError)
        setError(`Failed to save profile: ${profileError.message}`)
        return
      }

      // Update auth metadata for consistency
      const { error: authError } = await supabase.auth.updateUser({
        data: {
          first_name: firstName.trim() || null,
          last_name: lastName.trim() || null,
          nickname: nickname.trim() || null,
        }
      })

      if (authError) {
        console.warn('Auth metadata update failed:', authError.message)
        // Don't fail the whole operation for this
      }

      setMessage('Profile updated successfully!')
      
      // Refresh user data
      const { data: { user: updatedUser } } = await supabase.auth.getUser()
      if (updatedUser) {
        setUser(updatedUser)
      }

    } catch (err) {
      setError('An unexpected error occurred')
    } finally {
      setLoading(false)
    }
  }

  const uploadAvatar = async (event: React.ChangeEvent<HTMLInputElement>) => {
    console.log('=== AVATAR UPLOAD START ===')
    console.log('This function should NOT touch Supabase storage at all')
    
    try {
      setUploading(true)
      setError('')
      setMessage('')
      
      console.log('Starting avatar upload with data URL method only...')
      
      if (!event.target.files || event.target.files.length === 0) {
        console.log('No files selected')
        setUploading(false)
        return
      }
      
      const file = event.target.files[0]
      console.log('Selected file:', { name: file.name, size: file.size, type: file.type })
      
      // Validate file size (max 1MB for better performance)
      if (file.size > 1 * 1024 * 1024) {
        setError('File size must be less than 1MB')
        setUploading(false)
        return
      }
      
      // Validate file type
      if (!file.type.startsWith('image/')) {
        setError('Please select an image file')
        setUploading(false)
        return
      }
      
      if (!user?.id) {
        setError('User not found')
        setUploading(false)
        return
      }
      
      // Convert to data URL (NO STORAGE INVOLVED)
      console.log('Converting to data URL - NO SUPABASE STORAGE USED')
      const reader = new FileReader()
      
      reader.onload = async (e) => {
        try {
          const dataUrl = e.target?.result as string
          console.log('Data URL created successfully, length:', dataUrl.length)
          console.log('Data URL preview:', dataUrl.substring(0, 100) + '...')
          
          // Update profile with data URL directly (NO STORAGE)
          console.log('Saving to database directly as data URL...')
          
          // Try upsert approach with required role field
          const { error: upsertError } = await supabase
            .from('profiles')
            .upsert({
              id: user.id,
              email: user.email,
              avatar_url: dataUrl,
              role: 'sales', // Default role for new profiles
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            }, {
              onConflict: 'id'
            })
          
          if (upsertError) {
            console.error('Database upsert error:', upsertError)
            setError(`Failed to save profile picture: ${upsertError.message}`)
            setUploading(false)
            return
          }
          
          console.log('Profile updated successfully with data URL')
          setAvatarUrl(dataUrl)
          setMessage('Profile picture updated successfully!')
          
          // Reset file input
          event.target.value = ''
          setUploading(false)
          
        } catch (error: any) {
          console.error('Error in file reader onload:', error)
          setError(`Error processing image: ${error.message || 'Please try again'}`)
          setUploading(false)
        }
      }
      
      reader.onerror = (error) => {
        console.error('Error reading file:', error)
        setError('Error reading file. Please try again.')
        setUploading(false)
      }
      
      console.log('Starting file read as data URL...')
      reader.readAsDataURL(file)
      
    } catch (error: any) {
      console.error('Error in uploadAvatar function:', error)
      setError(`Error: ${error.message || 'Please try again'}`)
      setUploading(false)
    }
    
    console.log('=== AVATAR UPLOAD FUNCTION END ===')
  }

  const userInitials = firstName?.[0] + lastName?.[0] || email?.[0]?.toUpperCase() || 'U'

  return (
      <div className="space-y-6 p-4 md:p-6 lg:px-12 lg:py-8 min-h-screen">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Profile</h1>
          <p className="text-gray-600">Manage your personal information and account settings</p>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>Personal Information</CardTitle>
              <CardDescription>Update your personal details and contact information</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleUpdateProfile} className="space-y-4">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="firstName">First name</Label>
                    <Input
                      id="firstName"
                      type="text"
                      value={firstName}
                      onChange={(e) => handleFirstNameChange(e.target.value)}
                      placeholder="Enter your first name"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="lastName">Last name</Label>
                    <Input
                      id="lastName"
                      type="text"
                      value={lastName}
                      onChange={(e) => handleLastNameChange(e.target.value)}
                      placeholder="Enter your last name"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="nickname">Nickname (Optional)</Label>
                  <Input
                    id="nickname"
                    type="text"
                    value={nickname}
                    onChange={(e) => setNickname(e.target.value)}
                    placeholder="Enter your nickname"
                  />
                  <p className="text-xs text-gray-500">
                    If set, your nickname will be displayed instead of your full name.
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email address</Label>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    disabled
                    className="bg-gray-50"
                  />
                  <p className="text-xs text-gray-500">
                    Email address cannot be changed. Contact support if you need to update it.
                  </p>
                </div>
                {error && (
                  <div className="text-sm text-red-600">{error}</div>
                )}
                {message && (
                  <div className="text-sm text-green-600">{message}</div>
                )}
                <Button type="submit" disabled={loading}>
                  {loading ? 'Updating...' : 'Update Profile'}
                </Button>
              </form>
            </CardContent>
          </Card>

          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Profile Picture</CardTitle>
                <CardDescription>Your profile avatar</CardDescription>
              </CardHeader>
              <CardContent className="text-center">
                <Avatar className="h-24 w-24 mx-auto mb-4">
                  <AvatarImage src={avatarUrl || ""} alt="" />
                  <AvatarFallback className="text-xl">{userInitials}</AvatarFallback>
                </Avatar>
                <div className="space-y-2">
                  <input
                    type="file"
                    id="avatar-upload"
                    accept="image/*"
                    onChange={uploadAvatar}
                    className="hidden"
                  />
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => document.getElementById('avatar-upload')?.click()}
                    disabled={uploading}
                  >
                    {uploading ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-teal-600 mr-2"></div>
                        Processing...
                      </>
                    ) : (
                      <>
                        <Upload className="w-4 h-4 mr-2" />
                        Upload Picture
                      </>
                    )}
                  </Button>
                  <p className="text-xs text-gray-500">
                    JPG, PNG or GIF (max. 1MB)
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Account Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center space-x-3">
                  <User className="h-4 w-4 text-gray-400" />
                  <div>
                    <p className="text-sm font-medium">User ID</p>
                    <p className="text-xs text-gray-500">{user?.id}</p>
                  </div>
                </div>
                <Separator />
                <div className="flex items-center space-x-3">
                  <Mail className="h-4 w-4 text-gray-400" />
                  <div>
                    <p className="text-sm font-medium">Email</p>
                    <p className="text-xs text-gray-500">{user?.email}</p>
                  </div>
                </div>
                <Separator />
                <div className="flex items-center space-x-3">
                  <Calendar className="h-4 w-4 text-gray-400" />
                  <div>
                    <p className="text-sm font-medium">Member since</p>
                    <p className="text-xs text-gray-500">
                      {user?.created_at ? new Date(user.created_at).toLocaleDateString() : 'N/A'}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
  )
}