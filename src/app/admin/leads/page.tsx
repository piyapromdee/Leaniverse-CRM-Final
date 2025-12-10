'use client'

import { useState, useEffect } from 'react'
import AdminLayout from '@/components/admin-layout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import MasterFilterBar from '@/components/MasterFilterBar'
import { useMasterFilter } from '@/contexts/MasterFilterContext'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Users,
  Search,
  Filter,
  Download,
  UserPlus,
  Phone,
  Mail,
  Building,
  Calendar,
  TrendingUp,
  AlertCircle,
  CheckCircle,
  Activity,
  Bell
} from 'lucide-react'

interface Lead {
  id: string
  first_name: string
  last_name: string
  email: string
  phone?: string
  company_name?: string
  job_title?: string
  company_size?: string
  industry?: string
  budget_range?: string
  decision_timeline?: string
  notes?: string
  status: string
  source?: string
  priority?: string
  score?: number
  assigned_to?: string
  assigned_user_name?: string
  created_at: string
  updated_at?: string
}

interface User {
  id: string
  first_name: string
  last_name: string
  email: string
  role: string
}

interface LeadActivity {
  id: string
  lead_id: string
  user_id: string
  user_name: string
  activity_type: 'status_change' | 'assignment' | 'reassignment_request'
  description: string
  old_value?: string
  new_value?: string
  created_at: string
}

export default function AdminLeadsPage() {
  const { masterTimePeriod, masterAssignee, masterSource, getDateRange } = useMasterFilter()
  const [leads, setLeads] = useState<Lead[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [activities, setActivities] = useState<LeadActivity[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [sourceFilter, setSourceFilter] = useState('all')
  const [scoreFilter, setScoreFilter] = useState<'all' | 'no_score'>('all')
  const [selectedLeads, setSelectedLeads] = useState<string[]>([])
  const [bulkAction, setBulkAction] = useState('')
  const [sortBy, setSortBy] = useState('newest')
  const [lastRequestCount, setLastRequestCount] = useState(0)
  const [showNotification, setShowNotification] = useState(false)

  useEffect(() => {
    fetchLeads()
    fetchUsers()
    fetchActivities()
  }, [])

  // Auto-refresh activities periodically to sync with sales dashboard changes
  // In a real implementation, this would use Supabase real-time subscriptions
  useEffect(() => {
    const interval = setInterval(() => {
      fetchActivities()
    }, 30000) // Refresh every 30 seconds

    return () => clearInterval(interval)
  }, [])

  // Notification system for new reassignment requests
  useEffect(() => {
    const checkForNewRequests = () => {
      const currentRequests = getPendingRequests()
      const currentCount = currentRequests.length
      
      // If we have new requests (more than before)
      if (currentCount > lastRequestCount && lastRequestCount > 0) {
        const newRequestsCount = currentCount - lastRequestCount
        
        // Show browser notification
        if ('Notification' in window && Notification.permission === 'granted') {
          new Notification('🚨 New Reassignment Request', {
            body: `${newRequestsCount} new reassignment request${newRequestsCount > 1 ? 's' : ''} pending your approval`,
            icon: '/dummi-co-logo-new.jpg'
          })
        }
        
        // Show in-app notification
        setShowNotification(true)
        setTimeout(() => setShowNotification(false), 5000) // Hide after 5 seconds
        
        // Play notification sound
        try {
          const audio = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBkOX4PK9bSEE') 
          audio.play()
        } catch (error) {
          console.log('Could not play notification sound:', error)
        }
      }
      
      setLastRequestCount(currentCount)
    }
    
    // Check immediately and then every 10 seconds
    checkForNewRequests()
    const notificationInterval = setInterval(checkForNewRequests, 10000)
    
    return () => clearInterval(notificationInterval)
  }, [activities, lastRequestCount])

  // Request notification permission on load
  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission()
    }
  }, [])

  const fetchLeads = async () => {
    try {
      const response = await fetch('/api/admin/leads')
      if (response.ok) {
        const data = await response.json()
        // Use real data from database
        setLeads(data.leads || [])
      }
    } catch (error) {
      console.error('Error fetching leads:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchUsers = async () => {
    try {
      const response = await fetch('/api/admin/users-list')
      if (response.ok) {
        const data = await response.json()
        setUsers(data.users || [])
      }
    } catch (error) {
      console.error('Error fetching users:', error)
    }
  }

  const fetchActivities = async () => {
    try {
      // Check for reassignment requests from localStorage (for demo - in real app would be from database)
      const reassignmentRequests = JSON.parse(localStorage.getItem('reassignmentRequests') || '[]')
      // Check for sales activities from localStorage
      const salesActivities = JSON.parse(localStorage.getItem('salesActivities') || '[]')
      // Check for admin activities from localStorage
      const adminActivities = JSON.parse(localStorage.getItem('adminActivities') || '[]')
      
      // Mock activities for now - in real implementation, fetch from lead_activities table
      const mockActivities: LeadActivity[] = []

      // Add admin activities
      adminActivities.forEach((activity: any, index: number) => {
        if (activity.action === 'status_change') {
          mockActivities.push({
            id: `admin_stored_${index}`,
            lead_id: activity.leadId,
            user_id: 'admin',
            user_name: 'Admin',
            activity_type: 'status_change',
            description: `Changed ${activity.leadName}'s status from ${activity.oldStatus} to ${activity.newStatus}`,
            old_value: activity.oldStatus,
            new_value: activity.newStatus,
            created_at: activity.timestamp
          })
        } else if (activity.action === 'assignment') {
          mockActivities.push({
            id: `admin_stored_${index}`,
            lead_id: activity.leadId,
            user_id: 'admin',
            user_name: 'Admin',
            activity_type: 'assignment',
            description: `Assigned ${activity.leadName} to ${activity.assignedTo}`,
            created_at: activity.timestamp
          })
        }
      })

      // Add sales team activities
      salesActivities.forEach((activity: any, index: number) => {
        mockActivities.push({
          id: `sales_${index}`,
          lead_id: activity.leadId,
          user_id: 'sales_user',
          user_name: 'Sales Team Member',
          activity_type: 'status_change',
          description: `Changed status from ${activity.oldStatus || 'unknown'} to ${activity.newStatus}`,
          old_value: activity.oldStatus,
          new_value: activity.newStatus,
          created_at: activity.timestamp
        })
      })

      // Add reassignment requests as activities
      reassignmentRequests.forEach((request: any, index: number) => {
        mockActivities.push({
          id: `reassign_${index}`,
          lead_id: request.leadId,
          user_id: 'sales_user',
          user_name: 'Sales Team Member',
          activity_type: 'reassignment_request',
          description: `Requested reassignment to ${request.requestedUserName} - Reason: ${request.reason}`,
          created_at: request.timestamp
        })
      })

      // Sort activities by timestamp (newest first)
      mockActivities.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())

      setActivities(mockActivities)
    } catch (error) {
      console.error('Error fetching activities:', error)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'new':
      case 'pending': return 'bg-blue-100 text-blue-800'
      case 'contacted': return 'bg-yellow-100 text-yellow-800'
      case 'qualified': return 'bg-purple-100 text-purple-800'
      case 'converted': return 'bg-green-100 text-green-800'
      case 'won': return 'bg-emerald-100 text-emerald-800'
      case 'lost': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const calculateLeadScore = (lead: any) => {
    let score = 0
    
    // Basic information (40 points max)
    if (lead.first_name?.trim()) score += 10
    if (lead.last_name?.trim()) score += 10
    if (lead.email?.trim()) score += 15
    if (lead.phone?.trim()) score += 5
    
    // Company information (30 points max)
    if (lead.company_name?.trim()) score += 20
    if (lead.job_title?.trim()) score += 10
    
    // Engagement (30 points max)
    if (lead.source && lead.source !== 'Unknown') score += 10
    if (lead.budget_range || (lead.score && lead.score > 0)) score += 15
    if (lead.notes?.trim()) score += 5
    
    return Math.min(score, 100) // Cap at 100
  }

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600'
    if (score >= 60) return 'text-yellow-600'
    if (score >= 40) return 'text-orange-600'
    return 'text-red-600'
  }

  const formatSourceName = (source: string) => {
    if (!source) return 'Unknown'
    
    // Clean up lead form source names - more comprehensive matching
    if (source.includes('Deemmi-Lead-Form-Copy')) {
      return 'Lead Form Copy'
    }
    if (source.includes('Deemmi-Lead-Form')) {
      return 'Lead Form'  
    }
    if (source.toLowerCase().includes('lead-form') || source.toLowerCase().includes('leadform')) {
      return 'Lead Form'
    }
    
    // Other source mappings
    const sourceMap: Record<string, string> = {
      'website': 'Website',
      'Website': 'Website',
      'referral': 'Referral',
      'Referral': 'Referral',
      'linkedin': 'LinkedIn',
      'google_ads': 'Google Ads',
      'facebook_ads': 'Facebook Ads',
      'email_marketing': 'Email Marketing',
      'lead_magnet': 'Lead Magnet',
      'contact_form': 'Contact Form'
    }
    
    return sourceMap[source] || source.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
  }

  const handleExport = () => {
    const csvContent = [
      ['Name', 'Email', 'Company', 'Status', 'Source', 'Score', 'Created'],
      ...filteredLeads.map(lead => [
        `${lead.first_name || ''} ${lead.last_name || ''}`.trim(),
        lead.email,
        lead.company_name || '',
        lead.status,
        lead.source || '',
        lead.score || 0,
        new Date(lead.created_at).toLocaleDateString()
      ])
    ].map(row => row.join(',')).join('\n')
    
    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `leads-export-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    window.URL.revokeObjectURL(url)
  }

  const handleBulkAction = async () => {
    if (!bulkAction || selectedLeads.length === 0) return
    
    try {
      if (bulkAction === 'delete') {
        if (confirm(`Are you sure you want to delete ${selectedLeads.length} leads?`)) {
          // Call API to delete leads (for real implementation)
          alert('Bulk delete functionality would be implemented via API calls in production')
          setSelectedLeads([])
          setBulkAction('')
          fetchLeads() // Refresh data
        }
      } else {
        // Update status for selected leads via API
        const updatePromises = selectedLeads.map(leadId => 
          updateLeadStatus(leadId, bulkAction)
        )
        await Promise.all(updatePromises)
        setSelectedLeads([])
        setBulkAction('')
        fetchLeads() // Refresh data
      }
    } catch (error) {
      console.error('Error performing bulk action:', error)
    }
  }

  const updateLeadStatus = async (leadId: string, newStatus: string) => {
    try {
      const response = await fetch(`/api/admin/leads/${leadId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: newStatus })
      })

      if (!response.ok) {
        throw new Error('Failed to update lead status')
      }

      // Add activity record
      const newActivity: LeadActivity = {
        id: Date.now().toString(),
        lead_id: leadId,
        user_id: 'admin',
        user_name: 'Admin',
        activity_type: 'status_change',
        description: `Changed status to ${newStatus}`,
        new_value: newStatus,
        created_at: new Date().toISOString()
      }
      setActivities([newActivity, ...activities])

      return response.json()
    } catch (error) {
      console.error('Error updating lead status:', error)
      throw error
    }
  }

  const handleStatusChange = async (leadId: string, newStatus: string) => {
    try {
      // Get the current lead to capture old status
      const currentLead = leads.find(lead => lead.id === leadId)
      const oldStatus = currentLead?.status || 'unknown'
      const leadName = `${currentLead?.first_name || ''} ${currentLead?.last_name || ''}`.trim() || 'Lead'
      
      // Update locally first for immediate feedback
      setLeads(leads.map(lead => 
        lead.id === leadId ? { ...lead, status: newStatus } : lead
      ))
      
      // In a real implementation, this would call the API
      console.log(`Status updated for lead ${leadId} to ${newStatus}`)
      
      // Add activity record for tracking
      const newActivity: LeadActivity = {
        id: `admin_${Date.now()}`,
        lead_id: leadId,
        user_id: 'admin',
        user_name: 'Admin',
        activity_type: 'status_change',
        description: `Changed ${leadName}'s status to ${newStatus}`,
        old_value: oldStatus,
        new_value: newStatus,
        created_at: new Date().toISOString()
      }
      setActivities(prevActivities => [newActivity, ...prevActivities])
      
      // Also store admin activities in localStorage to persist
      const existingAdminActivities = JSON.parse(localStorage.getItem('adminActivities') || '[]')
      existingAdminActivities.push({
        leadId,
        leadName,
        action: 'status_change',
        oldStatus,
        newStatus,
        timestamp: new Date().toISOString(),
        userRole: 'admin'
      })
      localStorage.setItem('adminActivities', JSON.stringify(existingAdminActivities))
      
    } catch (error) {
      console.error('Error updating status:', error)
    }
  }

  const toggleSelectAll = () => {
    if (selectedLeads.length === filteredLeads.length) {
      setSelectedLeads([])
    } else {
      setSelectedLeads(filteredLeads.map(lead => lead.id))
    }
  }

  const handleAssignLead = async (leadId: string, userId: string) => {
    try {
      // Call API to persist the assignment to the database
      const response = await fetch(`/api/admin/leads/${leadId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          assigned_to: userId
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to assign lead')
      }

      const data = await response.json()

      // Update local state with the response data
      setLeads(leads.map(lead =>
        lead.id === leadId
          ? { ...lead, assigned_to: userId, assigned_user_name: data.assigned_user_name }
          : lead
      ))

      // Add activity record
      const leadName = `${leads.find(l => l.id === leadId)?.first_name || ''} ${leads.find(l => l.id === leadId)?.last_name || ''}`.trim() || 'Lead'
      const newActivity: LeadActivity = {
        id: `admin_assign_${Date.now()}`,
        lead_id: leadId,
        user_id: 'admin',
        user_name: 'Admin',
        activity_type: 'assignment',
        description: `Assigned ${leadName} to ${data.assigned_user_name}`,
        created_at: new Date().toISOString()
      }
      setActivities(prevActivities => [newActivity, ...prevActivities])

      // Store assignment in localStorage too
      const existingAdminActivities = JSON.parse(localStorage.getItem('adminActivities') || '[]')
      existingAdminActivities.push({
        leadId,
        leadName,
        action: 'assignment',
        assignedTo: data.assigned_user_name,
        timestamp: new Date().toISOString(),
        userRole: 'admin'
      })
      localStorage.setItem('adminActivities', JSON.stringify(existingAdminActivities))
      
      alert('Lead assigned successfully')
    } catch (error) {
      console.error('Error assigning lead:', error)
      alert('Failed to assign lead')
    }
  }

  const getLeadActivities = (leadId: string) => {
    return activities.filter(activity => activity.lead_id === leadId)
  }

  const hasRecentActivity = (leadId: string) => {
    const leadActivities = getLeadActivities(leadId)
    if (leadActivities.length === 0) return false
    
    const latestActivity = leadActivities[0]
    const activityDate = new Date(latestActivity.created_at)
    const hoursSinceActivity = (Date.now() - activityDate.getTime()) / (1000 * 60 * 60)
    
    return hoursSinceActivity < 24 // Activity within last 24 hours
  }

  const getPendingRequests = () => {
    return activities.filter(activity => activity.activity_type === 'reassignment_request')
  }

  // Helper function to check if lead requires attention
  const requiresAttention = (lead: Lead): boolean => {
    // Last activity > 7 days AND status is New or Contacted
    const lastActivityDate = new Date(lead.updated_at || lead.created_at)
    const daysSinceActivity = (Date.now() - lastActivityDate.getTime()) / (1000 * 60 * 60 * 24)

    const isOld = daysSinceActivity > 7
    const isActiveStatus = lead.status?.toLowerCase() === 'new' || lead.status?.toLowerCase() === 'contacted'

    return isOld && isActiveStatus
  }

  // Helper function to check if lead has no score
  const hasNoScore = (lead: Lead): boolean => {
    // Check for null, undefined, 0, empty string, or any falsy value
    if (lead.score === null || lead.score === undefined) return true
    if (typeof lead.score === 'number' && lead.score === 0) return true
    if (typeof lead.score === 'string' && (lead.score === '' || lead.score === '0')) return true
    return false
  }

  // Helper function to check if lead is qualified
  const isQualified = (lead: Lead): boolean => {
    return lead.status?.toLowerCase() === 'qualified' || lead.status?.toLowerCase() === 'contacted'
  }

  // Click handlers for summary cards to apply filters
  const handleRequiresAttentionClick = () => {
    setStatusFilter('requires_attention')
    setScoreFilter('all')
    setSourceFilter('all')
  }

  const handleWithoutScoreClick = () => {
    console.log('🔍 [WITHOUT SCORE] Activating filter')
    console.log('🔍 [WITHOUT SCORE] Leads with no score:', leads.filter(l => hasNoScore(l)).length)
    console.log('🔍 [WITHOUT SCORE] Sample leads without score:',
      leads.filter(l => hasNoScore(l)).slice(0, 3).map(l => ({
        name: `${l.first_name} ${l.last_name}`,
        score: l.score,
        scoreType: typeof l.score
      }))
    )
    console.log('🔍 [WITHOUT SCORE] Sample leads WITH score:',
      leads.filter(l => !hasNoScore(l)).slice(0, 3).map(l => ({
        name: `${l.first_name} ${l.last_name}`,
        score: l.score,
        scoreType: typeof l.score
      }))
    )
    setScoreFilter('no_score')
    setStatusFilter('all')
    setSourceFilter('all')
    setSearchTerm('') // Clear search term to ensure no interference
  }

  const handleTotalQualifiedClick = () => {
    setStatusFilter('qualified_total')
    setScoreFilter('all')
    setSourceFilter('all')
  }

  const handleResetFilters = () => {
    setStatusFilter('all')
    setScoreFilter('all')
    setSourceFilter('all')
    setSearchTerm('')
  }

  const filteredLeads = leads.filter(lead => {
    const matchesSearch = (
      (lead.first_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (lead.last_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (lead.email || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (lead.company_name || '').toLowerCase().includes(searchTerm.toLowerCase())
    )

    // Master Filter: Time Period - use getDateRange() for consistency
    let matchesTimePeriod = true
    if (lead.created_at) {
      const { startDate } = getDateRange()
      if (startDate) {
        const leadDate = new Date(lead.created_at)
        matchesTimePeriod = leadDate >= startDate
      }
    }

    // Master Filter: Assignee
    const matchesAssignee = masterAssignee === 'all' || lead.assigned_to === masterAssignee

    // Master Filter: Source
    let matchesMasterSource = masterSource === 'all'
    if (!matchesMasterSource) {
      if (masterSource === 'lead_form') {
        matchesMasterSource = (lead.source || '').toLowerCase().includes('lead-form') ||
                             (lead.source || '').toLowerCase().includes('leadform') ||
                             (lead.source || '').includes('Deemmi-Lead-Form')
      } else if (masterSource === 'website') {
        matchesMasterSource = (lead.source || '').toLowerCase() === 'website' ||
                             (lead.source || '').toLowerCase() === 'Website'
      } else {
        matchesMasterSource = (lead.source || '').toLowerCase() === masterSource.toLowerCase()
      }
    }

    // Status filter with special handling for "requires_attention"
    let matchesStatus = statusFilter === 'all'
    if (!matchesStatus) {
      if (statusFilter === 'requires_attention') {
        matchesStatus = requiresAttention(lead)
      } else if (statusFilter === 'qualified_total') {
        matchesStatus = isQualified(lead)
      } else {
        matchesStatus = lead.status === statusFilter
      }
    }

    let matchesSource = sourceFilter === 'all'
    if (!matchesSource) {
      if (sourceFilter === 'lead_form') {
        // Match any lead form variant
        matchesSource = (lead.source || '').toLowerCase().includes('lead-form') ||
                       (lead.source || '').toLowerCase().includes('leadform') ||
                       (lead.source || '').includes('Deemmi-Lead-Form')
      } else if (sourceFilter === 'website') {
        // Match website variants
        matchesSource = (lead.source || '').toLowerCase() === 'website' ||
                       (lead.source || '').toLowerCase() === 'Website'
      } else {
        matchesSource = (lead.source || '').toLowerCase() === sourceFilter.toLowerCase()
      }
    }

    const matchesScore = scoreFilter === 'all' || (scoreFilter === 'no_score' && hasNoScore(lead))

    return matchesSearch && matchesTimePeriod && matchesAssignee && matchesMasterSource && matchesStatus && matchesSource && matchesScore
  })

  // Debug logging for "Without Score" filter
  if (scoreFilter === 'no_score') {
    console.log('🔍 [WITHOUT SCORE] Filter Results:', {
      totalLeads: leads.length,
      leadsWithNoScore: leads.filter(l => hasNoScore(l)).length,
      filteredResults: filteredLeads.length,
      scoreFilter,
      statusFilter,
      sourceFilter,
      searchTerm,
      masterFiltersActive: {
        timePeriod: masterTimePeriod,
        assignee: masterAssignee,
        source: masterSource
      }
    })
    console.log('🔍 [WITHOUT SCORE] First 5 filtered leads:',
      filteredLeads.slice(0, 5).map(l => ({
        name: `${l.first_name} ${l.last_name}`,
        score: l.score,
        scoreType: typeof l.score,
        hasNoScore: hasNoScore(l)
      }))
    )
  }

  const sortedLeads = filteredLeads.sort((a, b) => {
    // Sort by creation date
    const dateA = new Date(a.created_at)
    const dateB = new Date(b.created_at)
    
    if (sortBy === 'newest') {
      return dateB.getTime() - dateA.getTime() // Newest first
    } else {
      return dateA.getTime() - dateB.getTime() // Oldest first
    }
  })

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600"></div>
        </div>
      </AdminLayout>
    )
  }

  return (
    <AdminLayout>
      {/* In-App Notification Toast */}
      {showNotification && (
        <div className="fixed top-4 right-4 z-50 animate-in slide-in-from-top-2 duration-300">
          <div className="bg-gradient-to-r from-red-500 to-orange-500 text-white px-6 py-4 rounded-lg shadow-2xl border-2 border-red-300 max-w-sm">
            <div className="flex items-center gap-3">
              <div className="relative">
                <Bell className="h-6 w-6 animate-pulse" />
                <span className="absolute -top-1 -right-1 h-3 w-3 bg-white rounded-full text-xs text-red-500 flex items-center justify-center font-bold">
                  !
                </span>
              </div>
              <div className="flex-1">
                <h4 className="font-bold text-sm">🚨 New Request!</h4>
                <p className="text-sm opacity-90">Reassignment request received</p>
              </div>
              <button 
                onClick={() => setShowNotification(false)}
                className="text-white hover:text-gray-200 ml-2"
              >
                ✕
              </button>
            </div>
          </div>
        </div>
      )}
      
      <div className="space-y-6">

        {/* Pending Requests Notification - Enhanced */}
        {getPendingRequests().length > 0 && (
          <Card className="bg-gradient-to-r from-yellow-50 to-orange-50 border-2 border-yellow-300 shadow-lg">
            <CardContent className="py-4">
              <div className="flex items-start gap-4">
                <div className="relative">
                  <Bell className="h-6 w-6 text-yellow-600 animate-pulse" />
                  <span className="absolute -top-1 -right-1 h-3 w-3 bg-red-500 rounded-full text-xs text-white flex items-center justify-center">
                    {getPendingRequests().length}
                  </span>
                </div>
                <div className="flex-1">
                  <h3 className="font-bold text-yellow-900 text-lg mb-2">
                    🚨 {getPendingRequests().length} Reassignment Request{getPendingRequests().length > 1 ? 's' : ''} Pending Your Approval
                  </h3>
                  <div className="space-y-3">
                    {getPendingRequests().map(request => {
                      // Extract lead info from stored reassignment requests
                      const reassignmentRequests = JSON.parse(localStorage.getItem('reassignmentRequests') || '[]')
                      const matchingRequest = reassignmentRequests.find((req: any, index: number) => `reassign_${index}` === request.id)
                      
                      return (
                        <div key={request.id} className="bg-white p-3 rounded-lg border border-yellow-200">
                          <div className="mb-2">
                            <p className="text-sm font-medium text-gray-900">
                              📋 Lead: <span className="text-blue-700">{matchingRequest?.leadName || 'Unknown Lead'}</span>
                            </p>
                            <p className="text-sm text-gray-700">
                              👤 Currently assigned to: <span className="font-medium">{matchingRequest?.currentUserName || 'Not assigned'}</span>
                            </p>
                            <p className="text-sm text-gray-700">
                              🔄 Reassign to: <span className="font-medium text-green-700">{matchingRequest?.requestedUserName || 'Unknown User'}</span>
                            </p>
                            <p className="text-xs text-gray-600 mt-1">
                              💭 Reason: {matchingRequest?.reason || 'No reason provided'}
                            </p>
                          </div>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            className="bg-green-600 hover:bg-green-700 text-white"
                            onClick={async () => {
                              if (confirm('✅ Approve this reassignment request?\n\nThis will reassign the lead to the requested team member.')) {
                                // Get the matching request details
                                const reassignmentRequests = JSON.parse(localStorage.getItem('reassignmentRequests') || '[]')
                                const matchingRequest = reassignmentRequests.find((req: any, index: number) => `reassign_${index}` === request.id)

                                if (matchingRequest) {
                                  try {
                                    // Actually reassign the lead via API
                                    const leadId = matchingRequest.leadId
                                    const newUserId = matchingRequest.requestedUserId
                                    const newUserName = matchingRequest.requestedUserName

                                    // Call API to persist the reassignment
                                    const response = await fetch(`/api/admin/leads/${leadId}`, {
                                      method: 'PATCH',
                                      headers: {
                                        'Content-Type': 'application/json',
                                      },
                                      body: JSON.stringify({
                                        assigned_to: newUserId
                                      })
                                    })

                                    if (!response.ok) {
                                      throw new Error('Failed to reassign lead')
                                    }

                                    // Update the lead's assignment in local state
                                    setLeads(prevLeads => prevLeads.map(lead =>
                                      lead.id === leadId
                                        ? { ...lead, assigned_to: newUserId, assigned_user_name: newUserName }
                                        : lead
                                    ))

                                    // Add activity record for the reassignment
                                    const reassignActivity: LeadActivity = {
                                      id: `reassign_approved_${Date.now()}`,
                                      lead_id: leadId,
                                      user_id: 'admin',
                                      user_name: 'Admin',
                                      activity_type: 'assignment',
                                      description: `Approved reassignment of ${matchingRequest.leadName} to ${newUserName}`,
                                      created_at: new Date().toISOString()
                                    }
                                    setActivities(prevActivities => [reassignActivity, ...prevActivities.filter(a => a.id !== request.id)])

                                    // Store in admin activities
                                    const existingAdminActivities = JSON.parse(localStorage.getItem('adminActivities') || '[]')
                                    existingAdminActivities.push({
                                      leadId,
                                      leadName: matchingRequest.leadName,
                                      action: 'reassignment_approved',
                                      assignedTo: newUserName,
                                      timestamp: new Date().toISOString(),
                                      userRole: 'admin'
                                    })
                                    localStorage.setItem('adminActivities', JSON.stringify(existingAdminActivities))
                                  } catch (error) {
                                    console.error('Error approving reassignment:', error)
                                    alert('Failed to approve reassignment. Please try again.')
                                    return
                                  }
                                }
                                
                                // Remove the request
                                const updatedRequests = reassignmentRequests.filter((req: any, index: number) => `reassign_${index}` !== request.id)
                                localStorage.setItem('reassignmentRequests', JSON.stringify(updatedRequests))
                                
                                fetchActivities() // Refresh to check for new requests
                                alert(`✅ Reassignment approved!\n\n${matchingRequest?.leadName || 'Lead'} has been reassigned to ${matchingRequest?.requestedUserName || 'the requested user'}.`)
                              }
                            }}
                          >
                            ✓ Approve Request
                          </Button>
                          <Button 
                            size="sm" 
                            variant="outline"
                            className="text-red-600 border-red-200 hover:bg-red-50"
                            onClick={() => {
                              if (confirm('❌ Reject this reassignment request?')) {
                                // Handle reassignment rejection
                                const reassignmentRequests = JSON.parse(localStorage.getItem('reassignmentRequests') || '[]')
                                const updatedRequests = reassignmentRequests.filter((req: any, index: number) => `reassign_${index}` !== request.id)
                                localStorage.setItem('reassignmentRequests', JSON.stringify(updatedRequests))
                                
                                setActivities(activities.filter(a => a.id !== request.id))
                                fetchActivities()
                                alert('❌ Reassignment request rejected.')
                              }
                            }}
                          >
                            ✗ Reject
                          </Button>
                        </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <p className="text-gray-600">
              Manage and track all incoming leads from your AI CRM platform.
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={handleExport}>
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
            {/* Notification Status Display */}
            {getPendingRequests().length > 0 && (
              <div className="flex items-center gap-2 px-3 py-2 bg-red-100 border border-red-300 rounded-md">
                <Bell className="h-4 w-4 text-red-600 animate-pulse" />
                <span className="text-sm text-red-700 font-medium">
                  {getPendingRequests().length} pending
                </span>
              </div>
            )}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className={`px-3 py-1 text-sm border rounded-md ${
                statusFilter !== 'all' ? 'border-orange-500 bg-orange-50 font-medium' : 'border-gray-200'
              }`}
            >
              <option value="all">All Statuses</option>
              <option value="new">New</option>
              <option value="contacted">Contacted</option>
              <option value="qualified">Qualified</option>
              <option value="converted">Converted</option>
              <option value="lost">Lost</option>
            </select>
            <select
              value={sourceFilter}
              onChange={(e) => setSourceFilter(e.target.value)}
              className={`px-3 py-1 text-sm border rounded-md ${
                sourceFilter !== 'all' ? 'border-blue-500 bg-blue-50 font-medium' : 'border-gray-200'
              }`}
            >
              <option value="all">All Sources</option>
              <option value="website">Website</option>
              <option value="lead_form">Lead Form</option>
              <option value="referral">Referral</option>
            </select>
            <select
              value={scoreFilter}
              onChange={(e) => setScoreFilter(e.target.value as 'all' | 'no_score')}
              className={`px-3 py-1 text-sm border rounded-md ${
                scoreFilter !== 'all' ? 'border-blue-500 bg-blue-50 font-medium' : 'border-gray-200'
              }`}
            >
              <option value="all">All Scores</option>
              <option value="no_score">Without Score ({leads.filter(l => hasNoScore(l)).length})</option>
            </select>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="px-3 py-1 text-sm border border-gray-200 rounded-md"
            >
              <option value="newest">Newest First</option>
              <option value="oldest">Oldest First</option>
            </select>
            {(statusFilter !== 'all' || sourceFilter !== 'all' || scoreFilter !== 'all' || searchTerm) && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleResetFilters}
                className="text-red-600 hover:text-red-700 hover:bg-red-50 border-red-300"
              >
                <Filter className="h-4 w-4 mr-1" />
                Clear Filters
              </Button>
            )}
          </div>
        </div>

        {/* Master Filter Bar */}
        <MasterFilterBar users={users} />

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 pt-4">
              <CardTitle className="text-sm font-medium">Total Leads</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent className="pb-4">
              <div className="text-xl font-bold">{leads.length}</div>
              <p className="text-xs text-muted-foreground">
                All time leads
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 pt-4">
              <CardTitle className="text-sm font-medium">New Leads</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent className="pb-4">
              <div className="text-xl font-bold">
                {leads.filter(lead => lead.status === 'new' || lead.status === 'pending' || lead.status === 'qualified' || !lead.status).length}
              </div>
              <p className="text-xs text-muted-foreground">
                Require attention
              </p>
            </CardContent>
          </Card>

          <Card
            className="cursor-pointer hover:shadow-md hover:scale-[1.01] transition-all duration-200"
            onClick={handleTotalQualifiedClick}
          >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 pt-4">
              <CardTitle className="text-sm font-medium">Total Qualified</CardTitle>
              <CheckCircle className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent className="pb-4">
              <div className="text-xl font-bold text-green-600">
                {leads.filter(lead => isQualified(lead)).length}
              </div>
              <p className="text-xs text-muted-foreground">
                Qualified/Contacted leads
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 pt-4">
              <CardTitle className="text-sm font-medium">Converted</CardTitle>
              <Calendar className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent className="pb-4">
              <div className="text-xl font-bold text-green-600">
                {leads.filter(lead => lead.status === 'converted' || lead.status === 'won').length}
              </div>
              <p className="text-xs text-muted-foreground">
                Successful conversions
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Quick Admin Actions */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card
            className="border-orange-200 bg-orange-50 cursor-pointer hover:shadow-lg hover:scale-[1.02] transition-all duration-200"
            onClick={handleRequiresAttentionClick}
          >
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <AlertCircle className="h-5 w-5 text-orange-600" />
                  <CardTitle className="text-sm">Requires Attention</CardTitle>
                </div>
                <span className="text-2xl font-bold text-orange-600">
                  {leads.filter(l => requiresAttention(l)).length}
                </span>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-gray-600">New/Contacted leads inactive for 7+ days</p>
              <p className="text-xs text-orange-700 mt-2 font-medium">→ Click to filter</p>
            </CardContent>
          </Card>

          <Card
            className="border-blue-200 bg-blue-50 cursor-pointer hover:shadow-lg hover:scale-[1.02] transition-all duration-200"
            onClick={handleWithoutScoreClick}
          >
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Users className="h-5 w-5 text-blue-600" />
                  <CardTitle className="text-sm">Without Score</CardTitle>
                </div>
                <span className="text-2xl font-bold text-blue-600">
                  {leads.filter(l => hasNoScore(l)).length}
                </span>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-gray-600">Leads needing scoring assessment</p>
              <p className="text-xs text-blue-700 mt-2 font-medium">→ Click to filter</p>
            </CardContent>
          </Card>

          <Card className="border-green-200 bg-green-50">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                  <CardTitle className="text-sm">Conversion Rate</CardTitle>
                </div>
                <span className="text-2xl font-bold text-green-600">
                  {leads.length > 0 ? Math.round((leads.filter(l => l.status === 'converted').length / leads.length) * 100) : 0}%
                </span>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-gray-600">Overall lead conversion success</p>
            </CardContent>
          </Card>
        </div>

        {/* Lead Database */}
        <Card>
          <CardHeader>
            <CardTitle>Lead Database</CardTitle>
            <CardDescription>
              Full access to all company leads with admin controls
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-2">
                <Search className="h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search leads by name, email, or company..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-96"
                />
              </div>
              
              {selectedLeads.length > 0 && (
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-600">
                    {selectedLeads.length} selected
                  </span>
                  <select 
                    value={bulkAction} 
                    onChange={(e) => setBulkAction(e.target.value)}
                    className="px-2 py-1 text-sm border border-gray-200 rounded-md"
                  >
                    <option value="">Select Action</option>
                    <option value="contacted">Mark as Contacted</option>
                    <option value="qualified">Mark as Qualified</option>
                    <option value="converted">Mark as Converted</option>
                    <option value="lost">Mark as Lost</option>
                    <option value="delete">Delete</option>
                  </select>
                  <Button size="sm" onClick={handleBulkAction} disabled={!bulkAction}>
                    Apply
                  </Button>
                </div>
              )}
            </div>

            {/* Leads Table */}
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">
                      <input
                        type="checkbox"
                        checked={selectedLeads.length === filteredLeads.length && filteredLeads.length > 0}
                        onChange={toggleSelectAll}
                        className="rounded border-gray-300"
                      />
                    </TableHead>
                    <TableHead>Contact</TableHead>
                    <TableHead>Company</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Source</TableHead>
                    <TableHead>Score</TableHead>
                    <TableHead>Assigned To</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sortedLeads.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="h-24 text-center">
                        No leads found.
                      </TableCell>
                    </TableRow>
                  ) : (
                    sortedLeads.map((lead) => (
                      <TableRow key={lead.id}>
                        <TableCell>
                          <input
                            type="checkbox"
                            checked={selectedLeads.includes(lead.id)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedLeads([...selectedLeads, lead.id])
                              } else {
                                setSelectedLeads(selectedLeads.filter(id => id !== lead.id))
                              }
                            }}
                            className="rounded border-gray-300"
                          />
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <div>
                              <div className="flex items-center gap-1">
                                <span className="font-medium">
                                  {lead.first_name || ''} {lead.last_name || ''}
                                </span>
                                {hasRecentActivity(lead.id) && (
                                  <Activity className="h-3 w-3 text-blue-600" />
                                )}
                              </div>
                              <div className="text-sm text-gray-500">
                                {lead.email}
                              </div>
                              {lead.job_title && (
                                <div className="text-sm text-gray-500">
                                  {lead.job_title}
                                </div>
                              )}
                              {getLeadActivities(lead.id).length > 0 && (
                                <div className="text-xs text-blue-600 mt-1">
                                  Last activity: {getLeadActivities(lead.id)[0].description}
                                </div>
                              )}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div>
                            <div className="font-medium">{lead.company_name || 'No company'}</div>
                            {lead.company_size && (
                              <div className="text-sm text-gray-500">
                                {lead.company_size}
                              </div>
                            )}
                            {lead.industry && (
                              <div className="text-sm text-gray-500">
                                {lead.industry}
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <select
                            value={lead.status}
                            onChange={(e) => handleStatusChange(lead.id, e.target.value)}
                            className="px-2 py-1 text-sm border border-gray-200 rounded"
                          >
                            <option value="new">New</option>
                            <option value="contacted">Contacted</option>
                            <option value="qualified">Qualified</option>
                            <option value="converted">Converted</option>
                            <option value="lost">Lost</option>
                          </select>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm">
                            {formatSourceName(lead.source || 'unknown')}
                          </span>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center">
                            {lead.score && lead.score > 0 ? (
                              <span className={`text-sm font-medium ${getScoreColor(lead.score)}`}>
                                {lead.score}/100
                              </span>
                            ) : (
                              <span className="text-sm text-gray-400 italic">
                                Not scored
                              </span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          {lead.assigned_to ? (
                            <div className="text-sm">
                              <span className="text-gray-900">{lead.assigned_user_name}</span>
                            </div>
                          ) : (
                            <select
                              onChange={(e) => e.target.value && handleAssignLead(lead.id, e.target.value)}
                              className="text-sm px-2 py-1 border border-gray-200 rounded"
                              defaultValue=""
                            >
                              <option value="">Assign to...</option>
                              {users.map(user => (
                                <option key={user.id} value={user.id}>
                                  {user.first_name} {user.last_name}
                                </option>
                              ))}
                            </select>
                          )}
                        </TableCell>
                        <TableCell>
                          <span className="text-sm text-gray-500">
                            {formatDate(lead.created_at)}
                          </span>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            {lead.phone && (
                              <Button 
                                variant="ghost" 
                                size="sm"
                                onClick={() => window.open(`tel:${lead.phone}`, '_self')}
                                title="Call this lead"
                              >
                                <Phone className="h-4 w-4" />
                              </Button>
                            )}
                            <Button 
                              variant="ghost" 
                              size="sm"
                              onClick={() => window.open(`mailto:${lead.email}?subject=Follow-up from Dummi & Co&body=Hi ${lead.first_name || ''},\n\nThank you for your interest in our CRM solution...`, '_blank')}
                              title="Send email to this lead"
                            >
                              <Mail className="h-4 w-4" />
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="sm"
                              onClick={() => {
                                const userId = prompt(`Assign ${lead.first_name} ${lead.last_name} to:\n\n${users.map((u, i) => `${i+1}. ${u.first_name} ${u.last_name}`).join('\n')}\n\nEnter number:`)
                                if (userId && parseInt(userId) > 0 && parseInt(userId) <= users.length) {
                                  const selectedUser = users[parseInt(userId) - 1]
                                  handleAssignLead(lead.id, selectedUser.id)
                                }
                              }}
                              title={lead.assigned_to ? "Reassign lead" : "Assign lead"}
                            >
                              <UserPlus className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  )
}