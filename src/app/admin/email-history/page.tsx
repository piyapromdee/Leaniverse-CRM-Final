'use client'

import { useState, useEffect, useCallback } from 'react'
import AdminLayout from '@/components/admin-layout'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  History,
  Search,
  Mail,
  MoreHorizontal,
  Eye,
  ChevronLeft,
  ChevronRight,
  Send,
  User,
  Clock,
  CheckCircle,
  XCircle,
  RefreshCw,
  ArrowUp,
  ArrowDown,
  ArrowUpDown,
} from 'lucide-react'

interface PersonalEmail {
  id: string
  recipient_email: string
  recipient_name: string | null
  subject: string
  body: string
  status: 'sent' | 'failed'
  error_message: string | null
  sent_at: string
  sent_by: string | null
  sender?: {
    first_name: string
    last_name: string
    email: string
  } | null
}

type SortField = 'sent_at' | 'recipient' | null
type SortDirection = 'asc' | 'desc'

export default function EmailHistoryPage() {
  const [emails, setEmails] = useState<PersonalEmail[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalEmails, setTotalEmails] = useState(0)
  const [showDetailsDialog, setShowDetailsDialog] = useState(false)
  const [selectedEmail, setSelectedEmail] = useState<PersonalEmail | null>(null)

  // Sorting state
  const [sortField, setSortField] = useState<SortField>('sent_at')
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc')

  const fetchEmails = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '20',
        type: 'personal' // Only fetch one-on-one emails, not campaign emails
      })

      if (statusFilter !== 'all') {
        params.append('status', statusFilter)
      }

      if (searchTerm.trim()) {
        params.append('search', searchTerm.trim())
      }

      const response = await fetch(`/api/admin/email-history/personal?${params}`)
      const result = await response.json()

      if (!response.ok) {
        // If API doesn't exist yet, show empty state
        if (response.status === 404) {
          setEmails([])
          setTotalPages(1)
          setTotalEmails(0)
          return
        }
        setError(result.error || 'Failed to fetch email history')
        return
      }

      setEmails(result.emails || [])
      setTotalPages(result.pagination?.totalPages || 1)
      setTotalEmails(result.pagination?.total || 0)
    } catch (error) {
      console.error('Error fetching emails:', error)
      setError('An unexpected error occurred')
    } finally {
      setLoading(false)
    }
  }, [page, statusFilter, searchTerm])

  useEffect(() => {
    fetchEmails()
  }, [fetchEmails])

  const handleSearch = () => {
    setPage(1)
    fetchEmails()
  }

  const handleViewDetails = (email: PersonalEmail) => {
    setSelectedEmail(email)
    setShowDetailsDialog(true)
  }

  const formatDate = (dateString: string) => {
    if (!dateString) return 'N/A'
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'sent':
        return (
          <Badge variant="default" className="bg-green-100 text-green-800">
            <CheckCircle className="mr-1 h-3 w-3" />
            Sent
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

  const getSuccessCount = () => emails.filter(e => e.status === 'sent').length
  const getFailedCount = () => emails.filter(e => e.status === 'failed').length

  // Handle sort toggle
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      // Toggle direction if same field
      if (sortDirection === 'asc') {
        setSortDirection('desc')
      } else {
        // Clear sorting
        setSortField(null)
        setSortDirection('desc')
      }
    } else {
      // New field, start with descending for time, ascending for name
      setSortField(field)
      setSortDirection(field === 'sent_at' ? 'desc' : 'asc')
    }
  }

  // Get sort icon for column header
  const getSortIcon = (field: SortField) => {
    if (sortField !== field) {
      return <ArrowUpDown className="h-4 w-4 text-gray-400" />
    }
    return sortDirection === 'asc'
      ? <ArrowUp className="h-4 w-4 text-blue-600" />
      : <ArrowDown className="h-4 w-4 text-blue-600" />
  }

  // Sort emails based on current sort state
  const sortedEmails = [...emails].sort((a, b) => {
    if (!sortField) return 0

    let comparison = 0
    if (sortField === 'sent_at') {
      comparison = new Date(a.sent_at).getTime() - new Date(b.sent_at).getTime()
    } else if (sortField === 'recipient') {
      const nameA = (a.recipient_name || a.recipient_email).toLowerCase()
      const nameB = (b.recipient_name || b.recipient_email).toLowerCase()
      comparison = nameA.localeCompare(nameB)
    }

    return sortDirection === 'desc' ? -comparison : comparison
  })

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <p className="text-gray-600">View all personalized, one-on-one emails sent to contacts and leads</p>
          </div>
          <Button onClick={fetchEmails} variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>

        {/* Global Messages */}
        {error && (
          <div className="text-sm text-red-600 bg-red-50 p-3 rounded-md">{error}</div>
        )}

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <Mail className="h-5 w-5 text-blue-600" />
                <div>
                  <div className="text-2xl font-bold">{totalEmails}</div>
                  <div className="text-sm text-gray-600">Total Emails</div>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <CheckCircle className="h-5 w-5 text-green-600" />
                <div>
                  <div className="text-2xl font-bold text-green-600">{getSuccessCount()}</div>
                  <div className="text-sm text-gray-600">Sent Successfully</div>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <XCircle className="h-5 w-5 text-red-600" />
                <div>
                  <div className="text-2xl font-bold text-red-600">{getFailedCount()}</div>
                  <div className="text-sm text-gray-600">Failed</div>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <Send className="h-5 w-5 text-purple-600" />
                <div>
                  <div className="text-2xl font-bold text-purple-600">
                    {totalEmails > 0 ? Math.round((getSuccessCount() / totalEmails) * 100) : 0}%
                  </div>
                  <div className="text-sm text-gray-600">Success Rate</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <History className="h-5 w-5" />
                  Personal Email History
                </CardTitle>
                <CardDescription>
                  Individual emails sent by Sales Reps to contacts and leads
                  {sortField && (
                    <span className="ml-2 text-xs text-blue-600">
                      • Sorted by {sortField === 'sent_at' ? 'Time Sent' : 'Recipient'} ({sortDirection === 'asc' ? 'oldest first' : sortField === 'sent_at' ? 'newest first' : 'A-Z'})
                    </span>
                  )}
                </CardDescription>
              </div>
              <div className="flex gap-2 flex-wrap">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <Input
                    placeholder="Search by recipient or subject..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                    className="pl-10 w-[250px]"
                  />
                </div>
                <Select value={statusFilter} onValueChange={(value) => { setStatusFilter(value); setPage(1); }}>
                  <SelectTrigger className="w-[130px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="sent">Sent</SelectItem>
                    <SelectItem value="failed">Failed</SelectItem>
                  </SelectContent>
                </Select>
                <Button onClick={handleSearch} size="sm">
                  <Search className="h-4 w-4 mr-2" />
                  Search
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex justify-center py-8">
                <div className="text-gray-500">Loading email history...</div>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Emails Table */}
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Sender</TableHead>
                      <TableHead>
                        <button
                          onClick={() => handleSort('recipient')}
                          className={`flex items-center gap-1 hover:text-blue-600 transition-colors ${
                            sortField === 'recipient' ? 'text-blue-600 font-semibold' : ''
                          }`}
                        >
                          Recipient
                          {getSortIcon('recipient')}
                        </button>
                      </TableHead>
                      <TableHead>Subject</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>
                        <button
                          onClick={() => handleSort('sent_at')}
                          className={`flex items-center gap-1 hover:text-blue-600 transition-colors ${
                            sortField === 'sent_at' ? 'text-blue-600 font-semibold' : ''
                          }`}
                        >
                          Time Sent
                          {getSortIcon('sent_at')}
                        </button>
                      </TableHead>
                      <TableHead className="w-[50px]"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sortedEmails.map((email) => (
                      <TableRow key={email.id}>
                        <TableCell>
                          <div className="flex items-center space-x-2">
                            <Avatar className="h-8 w-8">
                              <AvatarFallback>
                                {email.sender?.first_name?.[0] || 'S'}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <div className="text-sm font-medium">
                                {email.sender
                                  ? `${email.sender.first_name} ${email.sender.last_name}`
                                  : 'System'}
                              </div>
                              <div className="text-xs text-gray-500">
                                {email.sender?.email || 'system@dummi.co'}
                              </div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center space-x-2">
                            <Avatar className="h-8 w-8">
                              <AvatarFallback>
                                {email.recipient_name?.[0] || email.recipient_email[0].toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <div className="text-sm font-medium">
                                {email.recipient_name || 'Unknown'}
                              </div>
                              <div className="text-xs text-gray-500">
                                {email.recipient_email}
                              </div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="max-w-[250px] truncate font-medium" title={email.subject}>
                            {email.subject}
                          </div>
                        </TableCell>
                        <TableCell>{getStatusBadge(email.status)}</TableCell>
                        <TableCell>
                          <div className="flex items-center space-x-1 text-sm text-gray-600">
                            <Clock className="h-3 w-3" />
                            <span>{formatDate(email.sent_at)}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuLabel>Actions</DropdownMenuLabel>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem onClick={() => handleViewDetails(email)}>
                                <Eye className="mr-2 h-4 w-4" />
                                View Details
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>

                {sortedEmails.length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    <Mail className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                    <p className="font-medium">No emails found</p>
                    <p className="text-sm">
                      {searchTerm || statusFilter !== 'all'
                        ? 'Try adjusting your search filters.'
                        : 'Individual emails sent to contacts will appear here.'}
                    </p>
                  </div>
                )}

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-between pt-4">
                    <div className="text-sm text-gray-500">
                      Page {page} of {totalPages} ({totalEmails} total emails)
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setPage(page - 1)}
                        disabled={page <= 1}
                      >
                        <ChevronLeft className="h-4 w-4" />
                        Previous
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setPage(page + 1)}
                        disabled={page >= totalPages}
                      >
                        Next
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Email Details Dialog */}
        <Dialog open={showDetailsDialog} onOpenChange={setShowDetailsDialog}>
          <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-hidden">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Mail className="h-5 w-5" />
                Email Details
              </DialogTitle>
              <DialogDescription>
                Full details of this email communication
              </DialogDescription>
            </DialogHeader>

            {selectedEmail && (
              <div className="space-y-4 py-4 overflow-y-auto max-h-[60vh]">
                {/* Sender & Recipient Info */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm flex items-center gap-2">
                        <User className="h-4 w-4" />
                        Sender
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-sm font-medium">
                        {selectedEmail.sender
                          ? `${selectedEmail.sender.first_name} ${selectedEmail.sender.last_name}`
                          : 'System'}
                      </div>
                      <div className="text-xs text-gray-500">
                        {selectedEmail.sender?.email || 'system@dummi.co'}
                      </div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm flex items-center gap-2">
                        <Mail className="h-4 w-4" />
                        Recipient
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-sm font-medium">
                        {selectedEmail.recipient_name || 'Unknown'}
                      </div>
                      <div className="text-xs text-gray-500">
                        {selectedEmail.recipient_email}
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Status & Time */}
                <div className="flex items-center justify-between bg-gray-50 p-3 rounded-lg">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">Status:</span>
                    {getStatusBadge(selectedEmail.status)}
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Clock className="h-4 w-4" />
                    {formatDate(selectedEmail.sent_at)}
                  </div>
                </div>

                {/* Subject */}
                <div>
                  <div className="text-sm font-medium mb-1">Subject</div>
                  <div className="text-sm bg-gray-50 p-3 rounded-lg font-medium">
                    {selectedEmail.subject}
                  </div>
                </div>

                {/* Body */}
                <div>
                  <div className="text-sm font-medium mb-1">Message</div>
                  <div className="text-sm bg-gray-50 p-3 rounded-lg max-h-48 overflow-y-auto whitespace-pre-wrap">
                    {selectedEmail.body}
                  </div>
                </div>

                {/* Error Message */}
                {selectedEmail.error_message && (
                  <div>
                    <div className="text-sm font-medium text-red-600 mb-1">Error Message</div>
                    <div className="text-sm text-red-600 bg-red-50 p-3 rounded-lg">
                      {selectedEmail.error_message}
                    </div>
                  </div>
                )}
              </div>
            )}

            <DialogFooter>
              <Button variant="outline" onClick={() => setShowDetailsDialog(false)}>
                Close
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  )
}
