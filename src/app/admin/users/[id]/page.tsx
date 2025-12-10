'use client'

import { useState, useEffect, use } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import AdminLayout from '@/components/admin-layout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { formatCurrency } from '@/lib/currency'
import { 
  Loader2, 
  AlertCircle, 
  ArrowLeft,
  User,
  Mail,
  MailOpen,
  Calendar,
  CreditCard,
  ExternalLink,
  RefreshCw,
  Star,
  Shield,
  ShoppingBag,
  ShieldOff,
  UserX,
  UserCheck,
  Trash2,
  Settings,
  CheckCircle,
  XCircle,
  Clock,
  Eye,
  ChevronRight,
  Edit,
  Tag,
  Tags,
  Plus,
  X,
  Check,
  Copy
} from 'lucide-react'
import UserNotes from '@/components/user-notes'
import ManualTransactionForm from '@/components/manual-transaction-form'

interface UserProfile {
  id: string
  email: string
  first_name: string | null
  last_name: string | null
  nickname: string | null
  role: string
  avatar_url: string | null
  is_disabled: boolean
  created_at: string
  updated_at: string
}

interface UserTag {
  id: string
  name: string
  color: string
  description?: string
}

interface Transaction {
  id: string
  stripe_payment_intent_id: string
  amount: number
  currency: string
  status: 'succeeded' | 'failed' | 'canceled' | 'processing'
  payment_method_types: string[]
  metadata: Record<string, any>
  created_at: string
  product: {
    id: string
    name: string
  } | null
  price: {
    id: string
    type: 'one_time' | 'recurring'
    interval?: string
    interval_count?: number
  } | null
}

interface Purchase {
  id: string
  access_granted: boolean
  access_expires_at: string | null
  created_at: string
  product: {
    id: string
    name: string
    description: string | null
    short_description: string | null
  } | null
  transaction: {
    id: string
    amount: number
    currency: string
    status: string
    created_at: string
  } | null
}

interface EmailLog {
  id: string
  recipient_email: string
  subject: string
  body: string
  status: 'success' | 'failed'
  error_message?: string
  sent_at: string
  sender?: {
    first_name: string
    last_name: string
    email: string
  }
}

interface EmailStats {
  total: number
  successful: number
  failed: number
}

interface UserData {
  profile: UserProfile
  tags: UserTag[]
  transactions: Transaction[]
  purchases: Purchase[]
  stats: {
    totalTransactions: number
    successfulTransactions: number
    spendingByCurrency: Record<string, number>
    activePurchases: number
  }
}

export default function UserDetailsPage({
  params
}: {
  params: Promise<{ id: string }>
}) {
  const resolvedParams = use(params)
  const router = useRouter()
  const searchParams = useSearchParams()
  const userId = resolvedParams.id
  
  const [userData, setUserData] = useState<UserData | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  
  // Email history state
  const [emailLogs, setEmailLogs] = useState<EmailLog[]>([])
  const [emailStats, setEmailStats] = useState<EmailStats>({ total: 0, successful: 0, failed: 0 })
  const [emailsLoading, setEmailsLoading] = useState(false)

  // Edit profile state
  const [editProfileDialogOpen, setEditProfileDialogOpen] = useState(false)
  const [editingProfile, setEditingProfile] = useState(false)
  const [editFirstName, setEditFirstName] = useState('')
  const [editLastName, setEditLastName] = useState('')
  const [editNickname, setEditNickname] = useState('')
  const [editEmail, setEditEmail] = useState('')

  // Email detail dialog state
  const [emailDetailDialogOpen, setEmailDetailDialogOpen] = useState(false)
  const [selectedEmail, setSelectedEmail] = useState<EmailLog | null>(null)

  // Tag management state
  const [availableTags, setAvailableTags] = useState<UserTag[]>([])
  const [tagDialogOpen, setTagDialogOpen] = useState(false)
  const [tagOperation, setTagOperation] = useState<'add' | 'remove'>('add')
  const [selectedTagsToManage, setSelectedTagsToManage] = useState<string[]>([])
  const [tagManagementLoading, setTagManagementLoading] = useState(false)

  // Email management state
  const [emailDialogOpen, setEmailDialogOpen] = useState(false)
  const [emailSubject, setEmailSubject] = useState('')
  const [emailBody, setEmailBody] = useState('')
  const [sendingEmail, setSendingEmail] = useState(false)
  const [emailConfigStatus, setEmailConfigStatus] = useState<'loading' | 'configured' | 'not-configured' | 'error'>('loading')

  // Manual transaction state
  const [manualTransactionDialogOpen, setManualTransactionDialogOpen] = useState(false)

  const fetchUserData = async (showRefreshLoader = false) => {
    try {
      if (showRefreshLoader) {
        setRefreshing(true)
      } else {
        setLoading(true)
      }
      setError(null)

      const response = await fetch(`/api/admin/users/${userId}`)
      const result = await response.json()

      if (response.ok) {
        setUserData(result)
      } else {
        setError(result.error || 'Failed to fetch user data')
      }
    } catch (err) {
      setError('An unexpected error occurred')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  const fetchEmailData = async () => {
    setEmailsLoading(true)
    try {
      const response = await fetch(`/api/admin/users/${userId}/emails?limit=5`)
      const result = await response.json()

      if (response.ok) {
        setEmailLogs(result.emailLogs || [])
        setEmailStats(result.stats || { total: 0, successful: 0, failed: 0 })
      } else {
        console.error('Failed to fetch email data:', result.error)
      }
    } catch (error) {
      console.error('Error fetching email data:', error)
    } finally {
      setEmailsLoading(false)
    }
  }

  const fetchAvailableTags = async () => {
    try {
      const response = await fetch('/api/admin/tags')
      const result = await response.json()

      if (response.ok && result.tags) {
        setAvailableTags(result.tags)
      }
    } catch (error) {
      console.error('Error fetching tags:', error)
    }
  }

  const checkEmailConfig = async () => {
    try {
      const response = await fetch('/api/admin/email-config')
      const result = await response.json()

      if (response.ok && result.config) {
        setEmailConfigStatus('configured')
      } else {
        setEmailConfigStatus('not-configured')
      }
    } catch (error) {
      console.error('Error checking email config:', error)
      setEmailConfigStatus('error')
    }
  }

  useEffect(() => {
    fetchUserData()
    fetchEmailData()
    fetchAvailableTags()
    checkEmailConfig()
  }, [userId])

  // Auto-open email dialog if action=send-email query parameter is present
  useEffect(() => {
    const action = searchParams.get('action')
    if (action === 'send-email' && !loading) {
      setEmailDialogOpen(true)
      // Clear the query parameter after opening dialog
      router.replace(`/admin/users/${userId}`, { scroll: false })
    }
  }, [searchParams, loading, userId, router])

  const formatUserName = (profile: UserProfile) => {
    const fullName = [profile.first_name, profile.last_name].filter(Boolean).join(' ')
    if (profile.nickname && fullName) {
      return `${fullName} (${profile.nickname})`
    }
    return fullName || profile.nickname || profile.email || 'Unknown User'
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString()
  }

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
    setEditFirstName(value)
    
    // Parse if contains spaces
    if (value.includes(' ') && value.trim().split(/\s+/).length > 1) {
      const { firstName, lastName } = parseFullName(value)
      setEditFirstName(firstName)
      setEditLastName(lastName)
      
      // Focus nickname field after parsing
      setTimeout(() => {
        const nicknameField = document.getElementById('editNickname')
        nicknameField?.focus()
      }, 0)
    }
  }

  const handleLastNameChange = (value: string) => {
    setEditLastName(value)
    
    // Parse if contains spaces and first name is empty
    if (value.includes(' ') && value.trim().split(/\s+/).length > 1 && !editFirstName.trim()) {
      const { firstName, lastName } = parseFullName(value)
      setEditFirstName(firstName)
      setEditLastName(lastName)
      
      // Focus nickname field after parsing
      setTimeout(() => {
        const nicknameField = document.getElementById('editNickname')
        nicknameField?.focus()
      }, 0)
    }
  }

  const copyEmailToClipboard = async (email: string) => {
    try {
      await navigator.clipboard.writeText(email)
      setMessage('Email copied to clipboard!')
      // Clear the message after 3 seconds
      setTimeout(() => setMessage(null), 3000)
    } catch (err) {
      setError('Failed to copy email to clipboard')
      setTimeout(() => setError(null), 3000)
    }
  }

  const getStatusBadge = (status: Transaction['status']) => {
    switch (status) {
      case 'succeeded':
        return <Badge className="bg-green-100 text-green-800">Succeeded</Badge>
      case 'failed':
        return <Badge variant="destructive">Failed</Badge>
      case 'canceled':
        return <Badge variant="secondary">Canceled</Badge>
      case 'processing':
        return <Badge variant="outline">Processing</Badge>
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  const getEmailStatusBadge = (status: EmailLog['status']) => {
    switch (status) {
      case 'success':
        return (
          <Badge variant="default" className="bg-green-100 text-green-800">
            <CheckCircle className="mr-1 h-3 w-3" />
            Success
          </Badge>
        )
      case 'failed':
        return (
          <Badge variant="destructive">
            <XCircle className="mr-1 h-3 w-3" />
            Failed
          </Badge>
        )
      default:
        return <Badge variant="secondary">{status}</Badge>
    }
  }

  const getSuccessRate = () => {
    if (emailStats.total === 0) return 0
    return Math.round((emailStats.successful / emailStats.total) * 100)
  }

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'admin':
        return <Badge className="bg-purple-100 text-purple-800"><Shield className="h-3 w-3 mr-1" />Admin</Badge>
      case 'user':
        return <Badge variant="outline"><User className="h-3 w-3 mr-1" />User</Badge>
      default:
        return <Badge variant="outline">{role}</Badge>
    }
  }

  const formatPrice = (price: Transaction['price']) => {
    if (!price) return 'N/A'
    
    if (price.type === 'recurring') {
      const interval = price.interval_count === 1 
        ? price.interval 
        : `${price.interval_count} ${price.interval}s`
      return `Subscription (${interval})`
    }
    
    return 'One-time'
  }

  const isNewUserAccount = (transaction: Transaction) => {
    const metadata = transaction.metadata || {}
    return metadata.userAccountCreated === true
  }

  const hasValidAccess = (purchase: Purchase) => {
    if (!purchase.access_granted) return false
    if (!purchase.access_expires_at) return true
    return new Date() <= new Date(purchase.access_expires_at)
  }

  const handleUserAction = async (action: string) => {
    setActionLoading(action)
    setMessage(null)
    setError(null)

    try {
      const response = await fetch('/api/admin/users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ action, userId }),
      })

      const result = await response.json()

      if (!response.ok) {
        setError(result.error || `Failed to ${action} user`)
        return
      }

      setMessage(result.message)
      // Refresh user data to show updated status
      await fetchUserData()
      
      // Auto-clear message after 5 seconds
      setTimeout(() => setMessage(null), 5000)
    } catch (error) {
      console.error(`Error ${action} user:`, error)
      setError('An unexpected error occurred')
    } finally {
      setActionLoading(null)
    }
  }

  const handleMakeAdmin = () => handleUserAction('promote')
  const handleRemoveAdmin = () => handleUserAction('demote')
  const handleDisableUser = () => handleUserAction('disable')
  const handleEnableUser = () => handleUserAction('enable')

  const handleEditProfile = () => {
    if (!userData?.profile) return
    setEditFirstName(userData.profile.first_name || '')
    setEditLastName(userData.profile.last_name || '')
    setEditNickname(userData.profile.nickname || '')
    setEditEmail(userData.profile.email)
    setEditProfileDialogOpen(true)
    setError(null)
    setMessage(null)
  }

  const handleSaveProfile = async () => {
    if (!userData?.profile) return

    if (!editFirstName.trim() || !editLastName.trim() || !editEmail.trim()) {
      setError('All fields are required')
      return
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(editEmail)) {
      setError('Please enter a valid email address')
      return
    }

    setEditingProfile(true)
    setError(null)
    setMessage(null)

    try {
      const response = await fetch('/api/admin/users/edit-profile', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: userData.profile.id,
          firstName: editFirstName.trim(),
          lastName: editLastName.trim(),
          nickname: editNickname.trim() || null,
          email: editEmail.trim()
        }),
      })

      const result = await response.json()

      if (!response.ok) {
        setError(result.error || 'Failed to update profile')
        return
      }

      setMessage('Profile updated successfully!')
      setEditProfileDialogOpen(false)
      await fetchUserData()
      await fetchEmailData()
    } catch (error) {
      console.error('Error updating profile:', error)
      setError('An unexpected error occurred')
    } finally {
      setEditingProfile(false)
    }
  }

  const handleEmailClick = (email: EmailLog) => {
    setSelectedEmail(email)
    setEmailDetailDialogOpen(true)
  }

  const handleDeleteUser = () => {
    setDeleteDialogOpen(true)
  }

  const confirmDeleteUser = async () => {
    setDeleteDialogOpen(false)
    await handleUserAction('delete')
    // Redirect back to users list after deletion
    router.push('/admin/users')
  }

  const handleOpenTagDialog = () => {
    setTagOperation('add')
    setSelectedTagsToManage([])
    setTagDialogOpen(true)
    setError(null)
    setMessage(null)
  }

  const handleTagManagement = async () => {
    if (!userData || selectedTagsToManage.length === 0) {
      setError('Please select at least one tag')
      return
    }

    setTagManagementLoading(true)
    setError(null)
    setMessage(null)

    try {
      const response = await fetch('/api/admin/users/bulk-tag', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userIds: [userData.profile.id],
          tagIds: selectedTagsToManage,
          operation: tagOperation
        }),
      })

      const result = await response.json()

      if (!response.ok) {
        setError(result.error || 'Failed to update user tags')
        return
      }

      setMessage(result.message)
      setTagDialogOpen(false)
      setSelectedTagsToManage([])
      
      // Refresh user data to show updated tags
      await fetchUserData()

      // Auto-clear message after 5 seconds
      setTimeout(() => setMessage(null), 5000)

    } catch (err) {
      setError('An unexpected error occurred')
    } finally {
      setTagManagementLoading(false)
    }
  }

  const handleRemoveSingleTag = async (tagId: string) => {
    if (!userData) return

    setError(null)
    setMessage(null)

    try {
      const response = await fetch('/api/admin/users/bulk-tag', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userIds: [userData.profile.id],
          tagIds: [tagId],
          operation: 'remove'
        }),
      })

      const result = await response.json()

      if (!response.ok) {
        setError(result.error || 'Failed to remove tag')
        return
      }

      // Refresh user data to show updated tags
      await fetchUserData()

    } catch (err) {
      setError('An unexpected error occurred')
    }
  }

  const handleOpenEmailDialog = () => {
    if (!userData) return
    
    const userName = formatUserName(userData.profile)
    setEmailSubject('')
    setEmailBody(`Hello ${userName},\n\n`)
    setEmailDialogOpen(true)
    setError(null)
    setMessage(null)
  }

  const handleSendEmail = async () => {
    if (!userData || !emailSubject.trim() || !emailBody.trim()) {
      setError('Please enter both subject and message')
      return
    }

    setSendingEmail(true)
    setError(null)
    setMessage(null)

    try {
      const response = await fetch(`/api/admin/users/${userData.profile.id}/send-email`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          subject: emailSubject.trim(),
          body: emailBody.trim()
        }),
      })

      const result = await response.json()

      if (!response.ok) {
        setError(result.error || 'Failed to send email')
        return
      }

      setMessage(result.message)
      setEmailDialogOpen(false)
      setEmailSubject('')
      setEmailBody('')
      
      // Refresh email data to show the new email
      await fetchEmailData()

      // Auto-clear message after 5 seconds
      setTimeout(() => setMessage(null), 5000)

    } catch (err) {
      setError('An unexpected error occurred while sending email')
    } finally {
      setSendingEmail(false)
    }
  }

  const handleOpenManualTransactionDialog = () => {
    if (!userData) return
    
    setManualTransactionDialogOpen(true)
    setError(null)
    setMessage(null)
  }

  const handleManualTransactionSuccess = () => {
    setManualTransactionDialogOpen(false)
    setMessage('Manual transaction created successfully')
    
    // Refresh user data to show updated transactions and purchases
    fetchUserData()
    
    // Auto-clear message after 5 seconds
    setTimeout(() => setMessage(null), 5000)
  }

  const handleManualTransactionCancel = () => {
    setManualTransactionDialogOpen(false)
  }

  if (loading) {
    return (
      <AdminLayout>
        <div className="space-y-6">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin" />
              </div>
            </CardContent>
          </Card>
        </div>
      </AdminLayout>
    )
  }

  if (error || !userData) {
    return (
      <AdminLayout>
        <div className="space-y-6">
          <div className="flex items-center gap-4">
            <Button variant="ghost" onClick={() => router.back()}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Button>
          </div>

          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              {error || 'User not found'}
            </AlertDescription>
          </Alert>
        </div>
      </AdminLayout>
    )
  }

  const { profile, tags, transactions, purchases, stats } = userData

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" onClick={() => router.back()}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Button>
            <div>
              <h1 className="text-2xl font-bold">{formatUserName(profile)}</h1>
              <p className="text-muted-foreground">User Details & Transaction History</p>
            </div>
          </div>
          
          <Button 
            variant="outline" 
            onClick={() => {
              fetchUserData(true)
              fetchEmailData()
            }}
            disabled={refreshing}
          >
            {refreshing ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="mr-2 h-4 w-4" />
            )}
            Refresh
          </Button>
        </div>

        {/* Messages */}
        {(error || message) && (
          <div className="space-y-2">
            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            {message && (
              <Alert>
                <AlertDescription className="text-green-800">{message}</AlertDescription>
              </Alert>
            )}
          </div>
        )}

        {/* Tab Navigation */}
        <Tabs defaultValue="profile" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="profile">Profile & Management</TabsTrigger>
            <TabsTrigger value="history">History & Activity</TabsTrigger>
            <TabsTrigger value="finance">Finance & Transactions</TabsTrigger>
          </TabsList>

          {/* Tab 1: Profile & Management */}
          <TabsContent value="profile" className="space-y-6">
        {/* User Profile Card */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                User Profile
              </CardTitle>
              <Button 
                variant="outline" 
                size="sm"
                onClick={handleEditProfile}
                disabled={editingProfile}
              >
                <Edit className="mr-2 h-4 w-4" />
                Edit Profile
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-gray-500">Full Name</label>
                  <p className="text-lg">{[profile.first_name, profile.last_name].filter(Boolean).join(' ') || 'Not provided'}</p>
                </div>
                
                {profile.nickname && (
                  <div>
                    <label className="text-sm font-medium text-gray-500">Nickname</label>
                    <p className="text-lg">{profile.nickname}</p>
                  </div>
                )}
                
                <div>
                  <label className="text-sm font-medium text-gray-500">Email</label>
                  <div className="flex items-center gap-2">
                    <Mail className="h-4 w-4 text-gray-400" />
                    <p>{profile.email}</p>
                    <button
                      onClick={() => copyEmailToClipboard(profile.email)}
                      className="p-1 rounded-md hover:bg-gray-100 transition-colors"
                      title="Copy email to clipboard"
                    >
                      <Copy className="h-4 w-4 text-gray-500 hover:text-gray-700" />
                    </button>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-gray-500">Role</label>
                  <div className="mt-1">
                    {getRoleBadge(profile.role)}
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-500">Status</label>
                  <div className="mt-1">
                    {profile.is_disabled ? (
                      <Badge variant="destructive">Disabled</Badge>
                    ) : (
                      <Badge className="bg-green-100 text-green-800">Active</Badge>
                    )}
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-gray-500">Created</label>
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-gray-400" />
                    <p className="text-sm">{formatDate(profile.created_at)}</p>
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-500">User ID</label>
                  <p className="text-sm font-mono">{profile.id}</p>
                </div>
              </div>
            </div>
            
            {/* User Tags Section */}
            <div className="mt-6 pt-6 border-t">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <label className="text-sm font-medium text-gray-500">User Tags</label>
                  <p className="text-xs text-gray-400">Tags help organize and categorize users</p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleOpenTagDialog}
                >
                  <Plus className="mr-1 h-4 w-4" />
                  Add Tags
                </Button>
              </div>
              
              <div className="flex flex-wrap gap-2">
                {tags.length === 0 ? (
                  <div className="text-center py-8 w-full">
                    <Tag className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                    <p className="text-sm text-gray-500">No tags assigned</p>
                    <p className="text-xs text-gray-400">Click "Add Tags" to assign tags to this user</p>
                  </div>
                ) : (
                  tags.map((tag) => (
                    <span
                      key={tag.id}
                      className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium text-white group"
                      style={{ backgroundColor: tag.color }}
                      title={tag.description}
                    >
                      <Tag className="mr-1 h-3 w-3" />
                      {tag.name}
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          handleRemoveSingleTag(tag.id)
                        }}
                        className="ml-2 -mr-1 h-4 w-4 rounded-full hover:bg-black/20 flex items-center justify-center transition-colors"
                        title="Remove tag"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  ))
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* User Management Actions */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              User Management
            </CardTitle>
            <CardDescription>
              Manage user permissions and account status
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Role Management */}
              <div className="space-y-3">
                <h4 className="font-medium text-sm">Role Management</h4>
                {profile.role === 'admin' ? (
                  <Button
                    variant="outline"
                    onClick={handleRemoveAdmin}
                    disabled={actionLoading === 'demote'}
                    className="w-full"
                  >
                    {actionLoading === 'demote' ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <ShieldOff className="mr-2 h-4 w-4" />
                    )}
                    Remove Admin
                  </Button>
                ) : (
                  <Button
                    variant="outline"
                    onClick={handleMakeAdmin}
                    disabled={actionLoading === 'promote'}
                    className="w-full"
                  >
                    {actionLoading === 'promote' ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Shield className="mr-2 h-4 w-4" />
                    )}
                    Make Admin
                  </Button>
                )}
              </div>

              {/* Account Status */}
              <div className="space-y-3">
                <h4 className="font-medium text-sm">Account Status</h4>
                {profile.is_disabled ? (
                  <Button
                    variant="outline"
                    onClick={handleEnableUser}
                    disabled={actionLoading === 'enable'}
                    className="w-full"
                  >
                    {actionLoading === 'enable' ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <UserCheck className="mr-2 h-4 w-4" />
                    )}
                    Enable User
                  </Button>
                ) : (
                  <Button
                    variant="outline"
                    onClick={handleDisableUser}
                    disabled={actionLoading === 'disable'}
                    className="w-full"
                  >
                    {actionLoading === 'disable' ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <UserX className="mr-2 h-4 w-4" />
                    )}
                    Disable User
                  </Button>
                )}
              </div>

              {/* Communication */}
              <div className="space-y-3">
                <h4 className="font-medium text-sm">Communication</h4>
                <Button
                  variant="outline"
                  onClick={handleOpenEmailDialog}
                  disabled={emailConfigStatus !== 'configured' || profile.is_disabled}
                  className="w-full"
                >
                  <Mail className="mr-2 h-4 w-4" />
                  Send Email
                </Button>
              </div>

              {/* Danger Zone */}
              <div className="space-y-3">
                <h4 className="font-medium text-sm text-red-600">Danger Zone</h4>
                <Button
                  variant="destructive"
                  onClick={handleDeleteUser}
                  disabled={actionLoading === 'delete'}
                  className="w-full"
                >
                  {actionLoading === 'delete' ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Trash2 className="mr-2 h-4 w-4" />
                  )}
                  Delete User
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
          </TabsContent>

          {/* Tab 3: Finance & Transactions */}
          <TabsContent value="finance" className="space-y-6">
        {/* Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-2xl font-bold">{stats.totalTransactions}</p>
                  <p className="text-xs text-muted-foreground">Total Transactions</p>
                </div>
                <CreditCard className="h-8 w-8 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-2xl font-bold">{stats.successfulTransactions}</p>
                  <p className="text-xs text-muted-foreground">Successful</p>
                </div>
                <div className="h-8 w-8 rounded-full bg-green-100 flex items-center justify-center">
                  <span className="text-green-600 text-sm font-bold">✓</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  {Object.keys(stats.spendingByCurrency).length === 0 ? (
                    <p className="text-2xl font-bold">No purchases</p>
                  ) : Object.keys(stats.spendingByCurrency).length === 1 ? (
                    <p className="text-2xl font-bold">
                      {formatCurrency(
                        Object.values(stats.spendingByCurrency)[0], 
                        Object.keys(stats.spendingByCurrency)[0]
                      )}
                    </p>
                  ) : (
                    <div className="space-y-1">
                      {Object.entries(stats.spendingByCurrency)
                        .sort(([,a], [,b]) => b - a) // Sort by amount descending
                        .slice(0, 2) // Show top 2 currencies
                        .map(([currency, amount]) => (
                          <p key={currency} className="text-lg font-bold">
                            {formatCurrency(amount, currency)}
                          </p>
                        ))}
                      {Object.keys(stats.spendingByCurrency).length > 2 && (
                        <p className="text-sm text-muted-foreground">
                          +{Object.keys(stats.spendingByCurrency).length - 2} more
                        </p>
                      )}
                    </div>
                  )}
                  <p className="text-xs text-muted-foreground">Total Spent</p>
                </div>
                <CreditCard className="h-8 w-8 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-2xl font-bold">{stats.activePurchases}</p>
                  <p className="text-xs text-muted-foreground">Active Purchases</p>
                </div>
                <ShoppingBag className="h-8 w-8 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Active Purchases */}
        <Card>
          <CardHeader>
            <CardTitle>Active Purchases</CardTitle>
            <CardDescription>Products this user currently has access to</CardDescription>
          </CardHeader>
          <CardContent>
            {purchases.filter(hasValidAccess).length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No active purchases
              </div>
            ) : (
              <div className="space-y-4">
                {purchases.filter(hasValidAccess).map((purchase) => (
                  <div key={purchase.id} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-medium">{purchase.product?.name || 'Unknown Product'}</h4>
                        <p className="text-sm text-muted-foreground">
                          {purchase.product?.short_description || purchase.product?.description}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          Purchased: {formatDate(purchase.created_at)}
                        </p>
                      </div>
                      <div className="text-right">
                        <Badge className="bg-green-100 text-green-800">Active</Badge>
                        {purchase.access_expires_at && (
                          <p className="text-xs text-muted-foreground mt-1">
                            Expires: {formatDate(purchase.access_expires_at)}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Transaction History */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Transaction History</CardTitle>
                <CardDescription>Complete payment history for this user</CardDescription>
              </div>
              <Button 
                variant="outline" 
                size="sm"
                onClick={handleOpenManualTransactionDialog}
                className="flex items-center gap-2"
              >
                <Plus className="h-4 w-4" />
                Create Manual Transaction
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {transactions.length === 0 ? (
              <div className="text-center py-12">
                <CreditCard className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No transactions yet</h3>
                <p className="text-gray-600">This user hasn't made any purchases.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-3 px-4 font-medium">Transaction</th>
                      <th className="text-left py-3 px-4 font-medium">Product</th>
                      <th className="text-left py-3 px-4 font-medium">Amount</th>
                      <th className="text-left py-3 px-4 font-medium">Status</th>
                      <th className="text-left py-3 px-4 font-medium">Date</th>
                      <th className="text-left py-3 px-4 font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {transactions.map((transaction) => (
                      <tr key={transaction.id} className="border-b hover:bg-gray-50">
                        <td className="py-3 px-4">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <p className="font-mono text-sm">{transaction.id.slice(0, 8)}...</p>
                              {isNewUserAccount(transaction) && (
                                <div title="Account created with this purchase">
                                  <Star className="h-3 w-3 text-green-500" />
                                </div>
                              )}
                              {(() => {
                                const metadata = transaction.metadata || {}
                                const isManual = metadata.manual_transaction === true
                                const isTestMode = metadata.livemode === false || metadata.stripeMode === 'test'
                                
                                return (
                                  <div className="flex items-center gap-1">
                                    {isManual && (
                                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                                        Manual
                                      </span>
                                    )}
                                    {isTestMode && (
                                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                                        Test
                                      </span>
                                    )}
                                  </div>
                                )
                              })()}
                            </div>
                            <p className="text-xs text-gray-500">
                              {(() => {
                                const types = transaction.payment_method_types || []
                                const metadata = transaction.metadata || {}
                                
                                // Check for manual transaction first
                                if (metadata.manual_transaction === true) {
                                  return 'Manual Transaction'
                                }
                                
                                // Check metadata for actual payment method
                                if (metadata.actualPaymentMethod) {
                                  return metadata.actualPaymentMethod === 'promptpay' ? 'PromptPay' : 
                                         metadata.actualPaymentMethod === 'card' ? 'Card' : 
                                         metadata.actualPaymentMethod
                                }
                                
                                // Fallback: prioritize specific payment methods
                                if (types.includes('promptpay')) return 'PromptPay'
                                if (types.includes('card')) return 'Card'
                                return types.join(', ')
                              })()}
                            </p>
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <div className="space-y-1">
                            <p className="text-sm font-medium">
                              {transaction.product?.name || 'Product not found'}
                            </p>
                            <p className="text-xs text-gray-500">
                              {formatPrice(transaction.price)}
                            </p>
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <p className="font-medium">
                            {formatCurrency(transaction.amount, transaction.currency)}
                          </p>
                        </td>
                        <td className="py-3 px-4">
                          {getStatusBadge(transaction.status)}
                        </td>
                        <td className="py-3 px-4">
                          <p className="text-sm">{formatDate(transaction.created_at)}</p>
                        </td>
                        <td className="py-3 px-4">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => window.open(
                              `https://dashboard.stripe.com/payments/${transaction.stripe_payment_intent_id}`,
                              '_blank'
                            )}
                          >
                            <ExternalLink className="h-4 w-4" />
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
          </TabsContent>

          {/* Tab 2: History & Activity */}
          <TabsContent value="history" className="space-y-6">
        {/* Email History */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <MailOpen className="h-5 w-5" />
                  Email History
                </CardTitle>
                <CardDescription>Recent emails sent to this user</CardDescription>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => router.push(`/admin/users/${userId}/emails`)}
              >
                View All
                <ChevronRight className="ml-1 h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {emailsLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
              </div>
            ) : emailLogs.length === 0 ? (
              <div className="text-center py-12">
                <MailOpen className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No emails sent yet</h3>
                <p className="text-gray-600">This user hasn't received any emails through the system.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Email Stats */}
                <div className="grid grid-cols-3 gap-4 mb-6">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-600">{emailStats.total}</div>
                    <div className="text-sm text-gray-600">Total Emails</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600">{emailStats.successful}</div>
                    <div className="text-sm text-gray-600">Delivered</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-purple-600">{getSuccessRate()}%</div>
                    <div className="text-sm text-gray-600">Success Rate</div>
                  </div>
                </div>

                {/* Recent Emails */}
                <div className="space-y-3">
                  {emailLogs.map((email) => (
                    <div 
                      key={email.id} 
                      className="border rounded-lg p-4 hover:bg-gray-50 transition-colors cursor-pointer"
                      onClick={() => handleEmailClick(email)}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <h4 className="font-medium text-sm hover:text-blue-600">{email.subject}</h4>
                            {getEmailStatusBadge(email.status)}
                          </div>
                          <p className="text-sm text-gray-600 line-clamp-2 mb-2">
                            {email.body.substring(0, 150)}...
                          </p>
                          <div className="flex items-center justify-between text-xs text-gray-500">
                            <div className="flex items-center gap-4">
                              <span className="flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                {formatDate(email.sent_at)}
                              </span>
                              {email.sender && (
                                <span className="flex items-center gap-1">
                                  <User className="h-3 w-3" />
                                  {email.sender.first_name} {email.sender.last_name}
                                </span>
                              )}
                            </div>
                            {email.error_message && (
                              <span className="text-red-600 text-xs">
                                Error: {email.error_message.substring(0, 50)}...
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center text-gray-400 hover:text-blue-600 transition-colors">
                          <Eye className="h-4 w-4" />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {emailStats.total > 5 && (
                  <div className="text-center pt-4">
                    <Button
                      variant="outline"
                      onClick={() => router.push(`/admin/users/${userId}/emails`)}
                    >
                      <Eye className="mr-2 h-4 w-4" />
                      View All {emailStats.total} Emails
                    </Button>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Admin Notes */}
        <UserNotes
          userId={userData.profile.id}
          userName={formatUserName(userData.profile)}
        />
          </TabsContent>
        </Tabs>

        {/* Edit Profile Dialog */}
        <Dialog open={editProfileDialogOpen} onOpenChange={setEditProfileDialogOpen}>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Edit User Profile</DialogTitle>
              <DialogDescription>
                Update the user's profile information. Changes will be saved immediately.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              {userData?.profile && (
                <div className="space-y-4">
                  <div className="text-center p-4 bg-gray-50 rounded-lg">
                    <div className="flex items-center justify-center mb-2">
                      <Avatar className="h-12 w-12">
                        <AvatarImage src="" alt="" />
                        <AvatarFallback className="text-lg">
                          {(userData.profile.first_name?.[0] || '') + (userData.profile.last_name?.[0] || '') || userData.profile.email[0].toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                    </div>
                    <p className="text-sm text-gray-600">Editing profile for: {userData.profile.email}</p>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="editFirstName">First Name</Label>
                      <Input
                        id="editFirstName"
                        value={editFirstName}
                        onChange={(e) => handleFirstNameChange(e.target.value)}
                        placeholder="Enter first name"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="editLastName">Last Name</Label>
                      <Input
                        id="editLastName"
                        value={editLastName}
                        onChange={(e) => handleLastNameChange(e.target.value)}
                        placeholder="Enter last name"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="editNickname">Nickname (Optional)</Label>
                    <Input
                      id="editNickname"
                      value={editNickname}
                      onChange={(e) => setEditNickname(e.target.value)}
                      placeholder="Enter nickname"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="editEmail">Email Address</Label>
                    <Input
                      id="editEmail"
                      type="email"
                      value={editEmail}
                      onChange={(e) => setEditEmail(e.target.value)}
                      placeholder="Enter email address"
                    />
                  </div>

                  {/* Confirmation notice */}
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                    <div className="flex items-start space-x-2">
                      <AlertCircle className="h-4 w-4 text-yellow-600 mt-0.5" />
                      <div className="text-sm text-yellow-800">
                        <p className="font-medium">Important:</p>
                        <p>Changing the email address will update the user's login credentials. The user will need to use the new email address to sign in.</p>
                      </div>
                    </div>
                  </div>

                  {error && (
                    <div className="text-sm text-red-600 bg-red-50 p-3 rounded-md">{error}</div>
                  )}
                  {message && (
                    <div className="text-sm text-green-600 bg-green-50 p-3 rounded-md">{message}</div>
                  )}
                </div>
              )}
            </div>
            <DialogFooter>
              <Button 
                variant="outline" 
                onClick={() => setEditProfileDialogOpen(false)}
                disabled={editingProfile}
              >
                Cancel
              </Button>
              <Button 
                onClick={handleSaveProfile} 
                disabled={editingProfile || !editFirstName.trim() || !editLastName.trim() || !editEmail.trim()}
              >
                {editingProfile ? 'Saving...' : 'Save Changes'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Email Detail Dialog */}
        <Dialog open={emailDetailDialogOpen} onOpenChange={setEmailDetailDialogOpen}>
          <DialogContent className="sm:max-w-[700px] max-h-[80vh] overflow-hidden">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <MailOpen className="h-5 w-5" />
                Email Details
              </DialogTitle>
              <DialogDescription>
                View the complete email content
              </DialogDescription>
            </DialogHeader>
            <div className="py-4 overflow-y-auto">
              {selectedEmail && (
                <div className="space-y-4">
                  {/* Email Header Info */}
                  <div className="bg-gray-50 p-4 rounded-lg space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-lg">{selectedEmail.subject}</h3>
                        {getEmailStatusBadge(selectedEmail.status)}
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="font-medium text-gray-500">Sent to:</span>
                        <p className="text-gray-900">{selectedEmail.recipient_email}</p>
                      </div>
                      <div>
                        <span className="font-medium text-gray-500">Sent at:</span>
                        <p className="text-gray-900">{formatDate(selectedEmail.sent_at)}</p>
                      </div>
                      {selectedEmail.sender && (
                        <div>
                          <span className="font-medium text-gray-500">Sent by:</span>
                          <p className="text-gray-900">
                            {selectedEmail.sender.first_name} {selectedEmail.sender.last_name}
                          </p>
                        </div>
                      )}
                      <div>
                        <span className="font-medium text-gray-500">Status:</span>
                        <p className="text-gray-900 capitalize">{selectedEmail.status}</p>
                      </div>
                    </div>

                    {selectedEmail.error_message && (
                      <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-md">
                        <div className="flex items-start gap-2">
                          <AlertCircle className="h-4 w-4 text-red-600 mt-0.5" />
                          <div>
                            <h4 className="text-sm font-medium text-red-800">Error Message</h4>
                            <p className="text-sm text-red-700 mt-1">{selectedEmail.error_message}</p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Email Body */}
                  <div>
                    <h4 className="font-medium text-gray-900 mb-3">Email Content</h4>
                    <div className="border rounded-lg p-4 bg-white max-h-96 overflow-y-auto">
                      <div 
                        className="prose prose-sm max-w-none"
                        dangerouslySetInnerHTML={{ 
                          __html: selectedEmail.body.replace(/\n/g, '<br>') 
                        }}
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>
            <DialogFooter>
              <Button 
                variant="outline" 
                onClick={() => setEmailDetailDialogOpen(false)}
              >
                Close
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete User Confirmation Dialog */}
        <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle className="text-red-700">Delete User Account</DialogTitle>
              <DialogDescription>
                This action cannot be undone. This will permanently delete the user account and all associated data.
              </DialogDescription>
            </DialogHeader>
            <div className="py-4">
              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="flex items-center space-x-3">
                  <div className="h-10 w-10 rounded-full bg-red-100 flex items-center justify-center">
                    <User className="h-5 w-5 text-red-600" />
                  </div>
                  <div>
                    <p className="font-medium">{formatUserName(profile)}</p>
                    <p className="text-sm text-gray-500">{profile.email}</p>
                  </div>
                </div>
              </div>
              <p className="text-sm text-gray-600 mt-4">
                Are you sure you want to delete this user? This will remove their profile and all associated data permanently.
              </p>
            </div>
            <DialogFooter>
              <Button 
                variant="outline" 
                onClick={() => setDeleteDialogOpen(false)}
                disabled={actionLoading === 'delete'}
              >
                Cancel
              </Button>
              <Button 
                variant="destructive" 
                onClick={confirmDeleteUser}
                disabled={actionLoading === 'delete'}
              >
                {actionLoading === 'delete' ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Deleting...
                  </>
                ) : (
                  <>
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete User
                  </>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Tag Management Dialog */}
        <Dialog open={tagDialogOpen} onOpenChange={setTagDialogOpen}>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Add Tags to User</DialogTitle>
              <DialogDescription>
                Add tags to {formatUserName(profile)}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-3">
                <Label>Select Tags to Add</Label>
                {availableTags.filter(tag => !tags.some(userTag => userTag.id === tag.id)).length === 0 ? (
                  <div className="text-center py-8">
                    <Tag className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                    <p className="text-sm text-gray-500">
                      All available tags are already assigned
                    </p>
                  </div>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {availableTags.filter(tag => !tags.some(userTag => userTag.id === tag.id)).map((tag) => (
                      <Button
                        key={tag.id}
                        variant={selectedTagsToManage.includes(tag.id) ? "default" : "outline"}
                        size="sm"
                        onClick={() => {
                          setSelectedTagsToManage(prev => 
                            prev.includes(tag.id) 
                              ? prev.filter(id => id !== tag.id)
                              : [...prev, tag.id]
                          )
                        }}
                        className="flex items-center space-x-2 transition-all"
                        style={selectedTagsToManage.includes(tag.id) ? { 
                          backgroundColor: tag.color, 
                          borderColor: tag.color,
                          color: 'white'
                        } : {}}
                      >
                        <div 
                          className="w-3 h-3 rounded-full" 
                          style={{ backgroundColor: tag.color }}
                        />
                        <span>{tag.name}</span>
                        {selectedTagsToManage.includes(tag.id) && (
                          <Check className="h-3 w-3" />
                        )}
                      </Button>
                    ))}
                  </div>
                )}
              </div>
              
              {selectedTagsToManage.length > 0 && (
                <div className="space-y-2">
                  <Label className="text-sm text-gray-600">
                    Selected {selectedTagsToManage.length} tag{selectedTagsToManage.length === 1 ? '' : 's'} will be added to this user
                  </Label>
                </div>
              )}

              {error && (
                <div className="text-sm text-red-600 bg-red-50 p-3 rounded-md">{error}</div>
              )}
            </div>
            <DialogFooter>
              <Button 
                variant="outline" 
                onClick={() => {
                  setTagDialogOpen(false)
                  setSelectedTagsToManage([])
                  setError('')
                }}
                disabled={tagManagementLoading}
              >
                Cancel
              </Button>
              <Button 
                onClick={handleTagManagement}
                disabled={tagManagementLoading || selectedTagsToManage.length === 0}
              >
                {tagManagementLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Adding...
                  </>
                ) : (
                  <>
                    <Tags className="mr-2 h-4 w-4" />
                    Add Tags
                  </>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Email Composition Dialog */}
        <Dialog open={emailDialogOpen} onOpenChange={setEmailDialogOpen}>
          <DialogContent className="sm:max-w-[600px]">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Mail className="h-5 w-5" />
                Send Email to User
              </DialogTitle>
              <DialogDescription>
                Send a personalized email to {formatUserName(profile)}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              {/* Recipient Info */}
              <div className="space-y-2">
                <Label>Recipient</Label>
                <div className="p-3 bg-gray-50 rounded-md">
                  <div className="flex items-center space-x-3">
                    <Avatar className="h-8 w-8">
                      <AvatarFallback>
                        {(profile.first_name?.[0] || '') + (profile.last_name?.[0] || '') || profile.email[0].toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <div className="text-sm font-medium">{formatUserName(profile)}</div>
                      <div className="text-xs text-gray-500">{profile.email}</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Subject */}
              <div className="space-y-2">
                <Label htmlFor="emailSubject">Subject *</Label>
                <Input
                  id="emailSubject"
                  value={emailSubject}
                  onChange={(e) => setEmailSubject(e.target.value)}
                  placeholder="Enter email subject"
                />
              </div>

              {/* Message */}
              <div className="space-y-2">
                <Label htmlFor="emailBody">Message *</Label>
                <Textarea
                  id="emailBody"
                  value={emailBody}
                  onChange={(e) => setEmailBody(e.target.value)}
                  placeholder="Enter your message here..."
                  rows={8}
                  className="resize-none"
                />
                <p className="text-xs text-gray-500">
                  Tip: Use {'{name}'} to personalize the email with the recipient's name
                </p>
              </div>

              {/* Email Config Status */}
              {emailConfigStatus !== 'configured' && (
                <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-md">
                  <div className="flex items-start space-x-2">
                    <AlertCircle className="h-4 w-4 text-yellow-600 mt-0.5" />
                    <div className="text-sm text-yellow-800">
                      <p className="font-medium">Email system not configured</p>
                      <p>Please configure SMTP settings in the <a href="/admin/email-config" className="underline">Email Configuration</a> page to send emails.</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Messages */}
              {error && (
                <div className="text-sm text-red-600 bg-red-50 p-3 rounded-md">{error}</div>
              )}
            </div>
            <DialogFooter>
              <Button 
                variant="outline" 
                onClick={() => {
                  setEmailDialogOpen(false)
                  setError('')
                }}
                disabled={sendingEmail}
              >
                Cancel
              </Button>
              <Button 
                onClick={handleSendEmail}
                disabled={sendingEmail || !emailSubject.trim() || !emailBody.trim() || emailConfigStatus !== 'configured'}
              >
                {sendingEmail ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Sending...
                  </>
                ) : (
                  <>
                    <Mail className="mr-2 h-4 w-4" />
                    Send Email
                  </>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Manual Transaction Dialog */}
        <Dialog open={manualTransactionDialogOpen} onOpenChange={setManualTransactionDialogOpen}>
          <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Create Manual Transaction</DialogTitle>
              <DialogDescription>
                Create a manual product purchase transaction for {formatUserName(profile)}
              </DialogDescription>
            </DialogHeader>
            <div className="py-4">
              <ManualTransactionForm
                userId={userData.profile.id}
                userName={formatUserName(userData.profile)}
                onSuccess={handleManualTransactionSuccess}
                onCancel={handleManualTransactionCancel}
              />
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  )
}

export const dynamic = 'force-dynamic'