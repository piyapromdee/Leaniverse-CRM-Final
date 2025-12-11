'use client'

import React, { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Plus, Download, Eye, Share2, BarChart3, Calendar, Link2, Copy, ExternalLink, Edit2, Trash2, FileText, FormInput, Brain, Calculator, ClipboardList, CheckSquare, Presentation, HelpCircle, BookOpen, CopyPlus, Search } from 'lucide-react'
import { format } from 'date-fns'
import FormBuilder, { FormField } from '@/components/lead-magnet/FormBuilder'

interface LeadMagnet {
  id: string
  title: string
  description: string
  type: 'ebook' | 'whitepaper' | 'template' | 'webinar' | 'guide' | 'checklist' | 'lead_form' | 'quiz' | 'survey' | 'calculator' | 'assessment' | 'course'
  file_url?: string
  landing_page_url?: string
  downloads: number
  leads_generated: number
  created_at: string
  is_active: boolean
  form_fields?: FormField[] // For lead forms
  campaign_id?: string // For automatic campaign enrollment
}

const MAGNET_TYPES = [
  { value: 'lead_form', label: 'Lead Form', icon: '📝', description: 'Capture leads with custom forms' },
  { value: 'ebook', label: 'E-book', icon: '📖', description: 'Downloadable PDF book' },
  { value: 'whitepaper', label: 'Whitepaper', icon: '📄', description: 'Industry report or research' },
  { value: 'template', label: 'Template', icon: '📋', description: 'Ready-to-use templates' },
  { value: 'webinar', label: 'Webinar', icon: '🎥', description: 'Live or recorded webinar' },
  { value: 'guide', label: 'Guide', icon: '📚', description: 'Step-by-step guide' },
  { value: 'checklist', label: 'Checklist', icon: '✅', description: 'Action checklist' },
  { value: 'quiz', label: 'Quiz', icon: '🧩', description: 'Interactive quiz' },
  { value: 'survey', label: 'Survey', icon: '📊', description: 'Customer survey' },
  { value: 'calculator', label: 'Calculator', icon: '🧮', description: 'ROI or pricing calculator' },
  { value: 'assessment', label: 'Assessment', icon: '📈', description: 'Skills or needs assessment' },
  { value: 'course', label: 'Mini Course', icon: '🎓', description: 'Email course series' }
]

interface Campaign {
  id: string
  name: string
  status: string
}

export default function LeadMagnetPage() {
  const [magnets, setMagnets] = useState<LeadMagnet[]>([])
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [showEditDialog, setShowEditDialog] = useState(false)
  const [showPreviewDialog, setShowPreviewDialog] = useState(false)
  const [editingMagnet, setEditingMagnet] = useState<LeadMagnet | null>(null)
  const [previewMagnet, setPreviewMagnet] = useState<LeadMagnet | null>(null)
  const [loading, setLoading] = useState(true)
  const [showToast, setShowToast] = useState({ show: false, message: '' })
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [newMagnet, setNewMagnet] = useState({
    title: '',
    description: '',
    type: 'lead_form' as const,
    file_url: '',
    landing_page_url: '',
    form_fields: [] as FormField[],
    campaign_id: '',
    is_active: true
  })

  // Helper function to save magnets to localStorage
  const saveMagnetsToLocalStorage = (magnetsData: LeadMagnet[]) => {
    localStorage.setItem('leadMagnets', JSON.stringify(magnetsData))
    setMagnets(magnetsData)
  }

  // Helper function to get magnets from localStorage
  const getMagnetsFromLocalStorage = (): LeadMagnet[] => {
    const stored = localStorage.getItem('leadMagnets')
    return stored ? JSON.parse(stored) : []
  }

  const supabase = createClient()

  // Load available campaigns
  const fetchCampaigns = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: campaignsData, error } = await supabase
        .from('campaigns')
        .select('id, name, status')
        .eq('user_id', user.id)
        .order('name')

      if (error) {
        console.error('Error loading campaigns:', error)
        return
      }

      // Only show active campaigns for selection
      const activeCampaigns = campaignsData?.filter(c => c.status === 'draft' || c.status === 'sent') || []
      setCampaigns(activeCampaigns)
    } catch (error) {
      console.error('Error fetching campaigns:', error)
    }
  }

  useEffect(() => {
    fetchMagnets()
    fetchCampaigns()
  }, [])

  const refreshStats = async () => {
    console.log('🔄 Force refreshing lead magnet stats...')
    setLoading(true)
    await fetchMagnets()
    setLoading(false)
  }

  const fetchRealLeadStats = async (magnetId: string) => {
    try {
      console.log('🔍 Fetching stats for magnet:', magnetId)
      
      const { data: leads, error } = await supabase
        .from('leads')
        .select('*')
        .eq('source', magnetId)
      
      if (error) {
        console.log('Error fetching leads for stats:', error)
        return { leads_generated: 0, downloads: 0 }
      }
      
      console.log('📊 Found leads for', magnetId, ':', leads?.length || 0)
      
      return { 
        leads_generated: leads?.length || 0,
        downloads: leads?.length || 0 // Assuming each lead submission is a "download"
      }
    } catch (error) {
      console.log('Error in fetchRealLeadStats:', error)
      return { leads_generated: 0, downloads: 0 }
    }
  }

  const fetchMagnets = async () => {
    try {
      // First, check localStorage for any saved magnets
      const localMagnets = getMagnetsFromLocalStorage()
      
      const response = await fetch('/api/lead-magnets')
      if (!response.ok) {
        // If API fails, use localStorage data or mock data
        if (localMagnets.length > 0) {
          // Update with real stats for localStorage magnets
          const magnetsWithStats = await Promise.all(
            localMagnets.map(async (magnet) => {
              const stats = await fetchRealLeadStats(magnet.id)
              return { ...magnet, ...stats }
            })
          )
          setMagnets(magnetsWithStats)
        } else {
          // Use default mock data if no localStorage data with real stats
          const baseMockMagnets: LeadMagnet[] = [
            {
              id: 'deemmi-lead-form',
              title: 'Deemmi Lead Form',
              description: 'Custom lead capture form for qualified prospects interested in our CRM solution.',
              type: 'lead_form',
              landing_page_url: '',
              downloads: 0,
              leads_generated: 0,
              created_at: '2024-08-18T10:00:00Z',
              is_active: true,
              form_fields: [
                {
                  id: 'first_name',
                  type: 'text',
                  label: 'First Name',
                  placeholder: 'Enter your first name',
                  required: true,
                  order: 1
                },
                {
                  id: 'last_name',
                  type: 'text',
                  label: 'Last Name',
                  placeholder: 'Enter your last name',
                  required: true,
                  order: 2
                },
                {
                  id: 'email',
                  type: 'email',
                  label: 'Work Email',
                  placeholder: 'your.email@company.com',
                  required: true,
                  order: 3
                },
                {
                  id: 'company',
                  type: 'text',
                  label: 'Company Name',
                  placeholder: 'Your company name',
                  required: true,
                  order: 4
                },
                {
                  id: 'phone',
                  type: 'phone',
                  label: 'Phone Number',
                  placeholder: '+66 XX XXX XXXX',
                  required: false,
                  order: 5
                },
                {
                  id: 'company_size',
                  type: 'select',
                  label: 'Company Size',
                  required: true,
                  order: 6,
                  options: [
                    { label: '1-10 employees', value: '1-10' },
                    { label: '11-50 employees', value: '11-50' },
                    { label: '51-200 employees', value: '51-200' },
                    { label: '200+ employees', value: '200+' }
                  ]
                },
                {
                  id: 'website',
                  type: 'text',
                  label: 'Website',
                  placeholder: 'service',
                  required: false,
                  order: 7
                },
                {
                  id: 'interest',
                  type: 'select',
                  label: 'Primary Interest',
                  required: true,
                  order: 8,
                  options: [
                    { label: 'Sales Pipeline Management', value: 'sales_pipeline' },
                    { label: 'Lead Management', value: 'lead_management' },
                    { label: 'Customer Relationship Management', value: 'crm' },
                    { label: 'Sales Analytics & Reporting', value: 'analytics' },
                    { label: 'Marketing Automation', value: 'marketing' }
                  ]
                }
              ]
            },
            {
              id: '1',
              title: 'Ultimate Sales Funnel Guide',
              description: 'Complete guide to building high-converting sales funnels for SaaS businesses.',
              type: 'guide',
              file_url: '/downloads/sales-funnel-guide.pdf',
              landing_page_url: '',
              downloads: 156,
              leads_generated: 89,
              created_at: '2024-08-10T10:00:00Z',
              is_active: true
            },
            {
              id: '2',
              title: 'CRM Setup Checklist',
              description: '20-point checklist to set up your CRM for maximum sales efficiency.',
              type: 'checklist',
              file_url: '/downloads/crm-checklist.pdf',
              landing_page_url: 'https://example.com/external-landing',
              downloads: 234,
              leads_generated: 127,
              created_at: '2024-08-05T14:30:00Z',
              is_active: true
            },
            {
              id: '3',
              title: 'Lead Scoring Template',
              description: 'Excel template to score and prioritize your leads effectively.',
              type: 'template',
              file_url: '/downloads/lead-scoring-template.xlsx',
              landing_page_url: '',
              downloads: 89,
              leads_generated: 45,
              created_at: '2024-07-28T09:15:00Z',
              is_active: false
            }
          ]
          
          // Update mock data with real stats
          const mockMagnetsWithStats = await Promise.all(
            baseMockMagnets.map(async (magnet) => {
              const stats = await fetchRealLeadStats(magnet.id)
              return { ...magnet, ...stats }
            })
          )
          
          setMagnets(mockMagnetsWithStats)
          saveMagnetsToLocalStorage(mockMagnetsWithStats)
        }
      } else {
        const data = await response.json()
        // API already returns real stats, so just use the data directly
        console.log('📊 Lead magnets from API:', data)
        setMagnets(data)
        saveMagnetsToLocalStorage(data)
      }
    } catch (error) {
      console.error('Error fetching lead magnets:', error)
      // Use localStorage data if available
      const localMagnets = getMagnetsFromLocalStorage()
      if (localMagnets.length > 0) {
        const magnetsWithStats = await Promise.all(
          localMagnets.map(async (magnet) => {
            const stats = await fetchRealLeadStats(magnet.id)
            return { ...magnet, ...stats }
          })
        )
        setMagnets(magnetsWithStats)
      } else {
        // Fallback to mock data with real stats
        const fallbackMockMagnets: LeadMagnet[] = [
          {
            id: 'deemmi-lead-form',
            title: 'Deemmi Lead Form',
            description: 'Custom lead capture form for qualified prospects interested in our CRM solution.',
            type: 'lead_form',
            landing_page_url: '',
            downloads: 0,
            leads_generated: 0,
            created_at: '2024-08-18T10:00:00Z',
            is_active: true,
            form_fields: [
              {
                id: 'first_name',
                type: 'text',
                label: 'First Name',
                placeholder: 'Enter your first name',
                required: true,
                order: 1
              },
              {
                id: 'last_name',
                type: 'text',
                label: 'Last Name',
                placeholder: 'Enter your last name',
                required: true,
                order: 2
              },
              {
                id: 'email',
                type: 'email',
                label: 'Work Email',
                placeholder: 'your.email@company.com',
                required: true,
                order: 3
              },
              {
                id: 'company',
                type: 'text',
                label: 'Company Name',
                placeholder: 'Your company name',
                required: true,
                order: 4
              },
              {
                id: 'phone',
                type: 'phone',
                label: 'Phone Number',
                placeholder: '+66 XX XXX XXXX',
                required: false,
                order: 5
              },
              {
                id: 'company_size',
                type: 'select',
                label: 'Company Size',
                required: true,
                order: 6,
                options: [
                  { label: '1-10 employees', value: '1-10' },
                  { label: '11-50 employees', value: '11-50' },
                  { label: '51-200 employees', value: '51-200' },
                  { label: '200+ employees', value: '200+' }
                ]
              },
              {
                id: 'website',
                type: 'text',
                label: 'Website',
                placeholder: 'service',
                required: false,
                order: 7
              },
              {
                id: 'interest',
                type: 'select',
                label: 'Primary Interest',
                required: true,
                order: 8,
                options: [
                  { label: 'Sales Pipeline Management', value: 'sales_pipeline' },
                  { label: 'Lead Management', value: 'lead_management' },
                  { label: 'Customer Relationship Management', value: 'crm' },
                  { label: 'Sales Analytics & Reporting', value: 'analytics' },
                  { label: 'Marketing Automation', value: 'marketing' }
                ]
              }
            ]
          },
          {
            id: '1',
            title: 'Ultimate Sales Funnel Guide',
            description: 'Complete guide to building high-converting sales funnels for SaaS businesses.',
            type: 'guide',
            file_url: '/downloads/sales-funnel-guide.pdf',
            landing_page_url: '',
            downloads: 156,
            leads_generated: 89,
            created_at: '2024-08-10T10:00:00Z',
            is_active: true
          },
          {
            id: '2',
            title: 'CRM Setup Checklist',
            description: '20-point checklist to set up your CRM for maximum sales efficiency.',
            type: 'checklist',
            file_url: '/downloads/crm-checklist.pdf',
            landing_page_url: 'https://example.com/external-landing',
            downloads: 0,
            leads_generated: 0,
            created_at: '2024-08-05T14:30:00Z',
            is_active: true
          },
          {
            id: '3',
            title: 'Lead Scoring Template',
            description: 'Excel template to score and prioritize your leads effectively.',
            type: 'template',
            file_url: '/downloads/lead-scoring-template.xlsx',
            landing_page_url: '',
            downloads: 0,
            leads_generated: 0,
            created_at: '2024-07-28T09:15:00Z',
            is_active: false
          }
        ]
        
        // Update fallback mock data with real stats
        const fallbackWithStats = await Promise.all(
          fallbackMockMagnets.map(async (magnet) => {
            const stats = await fetchRealLeadStats(magnet.id)
            return { ...magnet, ...stats }
          })
        )
        
        setMagnets(fallbackWithStats)
        saveMagnetsToLocalStorage(fallbackWithStats)
      }
    } finally {
      setLoading(false)
    }
  }

  const handleCreateMagnet = async () => {
    try {
      const newMagnetData: LeadMagnet = {
        id: Date.now().toString(),
        ...newMagnet,
        downloads: 0,
        leads_generated: 0,
        created_at: new Date().toISOString(),
        is_active: newMagnet.is_active
      }

      // Update local state and localStorage immediately
      const updatedMagnets = [newMagnetData, ...magnets]
      setMagnets(updatedMagnets)
      saveMagnetsToLocalStorage(updatedMagnets)

      // Try to save to API in background (temporarily exclude campaign_id until column is added)
      // Temporarily remove campaign_id until database column is added
      const { campaign_id, ...magnetDataForAPI } = newMagnet

      fetch('/api/lead-magnets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(magnetDataForAPI)
      }).then(response => {
        if (response.ok) {
          response.json().then(data => {
            // Update with real ID from database if successful
            const magnetsWithRealId = updatedMagnets.map(m => 
              m.id === newMagnetData.id ? { ...data, ...newMagnetData, id: data.id } : m
            )
            saveMagnetsToLocalStorage(magnetsWithRealId)
          })
        }
      }).catch(error => {
        console.error('Error saving to API:', error)
      })

      setShowCreateDialog(false)
      setNewMagnet({
        title: '',
        description: '',
        type: 'lead_form',
        file_url: '',
        landing_page_url: '',
        form_fields: [],
        campaign_id: '',
        is_active: true
      })
      setShowToast({ show: true, message: 'Lead magnet created successfully!' })
      setTimeout(() => setShowToast({ show: false, message: '' }), 3000)
    } catch (error) {
      console.error('Error creating lead magnet:', error)
      setShowToast({ show: true, message: 'Failed to create lead magnet' })
      setTimeout(() => setShowToast({ show: false, message: '' }), 3000)
    }
  }

  const copyLandingPageUrl = (magnet: LeadMagnet) => {
    const baseUrl = window.location.origin
    
    // If landing_page_url starts with http, it's an external URL (WordPress, etc.)
    // Otherwise, use our internal landing page
    let fullUrl: string
    if (magnet.landing_page_url && magnet.landing_page_url.startsWith('http')) {
      // External URL (WordPress, etc.)
      fullUrl = magnet.landing_page_url
    } else if (magnet.landing_page_url && !magnet.landing_page_url.startsWith('/lead/')) {
      // Custom path but not external
      fullUrl = `${baseUrl}${magnet.landing_page_url.startsWith('/') ? '' : '/'}${magnet.landing_page_url}`
    } else {
      // Use our built-in landing page with the magnet ID
      fullUrl = `${baseUrl}/lead/${magnet.id}`
    }
    
    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(fullUrl).then(() => {
        setShowToast({ show: true, message: `Link copied: ${fullUrl}` })
        setTimeout(() => setShowToast({ show: false, message: '' }), 3000)
      }).catch(() => {
        fallbackCopyToClipboard(fullUrl)
      })
    } else {
      fallbackCopyToClipboard(fullUrl)
    }
  }

  const fallbackCopyToClipboard = (text: string) => {
    // Fallback method for older browsers or non-HTTPS
    const textArea = document.createElement('textarea')
    textArea.value = text
    textArea.style.position = 'fixed'
    textArea.style.left = '-999999px'
    textArea.style.top = '-999999px'
    document.body.appendChild(textArea)
    textArea.focus()
    textArea.select()
    
    try {
      document.execCommand('copy')
      setShowToast({ show: true, message: `Link copied: ${text}` })
      setTimeout(() => setShowToast({ show: false, message: '' }), 3000)
    } catch (err) {
      setShowToast({ show: true, message: 'Please manually copy this link: ' + text })
      setTimeout(() => setShowToast({ show: false, message: '' }), 5000)
    } finally {
      document.body.removeChild(textArea)
    }
  }

  const handleEdit = (magnet: LeadMagnet) => {
    setEditingMagnet(magnet)
    setShowEditDialog(true)
  }

  const handleDelete = async (magnetId: string) => {
    if (confirm('Are you sure you want to delete this lead magnet?')) {
      try {
        const response = await fetch(`/api/lead-magnets/${magnetId}`, {
          method: 'DELETE'
        })
        
        if (response.ok) {
          // Refresh the list from database
          fetchMagnets()
          setShowToast({ show: true, message: 'Lead magnet deleted successfully' })
          setTimeout(() => setShowToast({ show: false, message: '' }), 3000)
        } else {
          const error = await response.json()
          setShowToast({ show: true, message: `Failed to delete: ${error.error || 'Unknown error'}` })
          setTimeout(() => setShowToast({ show: false, message: '' }), 3000)
        }
      } catch (error) {
        console.error('Error deleting lead magnet:', error)
        setShowToast({ show: true, message: 'Failed to delete lead magnet' })
        setTimeout(() => setShowToast({ show: false, message: '' }), 3000)
      }
    }
  }

  const handleDuplicate = async (magnet: LeadMagnet) => {
    try {
      // Prepare the duplicate data - don't include stats (calculated dynamically)
      const duplicateData = {
        title: `${magnet.title} (Copy)`,
        description: magnet.description,
        slug: `${(magnet as any).slug || magnet.title.toLowerCase().replace(/\s+/g, '-')}-copy-${Date.now()}`,
        form_fields: magnet.form_fields,
        button_text: (magnet as any).button_text || 'Submit',
        success_message: (magnet as any).success_message || 'Thank you for your submission!',
        redirect_url: (magnet as any).redirect_url,
        landing_page_url: (magnet as any).landing_page_url,
        file_url: magnet.file_url,
        type: magnet.type || 'lead_form',
        is_active: magnet.is_active !== undefined ? magnet.is_active : true
        // Note: downloads and leads_generated are calculated dynamically, not stored
      }
      
      // Save to API
      const response = await fetch('/api/lead-magnets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(duplicateData)
      })

      if (response.ok) {
        const newMagnet = await response.json()
        
        // Refresh the magnets list from the API to ensure accurate stats
        fetchMagnets()
        
        setShowToast({ show: true, message: 'Lead magnet duplicated with 0 stats!' })
        setTimeout(() => setShowToast({ show: false, message: '' }), 3000)
      } else {
        const error = await response.json()
        console.error('Error duplicating lead magnet:', error)
        setShowToast({ show: true, message: `Failed to duplicate: ${error.error || 'Unknown error'}` })
        setTimeout(() => setShowToast({ show: false, message: '' }), 3000)
      }
    } catch (error) {
      console.error('Error duplicating lead magnet:', error)
      setShowToast({ show: true, message: 'Failed to duplicate lead magnet' })
      setTimeout(() => setShowToast({ show: false, message: '' }), 3000)
    }
  }

  const handlePreview = (magnet: LeadMagnet) => {
    setPreviewMagnet(magnet)
    setShowPreviewDialog(true)
  }

  const handleUpdateMagnet = async () => {
    if (!editingMagnet) return
    
    try {
      // Prepare update data - exclude computed fields
      const { downloads, leads_generated, created_at, updated_at, ...updateData } = editingMagnet as any
      
      // Try to update via API first
      const response = await fetch(`/api/lead-magnets/${editingMagnet.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updateData)
      })
      
      if (response.ok) {
        // Refresh the entire list from database to get updated data
        fetchMagnets()
        setShowToast({ show: true, message: 'Lead magnet updated successfully' })
      } else {
        // Fallback to local update
        const updatedMagnets = magnets.map(m => m.id === editingMagnet.id ? editingMagnet : m)
        saveMagnetsToLocalStorage(updatedMagnets)
        setShowToast({ show: true, message: 'Lead magnet updated (saved locally)' })
      }
    } catch (error) {
      console.error('Error updating lead magnet:', error)
      // Fallback to local update
      const updatedMagnets = magnets.map(m => m.id === editingMagnet.id ? editingMagnet : m)
      saveMagnetsToLocalStorage(updatedMagnets)
      setShowToast({ show: true, message: 'Lead magnet updated (saved locally)' })
    }
    
    setShowEditDialog(false)
    setEditingMagnet(null)
    setTimeout(() => setShowToast({ show: false, message: '' }), 3000)
  }

  const getTypeIcon = (type: string) => {
    const typeData = MAGNET_TYPES.find(t => t.value === type)
    return typeData?.icon || '📄'
  }

  const getTypeLabel = (type: string) => {
    const typeData = MAGNET_TYPES.find(t => t.value === type)
    return typeData?.label || type
  }

  // Filter magnets based on search and status
  const filteredMagnets = magnets.filter(magnet => {
    const matchesSearch = searchQuery === '' || 
      magnet.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      magnet.description.toLowerCase().includes(searchQuery.toLowerCase())
    
    const matchesStatus = statusFilter === 'all' ||
      (statusFilter === 'active' && magnet.is_active) ||
      (statusFilter === 'inactive' && !magnet.is_active)
    
    return matchesSearch && matchesStatus
  })

  // Calculate stats
  const stats = {
    totalDownloads: magnets.reduce((sum, m) => sum + m.downloads, 0),
    leadsGenerated: magnets.reduce((sum, m) => sum + m.leads_generated, 0),
    activeMagnets: magnets.filter(m => m.is_active).length
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="text-lg">Loading lead magnets...</div>
      </div>
    )
  }

  return (
    <div className="space-y-6 p-4 md:p-6 lg:px-12 lg:py-8 min-h-screen">
      {/* Page Title */}
      <div className="mb-4">
        <h1 className="text-2xl font-bold text-gray-900">Lead Magnets</h1>
        <p className="text-gray-600">Create and manage downloadable content to capture quality leads</p>
      </div>

      {/* Unified Control Panel Header */}
      <header className="mb-4">
        <Card>
          <CardContent className="p-3">
            {/* Top Row: Stats */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-3 pb-3 border-b">
              <div className="flex flex-wrap items-center gap-4 sm:gap-8">
                <div className="flex items-center gap-2">
                  <div className="text-2xl font-bold">{stats.totalDownloads}</div>
                  <div className="text-xs text-gray-500 uppercase">Total<br className="sm:hidden" /> Downloads</div>
                </div>
                <div className="flex items-center gap-3 sm:gap-6">
                  <div className="flex items-center gap-1">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <span className="text-sm font-semibold">{stats.leadsGenerated}</span>
                    <span className="text-xs text-gray-500 hidden sm:inline">Leads Generated</span>
                    <span className="text-xs text-gray-500 sm:hidden">Leads</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                    <span className="text-sm font-semibold">{stats.activeMagnets}</span>
                    <span className="text-xs text-gray-500 hidden sm:inline">Active Magnets</span>
                    <span className="text-xs text-gray-500 sm:hidden">Active</span>
                  </div>
                </div>
              </div>
              <Button onClick={() => setShowCreateDialog(true)} size="sm" className="h-8 w-full sm:w-auto">
                <Plus className="w-3 h-3 mr-1" />
                Create
              </Button>
            </div>

            {/* Bottom Row: Search & Filters */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div className="flex flex-col sm:flex-row sm:items-center gap-2 w-full sm:flex-1">
                <div className="relative w-full sm:flex-1 sm:max-w-xs">
                  <Search className="absolute left-2 top-2 h-3 w-3 text-muted-foreground" />
                  <Input
                    placeholder="Search magnets..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-7 h-8 text-sm w-full"
                  />
                </div>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-full sm:w-[120px] h-8 text-sm">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {searchQuery && (
                <Button
                  variant="outline"
                  onClick={() => setSearchQuery('')}
                  size="sm"
                  className="h-8 text-xs w-full sm:w-auto"
                >
                  Clear
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </header>

      {/* Lead Magnets Grid */}
      <Card>
        <CardContent className="p-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredMagnets.map(magnet => (
          <Card key={magnet.id} className={`${magnet.is_active ? 'border-green-200 bg-green-50/30' : 'border-gray-200 bg-gray-50/30'}`}>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex items-center space-x-2">
                  <span className="text-2xl">{getTypeIcon(magnet.type)}</span>
                  <div>
                    <CardTitle className="text-base">{magnet.title}</CardTitle>
                    <Badge variant="outline" className="mt-1">
                      {getTypeLabel(magnet.type)}
                    </Badge>
                  </div>
                </div>
                <Badge variant={magnet.is_active ? "default" : "secondary"}>
                  {magnet.is_active ? "Active" : "Inactive"}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-gray-600 line-clamp-2">{magnet.description}</p>
              
              {/* Stats */}
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-500">Downloads:</span>
                  <div className="font-semibold text-blue-600">{magnet.downloads}</div>
                </div>
                <div>
                  <span className="text-gray-500">Leads:</span>
                  <div className="font-semibold text-green-600">{magnet.leads_generated}</div>
                </div>
              </div>

              {/* Conversion Rate */}
              <div className="text-sm">
                <span className="text-gray-500">Conversion Rate:</span>
                <div className="font-semibold text-purple-600">
                  {magnet.downloads > 0 ? Math.round((magnet.leads_generated / magnet.downloads) * 100) : 0}%
                </div>
              </div>

              {/* Actions */}
              <div className="flex flex-wrap gap-2 pt-2">
                <Button size="sm" variant="outline" onClick={() => copyLandingPageUrl(magnet)} title="Copy shareable link">
                  <Copy className="w-3 h-3 mr-1" />
                  Copy Link
                </Button>
                <Button size="sm" variant="outline" onClick={() => handlePreview(magnet)} title="Preview landing page">
                  <Eye className="w-3 h-3 mr-1" />
                  Preview
                </Button>
                <Button size="sm" variant="outline" onClick={() => handleDuplicate(magnet)} title="Duplicate this lead magnet">
                  <CopyPlus className="w-3 h-3 mr-1" />
                  Duplicate
                </Button>
                <Button size="sm" variant="outline" onClick={() => handleEdit(magnet)} title="Edit lead magnet">
                  <Edit2 className="w-3 h-3 mr-1" />
                  Edit
                </Button>
                <Button size="sm" variant="outline" onClick={() => handleDelete(magnet.id)} className="text-red-600 hover:text-red-700" title="Delete lead magnet">
                  <Trash2 className="w-3 h-3 mr-1" />
                  Delete
                </Button>
              </div>

              <div className="text-xs text-gray-500 border-t pt-2">
                Created: {format(new Date(magnet.created_at), 'MMM dd, yyyy')}
              </div>
            </CardContent>
          </Card>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Create Lead Magnet Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="max-w-md max-h-[85vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>Create New Lead Magnet</DialogTitle>
            <DialogDescription>
              Set up a new lead magnet to capture leads with valuable content
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 mt-4 overflow-y-auto flex-1 px-1">
            <div>
              <Label htmlFor="title">Title</Label>
              <Input
                id="title"
                value={newMagnet.title}
                onChange={(e) => setNewMagnet({...newMagnet, title: e.target.value})}
                placeholder="Ultimate Sales Guide"
                className="mt-1 placeholder:text-gray-400"
              />
            </div>
            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={newMagnet.description}
                onChange={(e) => setNewMagnet({...newMagnet, description: e.target.value})}
                placeholder="Comprehensive guide to closing more deals..."
                className="mt-1 placeholder:text-gray-400"
                rows={3}
              />
            </div>
            <div>
              <Label htmlFor="type">Type</Label>
              <select
                value={newMagnet.type}
                onChange={(e) => setNewMagnet({...newMagnet, type: e.target.value as any})}
                className="mt-1 w-full p-2 border border-gray-300 rounded-md"
              >
                {MAGNET_TYPES.map(type => (
                  <option key={type.value} value={type.value}>
                    {type.icon} {type.label}
                  </option>
                ))}
              </select>
              <p className="text-xs text-gray-500 mt-1">
                {MAGNET_TYPES.find(t => t.value === newMagnet.type)?.description}
              </p>
            </div>
            <div>
              <Label htmlFor="campaign">On Submission: Enroll in Campaign</Label>
              <select
                id="campaign"
                value={newMagnet.campaign_id}
                onChange={(e) => setNewMagnet({...newMagnet, campaign_id: e.target.value})}
                className="mt-1 w-full p-2 border border-gray-300 rounded-md"
              >
                <option value="">None</option>
                {campaigns.map(campaign => (
                  <option key={campaign.id} value={campaign.id}>
                    {campaign.name} ({campaign.status})
                  </option>
                ))}
              </select>
              <p className="text-xs text-gray-500 mt-1">
                When leads submit this form, they will be automatically added to the selected email campaign
              </p>
            </div>
            {newMagnet.type !== 'lead_form' && newMagnet.type !== 'quiz' && newMagnet.type !== 'survey' && newMagnet.type !== 'calculator' && newMagnet.type !== 'assessment' && (
              <div>
                <Label htmlFor="file_url">File URL</Label>
                <Input
                  id="file_url"
                  value={newMagnet.file_url}
                  onChange={(e) => setNewMagnet({...newMagnet, file_url: e.target.value})}
                  placeholder="/downloads/my-guide.pdf"
                  className="mt-1 placeholder:text-gray-400"
                />
                <p className="text-xs text-gray-500 mt-1">URL to the downloadable file (optional)</p>
              </div>
            )}
            <div>
              <Label htmlFor="landing_page_url">Landing Page URL (Optional)</Label>
              <Input
                id="landing_page_url"
                value={newMagnet.landing_page_url}
                onChange={(e) => setNewMagnet({...newMagnet, landing_page_url: e.target.value})}
                placeholder="https://wordpress.com/landing or leave empty"
                className="mt-1 placeholder:text-gray-400"
              />
              <div className="text-xs text-gray-500 mt-1 space-y-1">
                <p>• Leave empty to use built-in CRM landing page</p>
                <p>• Enter full URL (https://...) for external pages (WordPress, etc.)</p>
                <p>• Built-in page will be at: /lead/[magnet-id]</p>
              </div>
            </div>
            
            <div>
              <Label htmlFor="status">Status</Label>
              <div className="flex items-center justify-between mt-2 p-3 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-600">
                  New lead magnets are active by default
                </p>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={newMagnet.is_active}
                    onChange={(e) => setNewMagnet({...newMagnet, is_active: e.target.checked})}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 rounded-full peer peer-checked:bg-blue-600 after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:after:translate-x-full peer-checked:after:border-white after:border after:border-gray-300"></div>
                  <span className="ml-3 text-sm font-medium text-gray-900">
                    {newMagnet.is_active ? 'Active' : 'Inactive'}
                  </span>
                </label>
              </div>
            </div>
            
            {newMagnet.type === 'lead_form' && (
              <div className="space-y-4">
                <div className="p-3 bg-blue-50 rounded-md">
                  <p className="text-sm text-blue-700">
                    <FormInput className="w-4 h-4 inline mr-1" />
                    Lead forms allow you to create custom fields to capture specific information from your leads.
                  </p>
                </div>
                <div className="max-h-96 overflow-y-auto border rounded-lg p-4 bg-gray-50">
                  <FormBuilder
                    fields={newMagnet.form_fields || []}
                    onChange={(fields) => setNewMagnet({...newMagnet, form_fields: fields})}
                  />
                </div>
              </div>
            )}
          </div>
          <div className="flex justify-end gap-3 p-4 border-t">
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleCreateMagnet}
              disabled={!newMagnet.title.trim() || !newMagnet.description.trim()}
            >
              Create Lead Magnet
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Lead Magnet Dialog */}
      {editingMagnet && (
        <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
          <DialogContent className="max-w-md max-h-[85vh] overflow-hidden flex flex-col">
            <DialogHeader>
              <DialogTitle>Edit Lead Magnet</DialogTitle>
              <DialogDescription>
                Update your lead magnet details
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 mt-4 overflow-y-auto flex-1 pr-2">
              <div>
                <Label htmlFor="edit-title">Title</Label>
                <Input
                  id="edit-title"
                  value={editingMagnet.title}
                  onChange={(e) => setEditingMagnet({...editingMagnet, title: e.target.value})}
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="edit-description">Description</Label>
                <Textarea
                  id="edit-description"
                  value={editingMagnet.description}
                  onChange={(e) => setEditingMagnet({...editingMagnet, description: e.target.value})}
                  className="mt-1"
                  rows={3}
                />
              </div>
              <div>
                <Label htmlFor="edit-type">Type</Label>
                <select
                  value={editingMagnet.type}
                  onChange={(e) => setEditingMagnet({...editingMagnet, type: e.target.value as any})}
                  className="mt-1 w-full p-2 border border-gray-300 rounded-md"
                >
                  {MAGNET_TYPES.map(type => (
                    <option key={type.value} value={type.value}>
                      {type.icon} {type.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <Label htmlFor="edit-campaign">On Submission: Enroll in Campaign</Label>
                <select
                  id="edit-campaign"
                  value={editingMagnet.campaign_id || ''}
                  onChange={(e) => setEditingMagnet({...editingMagnet, campaign_id: e.target.value})}
                  className="mt-1 w-full p-2 border border-gray-300 rounded-md"
                >
                  <option value="">None</option>
                  {campaigns.map(campaign => (
                    <option key={campaign.id} value={campaign.id}>
                      {campaign.name} ({campaign.status})
                    </option>
                  ))}
                </select>
                <p className="text-xs text-gray-500 mt-1">
                  When leads submit this form, they will be automatically added to the selected email campaign
                </p>
              </div>
              <div>
                <Label htmlFor="edit-status">Status</Label>
                <div className="flex items-center justify-between mt-2 p-3 bg-gray-50 rounded-lg">
                  <p className="text-sm text-gray-600">
                    {editingMagnet.is_active ? 'Lead magnet is live' : 'Lead magnet is disabled'}
                  </p>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={editingMagnet.is_active}
                      onChange={(e) => setEditingMagnet({...editingMagnet, is_active: e.target.checked})}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 rounded-full peer peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 peer-checked:bg-blue-600 after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:after:translate-x-full peer-checked:after:border-white after:border after:border-gray-300"></div>
                    <span className="ml-3 text-sm font-medium text-gray-900">
                      {editingMagnet.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </label>
                </div>
              </div>
              
              {editingMagnet.type === 'lead_form' && (
                <div className="space-y-4">
                  <Label className="text-base font-medium">Custom Form Fields</Label>
                  <div className="max-h-80 overflow-y-auto border rounded-lg p-4 bg-gray-50">
                    <FormBuilder
                      fields={editingMagnet.form_fields || []}
                      onChange={(fields) => setEditingMagnet({...editingMagnet, form_fields: fields})}
                    />
                  </div>
                </div>
              )}
            </div>
            <div className="flex justify-end gap-3 p-4 border-t">
              <Button variant="outline" onClick={() => setShowEditDialog(false)}>
                Cancel
              </Button>
              <Button onClick={handleUpdateMagnet}>
                Update Lead Magnet
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Preview Dialog */}
      {previewMagnet && (
        <Dialog open={showPreviewDialog} onOpenChange={setShowPreviewDialog}>
          <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Lead Magnet Preview</DialogTitle>
              <DialogDescription>
                Preview how your lead magnet landing page will look
              </DialogDescription>
            </DialogHeader>
            {previewMagnet && (
              <div className="mt-4 border rounded-lg p-6 bg-gradient-to-br from-blue-50 to-purple-50">
                {/* Preview Header */}
                <div className="text-center mb-8">
                  <span className="text-4xl mb-4 block">{getTypeIcon(previewMagnet.type)}</span>
                  <h1 className="text-3xl font-bold text-gray-900 mb-3">{previewMagnet.title}</h1>
                  <p className="text-lg text-gray-600 max-w-2xl mx-auto">{previewMagnet.description}</p>
                </div>

              {/* Lead Capture Form Preview */}
              <div className="max-w-md mx-auto bg-white rounded-lg shadow-lg p-6">
                <h3 className="text-xl font-semibold mb-4">Get Your Free {getTypeLabel(previewMagnet.type)}</h3>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="preview-name">Name *</Label>
                    <Input id="preview-name" placeholder="John Doe" className="mt-1" disabled />
                  </div>
                  <div>
                    <Label htmlFor="preview-email">Email *</Label>
                    <Input id="preview-email" type="email" placeholder="john@example.com" className="mt-1" disabled />
                  </div>
                  <div>
                    <Label htmlFor="preview-company">Company</Label>
                    <Input id="preview-company" placeholder="Acme Inc." className="mt-1" disabled />
                  </div>
                  {previewMagnet.type === 'lead_form' && previewMagnet.form_fields && previewMagnet.form_fields.length > 0 && (
                    <div className="space-y-3">
                      {previewMagnet.form_fields.map((field, index) => (
                        <div key={index}>
                          <Label htmlFor={`preview-field-${index}`}>
                            {field.label} {field.required && '*'}
                          </Label>
                          {field.type === 'text' && (
                            <Input id={`preview-field-${index}`} placeholder={field.placeholder} disabled className="mt-1" />
                          )}
                          {field.type === 'email' && (
                            <Input id={`preview-field-${index}`} type="email" placeholder={field.placeholder} disabled className="mt-1" />
                          )}
                          {field.type === 'phone' && (
                            <Input id={`preview-field-${index}`} type="tel" placeholder={field.placeholder} disabled className="mt-1" />
                          )}
                          {field.type === 'number' && (
                            <Input id={`preview-field-${index}`} type="number" placeholder={field.placeholder} disabled className="mt-1" />
                          )}
                          {field.type === 'textarea' && (
                            <Textarea id={`preview-field-${index}`} placeholder={field.placeholder} disabled rows={2} className="mt-1" />
                          )}
                          {field.type === 'select' && (
                            <select 
                              className="w-full p-2 border rounded mt-1" 
                              disabled
                              style={{ color: '#9CA3AF' }}
                            >
                              <option>{field.placeholder || 'Select an option'}</option>
                              {field.options?.map((option, i) => {
                                const optionValue = typeof option === 'string' ? option : option.value
                                const optionLabel = typeof option === 'string' ? option : option.label
                                return (
                                  <option key={i} value={optionValue}>{optionLabel}</option>
                                )
                              })}
                            </select>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                  
                  {previewMagnet.type === 'lead_form' && (!previewMagnet.form_fields || previewMagnet.form_fields.length === 0) && (
                    <div className="text-sm text-gray-500 italic">
                      No custom fields added yet. Edit this lead magnet to add custom fields.
                    </div>
                  )}
                  <Button className="w-full" disabled>
                    <Download className="w-4 h-4 mr-2" />
                    Download Now
                  </Button>
                  <p className="text-xs text-gray-500 text-center">
                    We respect your privacy. Unsubscribe at any time.
                  </p>
                </div>
              </div>

              {/* Stats Preview */}
              <div className="mt-8 grid grid-cols-3 gap-4 max-w-md mx-auto">
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">{previewMagnet.downloads}</div>
                  <div className="text-xs text-gray-500">Downloads</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">{previewMagnet.leads_generated}</div>
                  <div className="text-xs text-gray-500">Leads</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-purple-600">
                    {previewMagnet.downloads > 0 ? Math.round((previewMagnet.leads_generated / previewMagnet.downloads) * 100) : 0}%
                  </div>
                  <div className="text-xs text-gray-500">Conversion</div>
                </div>
              </div>
            </div>
            )}
            <div className="flex justify-end gap-3 mt-4">
              <Button variant="outline" onClick={() => copyLandingPageUrl(previewMagnet)}>
                <Copy className="w-4 h-4 mr-2" />
                Copy Link
              </Button>
              <Button onClick={() => setShowPreviewDialog(false)}>
                Close Preview
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Toast Notification */}
      {showToast.show && (
        <div className="fixed bottom-4 right-4 bg-gray-900 text-white px-4 py-2 rounded-lg shadow-lg z-50 animate-in slide-in-from-bottom-5">
          {showToast.message}
        </div>
      )}
    </div>
  )
}