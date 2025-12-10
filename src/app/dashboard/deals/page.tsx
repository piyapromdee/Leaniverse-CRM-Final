'use client'

import React, { useState, useEffect, Suspense } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useSearchParams, useRouter } from 'next/navigation'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Plus, Edit, Trash2, Calendar, User, Building, Target, TrendingUp, BarChart3, Globe, Search, Phone, Linkedin, Users, Mail, Share2, Monitor, Handshake, AlertTriangle } from 'lucide-react'
import { DateRangePicker } from '@/components/ui/date-range-picker'
import { DateRange } from 'react-day-picker'
import { format } from 'date-fns'
import { IndustryBanner } from '@/components/ui/industry-banner'

// Deal stages configuration - Simplified 4-stage pipeline for better UX
const DEAL_STAGES = [
  { id: 'discovery', title: 'DISCOVERY', color: 'bg-blue-50', headerColor: 'bg-blue-50', textColor: 'text-blue-700', valueColor: 'text-blue-600' },
  { id: 'proposal', title: 'PROPOSAL', color: 'bg-yellow-50', headerColor: 'bg-yellow-50', textColor: 'text-yellow-700', valueColor: 'text-yellow-600' },
  { id: 'won', title: 'CLOSED WON', color: 'bg-green-50', headerColor: 'bg-green-50', textColor: 'text-green-700', valueColor: 'text-green-600' },
  { id: 'lost', title: 'CLOSED LOST', color: 'bg-red-50', headerColor: 'bg-red-50', textColor: 'text-red-700', valueColor: 'text-red-600' }
]

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('th-TH', {
    style: 'currency',
    currency: 'THB',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}

const formatDate = (dateString: string | null) => {
  if (!dateString) return 'N/A'
  return format(new Date(dateString), 'dd/MM/yyyy')
}

// Check if a deal is stale (not updated in last 14 days)
const isDealStale = (deal: any) => {
  if (!deal.updated_at) return false
  
  // Don't mark closed deals as stale
  if (deal.stage === 'won' || deal.stage === 'lost') return false
  
  const lastUpdate = new Date(deal.updated_at)
  const now = new Date()
  const daysSinceUpdate = Math.floor((now.getTime() - lastUpdate.getTime()) / (1000 * 60 * 60 * 24))
  
  return daysSinceUpdate > 14
}

// Get days since last update
const getDaysSinceUpdate = (deal: any) => {
  if (!deal.updated_at) return 0
  const lastUpdate = new Date(deal.updated_at)
  const now = new Date()
  return Math.floor((now.getTime() - lastUpdate.getTime()) / (1000 * 60 * 60 * 24))
}

// Main Component Wrapper
export default function DealsPageWithSuspense() {
  return (
    <Suspense fallback={<div className="flex justify-center items-center h-screen">Loading...</div>}>
      <DealsPage />
    </Suspense>
  )
}

function DealsPage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const statusParam = searchParams.get('status')
  const [searchQuery, setSearchQuery] = useState('')
  
  // TEMPORARY FIX: Hardcode some deals data including converted leads
  const [allDeals, setAllDeals] = useState<any[]>([
    {
      "id": "a7936e64-d3dd-4af2-b7f4-cfad7350e3b0",
      "user_id": "2d6e1e84-7cbf-45b1-bc27-5c10dabdc735",
      "company_id": null,
      "contact_id": null,
      "title": "S - S R",
      "description": "Converted from lead. Original notes: Downloaded: Deemmi Lead Form",
      "value": 0,
      "stage": "discovery",
      "priority": "medium",
      "close_date": "2025-09-18",
      "assigned_to": "2d6e1e84-7cbf-45b1-bc27-5c10dabdc735",
      "created_at": "2025-08-19T05:56:48.604761+00:00",
      "updated_at": "2025-08-19T05:56:48.604761+00:00",
      "channel": "deemmi-lead-form",
      "loss_reason": null,
      "closed_date": null,
      "lost_date": null
    },
    {
      "id": "57bd1601-ec33-4f50-8a04-c814778a661d",
      "user_id": "1b0bfda8-d888-4ceb-8170-5cfc156f3277",
      "company_id": null,
      "contact_id": null,
      "title": "DeemmiCon - Roong Siri",
      "description": "Converted from qualified lead.",
      "value": 10000,
      "stage": "discovery",
      "priority": "high",
      "close_date": "2025-09-15",
      "assigned_to": "1b0bfda8-d888-4ceb-8170-5cfc156f3277",
      "created_at": "2025-08-16T10:31:55.342623+00:00",
      "updated_at": "2025-08-17T08:17:57.075068+00:00",
      "channel": "Website",
      "loss_reason": null,
      "closed_date": null,
      "lost_date": null
    },
    {
      "id": "6fb72e80-5eaf-4556-8a76-05bdb3abca14",
      "user_id": "1b0bfda8-d888-4ceb-8170-5cfc156f3277",
      "company_id": "c8f7b533-54d2-4ef2-ac6e-21f027d0f635",
      "contact_id": null,
      "title": "Finix Sport - Finix Sport Finix Sport",
      "description": "Converted from lead. Original notes: New Website \"Taround\"",
      "value": 300000,
      "stage": "proposal",
      "priority": "medium",
      "close_date": "2025-09-14",
      "assigned_to": "1b0bfda8-d888-4ceb-8170-5cfc156f3277",
      "created_at": "2025-08-15T12:04:15.797656+00:00",
      "updated_at": "2025-08-17T08:17:57.075068+00:00",
      "channel": "Referral",
      "loss_reason": null,
      "closed_date": null,
      "lost_date": null
    }
  ])
  const [isLoading, setIsLoading] = useState(true)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingDeal, setEditingDeal] = useState<any>(null)
  const [newDeal, setNewDeal] = useState({
    title: '',
    description: '',
    value: '',
    stage: 'discovery',
    expected_close_date: '',
    company_id: null as string | null,
    contact_id: null as string | null,
    channel: '',
    assigned_to: '',
    priority: 'medium',
    lost_date: '',
    loss_reason: '',
    closed_date: ''
  })
  const [companies, setCompanies] = useState<any[]>([])
  const [contacts, setContacts] = useState<any[]>([])
  const [teamMembers, setTeamMembers] = useState<any[]>([])
  const [userProfile, setUserProfile] = useState<any>(null)
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined)
  const [selectedChannel, setSelectedChannel] = useState('all')
  const [selectedStageView, setSelectedStageView] = useState('all')
  const [sortBy, setSortBy] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('deals_sort_by') || 'created_at'
    }
    return 'created_at'
  })
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>(() => {
    if (typeof window !== 'undefined') {
      return (localStorage.getItem('deals_sort_order') as 'asc' | 'desc') || 'desc'
    }
    return 'desc'
  })
  
  // Deal closure tracking states
  const [showWonDialog, setShowWonDialog] = useState(false)
  const [showLostDialog, setShowLostDialog] = useState(false)
  const [dealBeingClosed, setDealBeingClosed] = useState<any>(null)
  const [closureData, setClosureData] = useState({
    closedDate: new Date().toISOString().split('T')[0],
    lossReason: ''
  })

  const supabase = createClient()

  // Handle URL parameters for filtering
  useEffect(() => {
    if (statusParam) {
      switch (statusParam) {
        case 'active':
        case 'open':
          setSelectedStageView('active')
          break
        case 'won':
          setSelectedStageView('won')
          break
        case 'lost':
          setSelectedStageView('lost')
          break
        case 'closed':
          setSelectedStageView('closed')
          break
        default:
          setSelectedStageView('all')
      }
    }
  }, [statusParam])

  const loadData = async () => {
    setIsLoading(true)
    try {
      console.log('🔍 [DEALS] Starting loadData...')
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        console.log('🔍 [DEALS] No user found, exiting')
        setIsLoading(false)
        return
      }
      console.log('🔍 [DEALS] User ID:', user.id)

      // Load user profile
      const profileRes = await supabase.from('profiles').select('*').eq('id', user.id).single()
      if (profileRes.error) throw profileRes.error
      setUserProfile(profileRes.data)

      // Load deals with RLS - automatically filtered by user's organization
      // SECURITY: Sales users can only see their own assigned deals
      const userRole = profileRes.data?.role
      console.log('🔍 [DEALS] Fetching deals with RLS (multi-tenancy)... User role:', userRole)

      let dealsQuery = supabase
        .from('deals')
        .select('*')

      // Data isolation: Sales users only see deals assigned to them
      if (userRole === 'sales') {
        console.log('🔒 [DEALS] Applying sales user filter: assigned_to =', user.id)
        dealsQuery = dealsQuery.eq('assigned_to', user.id)
      } else {
        console.log('🔓 [DEALS] Admin/Owner: showing all deals')
      }

      const dealsRes = await dealsQuery.order('created_at', { ascending: false })
      
      if (dealsRes.error) {
        console.error('🔍 [DEALS] Error fetching deals:', dealsRes.error)
        setAllDeals([])
      } else {
        console.log('🔍 [DEALS] Fetched', dealsRes.data?.length || 0, 'deals (RLS filtered)')
        setAllDeals(dealsRes.data || [])
      }

      console.log('🔍 [FRONTEND] Deals loading completed')
      console.log('🔍 [FRONTEND] User ID:', user.id)

      // Load reference data
      const [companiesRes, contactsRes, teamRes] = await Promise.all([
        supabase.from('companies').select('id, name'),
        supabase.from('contacts').select('id, name, company_id'),
        supabase.from('profiles').select('id, first_name, last_name')
      ])

      if (companiesRes.error) throw companiesRes.error
      setCompanies(companiesRes.data || [])
      if (contactsRes.error) throw contactsRes.error
      setContacts(contactsRes.data || [])
      if (teamRes.error) throw teamRes.error
      setTeamMembers(teamRes.data || [])

    } catch (error: any) {
      console.error("Error loading deals:", error.message || error)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  // Save sorting preferences when they change
  useEffect(() => {
    localStorage.setItem('deals_sort_by', sortBy)
    localStorage.setItem('deals_sort_order', sortOrder)
  }, [sortBy, sortOrder])

  // Get unique channels from deals + predefined channels
  const uniqueChannels = React.useMemo(() => {
    // Normalize channel names from database to proper case
    const normalizeChannel = (channel: string) => {
      if (!channel) return ''
      // Special case for deemmi-lead-form
      if (channel === 'deemmi-lead-form') return 'Deemmi-lead-form'
      return channel.toLowerCase().split(' ').map(word => 
        word.charAt(0).toUpperCase() + word.slice(1)
      ).join(' ')
    }
    
    const dealsChannels = new Set(
      allDeals
        .map(deal => deal.channel)
        .filter(Boolean)
        .map(normalizeChannel)
    )
    const predefinedChannels = ['Organic Search', 'Cold Call', 'LinkedIn', 'Referral', 'Email Marketing', 'Social Media', 'Website', 'Partner', 'Advertising']
    const allChannelsSet = new Set([...Array.from(dealsChannels), ...predefinedChannels])
    return Array.from(allChannelsSet).sort()
  }, [allDeals])

  // Filter contacts based on selected company
  const filteredContacts = React.useMemo(() => {
    if (!newDeal.company_id || newDeal.company_id === 'none') {
      return contacts; // Show all contacts if no company selected
    }
    
    // Filter contacts by company, but always include the currently selected contact
    const companyContacts = contacts.filter(contact => contact.company_id === newDeal.company_id);
    
    // If there's a currently selected contact that doesn't belong to this company, include it anyway
    const currentContact = contacts.find(contact => contact.id === newDeal.contact_id);
    if (currentContact && !companyContacts.some(c => c.id === currentContact.id)) {
      return [currentContact, ...companyContacts];
    }
    
    return companyContacts;
  }, [contacts, newDeal.company_id, newDeal.contact_id]);

  // Filter deals by search, channel, stage, and date range
  const filteredDeals = React.useMemo(() => {
    console.log('🔍 [DEALS] Filtering deals...');
    console.log('🔍 [DEALS] All deals count:', allDeals.length);
    console.log('🔍 [DEALS] Selected channel:', selectedChannel);
    console.log('🔍 [DEALS] Selected stage view:', selectedStageView);
    console.log('🔍 [DEALS] Date range:', dateRange);
    console.log('🔍 [DEALS] Search query:', searchQuery);
    
    let filtered = allDeals;
    
    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      filtered = filtered.filter(deal => {
        return (
          deal.title?.toLowerCase().includes(query) ||
          deal.company?.toLowerCase().includes(query) ||
          deal.contact_name?.toLowerCase().includes(query) ||
          deal.stage?.toLowerCase().includes(query) ||
          deal.channel?.toLowerCase().includes(query)
        );
      });
    }
    
    // Filter by channel with normalization
    if (selectedChannel !== 'all') {
      filtered = filtered.filter(deal => {
        if (!deal.channel) return false;
        // Normalize the deal channel the same way as in uniqueChannels
        const normalizeChannel = (channel: string) => {
          if (!channel) return ''
          // Special case for deemmi-lead-form
          if (channel === 'deemmi-lead-form') return 'Deemmi-lead-form'
          return channel.toLowerCase().split(' ').map(word => 
            word.charAt(0).toUpperCase() + word.slice(1)
          ).join(' ')
        }
        const normalizedDealChannel = normalizeChannel(deal.channel);
        console.log('🔍 [DEALS] Comparing:', normalizedDealChannel, '===', selectedChannel);
        return normalizedDealChannel === selectedChannel;
      });
      console.log('🔍 [DEALS] After channel filter:', filtered.length);
    }
    
    // Filter by stage view
    if (selectedStageView !== 'all') {
      filtered = filtered.filter(deal => {
        if (selectedStageView === 'active') {
          return !['won', 'lost'].includes(deal.stage);
        }
        if (selectedStageView === 'closed') {
          return ['won', 'lost'].includes(deal.stage);
        }
        return deal.stage === selectedStageView;
      });
      console.log('🔍 [DEALS] After stage filter:', filtered.length);
    }
    
    // Filter by date range
    if (dateRange?.from) {
      const fromDate = dateRange.from;
      const toDate = dateRange.to || fromDate;
      
      // Set end time to end of day for 'to' date
      const toDateEndOfDay = new Date(toDate);
      toDateEndOfDay.setHours(23, 59, 59, 999);
      
      filtered = filtered.filter(deal => {
        if (!deal.created_at) return false;
        
        const dealDate = new Date(deal.created_at);
        const inRange = dealDate >= fromDate && dealDate <= toDateEndOfDay;
        
        if (!inRange) {
          console.log('🔍 [DEALS] Deal outside range:', deal.title, dealDate, 'Range:', fromDate, '-', toDateEndOfDay);
        }
        
        return inRange;
      });
      
      console.log('🔍 [DEALS] After date filter:', filtered.length);
    }
    
    console.log('🔍 [DEALS] Final filtered deals:', filtered.length);
    return filtered;
  }, [allDeals, selectedChannel, selectedStageView, dateRange, searchQuery])

  // Calculate pipeline stats
  const stats = React.useMemo(() => {
    // CRITICAL: Pipeline Value = SUM of OPEN deals only (exclude won and lost)
    const openDeals = filteredDeals.filter(d => d.stage === 'discovery' || d.stage === 'proposal')
    const pipelineValue = openDeals.reduce((sum, deal) => sum + (Number(deal.value) || 0), 0)
    
    // Calculate won and lost values separately for display
    const wonDeals = filteredDeals.filter(d => d.stage === 'won')
    const wonValue = wonDeals.reduce((sum, deal) => sum + (Number(deal.value) || 0), 0)
    
    const lostDeals = filteredDeals.filter(d => d.stage === 'lost')
    const lostValue = lostDeals.reduce((sum, deal) => sum + (Number(deal.value) || 0), 0)
    
    const totalValue = filteredDeals.reduce((sum, deal) => sum + (Number(deal.value) || 0), 0)
    const avgDealSize = openDeals.length > 0 ? pipelineValue / openDeals.length : 0

    return {
      activeDeals: openDeals.length,
      pipelineValue: pipelineValue,
      wonValue: wonValue,
      lostValue: lostValue,
      avgDealSize: avgDealSize,
      wonCount: wonDeals.length,
      lostCount: lostDeals.length
    }
  }, [filteredDeals])

  // Group deals by stage with sorting
  const dealsByStage = React.useMemo(() => {
    // Sorting function
    const sortDeals = (deals: any[]) => {
      return [...deals].sort((a, b) => {
        let valueA, valueB
        
        switch (sortBy) {
          case 'value':
            valueA = Number(a.value) || 0
            valueB = Number(b.value) || 0
            break
          case 'expected_close_date':
          case 'close_date':
            valueA = a.expected_close_date || a.close_date
            valueB = b.expected_close_date || b.close_date
            if (!valueA && !valueB) return 0
            if (!valueA) return 1
            if (!valueB) return -1
            valueA = new Date(valueA).getTime()
            valueB = new Date(valueB).getTime()
            break
          case 'created_at':
            valueA = new Date(a.created_at || 0).getTime()
            valueB = new Date(b.created_at || 0).getTime()
            break
          case 'updated_at':
            valueA = new Date(a.updated_at || 0).getTime()
            valueB = new Date(b.updated_at || 0).getTime()
            break
          case 'title':
            valueA = (a.title || '').toLowerCase()
            valueB = (b.title || '').toLowerCase()
            break
          default:
            valueA = a.created_at
            valueB = b.created_at
        }
        
        if (valueA < valueB) return sortOrder === 'asc' ? -1 : 1
        if (valueA > valueB) return sortOrder === 'asc' ? 1 : -1
        return 0
      })
    }
    
    const grouped: { [key: string]: any[] } = {}
    DEAL_STAGES.forEach(stage => {
      const stageDeals = filteredDeals.filter(deal => deal.stage === stage.id)
      grouped[stage.id] = sortDeals(stageDeals)
    })
    
    // Check for deals with unrecognized stages
    const recognizedStages = DEAL_STAGES.map(s => s.id)
    const orphanedDeals = filteredDeals.filter(deal => !recognizedStages.includes(deal.stage))
    if (orphanedDeals.length > 0) {
      console.warn('🔍 [DEALS] Found deals with unrecognized stages:', orphanedDeals.map(d => ({ id: d.id, title: d.title, stage: d.stage })))
    }
    
    return grouped
  }, [filteredDeals, sortBy, sortOrder])

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-red-100 text-red-600 px-2 py-1 rounded-md text-xs font-medium'
      case 'medium': return 'bg-yellow-100 text-yellow-600 px-2 py-1 rounded-md text-xs font-medium'
      case 'low': return 'bg-green-100 text-green-600 px-2 py-1 rounded-md text-xs font-medium'
      default: return 'bg-gray-100 text-gray-600 px-2 py-1 rounded-md text-xs font-medium'
    }
  }

  const getChannelIcon = (channel: string) => {
    switch (channel?.toLowerCase()) {
      case 'organic search': return <Search className="w-3 h-3" />
      case 'cold call': return <Phone className="w-3 h-3" />
      case 'linkedin': return <Linkedin className="w-3 h-3" />
      case 'referral': return <Users className="w-3 h-3" />
      case 'email marketing': return <Mail className="w-3 h-3" />
      case 'social media': return <Share2 className="w-3 h-3" />
      case 'website': return <Monitor className="w-3 h-3" />
      case 'partner': return <Handshake className="w-3 h-3" />
      default: return <Building className="w-3 h-3" />
    }
  }

  const handleOpenModal = (deal: any | null = null) => {
    if (deal) {
      console.log('🔍 [FRONTEND] Opening modal for editing deal:', deal)
      console.log('🔍 [FRONTEND] Deal expected_close_date:', deal.expected_close_date)
      console.log('🔍 [FRONTEND] Deal close_date:', deal.close_date)
      
      setEditingDeal(deal)
      // Format date for input field (YYYY-MM-DD) - check both fields
      const formattedDate = (deal.expected_close_date || deal.close_date) ? 
        new Date(deal.expected_close_date || deal.close_date).toISOString().split('T')[0] : ''
      
      console.log('🔍 [FRONTEND] Formatted date for input:', formattedDate)
      
      setNewDeal({
        title: deal.title || '',
        description: deal.description || '',
        value: deal.value?.toString() || '',
        stage: deal.stage || 'discovery',
        expected_close_date: formattedDate,
        company_id: deal.company_id,
        contact_id: deal.contact_id,
        channel: (() => {
          if (!deal.channel) return '';
          console.log('🔍 [DEAL MODAL] Original channel:', deal.channel);
          // Use the same normalization as uniqueChannels
          const normalizeChannel = (channel: string) => {
            if (!channel) return ''
            // Special case for deemmi-lead-form
            if (channel === 'deemmi-lead-form') return 'Deemmi-lead-form'
            return channel.toLowerCase().split(' ').map(word => 
              word.charAt(0).toUpperCase() + word.slice(1)
            ).join(' ')
          }
          const normalized = normalizeChannel(deal.channel);
          console.log('🔍 [DEAL MODAL] Normalized channel:', normalized);
          return normalized;
        })(),
        assigned_to: deal.assigned_to || '',
        priority: deal.priority || 'medium',
        lost_date: deal.lost_date ? new Date(deal.lost_date).toISOString().split('T')[0] : '',
        loss_reason: deal.loss_reason || '',
        closed_date: deal.closed_date ? new Date(deal.closed_date).toISOString().split('T')[0] : ''
      })
    } else {
      setEditingDeal(null)
      setNewDeal({
        title: '',
        description: '',
        value: '',
        stage: 'discovery',
        expected_close_date: '',
        company_id: null,
        contact_id: null,
        channel: '',
        assigned_to: userProfile?.id || '',
        priority: 'medium',
        lost_date: '',
        loss_reason: '',
        closed_date: ''
      })
    }
    setIsModalOpen(true)
  }

  const handleSaveDeal = async () => {
    try {
      if (!newDeal.title.trim()) {
        alert('Deal title is required')
        return
      }

      const dealData = {
        title: newDeal.title.trim(),
        description: newDeal.description || '',
        value: newDeal.value ? parseFloat(newDeal.value) : 0,
        stage: newDeal.stage,
        expected_close_date: newDeal.expected_close_date ? newDeal.expected_close_date : null,
        company_id: newDeal.company_id || null,
        contact_id: newDeal.contact_id || null,
        channel: newDeal.channel || '',
        assigned_to: newDeal.assigned_to || null,
        priority: newDeal.priority || 'medium',
        lost_date: newDeal.lost_date || null,
        loss_reason: newDeal.loss_reason || null,
        closed_date: newDeal.closed_date || null
      }

      console.log('🔍 [FRONTEND] Saving deal with data:', dealData)
      console.log('🔍 [FRONTEND] Expected close date from form state:', newDeal.expected_close_date)
      console.log('🔍 [FRONTEND] Expected close date in dealData:', dealData.expected_close_date)
      console.log('🔍 [FRONTEND] Is editing existing deal:', !!editingDeal)
      if (editingDeal) {
        console.log('🔍 [FRONTEND] Original deal data:', editingDeal)
      }

      const response = editingDeal
        ? await fetch('/api/deals', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              id: editingDeal.id,
              ...dealData
            })
          })
        : await fetch('/api/deals', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(dealData)
          })

      const result = await response.json()
      console.log('🔍 [FRONTEND] API Response:', result)
      console.log('🔍 [FRONTEND] Response status:', response.status)
      
      if (!response.ok) {
        throw new Error(result.error || result.details || 'Failed to save deal')
      }

      console.log('🔍 [FRONTEND] Deal saved successfully, reloading data...')
      
      // Activity logging is handled by the API endpoints
      
      setIsModalOpen(false)
      await loadData()
    } catch (error: any) {
      console.error('Save deal error:', error)
      alert("Error saving deal: " + error.message)
    }
  }

  const handleDeleteDeal = async (dealId: string) => {
    // Find the deal to get its title for logging
    const dealToDelete = allDeals.find(d => d.id === dealId)
    const dealTitle = dealToDelete?.title || 'Unknown Deal'
    
    if (window.confirm("Are you sure you want to delete this deal?")) {
      try {
        const response = await fetch(`/api/deals?id=${dealId}`, {
          method: 'DELETE'
        })
        
        const data = await response.json()
        if (!response.ok || !data.success) {
          throw new Error(data.error || 'Failed to delete deal')
        }
        
        // Activity logging is handled by the API endpoint
        
        loadData()
      } catch (error: any) {
        alert("Error deleting deal: " + error.message)
      }
    }
  }

  // Drag and Drop handlers
  const [draggedDeal, setDraggedDeal] = useState<any>(null)
  const [dragOverStage, setDragOverStage] = useState<string | null>(null)

  const handleDragStart = (e: React.DragEvent, deal: any) => {
    setDraggedDeal(deal)
    e.dataTransfer.effectAllowed = 'move'
    // Prevent click event from firing when dragging
    e.stopPropagation()
  }

  const handleDragOver = (e: React.DragEvent, stageId: string) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    setDragOverStage(stageId)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOverStage(null)
  }

  const handleDrop = async (e: React.DragEvent, targetStageId: string) => {
    e.preventDefault()
    setDragOverStage(null)
    
    if (!draggedDeal || draggedDeal.stage === targetStageId) {
      setDraggedDeal(null)
      return
    }

    // Check if moving to won or lost - show appropriate dialog
    if (targetStageId === 'won') {
      setDealBeingClosed(draggedDeal)
      setClosureData({
        closedDate: new Date().toISOString().split('T')[0],
        lossReason: ''
      })
      setShowWonDialog(true)
      setDraggedDeal(null)
      return
    }
    
    if (targetStageId === 'lost') {
      setDealBeingClosed(draggedDeal)
      setClosureData({
        closedDate: new Date().toISOString().split('T')[0],
        lossReason: ''
      })
      setShowLostDialog(true)
      setDraggedDeal(null)
      return
    }

    // For other stages, proceed normally
    await updateDealStage(draggedDeal, targetStageId)
  }

  const updateDealStage = async (deal: any, targetStageId: string, additionalData?: any) => {
    try {
      console.log('🔄 [DEALS] Updating deal stage:', { dealId: deal.id, targetStageId, additionalData })
      
      const response = await fetch('/api/deals', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: deal.id,
          stage: targetStageId,
          ...additionalData
        })
      })

      const result = await response.json()
      console.log('🔄 [DEALS] Update response:', result)

      if (!response.ok) {
        throw new Error(result.error || 'Failed to move deal')
      }

      console.log('✅ [DEALS] Deal stage updated successfully')
      await loadData() // Reload data to show updated pipeline
    } catch (error: any) {
      console.error('❌ [DEALS] Move deal error:', error)
      alert("Error moving deal: " + error.message)
    } finally {
      setDraggedDeal(null)
    }
  }

  const handleDragEnd = () => {
    setDraggedDeal(null)
    setDragOverStage(null)
  }

  const handleConfirmWon = async () => {
    if (!dealBeingClosed) return
    
    await updateDealStage(dealBeingClosed, 'won', {
      closed_date: closureData.closedDate
    })
    
    setShowWonDialog(false)
    setDealBeingClosed(null)
  }

  const handleConfirmLost = async () => {
    if (!dealBeingClosed) return
    
    await updateDealStage(dealBeingClosed, 'lost', {
      lost_date: closureData.closedDate,
      loss_reason: closureData.lossReason
    })
    
    setShowLostDialog(false)
    setDealBeingClosed(null)
  }

  if (isLoading) return <div className="flex justify-center items-center h-screen">Loading...</div>

  return (
    <div className="space-y-4 p-3 md:p-4 lg:px-8 lg:py-6 min-h-screen">
      {/* Page Title */}
      <div className="mb-4">
        <h1 className="text-2xl font-bold text-gray-900">Sales Pipeline</h1>
        <p className="text-gray-600">Sales Opportunities • Manage qualified prospects with purchase intent</p>
      </div>

      {/* Unified Control Panel Header */}
      <header className="mb-4">
        <Card>
          <CardContent className="p-3">
            {/* Top Row: Stats */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-3 pb-3 border-b">
              <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-8">
                <div className="flex items-center gap-2">
                  <div className="text-2xl font-bold">{stats.activeDeals}</div>
                  <div className="text-xs text-gray-500 uppercase">Active Deals</div>
                </div>
                <div className="flex items-center gap-4 sm:gap-6 flex-wrap">
                  <div className="flex items-center gap-2">
                    <Target className="w-4 h-4 text-green-600" />
                    <span className="text-sm font-semibold">{formatCurrency(stats.pipelineValue)}</span>
                    <span className="text-xs text-gray-500">Pipeline Value</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-purple-600" />
                    <span className="text-sm font-semibold">{formatCurrency(stats.avgDealSize)}</span>
                    <span className="text-xs text-gray-500">Avg Deal Size</span>
                  </div>
                </div>
              </div>
              <Button onClick={() => handleOpenModal(null)} size="sm" className="h-8 w-full sm:w-auto">
                <Plus className="w-3 h-3 mr-1" />
                Add Deal
              </Button>
            </div>

            {/* Bottom Row: Search & Filters */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div className="flex flex-col sm:flex-row sm:items-center gap-2 flex-1 w-full">
                <div className="relative w-full sm:flex-1 sm:max-w-xs">
                  <Search className="absolute left-2 top-2 h-3 w-3 text-muted-foreground" />
                  <Input
                    placeholder="Search deals..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-7 h-8 text-sm w-full"
                  />
                </div>
                <div className="flex gap-2 w-full sm:w-auto flex-wrap">
                <Select value={selectedChannel} onValueChange={setSelectedChannel}>
                  <SelectTrigger className="flex-1 sm:flex-none sm:w-[140px] h-8 text-sm">
                    <SelectValue placeholder="Channel" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Channels</SelectItem>
                    {uniqueChannels.map(channel => (
                      <SelectItem key={channel} value={channel}>{channel}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <DateRangePicker date={dateRange} onDateChange={setDateRange} />
                </div>
                <div className="flex gap-2 w-full sm:w-auto">
                <Select value={sortBy} onValueChange={setSortBy}>
                  <SelectTrigger className="flex-1 sm:flex-none sm:w-[160px] h-8 text-sm">
                    <SelectValue placeholder="Sort by" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="created_at">Created Date</SelectItem>
                    <SelectItem value="updated_at">Last Activity</SelectItem>
                    <SelectItem value="value">Deal Value</SelectItem>
                    <SelectItem value="expected_close_date">Expected Close</SelectItem>
                    <SelectItem value="title">Title</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={sortOrder} onValueChange={(value) => setSortOrder(value as 'asc' | 'desc')}>
                  <SelectTrigger className="flex-1 sm:flex-none sm:w-[140px] h-8 text-sm">
                    <SelectValue placeholder="Order" />
                  </SelectTrigger>
                  <SelectContent>
                    {sortBy === 'title' ? (
                      <>
                        <SelectItem value="asc">A to Z</SelectItem>
                        <SelectItem value="desc">Z to A</SelectItem>
                      </>
                    ) : sortBy === 'value' ? (
                      <>
                        <SelectItem value="desc">Highest First</SelectItem>
                        <SelectItem value="asc">Lowest First</SelectItem>
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
              </div>
              {dateRange?.from && (
                <Button variant="outline" onClick={() => setDateRange(undefined)} size="sm" className="h-8 text-xs">
                  Clear
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </header>

      {/* Pipeline Stages */}
      <Card>
        <CardContent className="p-6">
          <div className="flex justify-between items-center mb-4">
            <div>
              <h2 className="text-lg font-semibold text-gray-900 font-sans">Pipeline Stages</h2>
              {(dateRange?.from || selectedChannel !== 'all') && (
                <p className="text-sm text-gray-600 mt-1">
                  Showing {filteredDeals.length} of {allDeals.length} deals
                  {dateRange?.from && ` • Date: ${format(dateRange.from, 'MMM dd')}${dateRange.to ? ` - ${format(dateRange.to, 'MMM dd')}` : ''}`}
                  {selectedChannel !== 'all' && ` • Channel: ${selectedChannel}`}
                </p>
              )}
            </div>
            <Select value={selectedStageView} onValueChange={setSelectedStageView}>
              <SelectTrigger className="w-[180px] bg-white border-gray-200">
                <SelectValue placeholder="All Stages" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Stages</SelectItem>
                <SelectItem value="active">Active Stages</SelectItem>
                <SelectItem value="closed">Closed Stages</SelectItem>
                {DEAL_STAGES.map(stage => (
                  <SelectItem key={stage.id} value={stage.id}>{stage.title}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
          {DEAL_STAGES.filter(stage => {
            if (selectedStageView === 'all') return true
            if (selectedStageView === 'active') return !['won', 'lost'].includes(stage.id)
            if (selectedStageView === 'closed') return ['won', 'lost'].includes(stage.id)
            return stage.id === selectedStageView
          }).map(stage => {
            const stageDeals = dealsByStage[stage.id] || []
            const stageValue = stageDeals.reduce((sum, deal) => sum + (deal.value || 0), 0)

            return (
              <div 
                key={stage.id} 
                className={`bg-white rounded-lg border border-gray-200 shadow-sm h-[600px] min-w-[240px] flex-shrink-0 overflow-hidden flex flex-col ${
                  dragOverStage === stage.id ? 'border-blue-300 bg-blue-50' : ''
                }`}
                onDragOver={(e) => handleDragOver(e, stage.id)}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(e, stage.id)}
              >
                <div className={`${stage.headerColor} p-3 border-b border-gray-200`}>
                  <div className="flex justify-between items-center mb-1">
                    <h3 className={`font-semibold text-xs uppercase ${stage.textColor}`}>{stage.title}</h3>
                    <span className={`text-xs font-medium ${stage.textColor}`}>{stageDeals.length}</span>
                  </div>
                  <div className={`text-base font-bold ${stage.valueColor}`}>{formatCurrency(stageValue)}</div>
                </div>
                
                <div className={`p-2 bg-white flex-1 overflow-y-auto ${dragOverStage === stage.id ? 'bg-blue-25' : ''}`}>

                  <div className="space-y-2">
                    {stageDeals.length === 0 ? (
                      <div className="text-center text-gray-400 text-sm py-8">
                        No deals in this stage
                      </div>
                    ) : (
                      stageDeals.map(deal => (
                        <Card 
                          key={deal.id} 
                          className={`bg-white shadow-sm hover:shadow-md cursor-move transition-all mb-2 ${
                            draggedDeal?.id === deal.id ? 'opacity-50' : ''
                          } ${
                            isDealStale(deal) 
                              ? 'border-2 border-red-400 bg-red-50/30 is-stale' 
                              : 'border border-gray-200'
                          }`}
                          draggable={true}
                          onDragStart={(e) => handleDragStart(e, deal)}
                          onDragEnd={handleDragEnd}
                          onClick={(e) => {
                            // Only open modal if not dragging
                            if (!draggedDeal) {
                              handleOpenModal(deal)
                            }
                          }}
                        >
                          <CardContent className="p-3">
                            {isDealStale(deal) && (
                              <div className="flex items-center gap-1 mb-2 text-xs text-red-600 font-medium">
                                <AlertTriangle className="w-3 h-3" />
                                <span>Stale: {getDaysSinceUpdate(deal)} days since update</span>
                              </div>
                            )}
                            <div className="flex justify-between items-start mb-2">
                              <h4 
                                className="font-medium text-sm text-gray-900 leading-tight pr-2 hover:text-blue-600 hover:underline cursor-pointer"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  router.push(`/dashboard/deals/${deal.id}`)
                                }}
                              >
                                {deal.title}
                              </h4>
                              <div className="flex gap-1 flex-shrink-0">
                                <Button size="sm" variant="ghost" className="h-5 w-5 p-0 hover:bg-gray-100" onClick={(e) => {
                                  e.stopPropagation()
                                  handleOpenModal(deal)
                                }}>
                                  <Edit className="w-3 h-3 text-gray-400" />
                                </Button>
                                <Button size="sm" variant="ghost" className="h-5 w-5 p-0 hover:bg-red-50" onClick={(e) => {
                                  e.stopPropagation()
                                  handleDeleteDeal(deal.id)
                                }}>
                                  <Trash2 className="w-3 h-3 text-red-400" />
                                </Button>
                              </div>
                            </div>
                            
                            <div className="space-y-2">
                              <div className="flex items-center gap-2 text-xs text-gray-600">
                                <Building className="w-3 h-3" />
                                <span className="truncate">{companies.find(c => c.id === deal.company_id)?.name || 'Deemmi'}</span>
                              </div>
                              
                              <div className="text-lg font-bold text-blue-600">{formatCurrency(deal.value || 0)}</div>
                              
                              <div className="space-y-1 text-xs text-gray-500">
                                <div className="flex items-center gap-2">
                                  <Calendar className="w-3 h-3" />
                                  <span>Created: {formatDate(deal.created_at)}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <Calendar className="w-3 h-3" />
                                  <span>Expected: {formatDate(deal.close_date || deal.expected_close_date) || 'N/A'}</span>
                                </div>
                                {deal.stage === 'won' && deal.closed_date && (
                                  <div className="flex items-center gap-2">
                                    <Calendar className="w-3 h-3 text-green-600" />
                                    <span className="text-green-600 font-medium">Closed: {formatDate(deal.closed_date)}</span>
                                  </div>
                                )}
                                {deal.stage === 'lost' && deal.lost_date && (
                                  <div className="flex items-center gap-2">
                                    <Calendar className="w-3 h-3 text-red-600" />
                                    <span className="text-red-600 font-medium">Rejected: {formatDate(deal.lost_date)}</span>
                                  </div>
                                )}
                                {deal.stage === 'lost' && deal.loss_reason && (
                                  <div className="mt-2 p-2 bg-red-50 rounded border-l-2 border-red-200">
                                    <div className="text-xs text-red-700 font-medium mb-1">Lost Reason:</div>
                                    <div className="text-xs text-red-600">{deal.loss_reason}</div>
                                  </div>
                                )}
                                <div className="flex items-center gap-2">
                                  <User className="w-3 h-3" />
                                  <span className="truncate">Assigned: {teamMembers.find(m => m.id === deal.assigned_to)?.first_name || 'Janjarat'}</span>
                                </div>
                                {deal.channel && (
                                  <div className="flex items-center gap-2">
                                    {getChannelIcon(deal.channel)}
                                    <span className="truncate">Channel: {(() => {
                                      if (!deal.channel) return ''
                                      if (deal.channel === 'deemmi-lead-form') return 'Deemmi Lead Form'
                                      return deal.channel.toLowerCase().split(' ').map((word: string) => 
                                        word.charAt(0).toUpperCase() + word.slice(1)
                                      ).join(' ')
                                    })()}</span>
                                  </div>
                                )}
                                {deal.priority && (
                                  <div className="mt-2">
                                    <span className={getPriorityColor(deal.priority)}>
                                      {deal.priority}
                                    </span>
                                  </div>
                                )}
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))
                    )}
                  </div>
                </div>
              </div>
            )
          })}
          </div>
        </CardContent>
      </Card>

      {/* Deal Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-2xl bg-white">
          <DialogHeader className="pb-4">
            <DialogTitle className="text-xl font-semibold text-gray-800">{editingDeal ? 'Edit Deal' : 'Add New Deal'}</DialogTitle>
            <DialogDescription className="text-gray-600 mt-2">Fill in the deal details</DialogDescription>
          </DialogHeader>
          <div className="space-y-6 py-4">
            <div className="space-y-2">
              <Label className="text-sm font-medium text-gray-700">Deal Title *</Label>
              <Input 
                value={newDeal.title} 
                onChange={(e) => setNewDeal({...newDeal, title: e.target.value})} 
                className="mt-1 border-gray-200 focus:border-blue-300 focus:ring-blue-100"
              />
            </div>
            
            <div className="space-y-2">
              <Label className="text-sm font-medium text-gray-700">Description</Label>
              <Textarea 
                value={newDeal.description} 
                onChange={(e) => setNewDeal({...newDeal, description: e.target.value})} 
                className="mt-1 min-h-[100px] border-gray-200 focus:border-blue-300 focus:ring-blue-100"
                rows={4}
              />
            </div>

            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label className="text-sm font-medium text-gray-700">Deal Value (THB)</Label>
                <Input 
                  type="number" 
                  value={newDeal.value} 
                  onChange={(e) => setNewDeal({...newDeal, value: e.target.value})} 
                  className="mt-1 border-gray-200 focus:border-blue-300 focus:ring-blue-100"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-medium text-gray-700">Stage</Label>
                <Select value={newDeal.stage} onValueChange={(v) => setNewDeal({...newDeal, stage: v})}>
                  <SelectTrigger className="mt-1 border-gray-200">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {DEAL_STAGES.map(stage => (
                      <SelectItem key={stage.id} value={stage.id}>{stage.title}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label className="text-sm font-medium text-gray-700">Priority</Label>
                <Select value={newDeal.priority} onValueChange={(v) => setNewDeal({...newDeal, priority: v})}>
                  <SelectTrigger className="mt-1 border-gray-200">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-medium text-gray-700">Expected Close Date</Label>
                <Input 
                  type="date" 
                  value={newDeal.expected_close_date} 
                  onChange={(e) => setNewDeal({...newDeal, expected_close_date: e.target.value})} 
                  className="mt-1 border-gray-200 focus:border-blue-300 focus:ring-blue-100"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label className="text-sm font-medium text-gray-700">Company</Label>
                <Select value={newDeal.company_id || 'none'} onValueChange={(v) => setNewDeal({...newDeal, company_id: v === 'none' ? null : v, contact_id: null})}>
                  <SelectTrigger className="mt-1 border-gray-200">
                    <SelectValue placeholder="Select company..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">
                      {editingDeal && editingDeal.title && editingDeal.company_id === null ? 
                        `No Company (Current: ${editingDeal.title.split(' - ')[0] || 'Unknown'})` : 
                        'No Company'
                      }
                    </SelectItem>
                    {companies.map(c => (
                      <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-medium text-gray-700">Contact</Label>
                <Select value={newDeal.contact_id || 'none'} onValueChange={(v) => setNewDeal({...newDeal, contact_id: v === 'none' ? null : v})}>
                  <SelectTrigger className="mt-1 border-gray-200">
                    <SelectValue placeholder="Select contact..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No Contact</SelectItem>
                    {filteredContacts.length > 0 ? (
                      filteredContacts.map(c => (
                        <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                      ))
                    ) : (
                      newDeal.company_id && newDeal.company_id !== 'none' && (
                        <SelectItem value="no-contacts" disabled>No contacts for this company</SelectItem>
                      )
                    )}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label className="text-sm font-medium text-gray-700">Channel</Label>
                <Select value={newDeal.channel || 'none'} onValueChange={(v) => setNewDeal({...newDeal, channel: v === 'none' ? '' : v})}>
                  <SelectTrigger className="mt-1 border-gray-200">
                    <SelectValue placeholder="Select channel..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No Channel</SelectItem>
                    {uniqueChannels.map(channel => (
                      <SelectItem key={channel} value={channel}>{channel}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-medium text-gray-700">Assign To</Label>
                <Select value={newDeal.assigned_to || 'unassigned'} onValueChange={(v) => setNewDeal({...newDeal, assigned_to: v === 'unassigned' ? '' : v})}>
                  <SelectTrigger className="mt-1 border-gray-200">
                    <SelectValue placeholder="Assign to..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="unassigned">Not Assigned</SelectItem>
                    {teamMembers.map(m => (
                      <SelectItem key={m.id} value={m.id}>{m.first_name} {m.last_name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Loss tracking fields - only show when stage is "lost" */}
            {newDeal.stage === 'lost' && (
              <div className="space-y-4 p-4 bg-red-50 rounded-md border border-red-200">
                <h4 className="text-sm font-medium text-red-700">Loss Tracking Information</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-red-700">Date Lost</Label>
                    <Input
                      type="date"
                      value={newDeal.lost_date || new Date().toISOString().split('T')[0]}
                      onChange={(e) => setNewDeal({...newDeal, lost_date: e.target.value})}
                      className="mt-1 border-red-200 focus:border-red-300 focus:ring-red-100"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-red-700">Loss Reason *</Label>
                    <Input
                      placeholder="e.g., Price too high, chose competitor..."
                      value={newDeal.loss_reason || ''}
                      onChange={(e) => setNewDeal({...newDeal, loss_reason: e.target.value})}
                      className="mt-1 border-red-200 focus:border-red-300 focus:ring-red-100"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Won tracking fields - only show when stage is "won" */}
            {newDeal.stage === 'won' && (
              <div className="space-y-4 p-4 bg-green-50 rounded-md border border-green-200">
                <h4 className="text-sm font-medium text-green-700">Won Deal Information</h4>
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-green-700">Actual Close Date</Label>
                  <Input
                    type="date"
                    value={newDeal.closed_date || new Date().toISOString().split('T')[0]}
                    onChange={(e) => setNewDeal({...newDeal, closed_date: e.target.value})}
                    className="mt-1 border-green-200 focus:border-green-300 focus:ring-green-100"
                  />
                </div>
              </div>
            )}
          </div>
          <div className="flex justify-end gap-3 pt-6 border-t border-gray-200">
            <Button variant="outline" onClick={() => setIsModalOpen(false)} className="border-gray-200 text-gray-700 hover:bg-gray-50">Cancel</Button>
            <Button onClick={handleSaveDeal} className="bg-blue-100 hover:bg-blue-200 text-blue-700 border border-blue-200">{editingDeal ? 'Save Changes' : 'Create Deal'}</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Deal Won Dialog */}
      <Dialog open={showWonDialog} onOpenChange={setShowWonDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-2 text-green-700">
              <Target className="h-5 w-5 text-green-600" />
              <span>Deal Won! 🎉</span>
            </DialogTitle>
            <DialogDescription>
              Congratulations! Please confirm the actual close date for this deal.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div>
              <Label className="text-sm font-medium text-gray-700">Deal</Label>
              <p className="text-sm text-gray-600 mt-1">{dealBeingClosed?.title}</p>
              <p className="text-lg font-semibold text-green-600">{formatCurrency(dealBeingClosed?.value || 0)}</p>
            </div>
            <div>
              <Label className="text-sm font-medium text-gray-700">Actual Close Date</Label>
              <Input
                type="date"
                value={closureData.closedDate}
                onChange={(e) => setClosureData({...closureData, closedDate: e.target.value})}
                className="mt-1"
              />
            </div>
            <div className="flex justify-end gap-3 pt-4">
              <Button variant="outline" onClick={() => setShowWonDialog(false)}>
                Cancel
              </Button>
              <Button onClick={handleConfirmWon} className="bg-green-600 hover:bg-green-700 text-white">
                Confirm Win
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Deal Lost Dialog */}
      <Dialog open={showLostDialog} onOpenChange={setShowLostDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-2 text-red-700">
              <TrendingUp className="h-5 w-5 text-red-600 transform rotate-180" />
              <span>Deal Lost</span>
            </DialogTitle>
            <DialogDescription>
              Please provide details about why this deal was lost for future insights.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div>
              <Label className="text-sm font-medium text-gray-700">Deal</Label>
              <p className="text-sm text-gray-600 mt-1">{dealBeingClosed?.title}</p>
              <p className="text-lg font-semibold text-red-600">{formatCurrency(dealBeingClosed?.value || 0)}</p>
            </div>
            <div>
              <Label className="text-sm font-medium text-gray-700">Date Lost</Label>
              <Input
                type="date"
                value={closureData.closedDate}
                onChange={(e) => setClosureData({...closureData, closedDate: e.target.value})}
                className="mt-1"
              />
            </div>
            <div>
              <Label className="text-sm font-medium text-gray-700">Reason for Loss</Label>
              <Textarea
                placeholder="e.g., Price too high, chose competitor, timeline didn't match..."
                value={closureData.lossReason}
                onChange={(e) => setClosureData({...closureData, lossReason: e.target.value})}
                className="mt-1"
                rows={3}
              />
            </div>
            <div className="flex justify-end gap-3 pt-4">
              <Button variant="outline" onClick={() => setShowLostDialog(false)}>
                Cancel
              </Button>
              <Button 
                onClick={handleConfirmLost} 
                className="bg-red-600 hover:bg-red-700 text-white"
                disabled={!closureData.lossReason.trim()}
              >
                Confirm Loss
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}