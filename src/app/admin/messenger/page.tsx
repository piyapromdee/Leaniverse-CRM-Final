'use client'

import { useState, useEffect } from 'react'
import AdminLayout from '@/components/admin-layout'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Checkbox } from '@/components/ui/checkbox'
import { Progress } from '@/components/ui/progress'
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
  Mail,
  Filter,
  Send,
  Users,
  Check,
  X,
  Tag,
  Calendar,
  Shield,
  UserX,
  MessageSquare,
  CheckCircle,
  AlertCircle,
  Clock,
  Loader2,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
} from 'lucide-react'

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
  role: 'user' | 'admin'
  is_disabled?: boolean
  created_at: string
  updated_at: string
}

interface UserTag {
  id: string
  name: string
  color: string
  description?: string
}

interface UserWithProfile extends User {
  profile?: Profile
  tags?: UserTag[]
}

export default function TeamBroadcastPage() {
  const [users, setUsers] = useState<UserWithProfile[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [availableTags, setAvailableTags] = useState<UserTag[]>([])
  const [filterByTags, setFilterByTags] = useState<string[]>([])
  const [selectedUsers, setSelectedUsers] = useState<string[]>([])
  
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
  const [showEmailDialog, setShowEmailDialog] = useState(false)
  const [emailSubject, setEmailSubject] = useState('')
  const [emailBody, setEmailBody] = useState('')
  const [sendingEmail, setSendingEmail] = useState(false)
  const [delayBetweenEmails, setDelayBetweenEmails] = useState(0)
  const [emailConfigStatus, setEmailConfigStatus] = useState<'loading' | 'configured' | 'not-configured' | 'error'>('loading')
  const [showProgressDialog, setShowProgressDialog] = useState(false)
  const [progress, setProgress] = useState({
    current: 0,
    total: 0,
    successful: 0,
    failed: 0,
    status: '' as string,
    currentRecipient: '',
    error: '',
    waitTime: 0
  })
  const [finalResults, setFinalResults] = useState<any>(null)
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

  useEffect(() => {
    fetchTags()
    checkEmailConfig()
  }, [])

  // Fetch users when page, search, or filters change
  useEffect(() => {
    fetchUsers()
  }, [page, limit, debouncedSearchTerm, roleFilter, disabledFilter, filterByTags])

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

  const filteredUsers = users.filter(user => {
    // Skip disabled users
    return !user.profile?.is_disabled
  })

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

  // Pagination handlers
  const handlePageChange = (newPage: number) => {
    setPage(newPage)
    setSelectedUsers([]) // Clear selection when changing pages
  }

  const handleLimitChange = (newLimit: string) => {
    setLimit(parseInt(newLimit))
    setPage(1) // Reset to first page when changing limit
    setSelectedUsers([])
  }

  const handleSelectAll = () => {
    if (selectedUsers.length === filteredUsers.length) {
      setSelectedUsers([])
    } else {
      setSelectedUsers(filteredUsers.map(user => user.id))
    }
  }

  const handleUserSelect = (userId: string) => {
    setSelectedUsers(prev => 
      prev.includes(userId) 
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    )
  }

  const handleSendEmails = async () => {
    if (!emailSubject.trim() || !emailBody.trim()) {
      setError('Please enter both subject and body for the email')
      return
    }

    setSendingEmail(true)
    setError('')
    setMessage('')
    setShowEmailDialog(false)
    setShowProgressDialog(true)
    setFinalResults(null)

    // Reset progress
    setProgress({
      current: 0,
      total: selectedUsers.length,
      successful: 0,
      failed: 0,
      status: 'starting',
      currentRecipient: '',
      error: '',
      waitTime: 0
    })

    try {
      const selectedUserData = users.filter(user => selectedUsers.includes(user.id))
      
      const response = await fetch('/api/admin/messenger/send-progress', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userIds: selectedUsers,
          subject: emailSubject.trim(),
          body: emailBody.trim(),
          delayBetweenEmails: delayBetweenEmails * 1000, // Convert seconds to milliseconds
          recipients: selectedUserData.map(user => ({
            id: user.id,
            email: user.email,
            first_name: user.user_metadata.first_name,
            last_name: user.user_metadata.last_name
          }))
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        setError(errorData.error || 'Failed to send emails')
        setShowProgressDialog(false)
        return
      }

      // Handle Server-Sent Events
      const reader = response.body?.getReader()
      const decoder = new TextDecoder()

      if (reader) {
        while (true) {
          const { done, value } = await reader.read()
          if (done) break

          const chunk = decoder.decode(value)
          const lines = chunk.split('\n')

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              try {
                const data = JSON.parse(line.slice(6))
                
                if (data.type === 'progress') {
                  setProgress({
                    current: data.current,
                    total: data.total,
                    successful: data.successful,
                    failed: data.failed,
                    status: data.status,
                    currentRecipient: data.currentRecipient || '',
                    error: data.error || '',
                    waitTime: data.waitTime || 0
                  })
                } else if (data.type === 'complete') {
                  setFinalResults(data.results)
                  setSendingEmail(false)
                }
              } catch (e) {
                console.error('Error parsing SSE data:', e)
              }
            }
          }
        }
      }

      // Clear form after completion
      setEmailSubject('')
      setEmailBody('')
      setDelayBetweenEmails(0)
      setSelectedUsers([])

    } catch (error) {
      console.error('Error sending emails:', error)
      setError('An unexpected error occurred while sending emails')
      setShowProgressDialog(false)
      setSendingEmail(false)
    }
  }

  const clearMessages = () => {
    setError('')
    setMessage('')
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <p className="text-gray-600">Send internal announcements and bulk emails to your sales team</p>
            {/* Email Configuration Status */}
            <div className="flex items-center space-x-2 mt-2">
              {emailConfigStatus === 'loading' && (
                <span className="text-xs text-gray-500">Checking email configuration...</span>
              )}
              {emailConfigStatus === 'configured' && (
                <span className="text-xs text-green-600 flex items-center space-x-1">
                  <CheckCircle className="h-3 w-3" />
                  <span>Email system configured</span>
                </span>
              )}
              {emailConfigStatus === 'not-configured' && (
                <span className="text-xs text-red-600 flex items-center space-x-1">
                  <AlertCircle className="h-3 w-3" />
                  <span>Email not configured - <a href="/admin/email-config" className="underline">Setup SMTP</a></span>
                </span>
              )}
              {emailConfigStatus === 'error' && (
                <span className="text-xs text-red-600 flex items-center space-x-1">
                  <AlertCircle className="h-3 w-3" />
                  <span>Error checking email config</span>
                </span>
              )}
            </div>
          </div>
          <Button
            onClick={() => {
              if (selectedUsers.length === 0) {
                setError('Please select at least one team member to send announcement')
                return
              }
              if (emailConfigStatus !== 'configured') {
                setError('Email system not configured. Please set up SMTP settings first.')
                return
              }
              clearMessages()
              setShowEmailDialog(true)
            }}
            disabled={selectedUsers.length === 0 || emailConfigStatus !== 'configured'}
            className="flex items-center gap-2"
          >
            <Send className="h-4 w-4" />
            Send Announcement ({selectedUsers.length})
          </Button>
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
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <MessageSquare className="h-5 w-5" />
                  Team Broadcast
                </CardTitle>
                <CardDescription>
                  Select team members to send internal announcements. Disabled users are excluded from the list.
                </CardDescription>
              </div>
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
                    <Button variant="outline" size="sm">
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
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex justify-center py-8">
                <div className="text-gray-500">Loading users...</div>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Selection Controls */}
                {filteredUsers.length > 0 && (
                  <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div className="flex items-center space-x-4">
                      <Checkbox
                        checked={filteredUsers.length > 0 && selectedUsers.length === filteredUsers.length}
                        onCheckedChange={handleSelectAll}
                        id="select-all"
                      />
                      <Label htmlFor="select-all" className="text-sm font-medium">
                        Select All ({filteredUsers.length} users)
                      </Label>
                    </div>
                    <div className="text-sm text-gray-600">
                      {selectedUsers.length} selected
                    </div>
                  </div>
                )}

                {/* User List */}
                {filteredUsers.map((user) => (
                  <div key={user.id} className="flex items-center space-x-4 p-4 border rounded-lg hover:bg-gray-50 transition-colors">
                    <Checkbox
                      checked={selectedUsers.includes(user.id)}
                      onCheckedChange={() => handleUserSelect(user.id)}
                      id={`user-${user.id}`}
                    />
                    <Avatar className="h-10 w-10">
                      <AvatarImage src="" alt="" />
                      <AvatarFallback>{getUserInitials(user)}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <div className="flex items-center space-x-2">
                        <p className="font-medium">
                          {getUserDisplayName(user)}
                        </p>
                        {user.profile?.role === 'admin' && (
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                            <Shield className="mr-1 h-3 w-3" />
                            Admin
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
                      <div className="flex items-center space-x-4 text-sm text-gray-500 mt-1">
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
                  </div>
                ))}
                {filteredUsers.length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    {debouncedSearchTerm || filterByTags.length > 0 
                      ? 'No users found matching your filters.' 
                      : 'No users found.'
                    }
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

        {/* Email Composition Dialog */}
        <Dialog open={showEmailDialog} onOpenChange={setShowEmailDialog}>
          <DialogContent className="sm:max-w-[600px]">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Send className="h-5 w-5" />
                Send Team Announcement
              </DialogTitle>
              <DialogDescription>
                Compose an internal announcement to send to {selectedUsers.length} team member{selectedUsers.length !== 1 ? 's' : ''}. Review your message before sending.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              {/* Recipients Preview */}
              <div className="space-y-2">
                <Label>Recipients ({selectedUsers.length})</Label>
                <div className="max-h-32 overflow-y-auto border rounded-md p-3 bg-gray-50">
                  {users
                    .filter(user => selectedUsers.includes(user.id))
                    .map((user) => (
                      <div key={user.id} className="text-sm py-1 flex items-center space-x-2">
                        <Mail className="h-3 w-3" />
                        <span>{user.email}</span>
                        <span className="text-gray-500">
                          ({getUserDisplayName(user)})
                        </span>
                      </div>
                    ))}
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

              {/* Body */}
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
                  Tip: Use {'{name}'} to personalize emails with the recipient's name
                </p>
              </div>

              {/* Delay Between Emails */}
              <div className="space-y-2">
                <Label htmlFor="delayBetweenEmails">Delay Between Emails (seconds)</Label>
                <Input
                  id="delayBetweenEmails"
                  type="number"
                  min="0"
                  max="60"
                  value={delayBetweenEmails}
                  onChange={(e) => setDelayBetweenEmails(Math.max(0, Math.min(60, parseInt(e.target.value) || 0)))}
                  placeholder="0"
                />
                <p className="text-xs text-gray-500">
                  Add delay between each email to avoid being marked as spam. Max 60 seconds.
                  {delayBetweenEmails > 0 && (
                    <span className="block mt-1 text-blue-600">
                      Total sending time: ~{Math.ceil(selectedUsers.length * delayBetweenEmails / 60)} minutes for {selectedUsers.length} emails
                    </span>
                  )}
                </p>
              </div>

              {/* Messages */}
              {error && (
                <div className="text-sm text-red-600 bg-red-50 p-3 rounded-md">{error}</div>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowEmailDialog(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleSendEmails}
                disabled={sendingEmail || !emailSubject.trim() || !emailBody.trim()}
              >
                {sendingEmail ? 'Sending...' : 'Send Announcement'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Progress Dialog */}
        <Dialog open={showProgressDialog} onOpenChange={() => {}}>
          <DialogContent className="sm:max-w-[500px]" onInteractOutside={(e) => e.preventDefault()}>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Loader2 className={`h-5 w-5 ${sendingEmail ? 'animate-spin' : ''}`} />
                {finalResults ? 'Email Sending Complete' : 'Sending Emails'}
              </DialogTitle>
              <DialogDescription>
                {finalResults 
                  ? 'Email sending process has finished. Review the results below.'
                  : 'Please wait while we send emails to your selected recipients.'
                }
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-6 py-4">
              {/* Progress Bar */}
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Progress</span>
                  <span>{progress.current} / {progress.total}</span>
                </div>
                <Progress value={(progress.current / progress.total) * 100} className="h-3" />
              </div>

              {/* Current Status */}
              {!finalResults && (
                <div className="space-y-3">
                  <div className="text-sm">
                    {progress.status === 'starting' && (
                      <div className="flex items-center gap-2 text-blue-600">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span>Initializing email sending...</span>
                      </div>
                    )}
                    {progress.status === 'sending' && (
                      <div className="flex items-center gap-2 text-blue-600">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span>Sending to: {progress.currentRecipient}</span>
                      </div>
                    )}
                    {progress.status === 'sent' && (
                      <div className="flex items-center gap-2 text-green-600">
                        <CheckCircle className="h-4 w-4" />
                        <span>Successfully sent to: {progress.currentRecipient}</span>
                      </div>
                    )}
                    {progress.status === 'error' && (
                      <div className="flex items-center gap-2 text-red-600">
                        <AlertCircle className="h-4 w-4" />
                        <span>Failed to send to: {progress.currentRecipient}</span>
                        {progress.error && (
                          <span className="text-xs text-gray-500">({progress.error})</span>
                        )}
                      </div>
                    )}
                    {progress.status === 'waiting' && progress.waitTime > 0 && (
                      <div className="flex items-center gap-2 text-orange-600">
                        <Clock className="h-4 w-4" />
                        <span>Waiting {progress.waitTime / 1000} seconds before next email...</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Results Summary */}
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="bg-green-50 p-3 rounded-lg text-center">
                  <div className="text-2xl font-bold text-green-600">{progress.successful}</div>
                  <div className="text-green-700">Successful</div>
                </div>
                <div className="bg-red-50 p-3 rounded-lg text-center">
                  <div className="text-2xl font-bold text-red-600">{progress.failed}</div>
                  <div className="text-red-700">Failed</div>
                </div>
              </div>

              {/* Final Results */}
              {finalResults && (
                <div className="space-y-3">
                  <div className="text-sm font-medium text-green-600">
                    ✅ Email sending completed successfully!
                  </div>
                  
                  {finalResults.errors && finalResults.errors.length > 0 && (
                    <div className="space-y-2">
                      <div className="text-sm font-medium text-red-600">Failed emails:</div>
                      <div className="max-h-32 overflow-y-auto space-y-1">
                        {finalResults.errors.map((error: any, index: number) => (
                          <div key={index} className="text-xs bg-red-50 p-2 rounded">
                            <div className="font-medium">{error.email}</div>
                            <div className="text-red-600">{error.error}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  <div className="text-sm text-gray-600">
                    Total: {finalResults.total} | 
                    Successful: {finalResults.successful} | 
                    Failed: {finalResults.failed}
                  </div>
                </div>
              )}
            </div>

            <DialogFooter>
              {finalResults ? (
                <Button 
                  onClick={() => {
                    setShowProgressDialog(false)
                    setMessage(`Successfully sent emails to ${finalResults.successful} users`)
                    if (finalResults.failed > 0) {
                      setError(`${finalResults.failed} emails failed to send. Check the logs for details.`)
                    }
                  }}
                >
                  Close
                </Button>
              ) : (
                <div className="text-sm text-gray-500">
                  Sending in progress... Please do not close this window.
                </div>
              )}
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  )
}