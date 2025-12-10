'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import AdminLayout from '@/components/admin-layout'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Search,
  MoreHorizontal,
  UserPlus,
  Shield,
  ShieldOff,
  Trash2,
  Mail,
  MailOpen,
  Calendar,
  UserX,
  UserCheck,
  Eye,
  CreditCard,
  Upload,
  FileText,
  X,
  Check,
  AlertCircle,
  Tag,
  Plus,
  Filter,
  Edit,
  Tags,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  MessageSquare,
  ShoppingBag,
} from 'lucide-react'
import UserNotesPreview from '@/components/user-notes-preview'
import BulkManualTransactionForm from '@/components/bulk-manual-transaction-form'
import { Crown } from 'lucide-react'

interface User {
  id: string
  email: string
  created_at: string
  last_sign_in_at?: string
  user_metadata: {
    first_name?: string
    last_name?: string
  }
}

interface Profile {
  id: string
  email: string
  first_name?: string
  last_name?: string
  nickname?: string
  role: 'user' | 'admin' | 'super_admin'
  is_disabled?: boolean
  is_super_admin?: boolean  // Added for Super Admin detection
  effective_role?: string   // Added for display purposes
  created_at: string
  updated_at: string
}

interface UserTag {
  id: string
  name: string
  color: string
  description?: string
}

interface UserProduct {
  id: string
  name: string
  access_granted: boolean
  access_expires_at: string | null
}

interface UserWithProfile extends User {
  profile?: Profile
  tags?: UserTag[]
  notes_count?: number
  products?: UserProduct[]
}

export default function UserManagement() {
  const [users, setUsers] = useState<UserWithProfile[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [loading, setLoading] = useState(true)
  const [selectedUsers, setSelectedUsers] = useState<Set<string>>(new Set())
  const [bulkTagDialogOpen, setBulkTagDialogOpen] = useState(false)
  const [bulkTagOperation, setBulkTagOperation] = useState<'add' | 'remove'>('add')
  const [selectedTagsForBulk, setSelectedTagsForBulk] = useState<string[]>([])
  const [bulkTagLoading, setBulkTagLoading] = useState(false)
  const [addUserDialogOpen, setAddUserDialogOpen] = useState(false)
  const [newUserEmail, setNewUserEmail] = useState('')
  const [newUserFirstName, setNewUserFirstName] = useState('')
  const [newUserLastName, setNewUserLastName] = useState('')
  const [newUserNickname, setNewUserNickname] = useState('')
  const [newUserPassword, setNewUserPassword] = useState('')
  const [addUserLoading, setAddUserLoading] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [userToDelete, setUserToDelete] = useState<UserWithProfile | null>(null)
  const [deleteLoading, setDeleteLoading] = useState(false)
  const [adminConfirmDialogOpen, setAdminConfirmDialogOpen] = useState(false)
  const [userToPromote, setUserToPromote] = useState<UserWithProfile | null>(null)
  const [promoteLoading, setPromoteLoading] = useState(false)
  const [demoteConfirmDialogOpen, setDemoteConfirmDialogOpen] = useState(false)
  const [userToDemote, setUserToDemote] = useState<UserWithProfile | null>(null)
  const [demoteLoading, setDemoteLoading] = useState(false)
  const [profileDialogOpen, setProfileDialogOpen] = useState(false)
  const [selectedUser, setSelectedUser] = useState<UserWithProfile | null>(null)
  const [csvImportDialogOpen, setCsvImportDialogOpen] = useState(false)
  const [csvEmails, setCsvEmails] = useState<string[]>([])
  const [csvImporting, setCsvImporting] = useState(false)
  const [csvImportResults, setCsvImportResults] = useState<{
    total: number
    successful: number
    failed: number
    errors: { email: string; error: string }[]
  } | null>(null)
  const [availableTags, setAvailableTags] = useState<UserTag[]>([])
  const [selectedTags, setSelectedTags] = useState<string[]>([])
  const [filterByTags, setFilterByTags] = useState<string[]>([])
  const [showCreateTagDialog, setShowCreateTagDialog] = useState(false)
  const [newTagName, setNewTagName] = useState('')
  const [newTagColor, setNewTagColor] = useState('#3b82f6')
  const [newTagDescription, setNewTagDescription] = useState('')
  const [creatingTag, setCreatingTag] = useState(false)
  const [editProfileDialogOpen, setEditProfileDialogOpen] = useState(false)
  const [bulkManualTransactionDialogOpen, setBulkManualTransactionDialogOpen] = useState(false)
  const [userToEdit, setUserToEdit] = useState<UserWithProfile | null>(null)
  const [editingProfile, setEditingProfile] = useState(false)
  const [editFirstName, setEditFirstName] = useState('')
  const [editLastName, setEditLastName] = useState('')
  const [editEmail, setEditEmail] = useState('')
  const [editNickname, setEditNickname] = useState('')
  const [editSelectedTags, setEditSelectedTags] = useState<string[]>([])

  // Pagination state
  const [page, setPage] = useState(1)
  const [limit, setLimit] = useState(50)
  const [total, setTotal] = useState(0)
  const [totalPages, setTotalPages] = useState(0)
  const [hasNextPage, setHasNextPage] = useState(false)
  const [hasPreviousPage, setHasPreviousPage] = useState(false)
  
  // Search and filter state
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('')
  const [roleFilter, setRoleFilter] = useState('')
  const [disabledFilter, setDisabledFilter] = useState('')
  
  // Notes preview state
  const [notesPreviewOpen, setNotesPreviewOpen] = useState(false)
  const [notesPreviewUser, setNotesPreviewUser] = useState<UserWithProfile | null>(null)
  
  const supabase = createClient()

  // Debounce search term
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm)
    }, 300)

    return () => clearTimeout(timer)
  }, [searchTerm])

  // Reset to page 1 when search/filters change
  useEffect(() => {
    setPage(1)
  }, [debouncedSearchTerm, roleFilter, disabledFilter, filterByTags])

  // Selection helper functions
  const handleSelectUser = (userId: string, checked: boolean) => {
    setSelectedUsers(prev => {
      const newSet = new Set(prev)
      if (checked) {
        newSet.add(userId)
      } else {
        newSet.delete(userId)
      }
      return newSet
    })
  }

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedUsers(new Set(users.map(user => user.id)))
    } else {
      setSelectedUsers(new Set())
    }
  }

  const clearSelection = () => {
    setSelectedUsers(new Set())
  }

  // Notes preview handler
  const handleNotesPreview = (user: UserWithProfile) => {
    setNotesPreviewUser(user)
    setNotesPreviewOpen(true)
  }

  // Pagination handlers
  const handlePageChange = (newPage: number) => {
    setPage(newPage)
    clearSelection() // Clear selection when changing pages
  }

  const handleLimitChange = (newLimit: string) => {
    setLimit(parseInt(newLimit))
    setPage(1) // Reset to first page when changing limit
    clearSelection()
  }

  const handleBulkTagOperation = async () => {
    if (selectedUsers.size === 0 || selectedTagsForBulk.length === 0) {
      setError('Please select users and tags')
      return
    }

    setBulkTagLoading(true)
    setError('')
    setMessage('')

    try {
      const response = await fetch('/api/admin/users/bulk-tag', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userIds: Array.from(selectedUsers),
          tagIds: selectedTagsForBulk,
          operation: bulkTagOperation
        }),
      })

      const result = await response.json()

      if (!response.ok) {
        setError(result.error || 'Failed to update user tags')
        return
      }

      setMessage(result.message)
      setBulkTagDialogOpen(false)
      setSelectedTagsForBulk([])
      clearSelection()
      
      // Refresh users to show updated tags
      await fetchUsers()

    } catch (err) {
      setError('An unexpected error occurred')
    } finally {
      setBulkTagLoading(false)
    }
  }

  // Bulk manual transaction handlers
  const handleBulkManualTransactionSuccess = () => {
    setBulkManualTransactionDialogOpen(false)
    clearSelection()
    setMessage('Bulk manual transactions created successfully')
    
    // Refresh users to show updated transaction history
    fetchUsers()
  }

  const handleBulkManualTransactionCancel = () => {
    setBulkManualTransactionDialogOpen(false)
  }

  // Fetch tags once on mount
  useEffect(() => {
    fetchTags()
  }, [])

  // Fetch users when page, search, or filters change
  useEffect(() => {
    fetchUsers()
  }, [page, limit, debouncedSearchTerm, roleFilter, disabledFilter, filterByTags])

  const fetchUsers = async () => {
    setLoading(true)
    setError('')
    try {
      // Build query parameters
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
      })

      if (debouncedSearchTerm) {
        params.append('search', debouncedSearchTerm)
      }

      if (roleFilter) {
        params.append('role', roleFilter)
      }

      if (disabledFilter) {
        params.append('disabled', disabledFilter)
      }

      if (filterByTags.length > 0) {
        params.append('tags', filterByTags.join(','))
      }

      // Fetch paginated users with filters
      const response = await fetch(`/api/admin/users-paginated?${params}`)
      const result = await response.json()

      if (!response.ok) {
        setError(result.error || 'Failed to fetch users')
        return
      }

      // Set users and pagination info
      setUsers(result.users || [])
      setTotal(result.pagination.total)
      setTotalPages(result.pagination.totalPages)
      setHasNextPage(result.pagination.hasNextPage)
      setHasPreviousPage(result.pagination.hasPreviousPage)

    } catch (error) {
      console.error('Error fetching users:', error)
      setError(`An unexpected error occurred: ${error}`)
    } finally {
      setLoading(false)
    }
  }

  const fetchTags = async () => {
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

  const handleAddUser = async () => {
    if (!newUserEmail || !newUserPassword || !newUserFirstName || !newUserLastName) {
      setError('All fields are required')
      return
    }

    setAddUserLoading(true)
    setError('')
    setMessage('')

    try {
      // Create user in Supabase Auth
      const { data, error: authError } = await supabase.auth.signUp({
        email: newUserEmail,
        password: newUserPassword,
        options: {
          data: {
            first_name: newUserFirstName,
            last_name: newUserLastName,
            nickname: newUserNickname || null,
          },
        },
      })

      if (authError) {
        setError(`Failed to create user: ${authError.message}`)
        return
      }

      if (data.user) {
        // The profile will be automatically created by the trigger
        setMessage('User created successfully!')
        setNewUserEmail('')
        setNewUserFirstName('')
        setNewUserLastName('')
        setNewUserNickname('')
        setNewUserPassword('')
        setAddUserDialogOpen(false)
        
        // Refresh users list
        await fetchUsers()
      }
    } catch (error) {
      console.error('Error creating user:', error)
      setError('An unexpected error occurred')
    } finally {
      setAddUserLoading(false)
    }
  }

  const handleAdminAction = async (action: string, userId: string) => {
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
      await fetchUsers()
    } catch (error) {
      console.error(`Error ${action} user:`, error)
      setError('An unexpected error occurred')
    }
  }

  const handleMakeAdmin = async (user: UserWithProfile) => {
    setUserToPromote(user)
    setAdminConfirmDialogOpen(true)
  }

  const confirmPromoteToAdmin = async () => {
    if (!userToPromote) return

    setPromoteLoading(true)
    try {
      await handleAdminAction('promote', userToPromote.id)
      setAdminConfirmDialogOpen(false)
      setUserToPromote(null)
    } catch {
      // Error handling is already done in handleAdminAction
    } finally {
      setPromoteLoading(false)
    }
  }

  const handleRemoveAdmin = async (user: UserWithProfile) => {
    setUserToDemote(user)
    setDemoteConfirmDialogOpen(true)
  }

  const confirmDemoteFromAdmin = async () => {
    if (!userToDemote) return

    setDemoteLoading(true)
    try {
      await handleAdminAction('demote', userToDemote.id)
      setDemoteConfirmDialogOpen(false)
      setUserToDemote(null)
    } catch {
      // Error handling is already done in handleAdminAction
    } finally {
      setDemoteLoading(false)
    }
  }

  const handleDisableUser = async (userId: string) => {
    await handleAdminAction('disable', userId)
  }

  const handleEnableUser = async (userId: string) => {
    await handleAdminAction('enable', userId)
  }

  const handleDeleteUser = async (user: UserWithProfile) => {
    setUserToDelete(user)
    setDeleteDialogOpen(true)
  }

  const confirmDeleteUser = async () => {
    if (!userToDelete) return

    setDeleteLoading(true)
    try {
      await handleAdminAction('delete', userToDelete.id)
      setDeleteDialogOpen(false)
      setUserToDelete(null)
    } catch {
      // Error handling is already done in handleAdminAction
    } finally {
      setDeleteLoading(false)
    }
  }


  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  const getUserInitials = (user: UserWithProfile) => {
    return (user.user_metadata.first_name?.[0] || '') + (user.user_metadata.last_name?.[0] || '') || user.email[0].toUpperCase()
  }

  const getUserDisplayName = (user: UserWithProfile) => {
    const fullName = `${user.user_metadata.first_name || ''} ${user.user_metadata.last_name || ''}`.trim()
    if (user.profile?.nickname && fullName) {
      return `${fullName} (${user.profile.nickname})`
    }
    return fullName || user.profile?.nickname || user.email
  }

  const clearMessages = () => {
    setError('')
    setMessage('')
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

  const handleNewUserFirstNameChange = (value: string) => {
    setNewUserFirstName(value)
    
    // Parse if contains spaces
    if (value.includes(' ') && value.trim().split(/\s+/).length > 1) {
      const { firstName, lastName } = parseFullName(value)
      setNewUserFirstName(firstName)
      setNewUserLastName(lastName)
      
      // Focus nickname field after parsing
      setTimeout(() => {
        const nicknameField = document.getElementById('nickname')
        nicknameField?.focus()
      }, 0)
    }
  }

  const handleNewUserLastNameChange = (value: string) => {
    setNewUserLastName(value)
    
    // Parse if contains spaces and first name is empty
    if (value.includes(' ') && value.trim().split(/\s+/).length > 1 && !newUserFirstName.trim()) {
      const { firstName, lastName } = parseFullName(value)
      setNewUserFirstName(firstName)
      setNewUserLastName(lastName)
      
      // Focus nickname field after parsing
      setTimeout(() => {
        const nicknameField = document.getElementById('nickname')
        nicknameField?.focus()
      }, 0)
    }
  }

  const handleViewProfile = (user: UserWithProfile) => {
    setSelectedUser(user)
    setProfileDialogOpen(true)
  }

  const handleCsvFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    setCsvEmails([])
    setCsvImportResults(null)

    const reader = new FileReader()
    reader.onload = (e) => {
      const text = e.target?.result as string
      const lines = text.split('\n').map(line => line.trim()).filter(Boolean)
      
      // Skip header row if it contains "email" or similar
      const firstLine = lines[0]?.toLowerCase()
      const startIndex = firstLine?.includes('email') ? 1 : 0
      
      const emails = lines.slice(startIndex).filter(email => email && email.includes('@'))
      setCsvEmails(emails)
    }
    reader.readAsText(file)
  }

  const handleCsvImport = async () => {
    if (csvEmails.length === 0) {
      setError('No valid emails found in CSV file')
      return
    }

    setCsvImporting(true)
    setError('')
    setMessage('')

    try {
      const response = await fetch('/api/admin/users/import', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ emails: csvEmails, tagIds: selectedTags }),
      })

      const result = await response.json()

      if (!response.ok) {
        setError(result.error || 'Failed to import users')
        return
      }

      setCsvImportResults(result.results)
      setMessage(result.message)
      
      // Refresh users list
      await fetchUsers()
      
      // Clear form
      setCsvEmails([])
    } catch (error) {
      console.error('Error importing CSV:', error)
      setError('An unexpected error occurred during import')
    } finally {
      setCsvImporting(false)
    }
  }

  const resetCsvImport = () => {
    setCsvEmails([])
    setCsvImportResults(null)
    setSelectedTags([])
    setError('')
    setMessage('')
  }

  const handleCreateTag = async () => {
    if (!newTagName.trim()) {
      setError('Tag name is required')
      return
    }

    setCreatingTag(true)
    setError('')

    try {
      const response = await fetch('/api/admin/tags', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'create',
          name: newTagName.trim(),
          color: newTagColor,
          description: newTagDescription.trim() || undefined
        }),
      })

      const result = await response.json()

      if (!response.ok) {
        setError(result.error || 'Failed to create tag')
        return
      }

      setMessage('Tag created successfully!')
      setNewTagName('')
      setNewTagColor('#3b82f6')
      setNewTagDescription('')
      setShowCreateTagDialog(false)
      await fetchTags()
    } catch (error) {
      console.error('Error creating tag:', error)
      setError('An unexpected error occurred')
    } finally {
      setCreatingTag(false)
    }
  }

  const handleAssignTag = async (userId: string, tagId: string) => {
    try {
      const response = await fetch('/api/admin/tags', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'assign',
          userId,
          tagId
        }),
      })

      const result = await response.json()

      if (!response.ok) {
        setError(result.error || 'Failed to assign tag')
        return
      }

      setMessage('Tag assigned successfully!')
      await fetchUsers()
    } catch (error) {
      console.error('Error assigning tag:', error)
      setError('An unexpected error occurred')
    }
  }

  const handleRemoveTag = async (userId: string, tagId: string) => {
    try {
      const response = await fetch('/api/admin/tags', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'remove',
          userId,
          tagId
        }),
      })

      const result = await response.json()

      if (!response.ok) {
        setError(result.error || 'Failed to remove tag')
        return
      }

      setMessage('Tag removed successfully!')
      await fetchUsers()
    } catch (error) {
      console.error('Error removing tag:', error)
      setError('An unexpected error occurred')
    }
  }

  const handleEditProfile = (user: UserWithProfile) => {
    setUserToEdit(user)
    setEditFirstName(user.profile?.first_name || '')
    setEditLastName(user.profile?.last_name || '')
    setEditEmail(user.email)
    setEditSelectedTags(user.tags?.map(tag => tag.id) || [])
    setEditProfileDialogOpen(true)
    setError('')
    setMessage('')
  }

  const handleSaveProfile = async () => {
    if (!userToEdit) return

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
    setError('')
    setMessage('')

    try {
      const response = await fetch('/api/admin/users/edit-profile', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: userToEdit.id,
          firstName: editFirstName.trim(),
          lastName: editLastName.trim(),
          email: editEmail.trim(),
          tagIds: editSelectedTags
        }),
      })

      const result = await response.json()

      if (!response.ok) {
        setError(result.error || 'Failed to update profile')
        return
      }

      setMessage('Profile updated successfully!')
      setEditProfileDialogOpen(false)
      await fetchUsers()
    } catch (error) {
      console.error('Error updating profile:', error)
      setError('An unexpected error occurred')
    } finally {
      setEditingProfile(false)
    }
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <p className="text-gray-600">Manage users, roles, and permissions</p>
          </div>
          <div className="flex gap-2">
            <Dialog open={showCreateTagDialog} onOpenChange={setShowCreateTagDialog}>
              <DialogTrigger asChild>
                <Button variant="outline" onClick={() => { setError(''); setMessage(''); }}>
                  <Tag className="mr-2 h-4 w-4" />
                  Create Tag
                </Button>
              </DialogTrigger>
            </Dialog>
            <Dialog open={csvImportDialogOpen} onOpenChange={setCsvImportDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" onClick={resetCsvImport}>
                  <Upload className="mr-2 h-4 w-4" />
                  Import CSV
                </Button>
              </DialogTrigger>
            </Dialog>
            <Dialog open={addUserDialogOpen} onOpenChange={setAddUserDialogOpen}>
              <DialogTrigger asChild>
                <Button onClick={clearMessages}>
                  <UserPlus className="mr-2 h-4 w-4" />
                  Add User
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>Add New User</DialogTitle>
                <DialogDescription>
                  Create a new user account. The user will receive an email confirmation.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="firstName">First Name</Label>
                    <Input
                      id="firstName"
                      value={newUserFirstName}
                      onChange={(e) => handleNewUserFirstNameChange(e.target.value)}
                      placeholder="John"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="lastName">Last Name</Label>
                    <Input
                      id="lastName"
                      value={newUserLastName}
                      onChange={(e) => handleNewUserLastNameChange(e.target.value)}
                      placeholder="Doe"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="nickname">Nickname (Optional)</Label>
                  <Input
                    id="nickname"
                    value={newUserNickname}
                    onChange={(e) => setNewUserNickname(e.target.value)}
                    placeholder="Johnny"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={newUserEmail}
                    onChange={(e) => setNewUserEmail(e.target.value)}
                    placeholder="john.doe@example.com"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <Input
                    id="password"
                    type="password"
                    value={newUserPassword}
                    onChange={(e) => setNewUserPassword(e.target.value)}
                    placeholder="Minimum 6 characters"
                  />
                </div>
                {error && (
                  <div className="text-sm text-red-600">{error}</div>
                )}
                {message && (
                  <div className="text-sm text-green-600">{message}</div>
                )}
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setAddUserDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleAddUser} disabled={addUserLoading}>
                  {addUserLoading ? 'Creating...' : 'Create User'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
          </div>
        </div>

        {/* Global Messages */}
        {error && (
          <div className="text-sm text-red-600 bg-red-50 p-3 rounded-md">{error}</div>
        )}
        {message && (
          <div className="text-sm text-green-600 bg-green-50 p-3 rounded-md">{message}</div>
        )}

        <Card>
          <CardHeader>
            <div className="flex gap-2 w-full">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="Search users..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 w-full"
                />
              </div>
              
              {/* Role Filter */}
              <Select value={roleFilter || "all"} onValueChange={(value) => setRoleFilter(value === "all" ? "" : value)}>
                <SelectTrigger className="w-32">
                  <SelectValue placeholder="Role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Roles</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="user">User</SelectItem>
                </SelectContent>
              </Select>

              {/* Status Filter */}
              <Select value={disabledFilter || "all"} onValueChange={(value) => setDisabledFilter(value === "all" ? "" : value)}>
                <SelectTrigger className="w-32">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="false">Active</SelectItem>
                  <SelectItem value="true">Disabled</SelectItem>
                </SelectContent>
              </Select>
              
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline">
                    <Filter className="mr-2 h-4 w-4" />
                    Filter by Tags
                    {filterByTags.length > 0 && (
                      <span className="ml-1 px-1.5 py-0.5 text-xs bg-blue-100 text-blue-800 rounded-full">
                        {filterByTags.length}
                      </span>
                    )}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel>Filter by Tags</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  {availableTags.map((tag) => (
                    <DropdownMenuItem
                      key={tag.id}
                      onClick={() => {
                        setFilterByTags(prev => 
                          prev.includes(tag.id) 
                            ? prev.filter(id => id !== tag.id)
                            : [...prev, tag.id]
                        )
                      }}
                      className="flex items-center space-x-2"
                    >
                      <div className="flex items-center space-x-2 flex-1">
                        <div 
                          className="w-3 h-3 rounded-full" 
                          style={{ backgroundColor: tag.color }}
                        />
                        <span>{tag.name}</span>
                      </div>
                      {filterByTags.includes(tag.id) && (
                        <Check className="h-4 w-4" />
                      )}
                    </DropdownMenuItem>
                  ))}
                  {filterByTags.length > 0 && (
                    <>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        onClick={() => setFilterByTags([])}
                        className="text-red-600"
                      >
                        Clear Filters
                      </DropdownMenuItem>
                    </>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </CardHeader>
          <CardContent>
            {/* Bulk Actions Toolbar */}
            {selectedUsers.size > 0 && (
              <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <span className="text-sm font-medium text-blue-900">
                      {selectedUsers.size} user{selectedUsers.size === 1 ? '' : 's'} selected
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={clearSelection}
                    >
                      Clear Selection
                    </Button>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setBulkTagOperation('add')
                        setBulkTagDialogOpen(true)
                      }}
                    >
                      <Tags className="mr-1 h-4 w-4" />
                      Add Tags
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setBulkTagOperation('remove')
                        setBulkTagDialogOpen(true)
                      }}
                    >
                      <Tags className="mr-1 h-4 w-4" />
                      Remove Tags
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setBulkManualTransactionDialogOpen(true)}
                    >
                      <CreditCard className="mr-1 h-4 w-4" />
                      Create Transactions
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {/* Select All Checkbox */}
            {!loading && users.length > 0 && (
              <div className="mb-4 flex items-center space-x-2">
                <Checkbox
                  checked={selectedUsers.size === users.length && users.length > 0}
                  onCheckedChange={handleSelectAll}
                />
                <Label className="text-sm font-medium">
                  Select all {users.length} user{users.length === 1 ? '' : 's'}
                </Label>
              </div>
            )}

            {loading ? (
              <div className="flex justify-center py-8">
                <div className="text-gray-500">Loading users...</div>
              </div>
            ) : (
              <div className="space-y-4">
                {users.map((user) => (
                  <div key={user.id} className="relative group">
                    <div className="flex items-center justify-between p-4 pr-36 border rounded-lg hover:bg-gray-50 hover:border-blue-300 transition-all">
                      <div className="flex items-center space-x-4">
                        {/* Checkbox */}
                        <Checkbox
                          checked={selectedUsers.has(user.id)}
                          onCheckedChange={(checked) => handleSelectUser(user.id, checked as boolean)}
                        />
                        {/* User content wrapped in Link */}
                        <Link 
                          href={`/admin/users/${user.id}`}
                          className="flex items-center space-x-4 flex-1 cursor-pointer"
                        >
                          <Avatar className="h-10 w-10">
                            <AvatarImage src="" alt="" />
                            <AvatarFallback>{getUserInitials(user)}</AvatarFallback>
                          </Avatar>
                          <div>
                            <div className="flex items-center space-x-2">
                              <p className="font-medium group-hover:text-blue-700 transition-colors">
                                {getUserDisplayName(user)}
                              </p>
                              {/* Notes indicator - only show when user has notes */}
                              {(user.notes_count ?? 0) > 0 && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={(e) => {
                                    e.preventDefault()
                                    e.stopPropagation()
                                    handleNotesPreview(user)
                                  }}
                                  className="flex items-center gap-1 text-blue-600 hover:text-blue-700 hover:bg-blue-50 transition-colors h-6 px-2"
                                  title={`View ${user.notes_count ?? 0} note${(user.notes_count ?? 0) === 1 ? '' : 's'}`}
                                >
                                  <MessageSquare className="h-3 w-3" />
                                  <span className="text-xs font-medium">{user.notes_count ?? 0}</span>
                                </Button>
                              )}
                              {user.profile?.is_super_admin && (
                                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-purple-600 text-white shadow-sm">
                                  <Crown className="mr-1 h-3 w-3" />
                                  Super Admin
                                </span>
                              )}
                              {!user.profile?.is_super_admin && user.profile?.role === 'admin' && (
                                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                  <Shield className="mr-1 h-3 w-3" />
                                  Admin
                                </span>
                              )}
                              {user.profile?.is_disabled && (
                                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                                  <UserX className="mr-1 h-3 w-3" />
                                  Disabled
                                </span>
                              )}
                            </div>
                            {user.tags && user.tags.length > 0 && (
                              <div className="flex items-center space-x-1 mt-1 flex-wrap">
                                {user.tags.map((tag) => (
                                  <span 
                                    key={tag.id}
                                    className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium text-white"
                                    style={{ backgroundColor: tag.color }}
                                  >
                                    <Tag className="mr-1 h-2.5 w-2.5" />
                                    {tag.name}
                                  </span>
                                ))}
                              </div>
                            )}
                            {user.products && user.products.length > 0 && (
                              <div className="flex items-center space-x-1 mt-1 flex-wrap">
                                {user.products.map((product) => (
                                  <span 
                                    key={product.id}
                                    className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800"
                                    title={product.access_expires_at ? `Expires: ${new Date(product.access_expires_at).toLocaleDateString()}` : 'Lifetime access'}
                                  >
                                    <ShoppingBag className="mr-1 h-2.5 w-2.5" />
                                    {product.name}
                                  </span>
                                ))}
                              </div>
                            )}
                            <div className="flex items-center space-x-4 text-sm text-gray-500">
                              <div className="flex items-center space-x-1">
                                <Mail className="h-3 w-3" />
                                <span>{user.email}</span>
                              </div>
                              <div className="flex items-center space-x-1">
                                <Calendar className="h-3 w-3" />
                                <span>Joined {formatDate(user.created_at)}</span>
                              </div>
                            </div>
                          </div>
                        </Link>
                      </div>
                      <div className="flex items-center space-x-3">
                        <span className="text-sm text-gray-500">
                          Last seen: {user.last_sign_in_at ? formatDate(user.last_sign_in_at) : 'Never'}
                        </span>
                      </div>
                    </div>
                    
                    {/* Dropdown menu positioned absolutely to prevent link interference */}
                    <div className="absolute top-1/2 -translate-y-1/2 right-6 z-10 pr-2">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={(e) => {
                              e.preventDefault()
                              e.stopPropagation()
                              clearMessages()
                              console.log('⚙️ Actions menu opened for user:', user.email)
                            }}
                            className="bg-blue-600 hover:bg-blue-700 text-white border-none shadow-md hover:shadow-lg transition-shadow"
                          >
                            <MoreHorizontal className="h-4 w-4 mr-2" />
                            Actions
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-56">
                          <DropdownMenuLabel>User Actions</DropdownMenuLabel>
                          <DropdownMenuSeparator />

                          {/* GROUP 1: Profile & Access */}
                          <div className="px-2 py-1.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                            Profile & Access
                          </div>
                          <DropdownMenuItem onClick={() => handleViewProfile(user)}>
                            <Eye className="mr-2 h-4 w-4 text-blue-600" />
                            View Profile
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleEditProfile(user)}>
                            <Edit className="mr-2 h-4 w-4 text-blue-600" />
                            Edit Profile
                          </DropdownMenuItem>
                          {user.profile?.is_super_admin ? (
                            <DropdownMenuItem disabled className="text-gray-400 cursor-not-allowed">
                              <Crown className="mr-2 h-4 w-4 text-purple-400" />
                              Super Admin (Protected)
                            </DropdownMenuItem>
                          ) : user.profile?.role === 'admin' ? (
                            <DropdownMenuItem onClick={() => handleRemoveAdmin(user)}>
                              <ShieldOff className="mr-2 h-4 w-4 text-orange-600" />
                              Remove Admin
                            </DropdownMenuItem>
                          ) : (
                            <DropdownMenuItem onClick={() => handleMakeAdmin(user)}>
                              <Shield className="mr-2 h-4 w-4 text-green-600" />
                              Make Admin
                            </DropdownMenuItem>
                          )}

                          <DropdownMenuSeparator />

                          {/* GROUP 2: Communication & History */}
                          <div className="px-2 py-1.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                            Communication & History
                          </div>
                          <DropdownMenuItem asChild>
                            <Link href={`/admin/users/${user.id}?action=send-email`}>
                              <Mail className="mr-2 h-4 w-4 text-purple-600" />
                              Send Email
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuItem asChild>
                            <Link href={`/admin/users/${user.id}/emails`}>
                              <MailOpen className="mr-2 h-4 w-4 text-purple-600" />
                              View Email History
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuItem asChild>
                            <Link href={`/admin/users/${user.id}#transactions`}>
                              <CreditCard className="mr-2 h-4 w-4 text-purple-600" />
                              View Transaction History
                            </Link>
                          </DropdownMenuItem>

                          <DropdownMenuSeparator />

                          {/* GROUP 3: Tag Management */}
                          <div className="px-2 py-1.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                            Manage Tags
                          </div>
                          {availableTags.map((tag) => {
                            const hasTag = user.tags?.some(userTag => userTag.id === tag.id)
                            return (
                              <DropdownMenuItem
                                key={tag.id}
                                onClick={() => hasTag ? handleRemoveTag(user.id, tag.id) : handleAssignTag(user.id, tag.id)}
                                className="flex items-center space-x-2"
                              >
                                <div className="flex items-center space-x-2 flex-1">
                                  <div
                                    className="w-3 h-3 rounded-full"
                                    style={{ backgroundColor: tag.color }}
                                  />
                                  <span>{tag.name}</span>
                                </div>
                                {hasTag ? (
                                  <X className="h-4 w-4 text-red-500" />
                                ) : (
                                  <Plus className="h-4 w-4 text-green-500" />
                                )}
                              </DropdownMenuItem>
                            )
                          })}

                          <DropdownMenuSeparator className="bg-red-200" />

                          {/* GROUP 4: Danger Zone */}
                          <div className="px-2 py-1.5 text-xs font-semibold text-red-600 uppercase tracking-wide bg-red-50 rounded-sm">
                            ⚠️ Danger Zone
                          </div>
                          {user.profile?.is_super_admin ? (
                            <>
                              <DropdownMenuItem disabled className="text-gray-400 cursor-not-allowed">
                                <Crown className="mr-2 h-4 w-4 text-purple-400" />
                                Cannot disable Super Admin
                              </DropdownMenuItem>
                              <DropdownMenuItem disabled className="text-gray-400 cursor-not-allowed">
                                <Crown className="mr-2 h-4 w-4 text-purple-400" />
                                Cannot delete Super Admin
                              </DropdownMenuItem>
                            </>
                          ) : (
                            <>
                              {user.profile?.is_disabled ? (
                                <DropdownMenuItem
                                  onClick={() => handleEnableUser(user.id)}
                                  className="text-orange-600 focus:text-orange-700 focus:bg-orange-50"
                                >
                                  <UserCheck className="mr-2 h-4 w-4" />
                                  Enable User
                                </DropdownMenuItem>
                              ) : (
                                <DropdownMenuItem
                                  onClick={() => handleDisableUser(user.id)}
                                  className="text-orange-600 focus:text-orange-700 focus:bg-orange-50"
                                >
                                  <UserX className="mr-2 h-4 w-4" />
                                  Disable User
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuItem
                                className="text-red-600 focus:text-red-700 focus:bg-red-50 font-semibold"
                                onClick={() => handleDeleteUser(user)}
                              >
                                <Trash2 className="mr-2 h-4 w-4" />
                                Delete User
                              </DropdownMenuItem>
                            </>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                ))}
                {users.length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    {searchTerm ? 'No users found matching your search.' : 'No users found.'}
                  </div>
                )}
              </div>
            )}

            {/* Pagination Controls */}
            {total > 0 && (
              <div className="border-t pt-6 mt-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <span className="text-sm text-gray-700">
                      Showing {((page - 1) * limit) + 1} to {Math.min(page * limit, total)} of {total} results
                    </span>
                  </div>
                  
                  <div className="flex items-center space-x-4">
                    {/* Items per page selector */}
                    <div className="flex items-center space-x-2">
                      <Label htmlFor="limit" className="text-sm text-gray-600">Per page:</Label>
                      <Select value={limit.toString()} onValueChange={handleLimitChange}>
                        <SelectTrigger className="w-20">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="10">10</SelectItem>
                          <SelectItem value="25">25</SelectItem>
                          <SelectItem value="50">50</SelectItem>
                          <SelectItem value="100">100</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Page navigation */}
                    <div className="flex items-center space-x-1">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handlePageChange(1)}
                        disabled={!hasPreviousPage}
                      >
                        <ChevronsLeft className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handlePageChange(page - 1)}
                        disabled={!hasPreviousPage}
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </Button>
                      
                      <span className="px-3 py-1 text-sm font-medium">
                        Page {page} of {totalPages}
                      </span>
                      
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handlePageChange(page + 1)}
                        disabled={!hasNextPage}
                      >
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handlePageChange(totalPages)}
                        disabled={!hasNextPage}
                      >
                        <ChevronsRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 gap-6 sm:grid-cols-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Total Users</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{users.length}</div>
              <p className="text-sm text-gray-500">Registered users</p>
            </CardContent>
          </Card>
          <Card className="border-purple-200 bg-purple-50/30">
            <CardHeader>
              <CardTitle className="text-lg flex items-center">
                <Crown className="mr-2 h-5 w-5 text-purple-600" />
                Super Admins
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-purple-600">
                {users.filter(u => u.profile?.is_super_admin).length}
              </div>
              <p className="text-sm text-gray-500">Protected owner accounts</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Admin Users</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">
                {users.filter(u => !u.profile?.is_super_admin && u.profile?.role === 'admin').length}
              </div>
              <p className="text-sm text-gray-500">Users with admin privileges</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Disabled Users</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">
                {users.filter(u => u.profile?.is_disabled).length}
              </div>
              <p className="text-sm text-gray-500">Temporarily disabled users</p>
            </CardContent>
          </Card>
        </div>

        {/* View Profile Dialog */}
        <Dialog open={profileDialogOpen} onOpenChange={setProfileDialogOpen}>
          <DialogContent className="sm:max-w-[600px]">
            <DialogHeader>
              <DialogTitle>User Profile</DialogTitle>
              <DialogDescription>
                View detailed information about this user account.
              </DialogDescription>
            </DialogHeader>
            <div className="py-4">
              {selectedUser && (
                <div className="space-y-6">
                  {/* User Header */}
                  <div className="flex items-center space-x-4">
                    <Avatar className="h-16 w-16">
                      <AvatarImage src="" alt="" />
                      <AvatarFallback className="text-lg">{getUserInitials(selectedUser)}</AvatarFallback>
                    </Avatar>
                    <div>
                      <h3 className="text-lg font-semibold">
                        {getUserDisplayName(selectedUser)}
                      </h3>
                      <p className="text-gray-600">{selectedUser.email}</p>
                      <div className="flex items-center space-x-2 mt-1">
                        {selectedUser.profile?.is_super_admin && (
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-purple-600 text-white shadow-sm">
                            <Crown className="mr-1 h-3 w-3" />
                            Super Admin
                          </span>
                        )}
                        {!selectedUser.profile?.is_super_admin && selectedUser.profile?.role === 'admin' && (
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                            <Shield className="mr-1 h-3 w-3" />
                            Admin
                          </span>
                        )}
                        {selectedUser.profile?.is_disabled && (
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                            <UserX className="mr-1 h-3 w-3" />
                            Disabled
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Profile Details */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-3">
                      <div>
                        <Label className="text-sm font-medium text-gray-500">User ID</Label>
                        <p className="text-sm font-mono bg-gray-50 p-2 rounded border">
                          {selectedUser.id}
                        </p>
                      </div>
                      <div>
                        <Label className="text-sm font-medium text-gray-500">First Name</Label>
                        <p className="text-sm">{selectedUser.user_metadata.first_name || 'Not provided'}</p>
                      </div>
                      <div>
                        <Label className="text-sm font-medium text-gray-500">Last Name</Label>
                        <p className="text-sm">{selectedUser.user_metadata.last_name || 'Not provided'}</p>
                      </div>
                      <div>
                        <Label className="text-sm font-medium text-gray-500">Email Address</Label>
                        <p className="text-sm">{selectedUser.email}</p>
                      </div>
                    </div>
                    <div className="space-y-3">
                      <div>
                        <Label className="text-sm font-medium text-gray-500">Role</Label>
                        <p className="text-sm capitalize">{selectedUser.profile?.role || 'user'}</p>
                      </div>
                      <div>
                        <Label className="text-sm font-medium text-gray-500">Account Status</Label>
                        <p className="text-sm">
                          {selectedUser.profile?.is_disabled ? 'Disabled' : 'Active'}
                        </p>
                      </div>
                      <div>
                        <Label className="text-sm font-medium text-gray-500">Created At</Label>
                        <p className="text-sm">
                          {formatDate(selectedUser.created_at)}
                        </p>
                      </div>
                      <div>
                        <Label className="text-sm font-medium text-gray-500">Last Updated</Label>
                        <p className="text-sm">
                          {selectedUser.profile?.updated_at ? formatDate(selectedUser.profile.updated_at) : 'Never'}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setProfileDialogOpen(false)}>
                Close
              </Button>
              {selectedUser && (
                <Button asChild>
                  <Link href={`/admin/users/${selectedUser.id}`}>
                    <CreditCard className="mr-2 h-4 w-4" />
                    View Full Details & Transactions
                  </Link>
                </Button>
              )}
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
              {userToDelete && (
                <div className="bg-gray-50 p-4 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <Avatar className="h-10 w-10">
                      <AvatarImage src="" alt="" />
                      <AvatarFallback>{getUserInitials(userToDelete)}</AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium">
                        {getUserDisplayName(userToDelete)}
                      </p>
                      <p className="text-sm text-gray-500">{userToDelete.email}</p>
                    </div>
                  </div>
                </div>
              )}
              <p className="text-sm text-gray-600 mt-4">
                Are you sure you want to delete this user? This will remove their profile and all associated data permanently.
              </p>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => {
                  setDeleteDialogOpen(false)
                  setUserToDelete(null)
                }}
                disabled={deleteLoading}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={confirmDeleteUser}
                disabled={deleteLoading}
              >
                {deleteLoading ? 'Deleting...' : 'Delete User'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Admin Promotion Confirmation Dialog */}
        <Dialog open={adminConfirmDialogOpen} onOpenChange={setAdminConfirmDialogOpen}>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle className="text-blue-700">Grant Admin Access</DialogTitle>
              <DialogDescription>
                This action grants full system access and management privileges to the user.
              </DialogDescription>
            </DialogHeader>
            <div className="py-4">
              {userToPromote && (
                <div className="bg-gray-50 p-4 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <Avatar className="h-10 w-10">
                      <AvatarImage src="" alt="" />
                      <AvatarFallback>{getUserInitials(userToPromote)}</AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium">
                        {getUserDisplayName(userToPromote)}
                      </p>
                      <p className="text-sm text-gray-500">{userToPromote.email}</p>
                    </div>
                  </div>
                </div>
              )}
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mt-4">
                <div className="flex items-start space-x-2">
                  <AlertCircle className="h-5 w-5 text-yellow-600 mt-0.5 flex-shrink-0" />
                  <div className="text-sm text-yellow-800">
                    <p className="font-medium">Are you sure?</p>
                    <p className="mt-1">This grants the user full system access and management privileges, including:</p>
                    <ul className="list-disc list-inside mt-2 space-y-1">
                      <li>Access to all user data</li>
                      <li>Ability to manage other users</li>
                      <li>Full administrative controls</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => {
                  setAdminConfirmDialogOpen(false)
                  setUserToPromote(null)
                }}
                disabled={promoteLoading}
              >
                Cancel
              </Button>
              <Button
                onClick={confirmPromoteToAdmin}
                disabled={promoteLoading}
                className="bg-blue-600 hover:bg-blue-700"
              >
                {promoteLoading ? 'Promoting...' : 'Grant Admin Access'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Admin Demotion Confirmation Dialog */}
        <Dialog open={demoteConfirmDialogOpen} onOpenChange={setDemoteConfirmDialogOpen}>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle className="text-orange-700">Remove Admin Access</DialogTitle>
              <DialogDescription>
                This action removes administrative privileges from the user.
              </DialogDescription>
            </DialogHeader>
            <div className="py-4">
              {userToDemote && (
                <div className="bg-gray-50 p-4 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <Avatar className="h-10 w-10">
                      <AvatarImage src="" alt="" />
                      <AvatarFallback>{getUserInitials(userToDemote)}</AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium">
                        {getUserDisplayName(userToDemote)}
                      </p>
                      <p className="text-sm text-gray-500">{userToDemote.email}</p>
                    </div>
                  </div>
                </div>
              )}
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mt-4">
                <div className="flex items-start space-x-2">
                  <AlertCircle className="h-5 w-5 text-yellow-600 mt-0.5 flex-shrink-0" />
                  <div className="text-sm text-yellow-800">
                    <p className="font-medium">Are you sure?</p>
                    <p className="mt-1">This will remove all administrative privileges from the user and change their role to Sales, including:</p>
                    <ul className="list-disc list-inside mt-2 space-y-1">
                      <li>No access to admin dashboard</li>
                      <li>No ability to manage other users</li>
                      <li>Loss of all administrative controls</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => {
                  setDemoteConfirmDialogOpen(false)
                  setUserToDemote(null)
                }}
                disabled={demoteLoading}
              >
                Cancel
              </Button>
              <Button
                onClick={confirmDemoteFromAdmin}
                disabled={demoteLoading}
                className="bg-orange-600 hover:bg-orange-700"
              >
                {demoteLoading ? 'Removing...' : 'Remove Admin Access'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* CSV Import Dialog */}
        <Dialog open={csvImportDialogOpen} onOpenChange={setCsvImportDialogOpen}>
          <DialogContent className="sm:max-w-[600px]">
            <DialogHeader>
              <DialogTitle>Import Users from CSV</DialogTitle>
              <DialogDescription>
                Upload a CSV file with email addresses to create multiple user accounts at once.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-6 py-4">
              {/* Instructions */}
              <div className="bg-blue-50 p-4 rounded-lg">
                <div className="flex items-start space-x-3">
                  <FileText className="h-5 w-5 text-blue-600 mt-0.5" />
                  <div>
                    <h4 className="text-sm font-medium text-blue-900">CSV Format Requirements</h4>
                    <ul className="text-sm text-blue-700 mt-1 space-y-1">
                      <li>• Single column with email addresses</li>
                      <li>• Optional header row (will be automatically detected)</li>
                      <li>• One email per row</li>
                      <li>• Users will be created with placeholder names (&quot;-&quot;)</li>
                      <li>• Auto-generated secure passwords</li>
                    </ul>
                  </div>
                </div>
              </div>

              {/* File Upload */}
              <div className="space-y-3">
                <Label htmlFor="csvFile">Select CSV File</Label>
                <Input
                  id="csvFile"
                  type="file"
                  accept=".csv"
                  onChange={handleCsvFileChange}
                  className="cursor-pointer"
                />
              </div>

              {/* Tag Selection */}
              <div className="space-y-3">
                <Label>Assign Tags to Imported Users (Optional)</Label>
                <div className="flex flex-wrap gap-2">
                  {availableTags.map((tag) => (
                    <Button
                      key={tag.id}
                      variant={selectedTags.includes(tag.id) ? "default" : "outline"}
                      size="sm"
                      onClick={() => {
                        setSelectedTags(prev => 
                          prev.includes(tag.id) 
                            ? prev.filter(id => id !== tag.id)
                            : [...prev, tag.id]
                        )
                      }}
                      className="flex items-center space-x-2"
                      style={selectedTags.includes(tag.id) ? { backgroundColor: tag.color, borderColor: tag.color } : {}}
                    >
                      <div 
                        className="w-3 h-3 rounded-full" 
                        style={{ backgroundColor: selectedTags.includes(tag.id) ? 'white' : tag.color }}
                      />
                      <span>{tag.name}</span>
                    </Button>
                  ))}
                </div>
                {selectedTags.length > 0 && (
                  <p className="text-sm text-gray-600">
                    Selected {selectedTags.length} tag{selectedTags.length === 1 ? '' : 's'} will be assigned to all imported users.
                  </p>
                )}
              </div>

              {/* Email Preview */}
              {csvEmails.length > 0 && (
                <div className="space-y-3">
                  <Label>Email Preview ({csvEmails.length} emails found)</Label>
                  <div className="max-h-40 overflow-y-auto border rounded-md p-3 bg-gray-50">
                    {csvEmails.slice(0, 10).map((email, index) => (
                      <div key={index} className="text-sm py-1">
                        {email}
                      </div>
                    ))}
                    {csvEmails.length > 10 && (
                      <div className="text-sm text-gray-500 py-1">
                        ... and {csvEmails.length - 10} more emails
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Import Results */}
              {csvImportResults && (
                <div className="space-y-3">
                  <Label>Import Results</Label>
                  <div className="border rounded-md p-4 space-y-3">
                    <div className="flex items-center space-x-4 text-sm">
                      <div className="flex items-center space-x-2 text-green-600">
                        <Check className="h-4 w-4" />
                        <span>Successful: {csvImportResults.successful}</span>
                      </div>
                      <div className="flex items-center space-x-2 text-red-600">
                        <X className="h-4 w-4" />
                        <span>Failed: {csvImportResults.failed}</span>
                      </div>
                    </div>
                    
                    {csvImportResults.errors && csvImportResults.errors.length > 0 && (
                      <div className="space-y-2">
                        <Label className="text-red-600">Errors:</Label>
                        <div className="max-h-32 overflow-y-auto space-y-1">
                          {csvImportResults.errors.map((error: { email: string; error: string }, index: number) => (
                            <div key={index} className="text-sm bg-red-50 p-2 rounded flex items-start space-x-2">
                              <AlertCircle className="h-4 w-4 text-red-500 mt-0.5 flex-shrink-0" />
                              <div>
                                <span className="font-medium">{error.email}</span>
                                <span className="text-red-600 ml-2">{error.error}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Messages */}
              {error && (
                <div className="text-sm text-red-600 bg-red-50 p-3 rounded-md">{error}</div>
              )}
              {message && (
                <div className="text-sm text-green-600 bg-green-50 p-3 rounded-md">{message}</div>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setCsvImportDialogOpen(false)}>
                Close
              </Button>
              {csvEmails.length > 0 && !csvImportResults && (
                <Button onClick={handleCsvImport} disabled={csvImporting}>
                  {csvImporting ? 'Importing...' : `Import ${csvEmails.length} Users`}
                </Button>
              )}
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Create Tag Dialog */}
        <Dialog open={showCreateTagDialog} onOpenChange={setShowCreateTagDialog}>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Create New Tag</DialogTitle>
              <DialogDescription>
                Create a new tag that can be assigned to users for organization and filtering.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="tagName">Tag Name</Label>
                <Input
                  id="tagName"
                  value={newTagName}
                  onChange={(e) => setNewTagName(e.target.value)}
                  placeholder="Enter tag name"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="tagColor">Tag Color</Label>
                <div className="flex items-center space-x-3">
                  <Input
                    id="tagColor"
                    type="color"
                    value={newTagColor}
                    onChange={(e) => setNewTagColor(e.target.value)}
                    className="w-16 h-10 rounded cursor-pointer"
                  />
                  <div className="flex items-center space-x-2">
                    <div 
                      className="w-4 h-4 rounded-full border" 
                      style={{ backgroundColor: newTagColor }}
                    />
                    <span className="text-sm text-gray-600">{newTagColor}</span>
                  </div>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="tagDescription">Description (Optional)</Label>
                <Input
                  id="tagDescription"
                  value={newTagDescription}
                  onChange={(e) => setNewTagDescription(e.target.value)}
                  placeholder="Enter tag description"
                />
              </div>
              {/* Preview */}
              <div className="space-y-2">
                <Label>Preview</Label>
                <div className="p-3 border rounded-lg bg-gray-50">
                  <span 
                    className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium text-white"
                    style={{ backgroundColor: newTagColor }}
                  >
                    <Tag className="mr-1 h-3 w-3" />
                    {newTagName || 'Tag Name'}
                  </span>
                  {newTagDescription && (
                    <p className="text-sm text-gray-600 mt-2">{newTagDescription}</p>
                  )}
                </div>
              </div>
              {error && (
                <div className="text-sm text-red-600 bg-red-50 p-3 rounded-md">{error}</div>
              )}
              {message && (
                <div className="text-sm text-green-600 bg-green-50 p-3 rounded-md">{message}</div>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowCreateTagDialog(false)}>
                Cancel
              </Button>
              <Button onClick={handleCreateTag} disabled={creatingTag || !newTagName.trim()}>
                {creatingTag ? 'Creating...' : 'Create Tag'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

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
              {userToEdit && (
                <div className="space-y-4">
                  <div className="text-center p-4 bg-gray-50 rounded-lg">
                    <div className="flex items-center justify-center mb-2">
                      <Avatar className="h-12 w-12">
                        <AvatarImage src="" alt="" />
                        <AvatarFallback className="text-lg">
                          {(userToEdit.profile?.first_name?.[0] || '') + (userToEdit.profile?.last_name?.[0] || '') || userToEdit.email[0].toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                    </div>
                    <p className="text-sm text-gray-600">Editing profile for: {userToEdit.email}</p>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="editFirstName">First Name</Label>
                      <Input
                        id="editFirstName"
                        value={editFirstName}
                        onChange={(e) => setEditFirstName(e.target.value)}
                        placeholder="Enter first name"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="editLastName">Last Name</Label>
                      <Input
                        id="editLastName"
                        value={editLastName}
                        onChange={(e) => setEditLastName(e.target.value)}
                        placeholder="Enter last name"
                      />
                    </div>
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

                  {/* Tag Management */}
                  <div className="space-y-2">
                    <Label>User Tags</Label>
                    {availableTags.length === 0 ? (
                      <div className="text-center py-4 bg-gray-50 rounded-lg">
                        <Tag className="h-6 w-6 text-gray-400 mx-auto mb-2" />
                        <p className="text-xs text-gray-500">No tags available</p>
                      </div>
                    ) : (
                      <div className="flex flex-wrap gap-2 p-3 bg-gray-50 rounded-lg">
                        {availableTags.map((tag) => (
                          <Button
                            key={tag.id}
                            variant={editSelectedTags.includes(tag.id) ? "default" : "outline"}
                            size="sm"
                            onClick={() => {
                              setEditSelectedTags(prev =>
                                prev.includes(tag.id)
                                  ? prev.filter(id => id !== tag.id)
                                  : [...prev, tag.id]
                              )
                            }}
                            className="flex items-center space-x-2 transition-all"
                            style={editSelectedTags.includes(tag.id) ? {
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
                            {editSelectedTags.includes(tag.id) && (
                              <Check className="h-3 w-3" />
                            )}
                          </Button>
                        ))}
                      </div>
                    )}
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

        {/* Bulk Tag Management Dialog */}
        <Dialog open={bulkTagDialogOpen} onOpenChange={setBulkTagDialogOpen}>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>
                {bulkTagOperation === 'add' ? 'Add Tags to Users' : 'Remove Tags from Users'}
              </DialogTitle>
              <DialogDescription>
                {bulkTagOperation === 'add' 
                  ? `Add tags to ${selectedUsers.size} selected user${selectedUsers.size === 1 ? '' : 's'}`
                  : `Remove tags from ${selectedUsers.size} selected user${selectedUsers.size === 1 ? '' : 's'}`
                }
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-3">
                <Label>
                  {bulkTagOperation === 'add' ? 'Select Tags to Add' : 'Select Tags to Remove'}
                </Label>
                {availableTags.length === 0 ? (
                  <div className="text-center py-8">
                    <Tag className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                    <p className="text-sm text-gray-500">No tags available.</p>
                    <p className="text-xs text-gray-400">Create tags first to use this feature.</p>
                  </div>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {availableTags.map((tag) => (
                      <Button
                        key={tag.id}
                        variant={selectedTagsForBulk.includes(tag.id) ? "default" : "outline"}
                        size="sm"
                        onClick={() => {
                          setSelectedTagsForBulk(prev => 
                            prev.includes(tag.id) 
                              ? prev.filter(id => id !== tag.id)
                              : [...prev, tag.id]
                          )
                        }}
                        className="flex items-center space-x-2 transition-all"
                        style={selectedTagsForBulk.includes(tag.id) ? { 
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
                        {selectedTagsForBulk.includes(tag.id) && (
                          <Check className="h-3 w-3" />
                        )}
                      </Button>
                    ))}
                  </div>
                )}
              </div>
              
              {selectedTagsForBulk.length > 0 && (
                <div className="space-y-2">
                  <Label className="text-sm text-gray-600">
                    Selected {selectedTagsForBulk.length} tag{selectedTagsForBulk.length === 1 ? '' : 's'} will be {bulkTagOperation === 'add' ? 'added to' : 'removed from'} {selectedUsers.size} user{selectedUsers.size === 1 ? '' : 's'}
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
                  setBulkTagDialogOpen(false)
                  setSelectedTagsForBulk([])
                  setError('')
                }}
                disabled={bulkTagLoading}
              >
                Cancel
              </Button>
              <Button 
                onClick={handleBulkTagOperation}
                disabled={bulkTagLoading || selectedTagsForBulk.length === 0}
              >
                {bulkTagLoading ? (
                  <>
                    <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-gray-300 border-t-white" />
                    {bulkTagOperation === 'add' ? 'Adding...' : 'Removing...'}
                  </>
                ) : (
                  <>
                    <Tags className="mr-2 h-4 w-4" />
                    {bulkTagOperation === 'add' ? 'Add Tags' : 'Remove Tags'}
                  </>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Notes Preview Dialog */}
        {notesPreviewUser && (
          <UserNotesPreview
            open={notesPreviewOpen}
            onOpenChange={setNotesPreviewOpen}
            userId={notesPreviewUser.id}
            userName={getUserDisplayName(notesPreviewUser)}
            notesCount={notesPreviewUser.notes_count || 0}
          />
        )}

        {/* Bulk Manual Transaction Dialog */}
        <Dialog open={bulkManualTransactionDialogOpen} onOpenChange={setBulkManualTransactionDialogOpen}>
          <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Bulk Manual Transactions</DialogTitle>
              <DialogDescription>
                Create manual transactions for {selectedUsers.size} selected user{selectedUsers.size === 1 ? '' : 's'}
              </DialogDescription>
            </DialogHeader>
            <div className="py-4">
              <BulkManualTransactionForm
                selectedUserIds={Array.from(selectedUsers)}
                userCount={selectedUsers.size}
                onSuccess={handleBulkManualTransactionSuccess}
                onCancel={handleBulkManualTransactionCancel}
              />
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  )
}