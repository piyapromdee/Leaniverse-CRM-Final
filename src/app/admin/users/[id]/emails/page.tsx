'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import AdminLayout from '@/components/admin-layout'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
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
  MailOpen,
  Mail,
  Calendar,
  CheckCircle,
  XCircle,
  User,
  MoreHorizontal,
  Eye,
  ChevronLeft,
  ChevronRight,
  Send,
  AlertTriangle,
  Clock,
  ArrowLeft,
  TrendingUp,
} from 'lucide-react'

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

interface UserProfile {
  email: string
  first_name: string
  last_name: string
}

interface EmailStats {
  total: number
  successful: number
  failed: number
}

export default function UserEmailsPage() {
  const params = useParams()
  const router = useRouter()
  const userId = params.id as string

  const [user, setUser] = useState<UserProfile | null>(null)
  const [emailLogs, setEmailLogs] = useState<EmailLog[]>([])
  const [stats, setStats] = useState<EmailStats>({ total: 0, successful: 0, failed: 0 })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [showDetailsDialog, setShowDetailsDialog] = useState(false)
  const [selectedEmail, setSelectedEmail] = useState<EmailLog | null>(null)

  useEffect(() => {
    if (userId) {
      fetchUserEmails()
    }
  }, [userId, page])

  const fetchUserEmails = async () => {
    setLoading(true)
    setError('')
    try {
      const response = await fetch(`/api/admin/users/${userId}/emails?page=${page}&limit=20`)
      const result = await response.json()

      if (!response.ok) {
        setError(result.error || 'Failed to fetch user emails')
        return
      }

      setUser(result.user)
      setEmailLogs(result.emailLogs || [])
      setStats(result.stats)
      setTotalPages(result.pagination.totalPages || 1)
    } catch (error) {
      console.error('Error fetching user emails:', error)
      setError('An unexpected error occurred')
    } finally {
      setLoading(false)
    }
  }

  const handleViewDetails = (emailLog: EmailLog) => {
    setSelectedEmail(emailLog)
    setShowDetailsDialog(true)
  }

  const formatDate = (dateString: string) => {
    if (!dateString) return 'N/A'
    return new Date(dateString).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const getStatusBadge = (status: string) => {
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
    if (stats.total === 0) return 0
    return Math.round((stats.successful / stats.total) * 100)
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => router.back()}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Email History</h1>
            {user && (
              <p className="text-gray-600">
                All emails sent to {user.first_name} {user.last_name} ({user.email})
              </p>
            )}
          </div>
        </div>

        {/* Global Messages */}
        {error && (
          <div className="text-sm text-red-600 bg-red-50 p-3 rounded-md">{error}</div>
        )}

        {/* User Info & Stats */}
        {user && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center space-x-3">
                  <Avatar className="h-12 w-12">
                    <AvatarFallback className="text-lg">
                      {user.first_name?.[0] || user.email[0].toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <div className="font-medium">{user.first_name} {user.last_name}</div>
                    <div className="text-sm text-gray-600">{user.email}</div>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center space-x-2">
                  <MailOpen className="h-5 w-5 text-blue-600" />
                  <div>
                    <div className="text-2xl font-bold">{stats.total}</div>
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
                    <div className="text-2xl font-bold text-green-600">{stats.successful}</div>
                    <div className="text-sm text-gray-600">Successful</div>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center space-x-2">
                  <TrendingUp className="h-5 w-5 text-purple-600" />
                  <div>
                    <div className="text-2xl font-bold text-purple-600">{getSuccessRate()}%</div>
                    <div className="text-sm text-gray-600">Success Rate</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MailOpen className="h-5 w-5" />
              Email History
            </CardTitle>
            <CardDescription>
              Individual emails sent to this user
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex justify-center py-8">
                <div className="text-gray-500">Loading email history...</div>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Email Logs Table */}
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Subject</TableHead>
                      <TableHead>Sender</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Sent At</TableHead>
                      <TableHead>Error</TableHead>
                      <TableHead className="w-[50px]"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {emailLogs.map((emailLog) => (
                      <TableRow key={emailLog.id}>
                        <TableCell>
                          <div className="max-w-[300px] truncate" title={emailLog.subject}>
                            {emailLog.subject}
                          </div>
                        </TableCell>
                        <TableCell>
                          {emailLog.sender ? (
                            <div className="text-sm">
                              <div className="font-medium">
                                {emailLog.sender.first_name} {emailLog.sender.last_name}
                              </div>
                              <div className="text-gray-500">{emailLog.sender.email}</div>
                            </div>
                          ) : (
                            <span className="text-gray-500">System</span>
                          )}
                        </TableCell>
                        <TableCell>{getStatusBadge(emailLog.status)}</TableCell>
                        <TableCell>
                          <div className="flex items-center space-x-1">
                            <Clock className="h-3 w-3 text-gray-500" />
                            <span className="text-sm">{formatDate(emailLog.sent_at)}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          {emailLog.error_message ? (
                            <div className="flex items-center space-x-1">
                              <AlertTriangle className="h-3 w-3 text-red-500" />
                              <span className="text-sm text-red-600 truncate max-w-[150px]" title={emailLog.error_message}>
                                {emailLog.error_message}
                              </span>
                            </div>
                          ) : (
                            <span className="text-gray-400">-</span>
                          )}
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
                              <DropdownMenuItem onClick={() => handleViewDetails(emailLog)}>
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

                {emailLogs.length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    No emails found for this user.
                  </div>
                )}

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-between pt-4">
                    <div className="text-sm text-gray-500">
                      Page {page} of {totalPages}
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
                Detailed information about this email
              </DialogDescription>
            </DialogHeader>
            
            {selectedEmail && (
              <div className="space-y-4 py-4 overflow-y-auto max-h-[60vh]">
                {/* Email Info */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <div className="text-sm font-medium">Status</div>
                    <div className="text-sm">{getStatusBadge(selectedEmail.status)}</div>
                  </div>
                  <div>
                    <div className="text-sm font-medium">Sent At</div>
                    <div className="text-sm text-gray-600">{formatDate(selectedEmail.sent_at)}</div>
                  </div>
                  <div className="md:col-span-2">
                    <div className="text-sm font-medium">Sender</div>
                    <div className="text-sm text-gray-600">
                      {selectedEmail.sender
                        ? `${selectedEmail.sender.first_name} ${selectedEmail.sender.last_name} (${selectedEmail.sender.email})`
                        : 'System'}
                    </div>
                  </div>
                </div>

                {/* Subject */}
                <div>
                  <div className="text-sm font-medium">Subject</div>
                  <div className="text-sm text-gray-600 bg-gray-50 p-3 rounded-lg">
                    {selectedEmail.subject}
                  </div>
                </div>

                {/* Body */}
                <div>
                  <div className="text-sm font-medium">Message Body</div>
                  <div className="text-sm text-gray-600 bg-gray-50 p-3 rounded-lg max-h-40 overflow-y-auto whitespace-pre-wrap">
                    {selectedEmail.body}
                  </div>
                </div>

                {/* Error Message */}
                {selectedEmail.error_message && (
                  <div>
                    <div className="text-sm font-medium text-red-600">Error Message</div>
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