'use client'

import React, { useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, SelectSeparator, SelectLabel, SelectGroup } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Plus, Search, Filter, Eye, Edit, Trash2, UserPlus, Star, Phone, Mail, Building2, Calendar, ArrowRight, CheckSquare, RefreshCw, Settings, MoreVertical, Clock, MessageSquare } from 'lucide-react'
import { IndustryBanner } from '@/components/ui/industry-banner'
import { DateRangePicker } from '@/components/ui/date-range-picker'
import { DateRange } from 'react-day-picker'
import { format } from 'date-fns'
import LeadNotes from '@/components/lead-notes'

interface Lead {
  id: string
  first_name?: string
  last_name?: string
  email: string
  phone?: string
  company_name?: string
  job_title?: string
  status: 'new' | 'contacted' | 'qualified' | 'unqualified' | 'converted' | 'lost'
  source: string
  score: number
  priority: 'low' | 'medium' | 'high' | 'urgent'
  value?: number
  notes?: string
  created_at: string
  next_follow_up_date?: string
  assigned_to?: string | null
  assigned_user_name?: string | null
  org_id?: string
  lost_date?: string
  loss_reason?: string
  reassignment_status?: 'pending' | null
}

const statusColors = {
  new: 'bg-blue-100 text-blue-800',
  contacted: 'bg-yellow-100 text-yellow-800',
  qualified: 'bg-green-100 text-green-800',
  unqualified: 'bg-gray-100 text-gray-800',
  converted: 'bg-purple-100 text-purple-800',
  lost: 'bg-red-100 text-red-800'
}

const priorityColors = {
  low: 'bg-gray-100 text-gray-800',
  medium: 'bg-blue-100 text-blue-800',
  high: 'bg-orange-100 text-orange-800',
  urgent: 'bg-red-100 text-red-800'
}

export default function LeadsPage() {
  const searchParams = useSearchParams()
  const statusParam = searchParams.get('status')
  
  const [leads, setLeads] = useState<Lead[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [sourceFilter, setSourceFilter] = useState('all')
  const [availableSources, setAvailableSources] = useState<{
    regular: string[];
    leadMagnets: string[];
  }>({ regular: [], leadMagnets: [] })
  const [teamMembers, setTeamMembers] = useState<any[]>([])
  const [leadMagnetNames, setLeadMagnetNames] = useState<{[key: string]: string}>({})
  const [currentUserRole, setCurrentUserRole] = useState<string>('sales')
  const [dateRange, setDateRange] = useState<DateRange | undefined>()
  const [sortBy, setSortBy] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('leads_sort_by') || 'created_at'
    }
    return 'created_at'
  })
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>(() => {
    if (typeof window !== 'undefined') {
      return (localStorage.getItem('leads_sort_order') as 'asc' | 'desc') || 'desc'
    }
    return 'desc'
  })
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null)
  const [showDetailsDialog, setShowDetailsDialog] = useState(false)
  const [showEditDialog, setShowEditDialog] = useState(false)
  const [convertingLeadId, setConvertingLeadId] = useState<string | null>(null)
  const [deletingLeadId, setDeletingLeadId] = useState<string | null>(null)
  const [creatingTaskForLeadId, setCreatingTaskForLeadId] = useState<string | null>(null)
  const [taskCheckedLeads, setTaskCheckedLeads] = useState<Set<string>>(new Set())
  const [showFollowUpDialog, setShowFollowUpDialog] = useState(false)
  const [selectedLeadForTask, setSelectedLeadForTask] = useState<Lead | null>(null)
  const [followUpData, setFollowUpData] = useState({
    date: '',
    notes: ''
  })
  
  // Lead lost tracking states
  const [showLostDialog, setShowLostDialog] = useState(false)
  const [leadBeingLost, setLeadBeingLost] = useState<Lead | null>(null)
  const [lostData, setLostData] = useState({
    lostDate: new Date().toISOString().split('T')[0],
    lossReason: ''
  })

  // Reassignment request states
  const [showReassignDialog, setShowReassignDialog] = useState(false)
  const [leadForReassignment, setLeadForReassignment] = useState<Lead | null>(null)
  const [reassignmentData, setReassignmentData] = useState({
    requestedUser: '',
    reason: ''
  })
  
  // Visual feedback states
  const [assignmentLoadingId, setAssignmentLoadingId] = useState<string | null>(null)
  const [recentlyAssignedIds, setRecentlyAssignedIds] = useState<Set<string>>(new Set())

  // Column management state
  const [showColumnsDialog, setShowColumnsDialog] = useState(false)
  const [visibleColumns, setVisibleColumns] = useState({
    contact: true,
    company: true,
    status: true,
    source: true,
    assigned_to: true,
    priority: true,
    score: true,
    value: true,
    created: true,
    actions: true
  })

  // Form state for creating new leads
  const [newLead, setNewLead] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    company_name: '',
    job_title: '',
    source: 'Website',
    priority: 'medium',
    value: '',
    notes: ''
  })

  // Handle URL parameters for filtering
  useEffect(() => {
    if (statusParam) {
      switch (statusParam) {
        case 'new':
          setStatusFilter('new')
          break
        case 'qualified':
          setStatusFilter('qualified')
          break
        case 'converted':
          setStatusFilter('converted')
          break
        case 'contacted':
          setStatusFilter('contacted')
          break
        case 'unqualified':
          setStatusFilter('unqualified')
          break
        case 'lost':
          setStatusFilter('lost')
          break
        default:
          setStatusFilter('all')
      }
    }
  }, [statusParam])

  useEffect(() => {
    fetchLeads()
  }, [statusFilter, sourceFilter, dateRange])

  // Load initial data and column preferences
  useEffect(() => {
    const savedColumns = localStorage.getItem('leads_visible_columns')
    if (savedColumns) {
      try {
        const parsed = JSON.parse(savedColumns)
        setVisibleColumns(parsed)
      } catch (error) {
        console.log('Error loading column preferences:', error)
      }
    }

    // Load saved sorting preferences
    const savedSortBy = localStorage.getItem('leads_sort_by')
    const savedSortOrder = localStorage.getItem('leads_sort_order')
    
    if (savedSortBy) setSortBy(savedSortBy)
    if (savedSortOrder) setSortOrder(savedSortOrder as 'asc' | 'desc')
    
    // Load initial data
    fetchTeamMembers()
    fetchLeadMagnetNames()
    fetchCurrentUserRole()
  }, [])

  // Save sorting preferences when they change
  useEffect(() => {
    localStorage.setItem('leads_sort_by', sortBy)
    localStorage.setItem('leads_sort_order', sortOrder)
  }, [sortBy, sortOrder])

  // Save column preferences when changed
  const updateColumnVisibility = (column: keyof typeof visibleColumns, visible: boolean) => {
    const newVisibleColumns = { ...visibleColumns, [column]: visible }
    setVisibleColumns(newVisibleColumns)
    localStorage.setItem('leads_visible_columns', JSON.stringify(newVisibleColumns))
  }

  const fetchCurrentUserRole = async () => {
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single()
      
      if (profile?.role) {
        setCurrentUserRole(profile.role)
      }
    } catch (error) {
      console.error('Error fetching user role:', error)
    }
  }

  const fetchTeamMembers = async () => {
    try {
      const supabase = createClient()
      const { data: members, error } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, role')
        .in('role', ['sales', 'admin', 'owner'])
        .order('first_name')
      
      if (error) {
        console.error('Error fetching team members:', error)
      } else {
        setTeamMembers(members || [])
      }
    } catch (error) {
      console.error('Error fetching team members:', error)
    }
  }

  const fetchLeadMagnetNames = async () => {
    try {
      const supabase = createClient()
      const { data: magnets, error } = await supabase
        .from('lead_magnets')
        .select('slug, title')
      
      if (!error && magnets) {
        const nameMapping: {[key: string]: string} = {}
        magnets.forEach(magnet => {
          if (magnet.slug) {
            nameMapping[magnet.slug] = magnet.title
          }
        })
        setLeadMagnetNames(nameMapping)
      }
    } catch (error) {
      console.error('Error fetching lead magnet names:', error)
    }
  }

  const fetchLeads = async () => {
    try {
      console.log('🔍 Frontend: Fetching leads using API endpoint...')
      
      // Build query parameters
      const params = new URLSearchParams()
      
      // Apply status filter
      if (statusFilter && statusFilter !== 'all') {
        params.append('status', statusFilter)
      }
      
      // Apply source filter  
      if (sourceFilter && sourceFilter !== 'all') {
        params.append('source', sourceFilter)
      }
      
      // Apply date range filter if present
      if (dateRange?.from) {
        params.append('date_from', dateRange.from.toISOString())
      }
      if (dateRange?.to) {
        params.append('date_to', dateRange.to.toISOString())
      }
      
      // Make API request with consistent org_id filtering
      const apiUrl = `/api/leads${params.toString() ? `?${params.toString()}` : ''}`
      console.log('📡 API request URL:', apiUrl)
      
      const response = await fetch(apiUrl)
      const result = await response.json()
      
      if (!response.ok) {
        console.error('Error fetching leads from API:', result)
        setLeads([])
      } else {
        console.log('✅ Fetched', result.leads?.length || 0, 'leads from API')
        
        // Debug: Log the leads we got
        if (result.leads && result.leads.length > 0) {
          console.log('📊 First few leads:', result.leads.slice(0, 3).map((l: Lead) => ({
            id: l.id,
            name: `${l.first_name} ${l.last_name}`,
            email: l.email,
            company: l.company_name,
            created_at: l.created_at,
            org_id: l.org_id
          })))
        }
        
        setLeads(result.leads || [])
        
        // Extract unique sources for filtering options
        if (result.leads && result.leads.length > 0) {
          const uniqueSources = [...new Set(result.leads.map((lead: Lead) => lead.source).filter(Boolean))] as string[]
          const leadMagnetSources = uniqueSources.filter(source =>
            source.includes('lead-form') || source.includes('magnet') ||
            source.toLowerCase().includes('download') || source.toLowerCase().includes('ebook')
          )
          const regularSources = uniqueSources.filter(source => !leadMagnetSources.includes(source))
          
          setAvailableSources({
            regular: regularSources,
            leadMagnets: leadMagnetSources
          })
        }
        
        // Fetch team members for assignment
        await fetchTeamMembers()
        
        // Fetch lead magnet names for better source display
        await fetchLeadMagnetNames()
      }
    } catch (error) {
      console.error('Error fetching leads:', error)
      setLeads([])
    } finally {
      setLoading(false)
    }
  }

  const createLead = async () => {
    try {
      // Use API endpoint instead of direct database insertion
      const response = await fetch('/api/leads', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          first_name: newLead.first_name || null,
          last_name: newLead.last_name || null,
          email: newLead.email,
          phone: newLead.phone || null,
          company_name: newLead.company_name || null,
          job_title: newLead.job_title || null,
          source: newLead.source,
          priority: newLead.priority,
          value: newLead.value ? parseInt(newLead.value) : null,
          notes: newLead.notes || null,
          status: 'new'
        })
      })

      const result = await response.json()
      
      if (!response.ok) {
        console.error('Error creating lead:', result)
        alert(result.error || 'Failed to create lead')
      } else {
        console.log('✅ Lead created successfully:', result.lead)
        setShowCreateDialog(false)
        setNewLead({
          first_name: '',
          last_name: '',
          email: '',
          phone: '',
          company_name: '',
          job_title: '',
          source: 'Website',
          priority: 'medium',
          value: '',
          notes: ''
        })
        fetchLeads()
      }
    } catch (error) {
      console.error('Error creating lead:', error)
      alert('Failed to create lead')
    }
  }

  const updateLeadStatus = async (leadId: string, status: string) => {
    const lead = leads.find(l => l.id === leadId)
    if (!lead) return

    // Check if lead is already converted and trying to change status
    if (lead.status === 'converted' && status !== 'converted') {
      alert('⚠️ This lead has already been converted to a deal!\n\n' +
            'To mark it as lost, please:\n' +
            '1. Go to the Deals section\n' +
            '2. Find the corresponding deal\n' +
            '3. Move it to "Closed Lost" stage\n\n' +
            'This ensures proper tracking of your sales pipeline.')
      return
    }

    // Check if changing to lost - show dialog
    if (status === 'lost') {
      setLeadBeingLost(lead)
      setLostData({
        lostDate: new Date().toISOString().split('T')[0],
        lossReason: ''
      })
      setShowLostDialog(true)
      return
    }

    // For other statuses, proceed normally
    await updateLeadStatusDirect(leadId, status)
  }

  const requestLeadAssignment = async (leadId: string, requestedAssignTo: string | null) => {
    const lead = leads.find(l => l.id === leadId)
    if (!lead) return
    
    // Start loading state
    setAssignmentLoadingId(leadId)
    
    // Get the current user info
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      toast.error('Authentication required')
      setAssignmentLoadingId(null)
      return
    }
    
    // Get user's role
    const { data: profile } = await supabase
      .from('profiles')
      .select('role, first_name, last_name')
      .eq('id', user.id)
      .single()
    
    const userRole = profile?.role || 'sales'
    const currentUserName = profile ? `${profile.first_name} ${profile.last_name}`.trim() : 'User'
    
    // Get the requested assignee's name
    const newAssignee = requestedAssignTo 
      ? teamMembers.find(m => m.id === requestedAssignTo)
      : null
    const assigneeName = newAssignee 
      ? `${newAssignee.first_name} ${newAssignee.last_name}`.trim()
      : 'Unassigned'
    
    // Get the current assignee's name
    const prevAssignee = lead.assigned_to
      ? teamMembers.find(m => m.id === lead.assigned_to)
      : null
    const prevAssigneeName = prevAssignee
      ? `${prevAssignee.first_name} ${prevAssignee.last_name}`.trim()
      : 'Unassigned'
    
    const leadName = `${lead.first_name || ''} ${lead.last_name || lead.company_name || 'Lead'}`.trim()
    
    // Check if user can directly assign:
    // 1. Admins/owners can assign to anyone
    // 2. Sales users can self-assign (claim leads for themselves)
    const isSelfAssignment = requestedAssignTo === user.id
    const canDirectlyAssign = userRole === 'admin' || userRole === 'owner' || isSelfAssignment

    if (canDirectlyAssign) {
      // Direct assignment (admin assigning to anyone, or sales user claiming for themselves)
      const loadingToastId = toast.loading(
        `Assigning lead to ${assigneeName}...`,
        { description: leadName }
      )
    
    try {
      const supabase = createClient()
      
      // Admin direct assignment
      const { data, error } = await supabase
        .from('leads')
        .update({ 
          assigned_to: requestedAssignTo
        })
        .eq('id', leadId)
        .select()
        .single()
      
      if (error) {
        console.error('❌ Failed to update lead assignment:', error)
        console.error('Error details:', {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code
        })
        
        // Provide more specific error messages
        let errorMessage = 'Failed to update assignment'
        if (error.code === '42501') {
          errorMessage = 'Permission denied. Please contact your administrator.'
        } else if (error.code === '23505') {
          errorMessage = 'This assignment already exists.'
        } else if (error.message) {
          errorMessage = error.message
        }
        
        toast.error('Failed to update assignment', {
          id: loadingToastId,
          description: errorMessage,
          duration: 5000
        })
      } else {
        console.log('✅ Lead assignment updated successfully:', data)
        
        // Update local state with the new assignment
        setLeads(prevLeads => 
          prevLeads.map(lead => 
            lead.id === leadId 
              ? { 
                  ...lead, 
                  assigned_to: requestedAssignTo
                }
              : lead
          )
        )
        
        // Add to recently assigned for visual feedback
        setRecentlyAssignedIds(prev => new Set([...prev, leadId]))
        setTimeout(() => {
          setRecentlyAssignedIds(prev => {
            const newSet = new Set(prev)
            newSet.delete(leadId)
            return newSet
          })
        }, 3000)
        
        // Show success notification with details
        const leadName = `${lead.first_name || ''} ${lead.last_name || lead.company_name || 'Lead'}`.trim()
        
        if (prevAssigneeName === assigneeName) {
          toast.info('No change in assignment', {
            id: loadingToastId,
            description: `${leadName} is already assigned to ${assigneeName}`
          })
        } else {
          const successMessage = isSelfAssignment
            ? '✅ Lead claimed successfully!'
            : '✅ Lead assigned successfully!'
          const successDescription = isSelfAssignment
            ? `You have claimed ${leadName} and it's now in your pipeline`
            : `${leadName} assigned from ${prevAssigneeName} to ${assigneeName}`

          toast.success(successMessage, {
            id: loadingToastId,
            description: successDescription,
            duration: 5000,
            action: {
              label: 'Undo',
              onClick: () => {
                // Revert the assignment
                requestLeadAssignment(leadId, prevAssignee?.id || null)
              }
            }
          })
        }
        
        // Log activity for admin tracking
        const activityData = {
          leadId,
          leadName,
          action: 'reassignment',
          fromUser: prevAssigneeName,
          toUser: assigneeName,
          timestamp: new Date().toISOString(),
          performedBy: 'current_user' // In production, get from auth context
        }
        
        // Assignment activity is now handled by the notification system
      }
    } catch (error) {
      console.error('❌ Error updating lead assignment:', error)
      toast.error('Network error', {
        id: loadingToastId,
        description: 'Failed to update assignment. Please check your connection and try again.',
        duration: 5000
      })
      setAssignmentLoadingId(null)
    }
    } else {
      // Sales user trying to assign to someone else - open reassignment dialog
      setAssignmentLoadingId(null)

      // Pre-fill the reassignment dialog with the selected team member
      setLeadForReassignment(lead)
      setReassignmentData({
        requestedUser: requestedAssignTo || '',
        reason: `Requesting to reassign ${leadName} from ${prevAssigneeName} to ${assigneeName}`
      })
      setShowReassignDialog(true)

      toast.info('Reassignment Request Required', {
        description: 'Please provide a reason for this reassignment request',
        duration: 3000
      })
    }
  }

  const updateLeadStatusDirect = async (leadId: string, status: string, additionalData?: any) => {
    try {
      const updateData = {
        status,
        ...additionalData
      }

      console.log('🔄 Updating lead status via API:', { leadId, status, updateData })

      // Log activity for admin to see
      const activityData = {
        leadId,
        action: 'status_change',
        oldStatus: leads.find(l => l.id === leadId)?.status,
        newStatus: status,
        timestamp: new Date().toISOString(),
        userRole: 'sales'
      }
      
      // Store activity in localStorage for admin to see (in real app, would be database)
      const existingActivities = JSON.parse(localStorage.getItem('salesActivities') || '[]')
      existingActivities.push(activityData)
      localStorage.setItem('salesActivities', JSON.stringify(existingActivities))

      // Use API endpoint which includes activity logging
      const response = await fetch(`/api/leads/${leadId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updateData)
      })

      if (!response.ok) {
        const error = await response.json()
        console.error('❌ Failed to update lead status:', error)
        alert(`Failed to update lead status: ${error.error || 'Unknown error'}`)
      } else {
        const data = await response.json()
        console.log('✅ Lead status updated successfully:', data)
        await fetchLeads() // Refresh the leads list
      }
    } catch (error) {
      console.error('❌ Error updating lead:', error)
      alert('Failed to update lead status. Please try again.')
    }
  }

  const handleConfirmLeadLost = async () => {
    if (!leadBeingLost) return
    
    await updateLeadStatusDirect(leadBeingLost.id, 'lost', {
      lost_date: lostData.lostDate,
      loss_reason: lostData.lossReason
    })
    
    setShowLostDialog(false)
    setLeadBeingLost(null)
  }

  const requestReassignment = async () => {
    if (!leadForReassignment || !reassignmentData.requestedUser || !reassignmentData.reason) return
    
    const loadingToastId = toast.loading(
      'Sending reassignment request to admin...',
      { duration: 0 }
    )
    
    try {
      // Get current user
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) {
        toast.error('Not authenticated', { id: loadingToastId })
        return
      }

      const requestedUser = teamMembers.find(member => member.id === reassignmentData.requestedUser)
      if (!requestedUser) {
        toast.error('Selected user not found', { id: loadingToastId })
        return
      }

      const leadName = `${leadForReassignment.first_name || ''} ${leadForReassignment.last_name || ''}`.trim() || leadForReassignment.company_name || 'Unnamed Lead'
      const requestedUserName = `${requestedUser.first_name} ${requestedUser.last_name}`
      
      // Get current user profile for proper display
      const { data: currentUserProfile } = await supabase
        .from('profiles')
        .select('first_name, last_name')
        .eq('id', user.id)
        .single()
      
      const currentUserName = currentUserProfile 
        ? `${currentUserProfile.first_name} ${currentUserProfile.last_name}`.trim()
        : 'Someone'

      // Create notification for admin via API
      const response = await fetch('/api/notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'lead_reassignment_request',
          title: 'Lead Reassignment Request',
          message: `${currentUserName} wants to reassign lead "${leadName}" to ${requestedUserName}`,
          entity_type: 'lead',
          entity_id: leadForReassignment.id,
          metadata: {
            leadId: leadForReassignment.id,
            leadName: leadName,
            requestedUserId: reassignmentData.requestedUser,
            requestedUserName: requestedUserName,
            requestingUserId: user?.id, // Current user making the request
            requestingUserName: currentUserName, // Person making the request
            reason: reassignmentData.reason,
            currentOwnerId: leadForReassignment.assigned_to,
            currentOwnerName: currentUserName // Current owner (person making the request)
          }
        })
      })

      console.log('📡 Notification API response status:', response.status)
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        console.error('❌ Notification API Error:', errorData)
        console.error('Response status:', response.status)
        console.error('Response statusText:', response.statusText)
        
        // Still allow the reassignment to proceed even if notification fails
        toast.warning('Reassignment status updated but admin notification may have failed', {
          duration: 5000
        })
      } else {
        const result = await response.json()
        console.log('✅ Notification API Success:', result)
      }

      // Update the lead's reassignment_status in the database
      console.log('🔄 Attempting to update reassignment_status for lead:', leadForReassignment.id)
      const { data: updateData, error: updateError } = await supabase
        .from('leads')
        .update({ reassignment_status: 'pending' })
        .eq('id', leadForReassignment.id)
        .select()
      
      if (updateError) {
        console.error('❌ Database error updating reassignment_status:', updateError)
        console.error('Error details:', {
          message: updateError.message,
          details: updateError.details,
          hint: updateError.hint,
          code: updateError.code
        })
        // Don't throw error, just log it - the notification was still sent
        toast.warning('Request sent but status update failed. Please refresh the page.', {
          duration: 5000
        })
      } else {
        console.log('✅ Successfully updated reassignment_status to pending')
        console.log('Updated lead data:', updateData)
      }

      toast.success('Reassignment request sent successfully!', {
        id: loadingToastId,
        description: `Your request to be assigned to ${leadName} has been sent to the admin for approval. You'll be notified once it's reviewed.`,
        duration: 5000
      })
      
      // Close dialog and reset form
      setShowReassignDialog(false)
      setLeadForReassignment(null)
      setReassignmentData({ requestedUser: '', reason: '' })
      
      // Refresh leads to show the updated reassignment_status
      fetchLeads()
      
    } catch (error) {
      console.error('Error requesting reassignment:', error)
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
      toast.error('Failed to send reassignment request', {
        id: loadingToastId,
        description: errorMessage === 'Failed to send notification' 
          ? 'Please check your connection and try again.' 
          : errorMessage,
        duration: 5000
      })
    }
  }

  const cancelReassignment = async (leadId: string) => {
    try {
      console.log('🔄 Canceling reassignment for lead:', leadId)
      
      const supabase = createClient()
      const { data: updateData, error: updateError } = await supabase
        .from('leads')
        .update({ reassignment_status: null })
        .eq('id', leadId)
        .select()
      
      if (updateError) {
        console.error('❌ Error canceling reassignment:', updateError)
        toast.error('Failed to cancel reassignment request')
        return
      }

      console.log('✅ Successfully canceled reassignment for lead:', leadId)
      toast.success('Reassignment request canceled successfully')
      
      // Refresh leads to show the updated status
      fetchLeads()
      
    } catch (error) {
      console.error('Error canceling reassignment:', error)
      toast.error('Failed to cancel reassignment request')
    }
  }

  const convertLeadToDeal = async (leadId: string) => {
    console.log('Starting lead conversion for lead:', leadId)
    setConvertingLeadId(leadId)
    try {
      // Call the API endpoint to handle conversion properly
      const response = await fetch('/api/leads/convert', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ lead_id: leadId })
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to convert lead')
      }

      console.log('Lead conversion successful:', result)
      
      // Show success message with deal details
      const { deal } = result
      alert(`✅ Lead successfully converted to deal!\n\nDeal: "${deal.title}"\nValue: ฿${(deal.value || 0).toLocaleString()}\nStage: Discovery\n\n🎯 You can now find this deal in the Sales Pipeline under the DISCOVERY column.\n\n✨ Company and Contact records have been created automatically.`)
      
      fetchLeads() // Refresh leads to show updated status
    } catch (error: any) {
      console.error('Error converting lead:', error)
      alert(`❌ Failed to convert lead: ${error.message || 'Please try again.'}`)
    } finally {
      setConvertingLeadId(null)
    }
  }

  const duplicateLead = async (leadId: string) => {
    try {
      console.log('Duplicating lead:', leadId)
      const response = await fetch(`/api/leads/${leadId}/duplicate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      })

      const data = await response.json()
      console.log('Duplicate response:', data)
      
      if (data.success) {
        // Show success message
        alert(`✅ Lead duplicated successfully!\n\nNew lead: "${data.lead.first_name} ${data.lead.last_name}"\nStatus: New`)
        
        // Add the new lead directly to the list for immediate feedback
        const newLead = data.lead
        setLeads(prevLeads => [newLead, ...prevLeads])
        
        // Then refresh from server to ensure consistency
        setTimeout(() => {
          fetchLeads()
        }, 500)
      } else {
        alert(`❌ Failed to duplicate lead: ${data.error || 'Unknown error'}`)
      }
    } catch (error) {
      console.error('Error duplicating lead:', error)
      alert('❌ Failed to duplicate lead. Please try again.')
    }
  }

  const handleTaskCheckboxChange = (lead: Lead, checked: boolean) => {
    const newCheckedLeads = new Set(taskCheckedLeads)
    
    if (checked) {
      // When checked, show dialog to collect follow-up info
      setSelectedLeadForTask(lead)
      setFollowUpData({
        date: new Date().toISOString().split('T')[0], // Default to today
        notes: ''
      })
      setShowFollowUpDialog(true)
      newCheckedLeads.add(lead.id)
    } else {
      // When unchecked, just remove from checked set
      newCheckedLeads.delete(lead.id)
    }
    
    setTaskCheckedLeads(newCheckedLeads)
  }

  const handleFollowUpSubmit = async () => {
    if (!selectedLeadForTask) return
    
    try {
      await createFollowUpTask(selectedLeadForTask, followUpData.date, followUpData.notes)
      setShowFollowUpDialog(false)
      setSelectedLeadForTask(null)
      setFollowUpData({ date: '', notes: '' })
    } catch (error) {
      console.error('Error creating follow-up task:', error)
      // If there's an error, uncheck the checkbox
      const newCheckedLeads = new Set(taskCheckedLeads)
      newCheckedLeads.delete(selectedLeadForTask.id)
      setTaskCheckedLeads(newCheckedLeads)
    }
  }

  const handleFollowUpCancel = () => {
    if (selectedLeadForTask) {
      // Uncheck the checkbox when cancelled
      const newCheckedLeads = new Set(taskCheckedLeads)
      newCheckedLeads.delete(selectedLeadForTask.id)
      setTaskCheckedLeads(newCheckedLeads)
    }
    setShowFollowUpDialog(false)
    setSelectedLeadForTask(null)
    setFollowUpData({ date: '', notes: '' })
  }

  const createFollowUpTask = async (lead: Lead, followUpDate: string, notes: string) => {
    setCreatingTaskForLeadId(lead.id)
    try {
      const leadName = `${lead.first_name || ''} ${lead.last_name || ''}`.trim() || lead.company_name || 'Lead'
      
      // Create follow-up task - ensure valid priority values (capitalized)
      const getValidPriority = (leadPriority: string): 'High' | 'Medium' | 'Low' => {
        switch (leadPriority?.toLowerCase()) {
          case 'urgent': return 'High'
          case 'high': return 'High'
          case 'medium': return 'Medium'
          case 'low': return 'Low'
          default: return 'Medium' // Default fallback
        }
      }

      const response = await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: `Follow up with ${leadName}`,
          description: notes || `Follow up call/email for lead: ${leadName}\nEmail: ${lead.email}\nPhone: ${lead.phone || 'N/A'}\nCompany: ${lead.company_name || 'N/A'}\nStatus: ${lead.status}\nPriority: ${lead.priority}`,
          type: 'task', // Use 'task' instead of 'follow_up' 
          priority: getValidPriority(lead.priority),
          date: followUpDate,
          status: 'pending'
        })
      })

      const data = await response.json()
      
      if (data.task) {
        alert(`✅ Follow-up task created!\n\nTask: "Follow up with ${leadName}"\nScheduled: Today\n\n📋 You can view this task in the Activities section.`)
      } else {
        alert(`❌ Failed to create task: ${data.error}`)
      }
    } catch (error) {
      console.error('Error creating follow-up task:', error)
      alert('❌ Failed to create task due to network error')
    } finally {
      setCreatingTaskForLeadId(null)
    }
  }

  const deleteLead = async (leadId: string) => {
    if (!confirm('Are you sure you want to delete this lead?')) return
    
    setDeletingLeadId(leadId)
    try {
      const supabase = createClient()

      // Delete lead with Supabase - RLS will ensure only org leads can be deleted
      const { error } = await supabase
        .from('leads')
        .delete()
        .eq('id', leadId)

      if (error) {
        console.error('Error deleting lead:', error)
        alert(`Failed to delete lead: ${error.message}`)
      } else {
        console.log('✅ Lead deleted successfully')
        fetchLeads()
      }
    } catch (error) {
      console.error('Error deleting lead:', error)
      alert('Failed to delete lead')
    } finally {
      setDeletingLeadId(null)
    }
  }

  const updateLead = async () => {
    if (!selectedLead) return
    
    try {
      const supabase = createClient()

      // Update lead with Supabase - RLS will ensure only org leads can be updated
      const { data, error } = await supabase
        .from('leads')
        .update({
          first_name: selectedLead.first_name || null,
          last_name: selectedLead.last_name || null,
          email: selectedLead.email,
          phone: selectedLead.phone || null,
          company_name: selectedLead.company_name || null,
          job_title: selectedLead.job_title || null,
          source: selectedLead.source,
          priority: selectedLead.priority,
          value: selectedLead.value || null,
          notes: selectedLead.notes || null
        })
        .eq('id', selectedLead.id)
        .select()

      if (error) {
        console.error('Error updating lead:', error)
        alert(`Failed to update lead: ${error.message}`)
      } else {
        console.log('✅ Lead updated successfully:', data)
        setShowEditDialog(false)
        fetchLeads()
      }
    } catch (error) {
      console.error('Error updating lead:', error)
      alert('Failed to update lead')
    }
  }

  const filteredLeads = React.useMemo(() => {
    const filtered = leads.filter(lead => {
      const matchesSearch = searchQuery === '' || 
        lead.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (lead.first_name?.toLowerCase().includes(searchQuery.toLowerCase()) || false) ||
        (lead.last_name?.toLowerCase().includes(searchQuery.toLowerCase()) || false) ||
        (lead.company_name?.toLowerCase().includes(searchQuery.toLowerCase()) || false)
      
      // Apply date range filter
      let matchesDateRange = true
      if (dateRange?.from) {
        const leadDate = new Date(lead.created_at)
        const fromDate = new Date(dateRange.from)
        fromDate.setHours(0, 0, 0, 0)
        
        if (dateRange.to) {
          const toDate = new Date(dateRange.to)
          toDate.setHours(23, 59, 59, 999)
          matchesDateRange = leadDate >= fromDate && leadDate <= toDate
        } else {
          // Single day selection
          const toDate = new Date(fromDate)
          toDate.setHours(23, 59, 59, 999)
          matchesDateRange = leadDate >= fromDate && leadDate <= toDate
        }
      }
      
      return matchesSearch && matchesDateRange
    })

    // Apply sorting
    return filtered.sort((a, b) => {
      let valueA, valueB

      switch (sortBy) {
        case 'name':
          valueA = `${a.first_name || ''} ${a.last_name || ''}`.trim().toLowerCase()
          valueB = `${b.first_name || ''} ${b.last_name || ''}`.trim().toLowerCase()
          break
        case 'email':
          valueA = a.email.toLowerCase()
          valueB = b.email.toLowerCase()
          break
        case 'company_name':
          valueA = (a.company_name || '').toLowerCase()
          valueB = (b.company_name || '').toLowerCase()
          break
        case 'status':
          valueA = a.status
          valueB = b.status
          break
        case 'source':
          valueA = a.source.toLowerCase()
          valueB = b.source.toLowerCase()
          break
        case 'priority':
          const priorityOrder = { urgent: 4, high: 3, medium: 2, low: 1 }
          valueA = priorityOrder[a.priority as keyof typeof priorityOrder] || 0
          valueB = priorityOrder[b.priority as keyof typeof priorityOrder] || 0
          break
        case 'score':
          valueA = a.score || 0
          valueB = b.score || 0
          break
        case 'value':
          valueA = a.value || 0
          valueB = b.value || 0
          break
        case 'created_at':
          valueA = new Date(a.created_at).getTime()
          valueB = new Date(b.created_at).getTime()
          break
        default:
          valueA = new Date(a.created_at).getTime()
          valueB = new Date(b.created_at).getTime()
      }

      if (valueA < valueB) return sortOrder === 'asc' ? -1 : 1
      if (valueA > valueB) return sortOrder === 'asc' ? 1 : -1
      return 0
    })
  }, [leads, searchQuery, dateRange, sortBy, sortOrder])

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600'
    if (score >= 60) return 'text-yellow-600'
    if (score >= 40) return 'text-orange-600'
    return 'text-red-600'
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
    if (lead.value && lead.value > 0) score += 15
    if (lead.notes?.trim()) score += 5
    
    return Math.min(score, 100) // Cap at 100
  }

  if (loading) {
    return (
      <div className="container mx-auto px-6 py-8">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            {[1,2,3,4].map(i => (
              <div key={i} className="h-24 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  const newLeads = filteredLeads.filter(l => ['new', 'contacted', 'qualified'].includes(l.status))
  const stats = {
    total: filteredLeads.length,
    new: newLeads.length,
    qualified: filteredLeads.filter(l => l.status === 'qualified').length,
    converted: filteredLeads.filter(l => l.status === 'converted').length
  }
  
  // Debug logging for new leads count
  console.log('🔍 Leads Page Stats:', {
    totalLeads: filteredLeads.length,
    newLeadsStatuses: newLeads.map(l => l.status),
    newLeadsCount: newLeads.length,
    allStatuses: filteredLeads.map(l => l.status)
  })

  // Debug logging for date range
  console.log('🔍 Lead Management Debug:', {
    totalLeads: leads.length,
    filteredLeads: filteredLeads.length,
    dateRange,
    newLeadsCount: stats.new
  })

  return (
    <div className="space-y-6 p-4 md:p-6 lg:px-12 lg:py-8 min-h-screen">
      {/* Page Title */}
      <div className="mb-4">
        <h1 className="text-2xl font-bold text-gray-900">Lead Management</h1>
        <p className="text-gray-600">Marketing Pipeline • Capture and qualify prospects before they become sales opportunities</p>
      </div>


      {/* Create Lead Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Create New Lead</DialogTitle>
              <DialogDescription>Add a new lead to your pipeline</DialogDescription>
            </DialogHeader>
            <div className="grid gap-6 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="first_name" className="text-sm font-medium">First Name</Label>
                  <Input
                    id="first_name"
                    value={newLead.first_name}
                    onChange={(e) => setNewLead({...newLead, first_name: e.target.value})}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="last_name" className="text-sm font-medium">Last Name</Label>
                  <Input
                    id="last_name"
                    value={newLead.last_name}
                    onChange={(e) => setNewLead({...newLead, last_name: e.target.value})}
                    className="mt-1"
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="email" className="text-sm font-medium">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={newLead.email}
                  onChange={(e) => setNewLead({...newLead, email: e.target.value})}
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="phone" className="text-sm font-medium">Phone</Label>
                <Input
                  id="phone"
                  value={newLead.phone}
                  onChange={(e) => setNewLead({...newLead, phone: e.target.value})}
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="company_name" className="text-sm font-medium">Company</Label>
                <Input
                  id="company_name"
                  value={newLead.company_name}
                  onChange={(e) => setNewLead({...newLead, company_name: e.target.value})}
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="job_title" className="text-sm font-medium">Job Title</Label>
                <Input
                  id="job_title"
                  value={newLead.job_title}
                  onChange={(e) => setNewLead({...newLead, job_title: e.target.value})}
                  className="mt-1"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="source" className="text-sm font-medium">Source</Label>
                  <Select value={newLead.source} onValueChange={(value) => setNewLead({...newLead, source: value})}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="deemmi-lead-form">Deemmi Lead Form</SelectItem>
                      <SelectItem value="Website">Website</SelectItem>
                      <SelectItem value="Organic Search">Organic Search</SelectItem>
                      <SelectItem value="Google Ads">Google Ads</SelectItem>
                      <SelectItem value="Facebook Ads">Facebook Ads</SelectItem>
                      <SelectItem value="LINE Messenger">LINE Messenger</SelectItem>
                      <SelectItem value="Facebook Messenger">Facebook Messenger</SelectItem>
                      <SelectItem value="LinkedIn">LinkedIn</SelectItem>
                      <SelectItem value="Referral">Referral</SelectItem>
                      <SelectItem value="Email Marketing">Email Marketing</SelectItem>
                      <SelectItem value="Trade Show">Trade Show</SelectItem>
                      <SelectItem value="Cold Outreach">Cold Outreach</SelectItem>
                      <SelectItem value="Partner">Partner</SelectItem>
                      <SelectItem value="Social Media">Social Media</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="priority" className="text-sm font-medium">Priority</Label>
                  <Select value={newLead.priority} onValueChange={(value) => setNewLead({...newLead, priority: value})}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="urgent">Urgent</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <Label htmlFor="value" className="text-sm font-medium">Expected Value (THB)</Label>
                <Input
                  id="value"
                  type="number"
                  placeholder="0"
                  value={newLead.value}
                  onChange={(e) => setNewLead({...newLead, value: e.target.value})}
                  className="mt-1"
                />
                <p className="text-xs text-gray-500 mt-1">Enter 0 if unknown - can be updated later</p>
              </div>
              <div>
                <Label htmlFor="notes" className="text-sm font-medium">Notes</Label>
                <Textarea
                  id="notes"
                  value={newLead.notes}
                  onChange={(e) => setNewLead({...newLead, notes: e.target.value})}
                  rows={3}
                  className="mt-1"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
                Cancel
              </Button>
              <Button onClick={createLead} disabled={!newLead.first_name && !newLead.last_name && !newLead.email}>
                Create Lead
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>


      {/* Unified Control Panel Header */}
      <header className="mb-4">
        <Card>
          <CardContent className="p-3">
            {/* Top Row: Stats */}
            <div className="flex items-center justify-between mb-3 pb-3 border-b">
              <div className="flex items-center gap-8">
                <div className="flex items-center gap-2">
                  <div className="text-2xl font-bold">{stats.total}</div>
                  <div className="text-xs text-gray-500 uppercase">Total Leads</div>
                </div>
                <div className="flex items-center gap-6">
                  <div className="flex items-center gap-1">
                    <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                    <span className="text-sm font-semibold">{stats.new}</span>
                    <span className="text-xs text-gray-500">New</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <span className="text-sm font-semibold">{stats.qualified}</span>
                    <span className="text-xs text-gray-500">Qualified</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                    <span className="text-sm font-semibold">{stats.converted}</span>
                    <span className="text-xs text-gray-500">Converted</span>
                  </div>
                </div>
              </div>
              <Button onClick={() => setShowCreateDialog(true)} size="sm" className="h-8">
                <Plus className="w-3 h-3 mr-1" />
                Add Lead
              </Button>
            </div>

            {/* Bottom Row: Search & Filters */}
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 flex-1">
                <div className="relative flex-1 max-w-xs">
                  <Search className="absolute left-2 top-2 h-3 w-3 text-muted-foreground" />
                  <Input
                    placeholder="Search leads..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-7 h-8 text-sm"
                  />
                </div>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-[110px] h-8 text-sm">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="new">New</SelectItem>
                    <SelectItem value="contacted">Contacted</SelectItem>
                    <SelectItem value="qualified">Qualified</SelectItem>
                    <SelectItem value="unqualified">Unqualified</SelectItem>
                    <SelectItem value="converted">Converted</SelectItem>
                    <SelectItem value="lost">Lost</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={sourceFilter} onValueChange={setSourceFilter}>
                  <SelectTrigger className="w-[120px] h-8 text-sm">
                    <SelectValue placeholder="Source" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Sources</SelectItem>
                    
                    {availableSources.regular.length > 0 && (
                      <>
                        <SelectSeparator />
                        <SelectGroup>
                          <SelectLabel>Regular Sources</SelectLabel>
                          {availableSources.regular.map(source => (
                            <SelectItem key={source} value={source}>{source}</SelectItem>
                          ))}
                        </SelectGroup>
                      </>
                    )}
                    
                    {availableSources.leadMagnets.length > 0 && (
                      <>
                        <SelectSeparator />
                        <SelectGroup>
                          <SelectLabel>Lead Magnets</SelectLabel>
                          {availableSources.leadMagnets.map(source => (
                            <SelectItem key={source} value={source}>
                              {leadMagnetNames[source] || source}
                            </SelectItem>
                          ))}
                        </SelectGroup>
                      </>
                    )}
                  </SelectContent>
                </Select>
                <DateRangePicker date={dateRange} onDateChange={setDateRange} />
                {dateRange?.from && (
                  <Button variant="ghost" size="sm" onClick={() => setDateRange(undefined)} className="h-8 px-2 text-xs">
                    Clear
                  </Button>
                )}
                <Select value={sortBy} onValueChange={setSortBy}>
                  <SelectTrigger className="w-[140px] h-8 text-sm">
                    <SelectValue placeholder="Sort by" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="created_at">Created Date</SelectItem>
                    <SelectItem value="name">Contact Name</SelectItem>
                    <SelectItem value="company_name">Company</SelectItem>
                    <SelectItem value="value">Lead Value</SelectItem>
                    <SelectItem value="score">Score</SelectItem>
                    <SelectItem value="priority">Priority</SelectItem>
                    <SelectItem value="status">Status</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={sortOrder} onValueChange={(value) => setSortOrder(value as 'asc' | 'desc')}>
                  <SelectTrigger className="w-[140px] h-8 text-sm">
                    <SelectValue placeholder="Order" />
                  </SelectTrigger>
                  <SelectContent>
                    {(sortBy === 'name' || sortBy === 'company_name') ? (
                      <>
                        <SelectItem value="asc">A to Z</SelectItem>
                        <SelectItem value="desc">Z to A</SelectItem>
                      </>
                    ) : (sortBy === 'value' || sortBy === 'score') ? (
                      <>
                        <SelectItem value="desc">Highest First</SelectItem>
                        <SelectItem value="asc">Lowest First</SelectItem>
                      </>
                    ) : sortBy === 'priority' ? (
                      <>
                        <SelectItem value="desc">High to Low</SelectItem>
                        <SelectItem value="asc">Low to High</SelectItem>
                      </>
                    ) : (
                      <>
                        <SelectItem value="desc">Newest First</SelectItem>
                        <SelectItem value="asc">Oldest First</SelectItem>
                      </>
                    )}
                  </SelectContent>
                </Select>
              </div>
              <Button 
                variant="ghost" 
                onClick={() => setShowColumnsDialog(true)} 
                size="sm"
                className="h-8 px-2"
                title="Manage columns"
              >
                <Settings className="w-3 h-3" />
              </Button>
            </div>
          </CardContent>
        </Card>
      </header>

      {/* Leads Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="h-10">
                {visibleColumns.contact && (
                  <TableHead 
                    className="px-3 py-2 text-xs font-medium cursor-pointer hover:bg-gray-50"
                    onClick={() => {
                      if (sortBy === 'name') {
                        setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
                      } else {
                        setSortBy('name')
                        setSortOrder('asc')
                      }
                    }}
                  >
                    <div className="flex items-center gap-1">
                      Contact
                      {sortBy === 'name' && (
                        <span className="text-gray-400">●</span>
                      )}
                    </div>
                  </TableHead>
                )}
                {visibleColumns.company && (
                  <TableHead 
                    className="px-3 py-2 text-xs font-medium cursor-pointer hover:bg-gray-50"
                    onClick={() => {
                      if (sortBy === 'company_name') {
                        setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
                      } else {
                        setSortBy('company_name')
                        setSortOrder('asc')
                      }
                    }}
                  >
                    <div className="flex items-center gap-1">
                      Company
                      {sortBy === 'company_name' && (
                        <span className="text-gray-400">●</span>
                      )}
                    </div>
                  </TableHead>
                )}
                {visibleColumns.status && (
                  <TableHead 
                    className="px-3 py-2 text-xs font-medium cursor-pointer hover:bg-gray-50"
                    onClick={() => {
                      if (sortBy === 'status') {
                        setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
                      } else {
                        setSortBy('status')
                        setSortOrder('asc')
                      }
                    }}
                  >
                    <div className="flex items-center gap-1">
                      Status
                      {sortBy === 'status' && (
                        <span className="text-gray-400">●</span>
                      )}
                    </div>
                  </TableHead>
                )}
                {visibleColumns.source && (
                  <TableHead 
                    className="px-3 py-2 text-xs font-medium cursor-pointer hover:bg-gray-50"
                    onClick={() => {
                      if (sortBy === 'source') {
                        setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
                      } else {
                        setSortBy('source')
                        setSortOrder('asc')
                      }
                    }}
                  >
                    <div className="flex items-center gap-1">
                      Source
                      {sortBy === 'source' && (
                        <span className="text-gray-400">●</span>
                      )}
                    </div>
                  </TableHead>
                )}
                {visibleColumns.assigned_to && <TableHead className="px-3 py-2 text-xs font-medium">Responsible</TableHead>}
                {visibleColumns.priority && (
                  <TableHead 
                    className="px-3 py-2 text-xs font-medium cursor-pointer hover:bg-gray-50"
                    onClick={() => {
                      if (sortBy === 'priority') {
                        setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
                      } else {
                        setSortBy('priority')
                        setSortOrder('desc') // Start with urgent first
                      }
                    }}
                  >
                    <div className="flex items-center gap-1">
                      Priority
                      {sortBy === 'priority' && (
                        <span className="text-gray-400">●</span>
                      )}
                    </div>
                  </TableHead>
                )}
                {visibleColumns.score && (
                  <TableHead 
                    className="px-3 py-2 text-xs font-medium cursor-pointer hover:bg-gray-50"
                    onClick={() => {
                      if (sortBy === 'score') {
                        setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
                      } else {
                        setSortBy('score')
                        setSortOrder('desc') // Start with highest score first
                      }
                    }}
                  >
                    <div className="flex items-center gap-1">
                      Score
                      {sortBy === 'score' && (
                        <span className="text-gray-400">●</span>
                      )}
                    </div>
                  </TableHead>
                )}
                {visibleColumns.value && (
                  <TableHead 
                    className="px-3 py-2 text-xs font-medium cursor-pointer hover:bg-gray-50"
                    onClick={() => {
                      if (sortBy === 'value') {
                        setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
                      } else {
                        setSortBy('value')
                        setSortOrder('desc') // Start with highest value first
                      }
                    }}
                  >
                    <div className="flex items-center gap-1">
                      Value
                      {sortBy === 'value' && (
                        <span className="text-gray-400">●</span>
                      )}
                    </div>
                  </TableHead>
                )}
                {visibleColumns.created && (
                  <TableHead 
                    className="px-3 py-2 text-xs font-medium cursor-pointer hover:bg-gray-50"
                    onClick={() => {
                      if (sortBy === 'created_at') {
                        setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
                      } else {
                        setSortBy('created_at')
                        setSortOrder('desc') // Start with newest first
                      }
                    }}
                  >
                    <div className="flex items-center gap-1">
                      Created
                      {sortBy === 'created_at' && (
                        <span className="text-gray-400">●</span>
                      )}
                    </div>
                  </TableHead>
                )}
                {visibleColumns.actions && <TableHead className="text-right px-3 py-2 text-xs font-medium">Actions</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredLeads.map((lead) => {
                const isRecentlyAssigned = recentlyAssignedIds.has(lead.id)
                const isAssignmentLoading = assignmentLoadingId === lead.id
                const assignedUser = lead.assigned_to 
                  ? teamMembers.find(m => m.id === lead.assigned_to)
                  : null
                
                const assignedUserName = assignedUser
                  ? `${assignedUser.first_name} ${assignedUser.last_name}`.trim()
                  : 'Unassigned'
                  
                return (
                <TableRow
                  key={lead.id}
                  className={`
                    transition-all duration-500 h-auto cursor-pointer
                    ${isRecentlyAssigned ? 'bg-green-50 border-l-4 border-l-green-500 animate-pulse' : ''}
                    ${isAssignmentLoading ? 'opacity-70' : ''}
                    hover:bg-gray-50
                  `}
                  onClick={() => {
                    setSelectedLead(lead)
                    setShowDetailsDialog(true)
                  }}
                >
                  {visibleColumns.contact && (
                    <TableCell className="py-1.5 px-3">
                      <div className="space-y-0.5">
                        <div className="font-medium text-sm">
                          {lead.first_name || lead.last_name 
                            ? `${lead.first_name || ''} ${lead.last_name || ''}`.trim()
                            : 'Unknown'
                          }
                        </div>
                        <div className="text-xs text-gray-500 flex items-center">
                          <Mail className="w-3 h-3 mr-1" />
                          {lead.email}
                        </div>
                        {lead.phone && (
                          <div className="text-xs text-gray-500 flex items-center">
                            <Phone className="w-3 h-3 mr-1" />
                            {lead.phone}
                          </div>
                        )}
                        {lead.status === 'lost' && lead.loss_reason && (
                          <div className="text-xs text-red-600 mt-1 p-1 bg-red-50 rounded border-l-2 border-red-200">
                            <div className="font-medium">Lost Reason:</div>
                            <div>{lead.loss_reason}</div>
                          </div>
                        )}
                      </div>
                    </TableCell>
                  )}
                  {visibleColumns.company && (
                    <TableCell className="py-1.5 px-3">
                      <div className="space-y-0.5">
                        <div className="font-medium text-sm flex items-center">
                          <Building2 className="w-3 h-3 mr-1" />
                          {lead.company_name || 'N/A'}
                        </div>
                        {lead.job_title && (
                          <div className="text-xs text-gray-500">{lead.job_title}</div>
                        )}
                      </div>
                    </TableCell>
                  )}
                  {visibleColumns.status && (
                    <TableCell className="py-1.5 px-3">
                      <div className="flex items-center gap-2">
                        <Select 
                          value={lead.status} 
                          onValueChange={(value) => updateLeadStatus(lead.id, value)}
                        >
                          <SelectTrigger className="w-32">
                            <Badge className={statusColors[lead.status]} variant="secondary">
                              {lead.status}
                            </Badge>
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="new">New</SelectItem>
                            <SelectItem value="contacted">Contacted</SelectItem>
                            <SelectItem value="qualified">Qualified</SelectItem>
                            <SelectItem value="unqualified">Unqualified</SelectItem>
                            <SelectItem value="lost">Lost</SelectItem>
                          </SelectContent>
                        </Select>
                        {lead.reassignment_status === 'pending' && (
                          <div className="relative group">
                            <Clock className="w-4 h-4 text-orange-600 animate-pulse" />
                            <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 px-2 py-1 bg-gray-900 text-white text-xs rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                              Pending Reassignment Approval
                            </div>
                          </div>
                        )}
                      </div>
                    </TableCell>
                  )}
                  {visibleColumns.source && (
                    <TableCell className="py-1.5 px-3">
                      <Badge variant="outline">
                        {leadMagnetNames[lead.source] || (lead.source === 'deemmi-lead-form' ? 'Deemmi Lead Form' : lead.source)}
                      </Badge>
                    </TableCell>
                  )}
                  {visibleColumns.assigned_to && (
                    <TableCell className="py-1.5 px-3">
                      <Select
                        disabled={isAssignmentLoading || lead.reassignment_status === 'pending'}
                        value={lead.assigned_to || ''}
                        onValueChange={(value) => requestLeadAssignment(lead.id, value)}
                      >
                        <SelectTrigger className={`h-8 text-xs transition-all ${
                          assignedUser
                            ? 'border-solid border-gray-300 hover:border-blue-500 hover:bg-blue-50'
                            : 'border-dashed border-gray-300 hover:border-blue-500 hover:bg-blue-50'
                        }`}>
                          <SelectValue placeholder={
                            isAssignmentLoading ? (
                              <div className="flex items-center gap-2">
                                <div className="w-3 h-3 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                                <span>Processing...</span>
                              </div>
                            ) : (
                              <div className="flex items-center gap-2">
                                {assignedUser ? (
                                  <>
                                    <div className="flex items-center justify-center w-6 h-6 rounded-full bg-gradient-to-br from-teal-400 to-blue-500 text-white text-xs font-medium">
                                      {assignedUser.first_name?.[0]}{assignedUser.last_name?.[0]}
                                    </div>
                                    <span className="truncate">{assignedUserName}</span>
                                    {lead.reassignment_status === 'pending' && (
                                      <Badge variant="outline" className="text-xs bg-orange-50 text-orange-700 border-orange-200 ml-1">
                                        Pending
                                      </Badge>
                                    )}
                                  </>
                                ) : (
                                  <>
                                    <UserPlus className="w-4 h-4 text-gray-500" />
                                    <span className="text-gray-500">Assign to...</span>
                                  </>
                                )}
                              </div>
                            )
                          } />
                        </SelectTrigger>
                        <SelectContent>
                          {teamMembers.map((member) => (
                            <SelectItem key={member.id} value={member.id}>
                              <div className="flex items-center gap-2">
                                <div className="flex items-center justify-center w-6 h-6 rounded-full bg-gradient-to-br from-teal-400 to-blue-500 text-white text-xs font-medium">
                                  {member.first_name?.[0]}{member.last_name?.[0]}
                                </div>
                                <span>{member.first_name} {member.last_name}</span>
                                {member.id === lead.assigned_to && (
                                  <span className="text-xs text-blue-600 ml-1">(Current)</span>
                                )}
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                  )}
                  {visibleColumns.priority && (
                    <TableCell className="py-1.5 px-3">
                      <Badge className={priorityColors[lead.priority]} variant="secondary">
                        {lead.priority}
                      </Badge>
                    </TableCell>
                  )}
                  {visibleColumns.score && (
                    <TableCell className="py-1.5 px-3">
                      <div className="flex items-center">
                        <Star className={`w-4 h-4 mr-1 ${getScoreColor(calculateLeadScore(lead))}`} />
                        <span className={getScoreColor(calculateLeadScore(lead))}>{calculateLeadScore(lead)}</span>
                      </div>
                    </TableCell>
                  )}
                  {visibleColumns.value && (
                    <TableCell className="py-1.5 px-3">
                      <div className="text-xs font-medium text-gray-900">
                        ฿{(lead.value || 0).toLocaleString()}
                      </div>
                    </TableCell>
                  )}
                  {visibleColumns.created && (
                    <TableCell className="py-1.5 px-3">
                      <div className="flex items-center text-xs text-gray-500">
                        <Calendar className="w-3 h-3 mr-1" />
                        {new Date(lead.created_at).toLocaleDateString()}
                      </div>
                    </TableCell>
                  )}
                  {visibleColumns.actions && (
                    <TableCell className="py-1.5 px-3">
                      <div className="flex justify-end space-x-2 pr-4">
                        {lead.status === 'qualified' && (
                          <Button 
                            variant="default" 
                            size="sm"
                            className="bg-green-600 hover:bg-green-700"
                            disabled={convertingLeadId === lead.id}
                            onClick={() => convertLeadToDeal(lead.id)}
                          >
                            <ArrowRight className="w-4 h-4 mr-1" />
                            {convertingLeadId === lead.id ? 'Converting...' : 'Convert'}
                          </Button>
                        )}
                        {lead.status === 'converted' && (
                          <Button 
                            variant="outline" 
                            size="sm"
                            className="bg-green-50 border-green-200 text-green-700"
                            onClick={() => alert('✅ This lead has already been converted to a deal!\n\nYou can find the deal in the Sales Pipeline section.')}
                          >
                            <ArrowRight className="w-4 h-4 mr-1" />
                            Converted
                          </Button>
                        )}
                        <div className="flex items-center space-x-2">
                          <Checkbox
                            checked={taskCheckedLeads.has(lead.id)}
                            onCheckedChange={(checked) => handleTaskCheckboxChange(lead, checked as boolean)}
                            disabled={creatingTaskForLeadId === lead.id}
                            className="w-4 h-4"
                          />
                          <span className="text-xs text-gray-500">Follow-up</span>
                          {creatingTaskForLeadId === lead.id && <span className="text-xs text-blue-600">Creating...</span>}
                        </div>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="outline" size="sm">
                              <MoreVertical className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onClick={() => {
                                setSelectedLead(lead)
                                setShowDetailsDialog(true)
                              }}
                            >
                              <Eye className="w-4 h-4 mr-2" />
                              View Details
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => {
                                setSelectedLead(lead)
                                setShowEditDialog(true)
                              }}
                            >
                              <Edit className="w-4 h-4 mr-2" />
                              Edit
                            </DropdownMenuItem>
                            {lead.reassignment_status === 'pending' ? (
                              <DropdownMenuItem
                                onClick={() => cancelReassignment(lead.id)}
                                className="text-orange-600 hover:text-orange-700"
                                title="Cancel the pending reassignment request"
                              >
                                <RefreshCw className="w-4 h-4 mr-2" />
                                Cancel Reassignment
                              </DropdownMenuItem>
                            ) : (
                              <DropdownMenuItem
                                onClick={() => {
                                  setLeadForReassignment(lead)
                                  setReassignmentData({ requestedUser: '', reason: '' })
                                  setShowReassignDialog(true)
                                }}
                                title="Request reassignment to another team member"
                              >
                                <RefreshCw className="w-4 h-4 mr-2" />
                                Reassign
                              </DropdownMenuItem>
                            )}
                            {/* Only show delete option for admin users */}
                            {(currentUserRole === 'admin' || currentUserRole === 'owner') && (
                              <>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  disabled={deletingLeadId === lead.id}
                                  onClick={() => deleteLead(lead.id)}
                                  className="text-red-600 hover:text-red-700"
                                >
                                  <Trash2 className="w-4 h-4 mr-2" />
                                  Delete
                                </DropdownMenuItem>
                              </>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </TableCell>
                  )}
                </TableRow>
                )
              })}
            </TableBody>
          </Table>
          
          {filteredLeads.length === 0 && (
            <div className="text-center py-12">
              <UserPlus className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">No leads found</h3>
              <p className="mt-1 text-sm text-gray-500">
                {searchQuery || statusFilter !== 'all' || sourceFilter !== 'all'
                  ? 'Try adjusting your filters'
                  : leads.length === 0
                    ? 'No leads have been assigned to you yet. Please contact your admin for lead assignment.'
                    : 'Get started by creating your first lead'
                }
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Lead Details Dialog */}
      <Dialog open={showDetailsDialog} onOpenChange={setShowDetailsDialog}>
        <DialogContent className="!max-w-4xl !w-[90vw] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold">Lead Details</DialogTitle>
          </DialogHeader>
          {selectedLead && (
            <div className="space-y-6 py-4">
              {/* Contact Info Section */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="text-lg font-semibold mb-3">
                  {selectedLead.first_name || selectedLead.last_name
                    ? `${selectedLead.first_name || ''} ${selectedLead.last_name || ''}`.trim()
                    : 'Unknown'
                  }
                </h3>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <span className="text-gray-500">Email:</span>
                    <span className="ml-2 font-medium">{selectedLead.email || 'N/A'}</span>
                  </div>
                  <div>
                    <span className="text-gray-500">Phone:</span>
                    <span className="ml-2 font-medium">{selectedLead.phone || 'N/A'}</span>
                  </div>
                  <div>
                    <span className="text-gray-500">Company:</span>
                    <span className="ml-2 font-medium">{selectedLead.company_name || 'N/A'}</span>
                  </div>
                  <div>
                    <span className="text-gray-500">Job Title:</span>
                    <span className="ml-2 font-medium">{selectedLead.job_title || 'N/A'}</span>
                  </div>
                </div>
              </div>

              {/* Status & Details Section */}
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-white border rounded-lg p-3">
                  <p className="text-xs text-gray-500 mb-1">Status</p>
                  <Badge className={statusColors[selectedLead.status]} variant="secondary">
                    {selectedLead.status}
                  </Badge>
                </div>
                <div className="bg-white border rounded-lg p-3">
                  <p className="text-xs text-gray-500 mb-1">Priority</p>
                  <Badge className={priorityColors[selectedLead.priority]} variant="secondary">
                    {selectedLead.priority}
                  </Badge>
                </div>
                <div className="bg-white border rounded-lg p-3">
                  <p className="text-xs text-gray-500 mb-1">Source</p>
                  <p className="text-sm font-medium truncate">
                    {leadMagnetNames[selectedLead.source] || (selectedLead.source === 'deemmi-lead-form' ? 'Deemmi Lead Form' : selectedLead.source)}
                  </p>
                </div>
                <div className="bg-white border rounded-lg p-3">
                  <p className="text-xs text-gray-500 mb-1">Expected Value</p>
                  <p className="text-sm font-bold text-green-600">
                    ฿{(selectedLead.value || 0).toLocaleString()}
                  </p>
                </div>
                <div className="bg-white border rounded-lg p-3">
                  <p className="text-xs text-gray-500 mb-1">Score</p>
                  <p className={`text-lg font-bold ${getScoreColor(calculateLeadScore(selectedLead))}`}>
                    {calculateLeadScore(selectedLead)}/100
                  </p>
                </div>
                <div className="bg-white border rounded-lg p-3">
                  <p className="text-xs text-gray-500 mb-1">Created</p>
                  <p className="text-sm">{new Date(selectedLead.created_at).toLocaleDateString()}</p>
                </div>
              </div>

              {/* Notes Section */}
              {selectedLead.notes && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <p className="text-xs text-yellow-700 font-medium mb-2">First Message / Notes</p>
                  <p className="text-sm text-gray-700 whitespace-pre-wrap">{selectedLead.notes}</p>
                </div>
              )}

              {/* Activity & Notes Section */}
              <div>
                <LeadNotes
                  leadId={selectedLead.id}
                  leadName={`${selectedLead.first_name || ''} ${selectedLead.last_name || ''}`.trim() || selectedLead.company_name || selectedLead.email}
                />
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Lead Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Lead</DialogTitle>
            <DialogDescription>Update lead information</DialogDescription>
          </DialogHeader>
          {selectedLead && (
            <div className="grid gap-6 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="edit_first_name" className="text-sm font-medium">First Name</Label>
                  <Input
                    id="edit_first_name"
                    value={selectedLead.first_name || ''}
                    onChange={(e) => setSelectedLead({...selectedLead, first_name: e.target.value})}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="edit_last_name" className="text-sm font-medium">Last Name</Label>
                  <Input
                    id="edit_last_name"
                    value={selectedLead.last_name || ''}
                    onChange={(e) => setSelectedLead({...selectedLead, last_name: e.target.value})}
                    className="mt-1"
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="edit_email" className="text-sm font-medium">Email</Label>
                <Input
                  id="edit_email"
                  type="email"
                  value={selectedLead.email}
                  onChange={(e) => setSelectedLead({...selectedLead, email: e.target.value})}
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="edit_phone" className="text-sm font-medium">Phone</Label>
                <Input
                  id="edit_phone"
                  value={selectedLead.phone || ''}
                  onChange={(e) => setSelectedLead({...selectedLead, phone: e.target.value})}
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="edit_company_name" className="text-sm font-medium">Company</Label>
                <Input
                  id="edit_company_name"
                  value={selectedLead.company_name || ''}
                  onChange={(e) => setSelectedLead({...selectedLead, company_name: e.target.value})}
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="edit_job_title" className="text-sm font-medium">Job Title</Label>
                <Input
                  id="edit_job_title"
                  value={selectedLead.job_title || ''}
                  onChange={(e) => setSelectedLead({...selectedLead, job_title: e.target.value})}
                  className="mt-1"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="edit_source" className="text-sm font-medium">Source</Label>
                  <Select value={selectedLead.source} onValueChange={(value) => setSelectedLead({...selectedLead, source: value})}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="deemmi-lead-form">Deemmi Lead Form</SelectItem>
                      <SelectItem value="Website">Website</SelectItem>
                      <SelectItem value="Organic Search">Organic Search</SelectItem>
                      <SelectItem value="Google Ads">Google Ads</SelectItem>
                      <SelectItem value="Facebook Ads">Facebook Ads</SelectItem>
                      <SelectItem value="LINE Messenger">LINE Messenger</SelectItem>
                      <SelectItem value="Facebook Messenger">Facebook Messenger</SelectItem>
                      <SelectItem value="LinkedIn">LinkedIn</SelectItem>
                      <SelectItem value="Referral">Referral</SelectItem>
                      <SelectItem value="Email Marketing">Email Marketing</SelectItem>
                      <SelectItem value="Trade Show">Trade Show</SelectItem>
                      <SelectItem value="Cold Outreach">Cold Outreach</SelectItem>
                      <SelectItem value="Partner">Partner</SelectItem>
                      <SelectItem value="Social Media">Social Media</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="edit_priority" className="text-sm font-medium">Priority</Label>
                  <Select value={selectedLead.priority} onValueChange={(value) => setSelectedLead({...selectedLead, priority: value as "medium" | "high" | "low" | "urgent"})}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="urgent">Urgent</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <Label htmlFor="edit_value" className="text-sm font-medium">Expected Value (THB)</Label>
                <Input
                  id="edit_value"
                  type="number"
                  placeholder="0"
                  value={selectedLead.value?.toString() || ''}
                  onChange={(e) => setSelectedLead({...selectedLead, value: parseInt(e.target.value) || 0})}
                  className="mt-1"
                />
                <p className="text-xs text-gray-500 mt-1">Enter 0 if unknown</p>
              </div>
              <div>
                <Label htmlFor="edit_notes" className="text-sm font-medium">Notes</Label>
                <Textarea
                  id="edit_notes"
                  value={selectedLead.notes || ''}
                  onChange={(e) => setSelectedLead({...selectedLead, notes: e.target.value})}
                  rows={3}
                  className="mt-1"
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditDialog(false)}>
              Cancel
            </Button>
            <Button onClick={updateLead}>
              Update Lead
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Follow-up Task Dialog */}
      <Dialog open={showFollowUpDialog} onOpenChange={() => {}}>
        <DialogContent className="sm:max-w-[525px]">
          <DialogHeader>
            <DialogTitle>Create Follow-up Task</DialogTitle>
            <DialogDescription>
              Set up a follow-up task for {selectedLeadForTask?.first_name} {selectedLeadForTask?.last_name || selectedLeadForTask?.company_name}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="followup_date" className="text-right">
                Follow-up Date
              </Label>
              <Input
                id="followup_date"
                type="date"
                value={followUpData.date}
                onChange={(e) => setFollowUpData({...followUpData, date: e.target.value})}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-start gap-4">
              <Label htmlFor="followup_notes" className="text-right pt-2">
                Notes
              </Label>
              <Textarea
                id="followup_notes"
                placeholder="What do you need to do? (e.g., Call to discuss pricing, Send proposal, Follow up on demo...)"
                value={followUpData.notes}
                onChange={(e) => setFollowUpData({...followUpData, notes: e.target.value})}
                className="col-span-3"
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={handleFollowUpCancel}>
              Cancel
            </Button>
            <Button onClick={handleFollowUpSubmit} disabled={!followUpData.date}>
              Create Task
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Lead Lost Dialog */}
      <Dialog open={showLostDialog} onOpenChange={setShowLostDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-2 text-red-700">
              <UserPlus className="h-5 w-5 text-red-600 transform rotate-180" />
              <span>Lead Lost</span>
            </DialogTitle>
            <DialogDescription>
              Please provide details about why this lead was lost for future insights.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div>
              <Label className="text-sm font-medium text-gray-700">Lead</Label>
              <p className="text-sm text-gray-600 mt-1">
                {leadBeingLost?.first_name} {leadBeingLost?.last_name}
              </p>
              <p className="text-sm text-gray-500">{leadBeingLost?.email}</p>
              <p className="text-sm text-gray-500">{leadBeingLost?.company_name}</p>
            </div>
            <div>
              <Label className="text-sm font-medium text-gray-700">Date Lost</Label>
              <Input
                type="date"
                value={lostData.lostDate}
                onChange={(e) => setLostData({...lostData, lostDate: e.target.value})}
                className="mt-1"
              />
            </div>
            <div>
              <Label className="text-sm font-medium text-gray-700">Reason for Loss</Label>
              <Textarea
                placeholder="e.g., Not interested, budget constraints, wrong timing, chose competitor..."
                value={lostData.lossReason}
                onChange={(e) => setLostData({...lostData, lossReason: e.target.value})}
                className="mt-1"
                rows={3}
              />
            </div>
            <div className="flex justify-end gap-3 pt-4">
              <Button variant="outline" onClick={() => setShowLostDialog(false)}>
                Cancel
              </Button>
              <Button 
                onClick={handleConfirmLeadLost} 
                className="bg-red-600 hover:bg-red-700 text-white"
                disabled={!lostData.lossReason.trim()}
              >
                Confirm Loss
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Reassignment Request Dialog */}
      <Dialog open={showReassignDialog} onOpenChange={setShowReassignDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-2 text-orange-700">
              <RefreshCw className="h-5 w-5 text-orange-600" />
              <span>Request Reassignment</span>
            </DialogTitle>
            <DialogDescription>
              Request admin to reassign this lead to another team member.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div>
              <Label className="text-sm font-medium text-gray-700">Lead</Label>
              <p className="text-sm text-gray-600 mt-1">
                {leadForReassignment?.first_name} {leadForReassignment?.last_name}
              </p>
              <p className="text-sm text-gray-500">{leadForReassignment?.email}</p>
              <p className="text-sm text-gray-500">{leadForReassignment?.company_name}</p>
            </div>
            <div>
              <Label className="text-sm font-medium text-gray-700">Request Assignment To</Label>
              <Select value={reassignmentData.requestedUser} onValueChange={(value) => setReassignmentData({...reassignmentData, requestedUser: value})}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Select team member" />
                </SelectTrigger>
                <SelectContent>
                  {teamMembers
                    .filter(member => 
                      member.id !== leadForReassignment?.assigned_to &&
                      member.role === 'sales'
                    )
                    .map(member => (
                      <SelectItem key={member.id} value={member.id}>
                        {member.first_name} {member.last_name} ({member.role})
                      </SelectItem>
                    ))
                  }
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-sm font-medium text-gray-700">Reason for Reassignment</Label>
              <Textarea
                placeholder="e.g., Need technical expertise, better industry knowledge, scheduling conflicts, workload balancing..."
                value={reassignmentData.reason}
                onChange={(e) => setReassignmentData({...reassignmentData, reason: e.target.value})}
                className="mt-1"
                rows={3}
              />
            </div>
            <div className="flex justify-end gap-3 pt-4">
              <Button variant="outline" onClick={() => setShowReassignDialog(false)}>
                Cancel
              </Button>
              <Button 
                onClick={requestReassignment} 
                className="bg-orange-600 hover:bg-orange-700 text-white"
                disabled={!reassignmentData.requestedUser || !reassignmentData.reason.trim()}
              >
                Send Request
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Manage Columns Dialog */}
      <Dialog open={showColumnsDialog} onOpenChange={setShowColumnsDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Manage Columns</DialogTitle>
            <DialogDescription>Choose which columns to show or hide in the leads table</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {Object.entries({
              contact: 'Contact',
              company: 'Company', 
              status: 'Status',
              source: 'Source',
              assigned_to: 'Assigned To',
              priority: 'Priority',
              score: 'Score',
              value: 'Value', 
              created: 'Created',
              actions: 'Actions'
            }).map(([key, label]) => (
              <div key={key} className="flex items-center space-x-2">
                <Checkbox
                  id={key}
                  checked={visibleColumns[key as keyof typeof visibleColumns]}
                  onCheckedChange={(checked) => 
                    updateColumnVisibility(key as keyof typeof visibleColumns, !!checked)
                  }
                />
                <Label htmlFor={key} className="text-sm font-medium">
                  {label}
                </Label>
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => {
                // Reset to defaults
                const defaultColumns = {
                  contact: true,
                  company: true,
                  status: true,
                  source: true,
                  assigned_to: true,
                  priority: true,
                  score: true,
                  value: true,
                  created: true,
                  actions: true
                }
                setVisibleColumns(defaultColumns)
                localStorage.setItem('leads_visible_columns', JSON.stringify(defaultColumns))
              }}
            >
              Reset to Default
            </Button>
            <Button onClick={() => setShowColumnsDialog(false)}>
              Done
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}