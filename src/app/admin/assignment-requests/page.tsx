'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import AdminLayout from '@/components/admin-layout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import { Check, X, Clock, Users, ArrowRight, RefreshCw } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { getUserNotifications, markNotificationAsRead } from '@/lib/notification-system'

interface AssignmentRequest {
  id: string
  leadId: string
  leadName: string
  currentAssignee: string
  currentAssigneeId: string | null
  requestedAssignee: string
  requestedAssigneeId: string | null
  requestedBy: string
  requestedById: string
  reason: string
  status: 'pending' | 'approved' | 'rejected'
  timestamp: string
  processedAt?: string
  processedBy?: string
}

interface DatabaseNotification {
  id: string
  user_id: string
  type: string
  title: string
  message: string
  entity_type: string
  entity_id: string | null
  priority: string
  is_read: boolean
  action_url: string | null
  metadata: any
  created_at: string
}

export default function AssignmentRequestsPage() {
  const [requests, setRequests] = useState<AssignmentRequest[]>([])
  const [processingId, setProcessingId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [lastFetchTime, setLastFetchTime] = useState<string>('')

  useEffect(() => {
    loadRequests()
    // Poll for new requests every 30 seconds
    const interval = setInterval(loadRequests, 30000)
    return () => clearInterval(interval)
  }, [])

  const loadRequests = useCallback(async () => {
    try {
      const supabase = createClient()
      
      // Get current user (must be admin)
      const { data: { user }, error: authError } = await supabase.auth.getUser()
      if (authError || !user) {
        console.error('Authentication error:', authError)
        if (loading) setLoading(false)
        return
      }

      // Get all lead_reassignment_request notifications for admin users
      const { data: notifications, error } = await supabase
        .from('notifications')
        .select(`
          id,
          user_id,
          type,
          title,
          message,
          entity_type,
          entity_id,
          priority,
          is_read,
          action_url,
          metadata,
          created_at
        `)
        .eq('type', 'lead_reassignment_request')
        .order('created_at', { ascending: false })

      if (error) {
        console.error('❌ [ADMIN] Error fetching notifications:', error)
        if (loading) setLoading(false)
        return
      }

      // Create a unique hash of the data to detect changes
      const dataHash = JSON.stringify(notifications?.map((n: DatabaseNotification) => ({ id: n.id, is_read: n.is_read, created_at: n.created_at })))
      
      // Only process if data actually changed
      if (dataHash !== lastFetchTime) {
        setLastFetchTime(dataHash)
        
        // Convert database notifications to assignment requests format
        const assignmentRequests: AssignmentRequest[] = notifications?.map((notification: DatabaseNotification) => {
          const metadata = notification.metadata || {}
          
          return {
            id: notification.id,
            leadId: metadata.leadId || notification.entity_id || '',
            leadName: metadata.leadName || 'Unknown Lead',
            currentAssignee: metadata.currentOwnerName || metadata.requestingUserName || 'Unknown',
            currentAssigneeId: metadata.currentOwnerId || metadata.requestingUserId || null,
            requestedAssignee: metadata.requestedUserName || 'Unknown',
            requestedAssigneeId: metadata.requestedUserId || null,
            requestedBy: metadata.requestingUserName || 'Unknown',
            requestedById: metadata.requestingUserId || '',
            reason: metadata.reason || 'No reason provided',
            status: notification.is_read ? 'approved' : 'pending',
            timestamp: notification.created_at,
            processedAt: notification.is_read ? notification.created_at : undefined,
            processedBy: notification.is_read ? 'Admin' : undefined
          }
        }) || []

        setRequests(assignmentRequests)
      }
      
      if (loading) setLoading(false)

    } catch (error) {
      console.error('❌ [ADMIN] Error loading requests:', error)
      if (loading) setLoading(false)
    }
  }, [loading, lastFetchTime])

  const approveRequest = async (request: AssignmentRequest) => {
    setProcessingId(request.id)
    
    try {
      const supabase = createClient()
      
      console.log('✅ [ADMIN] Approving request:', {
        notificationId: request.id,
        leadId: request.leadId,
        requestedAssigneeId: request.requestedAssigneeId,
        requestedAssignee: request.requestedAssignee
      })

      // 1. Update the lead with the new assignment and clear reassignment_status
      console.log('🔄 [ADMIN] Updating lead with:', {
        assigned_to: request.requestedAssigneeId,
        reassignment_status: null
      })

      const { data: updatedLead, error: leadError } = await supabase
        .from('leads')
        .update({ 
          assigned_to: request.requestedAssigneeId,
          reassignment_status: null  // Clear the pending status
        })
        .eq('id', request.leadId)
        .select()
      
      if (leadError) {
        console.error('❌ [ADMIN] Error updating lead:', leadError)
        console.error('❌ [ADMIN] Lead error details:', {
          message: leadError.message,
          details: leadError.details,
          hint: leadError.hint,
          code: leadError.code
        })
        toast.error('Failed to update assignment', {
          description: leadError.message
        })
        return
      }

      console.log('✅ [ADMIN] Lead updated successfully')
      console.log('✅ [ADMIN] Updated lead data:', updatedLead)
      
      if (updatedLead && updatedLead.length > 0) {
        console.log('✅ [ADMIN] New lead assignment:', {
          leadId: updatedLead[0].id,
          newOwner: updatedLead[0].assigned_to,
          reassignmentStatus: updatedLead[0].reassignment_status
        })
      }
      
      // 2. Mark the notification as read to indicate it's been processed
      const { error: notificationError } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('id', request.id)

      if (notificationError) {
        console.error('Error updating notification:', notificationError)
        // Don't fail the whole operation for this
      }

      // 3. Send approval notification to the requester
      try {
        // Get the original notification to find the requester's ID
        const { data: originalNotification } = await supabase
          .from('notifications')
          .select('metadata')
          .eq('id', request.id)
          .single()

        const metadata = originalNotification?.metadata || {}
        const requestingUserId = metadata.requestingUserId

        if (requestingUserId) {
          console.log('📬 [ADMIN] Sending approval notification to:', requestingUserId)
          
          // Insert approval notification directly into notifications table
          const { error: approvalError } = await supabase
            .from('notifications')
            .insert([{
              user_id: requestingUserId,
              type: 'lead_reassignment_approved',
              title: 'Reassignment Approved',
              message: `Your request to be assigned to ${request.leadName} has been approved by admin.`,
              entity_type: 'lead',
              entity_id: request.leadId,
              priority: 'medium',
              is_read: false,
              action_url: '/dashboard/leads',
              metadata: {
                leadName: request.leadName,
                approvedBy: 'Admin',
                newAssignee: request.requestedAssignee,
                originalRequestId: request.id
              },
              created_at: new Date().toISOString()
            }])

          if (approvalError) {
            console.warn('Failed to send approval notification:', approvalError)
          } else {
            console.log('✅ [ADMIN] Approval notification sent successfully')
          }
        }
      } catch (notifyError) {
        console.warn('Error sending approval notification:', notifyError)
      }

      // 4. Update local state
      const updatedRequest = {
        ...request,
        status: 'approved' as const,
        processedAt: new Date().toISOString(),
        processedBy: 'Admin'
      }
      
      const allRequests = requests.map(r => 
        r.id === request.id ? updatedRequest : r
      )
      setRequests(allRequests)
      
      toast.success('Assignment approved!', {
        description: `${request.leadName} has been assigned to ${request.requestedAssignee}`
      })

    } catch (error) {
      console.error('Error approving request:', error)
      toast.error('Failed to approve request')
    } finally {
      setProcessingId(null)
    }
  }

  const rejectRequest = async (request: AssignmentRequest) => {
    setProcessingId(request.id)
    
    try {
      const supabase = createClient()
      
      console.log('❌ [ADMIN] Rejecting request:', {
        notificationId: request.id,
        leadId: request.leadId
      })

      // 1. Clear the reassignment_status on the lead (no longer pending)
      const { error: leadError } = await supabase
        .from('leads')
        .update({ 
          reassignment_status: null  // Clear the pending status
        })
        .eq('id', request.leadId)
      
      if (leadError) {
        console.error('Error updating lead:', leadError)
        // Don't fail for this, continue with rejection
      }

      // 2. Mark the notification as read to indicate it's been processed
      const { error: notificationError } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('id', request.id)

      if (notificationError) {
        console.error('Error updating notification:', notificationError)
      }

      // 3. Send rejection notification to the requester
      try {
        // Get the original notification to find the requester's ID
        const { data: originalNotification } = await supabase
          .from('notifications')
          .select('metadata')
          .eq('id', request.id)
          .single()

        const metadata = originalNotification?.metadata || {}
        const requestingUserId = metadata.requestingUserId

        if (requestingUserId) {
          console.log('📬 [ADMIN] Sending rejection notification to:', requestingUserId)
          
          // Insert rejection notification directly into notifications table
          const { error: rejectionError } = await supabase
            .from('notifications')
            .insert([{
              user_id: requestingUserId,
              type: 'lead_reassignment_rejected',
              title: 'Reassignment Rejected',
              message: `Your request to be assigned to ${request.leadName} has been rejected by admin.`,
              entity_type: 'lead',
              entity_id: request.leadId,
              priority: 'medium',
              is_read: false,
              action_url: '/dashboard/leads',
              metadata: {
                leadName: request.leadName,
                rejectedBy: 'Admin',
                originalReason: request.reason,
                originalRequestId: request.id
              },
              created_at: new Date().toISOString()
            }])

          if (rejectionError) {
            console.warn('Failed to send rejection notification:', rejectionError)
          } else {
            console.log('✅ [ADMIN] Rejection notification sent successfully')
          }
        }
      } catch (notifyError) {
        console.warn('Error sending rejection notification:', notifyError)
      }

      // 4. Update local state
      const updatedRequest = {
        ...request,
        status: 'rejected' as const,
        processedAt: new Date().toISOString(),
        processedBy: 'Admin'
      }
      
      const allRequests = requests.map(r => 
        r.id === request.id ? updatedRequest : r
      )
      setRequests(allRequests)
      
      toast.info('Assignment request rejected', {
        description: `Request for ${request.leadName} has been rejected`
      })

    } catch (error) {
      console.error('Error rejecting request:', error)
      toast.error('Failed to reject request')
    } finally {
      setProcessingId(null)
    }
  }

  const pendingRequests = useMemo(() => requests.filter(r => r.status === 'pending'), [requests])
  const processedRequests = useMemo(() => requests.filter(r => r.status !== 'pending'), [requests])

  if (loading) {
    return (
      <AdminLayout>
        <div className="container mx-auto px-6 py-8">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
          </div>
        </div>
      </AdminLayout>
    )
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Assignment Requests</h1>
            <p className="text-gray-600">Review and approve lead assignment requests from your team</p>
          </div>
          <div className="flex gap-2">
            <Button onClick={loadRequests} variant="outline">
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh
            </Button>
            <Button 
              onClick={async () => {
                const supabase = createClient()
                try {
                  // Clear all pending reassignment statuses
                  if (confirm('Clear all pending reassignment requests? This will make all leads available for reassignment again.')) {
                    const { data: clearData, error: clearError } = await supabase
                      .from('leads')
                      .update({ reassignment_status: null })
                      .not('reassignment_status', 'is', null)
                      .select('id')
                    
                    if (clearError) {
                      alert(`Error: ${clearError.message}`)
                    } else {
                      alert(`Success! Cleared ${clearData?.length || 0} pending reassignment requests.`)
                      loadRequests() // Refresh the page
                    }
                  }
                } catch (e) {
                  console.error('🧪 [CLEAR] Exception:', e)
                  alert(`Error: ${e}`)
                }
              }}
              variant="destructive"
              size="sm"
            >
              Clear All Pending
            </Button>
          </div>
        </div>

        {/* Pending Requests */}
        <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-orange-500" />
            Pending Requests ({pendingRequests.length})
          </CardTitle>
          <CardDescription>
            These assignment requests are waiting for your approval
          </CardDescription>
        </CardHeader>
        <CardContent>
          {pendingRequests.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No pending assignment requests
            </div>
          ) : (
            <div className="space-y-4">
              {pendingRequests.map((request) => (
                <div key={request.id} className="border rounded-lg p-4 bg-orange-50 border-orange-200">
                  <div className="flex items-start justify-between">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="bg-orange-100">Pending</Badge>
                        <span className="text-sm text-gray-500">
                          {new Date(request.timestamp).toLocaleString()}
                        </span>
                      </div>
                      <div className="font-medium text-lg">{request.leadName}</div>
                      <div className="flex items-center gap-2 text-sm">
                        <Users className="w-4 h-4 text-gray-500" />
                        <span>{request.currentAssignee}</span>
                        <ArrowRight className="w-4 h-4 text-gray-400" />
                        <span className="font-semibold text-teal-700">{request.requestedAssignee}</span>
                      </div>
                      <div className="text-sm text-gray-600">
                        <strong>Requested by:</strong> {request.requestedBy}
                      </div>
                      <div className="text-sm text-gray-600">
                        <strong>Reason:</strong> {request.reason}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        className="bg-green-600 hover:bg-green-700"
                        onClick={() => approveRequest(request)}
                        disabled={processingId === request.id}
                      >
                        {processingId === request.id ? (
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        ) : (
                          <Check className="w-4 h-4" />
                        )}
                        <span className="ml-1">Approve</span>
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => rejectRequest(request)}
                        disabled={processingId === request.id}
                      >
                        <X className="w-4 h-4 mr-1" />
                        Reject
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

        {/* Processed Requests History */}
        <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Check className="w-5 h-5 text-gray-500" />
            Processed Requests ({processedRequests.length})
          </CardTitle>
          <CardDescription>
            History of approved and rejected assignment requests
          </CardDescription>
        </CardHeader>
        <CardContent>
          {processedRequests.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No processed requests yet
            </div>
          ) : (
            <div className="space-y-3">
              {processedRequests.slice(0, 10).map((request) => (
                <div key={request.id} className={`border rounded-lg p-3 ${
                  request.status === 'approved' ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'
                }`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Badge 
                        variant={request.status === 'approved' ? 'default' : 'destructive'}
                        className={request.status === 'approved' ? 'bg-green-600' : ''}
                      >
                        {request.status === 'approved' ? 'Approved' : 'Rejected'}
                      </Badge>
                      <div>
                        <span className="font-medium">{request.leadName}</span>
                        <span className="text-sm text-gray-600 ml-2">
                          {request.currentAssignee} → {request.requestedAssignee}
                        </span>
                      </div>
                    </div>
                    <div className="text-sm text-gray-500">
                      {request.processedAt && new Date(request.processedAt).toLocaleString()}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
      </div>
    </AdminLayout>
  )
}