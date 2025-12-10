'use client'

import React, { useState, useEffect, Suspense } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useSearchParams } from 'next/navigation'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Plus, Edit, Trash2, Calendar, User, Building, Target, TrendingUp, BarChart3, Globe, Search, Phone, Linkedin, Users, Mail, Share2, Monitor, Handshake } from 'lucide-react'
import { DateRangePicker } from '@/components/ui/date-range-picker'
import { DateRange } from 'react-day-picker'
import { format } from 'date-fns'

// Deal stages configuration with pastel colored headers
const DEAL_STAGES = [
  { id: 'lead', title: 'LEAD', color: 'bg-white', headerColor: 'bg-gray-50', textColor: 'text-gray-700' },
  { id: 'qualified', title: 'QUALIFIED', color: 'bg-white', headerColor: 'bg-yellow-50', textColor: 'text-yellow-700' },
  { id: 'proposal', title: 'PROPOSAL & FOLLOW-UP', color: 'bg-white', headerColor: 'bg-blue-50', textColor: 'text-blue-700' },
  { id: 'won', title: 'CLOSED WON', color: 'bg-white', headerColor: 'bg-green-50', textColor: 'text-green-700' },
  { id: 'lost', title: 'CLOSED LOST', color: 'bg-white', headerColor: 'bg-red-50', textColor: 'text-red-700' }
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
  const statusParam = searchParams.get('status')
  
  const [allDeals, setAllDeals] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingDeal, setEditingDeal] = useState<any>(null)
  const [newDeal, setNewDeal] = useState({
    title: '',
    description: '',
    value: '',
    stage: 'lead',
    expected_close_date: '',
    company_id: null as string | null,
    contact_id: null as string | null,
    channel: '',
    assigned_to: '',
    priority: 'medium'
  })
  const [companies, setCompanies] = useState<any[]>([])
  const [contacts, setContacts] = useState<any[]>([])
  const [teamMembers, setTeamMembers] = useState<any[]>([])
  const [userProfile, setUserProfile] = useState<any>(null)
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined)
  const [selectedChannel, setSelectedChannel] = useState('all')
  const [selectedStageView, setSelectedStageView] = useState('all')

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
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        setIsLoading(false)
        return
      }

      // Load user profile
      const profileRes = await supabase.from('profiles').select('*').eq('id', user.id).single()
      if (profileRes.error) throw profileRes.error
      setUserProfile(profileRes.data)

      // Load deals
      const dealsRes = await supabase
        .from('deals')
        .select('*')
        .order('created_at', { ascending: false })

      if (dealsRes.error) throw dealsRes.error
      setAllDeals(dealsRes.data || [])

      // Load reference data
      const [companiesRes, contactsRes, teamRes] = await Promise.all([
        supabase.from('companies').select('id, name'),
        supabase.from('contacts').select('id, name'),
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

  // Get unique channels from deals + predefined channels
  const uniqueChannels = React.useMemo(() => {
    const dealsChannels = new Set(allDeals.map(deal => deal.channel).filter(Boolean))
    const predefinedChannels = ['Organic Search', 'Cold Call', 'LinkedIn', 'Referral', 'Email Marketing', 'Social Media', 'Website', 'Partner']
    const allChannelsSet = new Set([...Array.from(dealsChannels), ...predefinedChannels])
    return Array.from(allChannelsSet).sort()
  }, [allDeals])

  // Filter deals by channel
  const filteredDeals = React.useMemo(() => {
    if (selectedChannel === 'all') return allDeals
    return allDeals.filter(deal => deal.channel === selectedChannel)
  }, [allDeals, selectedChannel])

  // Calculate pipeline stats
  const stats = React.useMemo(() => {
    const activeDeals = filteredDeals.filter(d => d.stage !== 'lost' && d.stage !== 'won')
    const pipelineValue = activeDeals.reduce((sum, deal) => sum + (Number(deal.value) || 0), 0)
    const totalValue = filteredDeals.reduce((sum, deal) => sum + (Number(deal.value) || 0), 0)
    const avgDealSize = filteredDeals.length > 0 ? totalValue / filteredDeals.length : 0

    return {
      activeDeals: activeDeals.length,
      pipelineValue: pipelineValue,
      avgDealSize: avgDealSize
    }
  }, [filteredDeals])

  // Group deals by stage
  const dealsByStage = React.useMemo(() => {
    const grouped: { [key: string]: any[] } = {}
    DEAL_STAGES.forEach(stage => {
      grouped[stage.id] = filteredDeals.filter(deal => deal.stage === stage.id)
    })
    return grouped
  }, [filteredDeals])

  // Updated priority color function with pastel theme
  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-red-100 text-red-700 px-2 py-1 rounded-full'
      case 'medium': return 'bg-yellow-100 text-yellow-700 px-2 py-1 rounded-full'
      case 'low': return 'bg-green-100 text-green-700 px-2 py-1 rounded-full'
      default: return 'bg-gray-100 text-gray-700 px-2 py-1 rounded-full'
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
      setEditingDeal(deal)
      setNewDeal({
        title: deal.title || '',
        description: deal.description || '',
        value: deal.value?.toString() || '',
        stage: deal.stage || 'lead',
        expected_close_date: deal.expected_close_date || '',
        company_id: deal.company_id,
        contact_id: deal.contact_id,
        channel: deal.channel || '',
        assigned_to: deal.assigned_to || '',
        priority: deal.priority || 'medium'
      })
    } else {
      setEditingDeal(null)
      setNewDeal({
        title: '',
        description: '',
        value: '',
        stage: 'lead',
        expected_close_date: '',
        company_id: null,
        contact_id: null,
        channel: '',
        assigned_to: userProfile?.id || '',
        priority: 'medium'
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
        expected_close_date: newDeal.expected_close_date || null,
        company_id: newDeal.company_id || null,
        contact_id: newDeal.contact_id || null,
        channel: newDeal.channel || '',
        assigned_to: newDeal.assigned_to || null,
        priority: newDeal.priority || 'medium'
      }

      console.log('Saving deal:', dealData)

      const response = editingDeal
        ? await fetch('/api/deals', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: editingDeal.id, ...dealData })
          })
        : await fetch('/api/deals', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(dealData)
          })

      const result = await response.json()
      console.log('API Response:', result)
      
      if (!response.ok) {
        throw new Error(result.error || result.details || 'Failed to save deal')
      }

      setIsModalOpen(false)
      await loadData()
    } catch (error: any) {
      console.error('Save deal error:', error)
      alert("Error saving deal: " + error.message)
    }
  }

  const handleDeleteDeal = async (dealId: string) => {
    if (window.confirm("Are you sure you want to delete this deal?")) {
      try {
        const response = await fetch(`/api/deals?id=${dealId}`, {
          method: 'DELETE'
        })
        
        if (!response.ok) {
          const error = await response.json()
          throw new Error(error.error || 'Failed to delete deal')
        }
        
        loadData()
      } catch (error: any) {
        alert("Error deleting deal: " + error.message)
      }
    }
  }

  if (isLoading) return <div className="flex justify-center items-center h-screen">Loading...</div>

  return (
    <div className="space-y-6 p-4 md:p-6 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">My Deals Pipeline</h1>
          <p className="text-gray-600">Manage and track your sales opportunities</p>
        </div>
        <div className="flex flex-col sm:flex-row items-end sm:items-center gap-2">
          <div className="flex items-center space-x-2">
            <Globe className="h-5 w-5 text-gray-500" />
            <Select value={selectedChannel} onValueChange={setSelectedChannel}>
              <SelectTrigger className="w-[180px] bg-white border-gray-200">
                <SelectValue placeholder="All Channels" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Channels</SelectItem>
                {uniqueChannels.map(channel => (
                  <SelectItem key={channel} value={channel}>{channel}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DateRangePicker date={dateRange} onDateChange={setDateRange} />
          <Button onClick={() => handleOpenModal(null)} className="bg-blue-100 hover:bg-blue-200 text-blue-700 border border-blue-200">
            <Plus className="w-4 h-4 mr-2" /> Add Deal
          </Button>
        </div>
      </div>

      {/* Stats Cards - Pastel theme with very light backgrounds */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="bg-blue-50 border-blue-100 shadow-sm">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-blue-700">Active Deals</p>
                <p className="text-xs text-blue-600">Currently in pipeline</p>
              </div>
              <BarChart3 className="w-6 h-6 text-blue-600" />
            </div>
            <div className="text-2xl font-bold text-blue-700 mt-3">{stats.activeDeals}</div>
          </CardContent>
        </Card>

        <Card className="bg-green-50 border-green-100 shadow-sm">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-green-700">Pipeline Value</p>
                <p className="text-xs text-green-600">Total potential value</p>
              </div>
              <Target className="w-6 h-6 text-green-600" />
            </div>
            <div className="text-2xl font-bold text-green-700 mt-3">{formatCurrency(stats.pipelineValue)}</div>
          </CardContent>
        </Card>

        <Card className="bg-purple-50 border-purple-100 shadow-sm">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-purple-700">Avg Deal Size</p>
                <p className="text-xs text-purple-600">Average value per deal</p>
              </div>
              <TrendingUp className="w-6 h-6 text-purple-600" />
            </div>
            <div className="text-2xl font-bold text-purple-700 mt-3">{formatCurrency(stats.avgDealSize)}</div>
          </CardContent>
        </Card>
      </div>

      {/* Pipeline Stages */}
      <div>
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold text-gray-800">Pipeline Stages</h2>
          <Select value={selectedStageView} onValueChange={setSelectedStageView}>
            <SelectTrigger className="w-[180px] bg-white border-gray-200">
              <SelectValue placeholder="View: All Stages" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">View: All Stages</SelectItem>
              <SelectItem value="active">View: Active Stages</SelectItem>
              <SelectItem value="closed">View: Closed Stages</SelectItem>
              {DEAL_STAGES.map(stage => (
                <SelectItem key={stage.id} value={stage.id}>View: {stage.title}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
          {DEAL_STAGES.filter(stage => {
            if (selectedStageView === 'all') return true
            if (selectedStageView === 'active') return !['won', 'lost'].includes(stage.id)
            if (selectedStageView === 'closed') return ['won', 'lost'].includes(stage.id)
            return stage.id === selectedStageView
          }).map(stage => {
            const stageDeals = dealsByStage[stage.id] || []
            const stageValue = stageDeals.reduce((sum, deal) => sum + (deal.value || 0), 0)

            return (
              <div key={stage.id} className={`${stage.color} rounded-lg border border-gray-200 shadow-sm min-h-[500px] min-w-[260px] flex-shrink-0 overflow-hidden`}>
                <div className={`${stage.headerColor} p-3 border-b border-gray-200`}>
                  <div className="flex justify-between items-center">
                    <h3 className={`font-semibold text-xs uppercase ${stage.textColor}`}>{stage.title}</h3>
                    <div className="bg-gray-100 text-gray-700 text-xs rounded-full w-5 h-5 flex items-center justify-center font-bold">
                      {stageDeals.length}
                    </div>
                  </div>
                  <div className={`text-lg font-bold mt-2 ${stage.textColor}`}>{formatCurrency(stageValue)}</div>
                </div>
                
                <div className="p-3">
                  <div className="space-y-3">
                    {stageDeals.length === 0 ? (
                      <div className="text-center text-gray-400 text-sm py-12">
                        No deals in this stage
                      </div>
                    ) : (
                      stageDeals.map(deal => (
                        <Card key={deal.id} className="bg-white border border-gray-200 shadow-sm hover:shadow-md cursor-pointer transition-all" 
                              onClick={() => handleOpenModal(deal)}>
                          <CardContent className="p-3">
                            <div className="flex justify-between items-start mb-2">
                              <h4 className="font-medium text-sm text-gray-800 leading-tight pr-1 line-clamp-2">{deal.title}</h4>
                              <div className="flex gap-1 flex-shrink-0">
                                <Button size="sm" variant="ghost" className="h-5 w-5 p-0 hover:bg-gray-100" onClick={(e) => {
                                  e.stopPropagation()
                                  handleOpenModal(deal)
                                }}>
                                  <Edit className="w-3 h-3 text-gray-500" />
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
                              <div className="flex items-center gap-1 text-xs text-gray-600">
                                <Building className="w-3 h-3" />
                                <span className="truncate">{companies.find(c => c.id === deal.company_id)?.name || 'Unknown Company'}</span>
                              </div>
                              
                              <div className="text-lg font-bold text-blue-700">{formatCurrency(deal.value || 0)}</div>
                              
                              <div className="space-y-1 text-xs text-gray-500">
                                <div className="flex items-center gap-1">
                                  <Calendar className="w-3 h-3" />
                                  <span>Created: {formatDate(deal.created_at)}</span>
                                </div>
                                <div className="flex items-center gap-1">
                                  <Calendar className="w-3 h-3" />
                                  <span>Expected: {formatDate(deal.expected_close_date)}</span>
                                </div>
                                <div className="flex items-center gap-1">
                                  <User className="w-3 h-3" />
                                  <span className="truncate">Assigned: {teamMembers.find(m => m.id === deal.assigned_to)?.first_name || 'Janjarat'}</span>
                                </div>
                                {deal.channel && (
                                  <div className="flex items-center gap-1">
                                    {getChannelIcon(deal.channel)}
                                    <span className="truncate">Channel: {deal.channel}</span>
                                  </div>
                                )}
                                {deal.priority && (
                                  <div className="mt-2">
                                    <span className={`text-xs font-medium ${getPriorityColor(deal.priority)}`}>
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
      </div>

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
                <Select value={newDeal.company_id || 'none'} onValueChange={(v) => setNewDeal({...newDeal, company_id: v === 'none' ? null : v})}>
                  <SelectTrigger className="mt-1 border-gray-200">
                    <SelectValue placeholder="Select company..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No Company</SelectItem>
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
                    {contacts.map(c => (
                      <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                    ))}
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
                <Select value={newDeal.assigned_to || 'none'} onValueChange={(v) => setNewDeal({...newDeal, assigned_to: v === 'none' ? '' : v})}>
                  <SelectTrigger className="mt-1 border-gray-200">
                    <SelectValue placeholder="Assign to..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Assign to Me</SelectItem>
                    {teamMembers.map(m => (
                      <SelectItem key={m.id} value={m.id}>{m.first_name} {m.last_name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-6 border-t border-gray-200">
            <Button variant="outline" onClick={() => setIsModalOpen(false)} className="border-gray-200 text-gray-700 hover:bg-gray-50">Cancel</Button>
            <Button onClick={handleSaveDeal} className="bg-blue-100 hover:bg-blue-200 text-blue-700 border border-blue-200">{editingDeal ? 'Save Changes' : 'Create Deal'}</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}