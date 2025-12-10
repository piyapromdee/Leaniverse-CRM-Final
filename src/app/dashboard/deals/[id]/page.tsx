'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Target, ArrowLeft, Edit, Calendar, User, Building, DollarSign, Activity, FileText, Trash2, Plus, Phone, Mail, MessageSquare } from 'lucide-react'
import PageHeader from '@/components/page-header'

export default function DealDetailPage() {
  const params = useParams()
  const router = useRouter() 
  const supabase = createClient()
  const dealId = params.id as string
  const [deal, setDeal] = useState<any>(null)
  const [isReadOnly, setIsReadOnly] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [companies, setCompanies] = useState<any[]>([])
  const [contacts, setContacts] = useState<any[]>([])
  const [teamMembers, setTeamMembers] = useState<any[]>([])
  const [activities, setActivities] = useState<any[]>([])
  
  // Activity modal states
  const [isAddTaskModalOpen, setIsAddTaskModalOpen] = useState(false)
  const [isLogActivityModalOpen, setIsLogActivityModalOpen] = useState(false)
  const [isAddNoteModalOpen, setIsAddNoteModalOpen] = useState(false)
  const [isQuickEditContactOpen, setIsQuickEditContactOpen] = useState(false)
  
  // Activity form states
  const [newTask, setNewTask] = useState({
    description: '',
    due_date: '',
    assigned_to: ''
  })
  
  const [newActivity, setNewActivity] = useState({
    type: 'call',
    date: new Date().toISOString().split('T')[0],
    notes: ''
  })
  
  const [newNote, setNewNote] = useState({
    content: ''
  })

  const [quickEditContact, setQuickEditContact] = useState({
    name: '',
    email: '',
    phone: ''
  })

  const [editingDeal, setEditingDeal] = useState({
    title: '',
    description: '',
    value: '',
    stage: 'discovery',
    expected_close_date: '',
    company_id: null as string | null,
    contact_id: null as string | null,
    channel: '',
    assigned_to: '',
    priority: 'Medium'
  })

  // Enhanced form states for contact and company
  const [editingContact, setEditingContact] = useState({
    name: '',
    email: '',
    phone: '',
    position: ''
  })

  const [editingCompany, setEditingCompany] = useState({
    name: '',
    industry: '',
    website: '',
    address: ''
  })

  const [showNewContactForm, setShowNewContactForm] = useState(false)
  const [showNewCompanyForm, setShowNewCompanyForm] = useState(false)

  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true)
      try {
        console.log('🔍 [DEAL PAGE] Loading deal with ID:', dealId);
        console.log('🔍 [DEAL PAGE] Deal ID type:', typeof dealId);
        console.log('🔍 [DEAL PAGE] Deal ID length:', dealId?.length);
        
        // Load deal data from API (with proper field mapping)
        const apiUrl = `/api/deals/${dealId}`;
        console.log('🔍 [DEAL PAGE] API URL:', apiUrl);
        
        const response = await fetch(apiUrl)
        const result = await response.json()
        
        console.log('🔍 [DEAL PAGE] API Response status:', response.status);
        console.log('🔍 [DEAL PAGE] API Response:', result);
        
        if (!response.ok) {
          console.error('❌ [DEAL PAGE] Error loading deal:', result.error || 'Unknown error');
          console.error('❌ [DEAL PAGE] Full error response:', result);
          setDeal(null)
          return
        }
        
        const dealData = result.data

        if (!dealData) {
          console.warn('Deal not found for ID:', dealId)
          setDeal(null)
        } else {
          setDeal(dealData)
        }

        // Load reference data for editing and activities
        const [companiesRes, contactsRes, teamRes, activitiesRes] = await Promise.all([
          supabase.from('companies').select('id, name'),
          supabase.from('contacts').select('id, name'),
          supabase.from('profiles').select('id, first_name, last_name'),
          supabase.from('calendar_events').select('*').eq('deal_id', dealId).order('created_at', { ascending: false })
        ])

        if (companiesRes.data) setCompanies(companiesRes.data)
        if (contactsRes.data) setContacts(contactsRes.data)
        if (teamRes.data) setTeamMembers(teamRes.data)
        if (activitiesRes.data) setActivities(activitiesRes.data)

      } catch (error: any) {
        console.error('Error loading deal data:', {
          dealId,
          error: error.message || error,
          stack: error.stack
        })
        setDeal(null)
      } finally {
        setIsLoading(false)
      }
    }

    if (dealId && dealId !== 'undefined') {
      // Check if this is a test activity ID
      if (dealId.startsWith('test-')) {
        console.warn('Attempted to load test activity as deal:', dealId)
        setDeal(null)
        setIsLoading(false)
      } else {
        loadData()
      }
    } else {
      console.warn('Invalid deal ID provided:', dealId)
      setIsLoading(false)
    }
    
    // Check if coming from Recent Wins/Losses (read-only mode)
    const urlParams = new URLSearchParams(window.location.search)
    const fromWidget = urlParams.get('from')
    if (fromWidget === 'recent-wins' || fromWidget === 'recent-losses') {
      setIsReadOnly(true)
    }
  }, [dealId, supabase])

  // Load activities function
  const loadActivities = async () => {
    try {
      const { data } = await supabase
        .from('calendar_events')
        .select('*')
        .eq('deal_id', dealId)
        .order('created_at', { ascending: false })
      
      if (data) setActivities(data)
    } catch (error) {
      console.error('Error loading activities:', error)
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading deal...</p>
        </div>
      </div>
    )
  }

  if (!deal) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <Target className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Deal not found</h3>
          <p className="text-gray-600 mb-4">The deal you're looking for doesn't exist.</p>
          <Button onClick={() => router.back()} variant="outline">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Go Back
          </Button>
        </div>
      </div>
    )
  }

  const getPriorityColor = (priority: string) => {
    switch (priority?.toLowerCase()) {
      case 'high': return 'bg-red-100 text-red-800'
      case 'medium': return 'bg-yellow-100 text-yellow-800'
      case 'low': return 'bg-green-100 text-green-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getStatusColor = (stage: string) => {
    switch (stage?.toLowerCase()) {
      case 'won': return 'bg-green-100 text-green-800'
      case 'lost': return 'bg-red-100 text-red-800'
      case 'discovery': return 'bg-blue-100 text-blue-800'
      case 'proposal': return 'bg-orange-100 text-orange-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const formatStageTitle = (stage: string) => {
    switch (stage?.toLowerCase()) {
      case 'won': return 'Closed Won'
      case 'lost': return 'Closed Lost'
      case 'discovery': return 'Discovery'
      case 'proposal': return 'Proposal'
      default: return stage || 'Unknown'
    }
  }

  const formatCurrency = (amount: number) => {
    return `฿${amount.toLocaleString()}`
  }

  // Deal stages configuration - Must match the pipeline stages
  const DEAL_STAGES = [
    { id: 'discovery', title: 'DISCOVERY' },
    { id: 'proposal', title: 'PROPOSAL' },
    { id: 'won', title: 'CLOSED WON' },
    { id: 'lost', title: 'CLOSED LOST' }
  ]

  const handleEditDeal = () => {
    setEditingDeal({
      title: deal.title || '',
      description: deal.description || '',
      value: deal.value?.toString() || '',
      stage: deal.stage || 'discovery',
      expected_close_date: deal.expected_close_date || '',
      company_id: deal.company_id,
      contact_id: deal.contact_id,
      channel: deal.channel || '',
      assigned_to: deal.assigned_to || '',
      priority: deal.priority || 'Medium'
    })

    // Populate contact form if contact exists
    if (deal.contacts) {
      setEditingContact({
        name: deal.contacts.name || '',
        email: deal.contacts.email || '',
        phone: deal.contacts.phone || '',
        position: deal.contacts.position || ''
      })
    } else {
      setEditingContact({
        name: '',
        email: '',
        phone: '',
        position: ''
      })
    }

    // Populate company form if company exists
    if (deal.companies) {
      setEditingCompany({
        name: deal.companies.name || '',
        industry: deal.companies.industry || '',
        website: deal.companies.website || '',
        address: deal.companies.address || ''
      })
    } else {
      setEditingCompany({
        name: '',
        industry: '',
        website: '',
        address: ''
      })
    }

    setShowNewContactForm(!deal.contact_id)
    setShowNewCompanyForm(!deal.company_id)
    setIsEditModalOpen(true)
  }

  const handleSaveEdit = async () => {
    try {
      // Get current user for user_id and org_id
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('User not authenticated')

      // Get user profile for org_id
      const { data: profile } = await supabase
        .from('profiles')
        .select('org_id')
        .eq('id', user.id)
        .single()

      let companyId = editingDeal.company_id
      let contactId = editingDeal.contact_id

      // Handle company creation/update
      if (showNewCompanyForm && editingCompany.name.trim()) {
        const normalizedCompanyName = editingCompany.name.trim()
          .replace(/([a-z])([A-Z])/g, '$1 $2') // Add space between lowercase and uppercase
          .replace(/([a-zA-Z])([0-9])/g, '$1 $2') // Add space between letters and numbers
          .replace(/([0-9])([a-zA-Z])/g, '$1 $2') // Add space between numbers and letters
          .replace(/\s+/g, ' ') // Replace multiple spaces with single space
          .trim() // Remove leading/trailing spaces
        
        const companyData = {
          name: normalizedCompanyName,
          industry: editingCompany.industry || '',
          website: editingCompany.website || '',
          address: editingCompany.address || '',
          status: 'active'  // Use 'active' as default status
        }

        if (editingDeal.company_id) {
          // Update existing company
          const { error } = await supabase
            .from('companies')
            .update({ ...companyData, updated_at: new Date().toISOString() })
            .eq('id', editingDeal.company_id)

          if (error) throw error
          companyId = editingDeal.company_id
        } else {
          // Create new company with user_id and org_id
          const { data, error } = await supabase
            .from('companies')
            .insert([{ 
              ...companyData, 
              user_id: user.id,
              org_id: profile?.org_id || null,
              created_at: new Date().toISOString(), 
              updated_at: new Date().toISOString() 
            }])
            .select()
            .single()

          if (error) throw error
          companyId = data.id
        }
      }

      // Handle contact creation/update
      if (showNewContactForm && editingContact.name.trim()) {
        const contactData = {
          name: editingContact.name.trim(),
          email: editingContact.email || '',
          phone: editingContact.phone || '',
          position: editingContact.position || '',
          company_id: companyId,
          status: 'lead'  // Use 'lead' which is the default value in the database
        }
        
        console.log('Contact data being saved:', contactData)

        if (editingDeal.contact_id) {
          // Update existing contact
          const { error } = await supabase
            .from('contacts')
            .update({ ...contactData, updated_at: new Date().toISOString() })
            .eq('id', editingDeal.contact_id)

          if (error) throw error
          contactId = editingDeal.contact_id
        } else {
          // Create new contact with user_id and org_id
          const { data, error } = await supabase
            .from('contacts')
            .insert([{ 
              ...contactData, 
              user_id: user.id,
              org_id: profile?.org_id || null,
              created_at: new Date().toISOString(), 
              updated_at: new Date().toISOString() 
            }])
            .select()
            .single()

          if (error) throw error
          contactId = data.id
        }
      }

      // Update deal with potentially new company and contact IDs
      const dealData = {
        title: editingDeal.title.trim(),
        description: editingDeal.description || '',
        value: editingDeal.value ? parseFloat(editingDeal.value) : 0,
        stage: editingDeal.stage,
        expected_close_date: editingDeal.expected_close_date || null,
        company_id: companyId || null,
        contact_id: contactId || null,
        channel: editingDeal.channel || '',
        assigned_to: editingDeal.assigned_to || null,
        priority: editingDeal.priority || 'Medium'
      }

      const response = await fetch('/api/deals', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: dealId, ...dealData })
      })

      if (!response.ok) {
        const errorData = await response.json()
        console.error('API Error Response:', errorData)
        throw new Error(errorData.error || errorData.details || 'Failed to update deal')
      }
      
      // Parse the successful response
      const result = await response.json()
      console.log('Deal updated successfully:', result)

      setIsEditModalOpen(false)
      window.location.reload() // Reload to show updated data
    } catch (error: any) {
      console.error('Update deal error:', error)
      console.error('Error details:', {
        message: error?.message,
        code: error?.code,
        details: error?.details,
        hint: error?.hint,
        fullError: JSON.stringify(error, null, 2)
      })
      alert("Error updating deal: " + (error?.message || 'Unknown error occurred'))
    }
  }

  const handleDeleteDeal = async () => {
    if (window.confirm("Are you sure you want to delete this deal? This action cannot be undone.")) {
      try {
        const response = await fetch(`/api/deals?id=${dealId}`, {
          method: 'DELETE'
        })
        
        if (!response.ok) {
          const error = await response.json()
          throw new Error(error.error || 'Failed to delete deal')
        }
        
        router.push('/dashboard/deals') // Redirect to deals list
      } catch (error: any) {
        alert("Error deleting deal: " + error.message)
      }
    }
  }

  // Activity handlers
  const handleSaveTask = async () => {
    try {
      if (!newTask.description.trim()) {
        alert("Task description is required")
        return
      }

      const taskData: any = {
        title: newTask.description,
        description: newTask.description,
        type: 'task',
        status: 'pending',
        deal_id: dealId
      }
      
      // Only add optional fields if they have values
      if (newTask.due_date) {
        taskData.date = newTask.due_date
      }
      
      if (newTask.assigned_to && newTask.assigned_to !== 'unassigned') {
        taskData.assigned_to = newTask.assigned_to
      }

      console.log('Sending task data:', taskData)
      
      const response = await fetch('/api/activities', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(taskData)
      })

      if (!response.ok) {
        const error = await response.json()
        console.error('API Error:', error)
        throw new Error(error.error || error.details || 'Failed to create task')
      }

      setIsAddTaskModalOpen(false)
      setNewTask({ description: '', due_date: '', assigned_to: '' })
      alert("Task created successfully!")
      // Refresh activities list
      await loadActivities()
    } catch (error: any) {
      console.error('Save task error:', error)
      alert("Error creating task: " + error.message)
    }
  }

  const handleSaveActivity = async () => {
    try {
      const activityTitle = `${newActivity.type.charAt(0).toUpperCase() + newActivity.type.slice(1)} Activity`
      
      const activityData = {
        title: activityTitle,
        description: newActivity.notes || `${newActivity.type} activity logged`,
        type: newActivity.type,
        status: 'completed',
        date: newActivity.date,
        deal_id: dealId
      }

      console.log('Sending activity data:', activityData)
      
      const response = await fetch('/api/activities', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(activityData)
      })

      if (!response.ok) {
        const error = await response.json()
        console.error('API Error:', error)
        throw new Error(error.error || error.details || 'Failed to log activity')
      }

      setIsLogActivityModalOpen(false)
      setNewActivity({ type: 'call', date: new Date().toISOString().split('T')[0], notes: '' })
      alert("Activity logged successfully!")
      // Refresh activities list
      await loadActivities()
    } catch (error: any) {
      console.error('Save activity error:', error)
      alert("Error logging activity: " + error.message)
    }
  }

  const handleSaveNote = async () => {
    try {
      console.log('handleSaveNote called, newNote:', newNote)
      if (!newNote.content.trim()) {
        alert("Note content is required")
        return
      }

      const noteData: any = {
        title: 'Note',
        description: newNote.content,
        type: 'email', // Use 'email' type since 'note' is not allowed in database constraint
        status: 'completed',
        deal_id: dealId
      }

      console.log('Sending note data:', noteData)
      
      const response = await fetch('/api/activities', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(noteData)
      })

      if (!response.ok) {
        const error = await response.json()
        console.error('API Error:', error)
        throw new Error(error.error || error.details || 'Failed to create note')
      }

      // Also update contact notes if there's a contact associated with this deal
      if (deal.contact_id) {
        try {
          // Get current contact notes
          const { data: contactData, error: contactFetchError } = await supabase
            .from('contacts')
            .select('notes')
            .eq('id', deal.contact_id)
            .single()

          if (!contactFetchError && contactData) {
            const currentNotes = contactData.notes || ''
            const newContactNote = `[${new Date().toLocaleString()}] Deal Note: ${newNote.content}`
            const updatedNotes = currentNotes ? `${currentNotes}\n\n${newContactNote}` : newContactNote

            // Update contact notes
            await supabase
              .from('contacts')
              .update({
                notes: updatedNotes,
                updated_at: new Date().toISOString()
              })
              .eq('id', deal.contact_id)
          }
        } catch (contactError) {
          console.warn('Could not update contact notes:', contactError)
          // Don't throw error - the activity was still created successfully
        }
      }

      setIsAddNoteModalOpen(false)
      setNewNote({ content: '' })
      alert("Note added successfully!")
      // Refresh activities list
      await loadActivities()
    } catch (error: any) {
      console.error('Save note error:', error)
      alert("Error creating note: " + error.message)
    }
  }

  // Quick Edit Contact handlers
  const handleQuickEditContact = () => {
    setQuickEditContact({
      name: deal.contacts?.name || '',
      email: deal.contacts?.email || '',
      phone: deal.contacts?.phone || ''
    })
    setIsQuickEditContactOpen(true)
  }

  const handleSaveQuickEditContact = async () => {
    try {
      if (!quickEditContact.name.trim()) {
        alert("Contact name is required")
        return
      }

      const { error } = await supabase
        .from('contacts')
        .update({
          name: quickEditContact.name.trim(),
          email: quickEditContact.email || '',
          phone: quickEditContact.phone || '',
          updated_at: new Date().toISOString()
        })
        .eq('id', deal.contact_id)

      if (error) throw error

      setIsQuickEditContactOpen(false)
      alert("Contact updated successfully!")
      // Reload the page to show updated contact info
      window.location.reload()
    } catch (error: any) {
      console.error('Update contact error:', error)
      alert("Error updating contact: " + error.message)
    }
  }

  return (
    <div className="p-3 md:p-4 lg:px-8 lg:py-6 min-h-screen">
      <PageHeader 
        title={deal.title || 'Deal Details'}
        description={`Deal details and information for ${deal.companies?.name || 'this deal'}`}
        showBackButton={false}
      >
        <div className="flex items-center space-x-2">
          <Button onClick={() => router.back()} variant="outline">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
          {!isReadOnly && (
            <>
              <Button onClick={handleEditDeal} className="bg-teal-500 hover:bg-teal-600">
                <Edit className="w-4 h-4 mr-2" />
                Edit Deal
              </Button>
              <Button onClick={handleDeleteDeal} variant="destructive">
                <Trash2 className="w-4 h-4 mr-2" />
                Delete Deal
              </Button>
            </>
          )}
          {isReadOnly && (
            <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
              View Only
            </Badge>
          )}
        </div>
      </PageHeader>
      
      <div className="space-y-6 mt-6">
        {/* Deal Status Badges */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Badge className={getStatusColor(deal.stage)}>
              {formatStageTitle(deal.stage)}
            </Badge>
            <Badge className={getPriorityColor(deal.priority)}>
              {deal.priority?.charAt(0).toUpperCase() + deal.priority?.slice(1) || 'Medium'} Priority
            </Badge>
          </div>
        </div>

        {/* Deal Value Card */}
        <Card className="bg-gradient-to-r from-green-50 to-emerald-50 border-green-200">
          <CardHeader className="text-center">
            <CardTitle className="text-3xl font-bold text-green-700">
              {formatCurrency(deal.value)}
            </CardTitle>
            <p className="text-green-600 font-medium">Deal Value</p>
          </CardHeader>
        </Card>

        {/* Tabbed Navigation */}
        <Tabs defaultValue="details" className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-6">
            <TabsTrigger 
              value="details" 
              className="data-[state=active]:bg-teal-600 data-[state=active]:text-white"
            >
              Details
            </TabsTrigger>
            <TabsTrigger 
              value="activities" 
              className="data-[state=active]:bg-teal-600 data-[state=active]:text-white"
            >
              Activities
            </TabsTrigger>
          </TabsList>
          
          {/* Details Tab Content */}
          <TabsContent value="details" className="space-y-6">
            {/* Deal Information Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Contact Information */}
              <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <User className="w-5 h-5 text-blue-600" />
                  <span>Contact Information</span>
                </div>
                {deal.contact_id && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleQuickEditContact}
                    className="h-8 w-8 p-0"
                  >
                    <Edit className="w-4 h-4" />
                  </Button>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-600 block">Contact Person:</label>
                {deal.contact_id && deal.contacts?.name ? (
                  <Link 
                    href={`/dashboard/contacts/${deal.contact_id}`}
                    className="text-teal-600 hover:text-teal-700 font-semibold hover:underline inline-flex items-center"
                  >
                    {deal.contacts.name}
                    <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                    </svg>
                  </Link>
                ) : (
                  <p className="text-gray-900 font-medium">{deal.contacts?.name || 'Not specified'}</p>
                )}
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-600 block">Email:</label>
                {deal.contacts?.email ? (
                  <a 
                    href={`mailto:${deal.contacts.email}`}
                    className="text-gray-900 hover:text-teal-600 hover:underline block"
                  >
                    {deal.contacts.email}
                  </a>
                ) : (
                  <p className="text-gray-500 italic">Not available</p>
                )}
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-600 block">Phone:</label>
                {deal.contacts?.phone ? (
                  <a 
                    href={`tel:${deal.contacts.phone}`}
                    className="text-gray-900 hover:text-teal-600 hover:underline block"
                  >
                    {deal.contacts.phone}
                  </a>
                ) : (
                  <p className="text-gray-500 italic">Not available</p>
                )}
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-600 block">Company:</label>
                {deal.company_id && deal.companies?.name ? (
                  <Link 
                    href={`/dashboard/companies/${deal.company_id}`}
                    className="text-teal-600 hover:text-teal-700 font-semibold hover:underline inline-flex items-center"
                  >
                    {deal.companies.name}
                    <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                    </svg>
                  </Link>
                ) : (
                  <p className="text-gray-900 font-medium">{deal.companies?.name || 'Not specified'}</p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Deal Details */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Building className="w-5 h-5 text-purple-600" />
                <span>Deal Details</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-600">Stage</label>
                <p className="text-gray-900 font-semibold">{formatStageTitle(deal.stage)}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-600">Priority</label>
                <p className="text-gray-900">{deal.priority?.charAt(0).toUpperCase() + deal.priority?.slice(1) || 'Medium'}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-600">Expected Close Date</label>
                <p className="text-gray-900">{deal.expected_close_date ? new Date(deal.expected_close_date).toLocaleDateString() : 'Not set'}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-600">Channel</label>
                <p className="text-gray-900">{deal.channel || 'Not specified'}</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Description */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <FileText className="w-5 h-5 text-green-600" />
              <span>Description</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-700 leading-relaxed">{deal.description || 'No description provided'}</p>
          </CardContent>
        </Card>

        {/* Activity Timeline */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Activity className="w-5 h-5 text-teal-600" />
              <span>Recent Activity</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-start space-x-3">
                <div className="w-2 h-2 bg-teal-500 rounded-full mt-2"></div>
                <div>
                  <p className="text-sm font-medium text-gray-900">
                    {deal.stage === 'won' ? 'Deal closed successfully' : 
                     deal.stage === 'lost' ? 'Deal lost' : 
                     'Deal in progress'}
                  </p>
                  <p className="text-xs text-gray-500">Current status</p>
                </div>
              </div>
              <div className="flex items-start space-x-3">
                <div className="w-2 h-2 bg-gray-300 rounded-full mt-2"></div>
                <div>
                  <p className="text-sm font-medium text-gray-900">Deal created</p>
                  <p className="text-xs text-gray-500">
                    {deal.created_at ? new Date(deal.created_at).toLocaleDateString() : 'Unknown date'}
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
          </TabsContent>

          {/* Activities Tab Content */}
          <TabsContent value="activities" className="space-y-6">
            {/* Action Buttons Header */}
            <div className="flex flex-wrap gap-3">
              <Button 
                onClick={() => setIsAddTaskModalOpen(true)}
                className="bg-teal-600 hover:bg-teal-700"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Task
              </Button>
              
              <Button 
                onClick={() => setIsLogActivityModalOpen(true)}
                className="bg-teal-500 hover:bg-teal-600"
              >
                <Phone className="w-4 h-4 mr-2" />
                Log Activity
              </Button>
              
              <Button 
                onClick={() => setIsAddNoteModalOpen(true)}
                className="bg-teal-400 hover:bg-teal-500"
              >
                <MessageSquare className="w-4 h-4 mr-2" />
                Add Note
              </Button>
            </div>

            {/* Activities List Placeholder */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Activity className="w-5 h-5 text-teal-600" />
                  <span>Recent Activities</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {activities.length > 0 ? (
                  <div className="space-y-4">
                    {activities.slice(0, 10).map((activity, index) => (
                      <div key={activity.id || index} className="flex items-start space-x-3 p-3 border border-gray-100 rounded-lg">
                        <div className="flex-shrink-0">
                          {activity.type === 'task' && <Plus className="w-4 h-4 text-teal-600 mt-1" />}
                          {(activity.type === 'note' || (activity.type === 'email' && activity.title === 'Note')) && <MessageSquare className="w-4 h-4 text-yellow-600 mt-1" />}
                          {activity.type === 'call' && <Phone className="w-4 h-4 text-blue-600 mt-1" />}
                          {activity.type === 'email' && activity.title !== 'Note' && <Mail className="w-4 h-4 text-purple-600 mt-1" />}
                          {activity.type === 'meeting' && <User className="w-4 h-4 text-green-600 mt-1" />}
                          {!['task', 'call', 'email', 'meeting'].includes(activity.type) && <Activity className="w-4 h-4 text-gray-600 mt-1" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">
                            {activity.title}
                          </p>
                          {activity.description && (
                            <p className="text-sm text-gray-500 mt-1">{activity.description}</p>
                          )}
                          <div className="flex items-center mt-2 space-x-4 text-xs text-gray-400">
                            <span className="capitalize">{activity.type === 'email' && activity.title === 'Note' ? 'note' : activity.type}</span>
                            {activity.status && (
                              <span className={`px-2 py-1 rounded-full ${
                                activity.status === 'completed' ? 'bg-green-100 text-green-800' :
                                activity.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                                'bg-gray-100 text-gray-800'
                              }`}>
                                {activity.status}
                              </span>
                            )}
                            {activity.priority && (
                              <span className={`px-2 py-1 rounded-full text-xs ${
                                activity.priority === 'High' ? 'bg-red-100 text-red-800' :
                                activity.priority === 'Medium' ? 'bg-orange-100 text-orange-800' :
                                'bg-blue-100 text-blue-800'
                              }`}>
                                {activity.priority}
                              </span>
                            )}
                            {activity.date && <span>{new Date(activity.date).toLocaleDateString()}</span>}
                            {activity.created_at && <span>Created {new Date(activity.created_at).toLocaleDateString()}</span>}
                            {activity.assigned_to && (
                              <span className="text-blue-600 font-medium">
                                Assigned to: {teamMembers.find(m => m.id === activity.assigned_to)?.first_name || 'Unknown'}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <Activity className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                    <p className="text-gray-500 text-sm">
                      No activities yet. Use the buttons above to add tasks, log activities, or create notes.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Enhanced Edit Deal Modal */}
      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader className="pb-4">
            <DialogTitle className="text-xl font-semibold">Edit Deal</DialogTitle>
            <DialogDescription className="text-gray-600 mt-2">Update deal details and manage contact/company information</DialogDescription>
          </DialogHeader>
          
          <Tabs defaultValue="deal" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="deal">Deal Details</TabsTrigger>
              <TabsTrigger value="contact">Contact Info</TabsTrigger>
              <TabsTrigger value="company">Company Info</TabsTrigger>
            </TabsList>

            <TabsContent value="deal" className="space-y-6 py-4">
              <div className="space-y-2">
                <Label className="text-sm font-medium text-gray-700">Deal Title *</Label>
                <Input 
                  value={editingDeal.title} 
                  onChange={(e) => setEditingDeal({...editingDeal, title: e.target.value})} 
                  className="mt-1"
                />
              </div>
              
              <div className="space-y-2">
                <Label className="text-sm font-medium text-gray-700">Description</Label>
                <Textarea 
                  value={editingDeal.description} 
                  onChange={(e) => setEditingDeal({...editingDeal, description: e.target.value})} 
                  className="mt-1 min-h-[100px]"
                  rows={4}
                />
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-gray-700">Deal Value (THB)</Label>
                  <Input 
                    type="number" 
                    value={editingDeal.value} 
                    onChange={(e) => setEditingDeal({...editingDeal, value: e.target.value})} 
                    className="mt-1"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-gray-700">Stage</Label>
                  <Select value={editingDeal.stage} onValueChange={(v) => setEditingDeal({...editingDeal, stage: v})}>
                    <SelectTrigger className="mt-1">
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
                  <Select value={editingDeal.priority} onValueChange={(v) => setEditingDeal({...editingDeal, priority: v})}>
                    <SelectTrigger className="mt-1">
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
                    value={editingDeal.expected_close_date} 
                    onChange={(e) => setEditingDeal({...editingDeal, expected_close_date: e.target.value})} 
                    className="mt-1"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-gray-700">Channel</Label>
                  <Input 
                    value={editingDeal.channel} 
                    onChange={(e) => setEditingDeal({...editingDeal, channel: e.target.value})} 
                    className="mt-1"
                    placeholder="e.g., Organic Search, Cold Call"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-gray-700">Assign To</Label>
                  <Select value={editingDeal.assigned_to || 'none'} onValueChange={(v) => setEditingDeal({...editingDeal, assigned_to: v === 'none' ? '' : v})}>
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="Assign to..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Unassigned</SelectItem>
                      {teamMembers.map(m => (
                        <SelectItem key={m.id} value={m.id}>{m.first_name} {m.last_name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-gray-700">Existing Company</Label>
                  <Select 
                    value={editingDeal.company_id || 'none'} 
                    onValueChange={(v) => {
                      const newCompanyId = v === 'none' ? null : v
                      setEditingDeal({...editingDeal, company_id: newCompanyId})
                      setShowNewCompanyForm(!newCompanyId)
                    }}
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="Select existing company..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Create New Company</SelectItem>
                      {companies.map(c => (
                        <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-gray-700">Existing Contact</Label>
                  <Select 
                    value={editingDeal.contact_id || 'none'} 
                    onValueChange={(v) => {
                      const newContactId = v === 'none' ? null : v
                      setEditingDeal({...editingDeal, contact_id: newContactId})
                      setShowNewContactForm(!newContactId)
                    }}
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="Select existing contact..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Create New Contact</SelectItem>
                      {contacts.map(c => (
                        <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="contact" className="space-y-6 py-4">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-lg font-medium">Contact Information</h3>
                  <p className="text-sm text-gray-600">
                    {showNewContactForm ? 'Create new contact or update existing one' : 'View existing contact details'}
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowNewContactForm(!showNewContactForm)}
                >
                  {showNewContactForm ? 'Cancel' : 'Edit Contact'}
                </Button>
              </div>

              {showNewContactForm ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-sm font-medium text-gray-700">Contact Name *</Label>
                      <Input
                        value={editingContact.name}
                        onChange={(e) => setEditingContact({...editingContact, name: e.target.value})}
                        placeholder="Full name"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm font-medium text-gray-700">Position</Label>
                      <Input
                        value={editingContact.position}
                        onChange={(e) => setEditingContact({...editingContact, position: e.target.value})}
                        placeholder="Job title"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-sm font-medium text-gray-700">Email</Label>
                      <Input
                        type="email"
                        value={editingContact.email}
                        onChange={(e) => setEditingContact({...editingContact, email: e.target.value})}
                        placeholder="contact@example.com"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm font-medium text-gray-700">Phone</Label>
                      <Input
                        value={editingContact.phone}
                        onChange={(e) => setEditingContact({...editingContact, phone: e.target.value})}
                        placeholder="+66 123 456 789"
                      />
                    </div>
                  </div>
                </div>
              ) : (
                <div className="bg-gray-50 p-4 rounded-lg">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-gray-500">Name</p>
                      <p className="font-medium">{deal?.contacts?.name || 'No contact selected'}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Position</p>
                      <p className="font-medium">{deal?.contacts?.position || 'Not specified'}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Email</p>
                      <p className="font-medium">{deal?.contacts?.email || 'Not specified'}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Phone</p>
                      <p className="font-medium">{deal?.contacts?.phone || 'Not specified'}</p>
                    </div>
                  </div>
                </div>
              )}
            </TabsContent>

            <TabsContent value="company" className="space-y-6 py-4">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-lg font-medium">Company Information</h3>
                  <p className="text-sm text-gray-600">
                    {showNewCompanyForm ? 'Create new company or update existing one' : 'View existing company details'}
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowNewCompanyForm(!showNewCompanyForm)}
                >
                  {showNewCompanyForm ? 'Cancel' : 'Edit Company'}
                </Button>
              </div>

              {showNewCompanyForm ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-sm font-medium text-gray-700">Company Name *</Label>
                      <Input
                        value={editingCompany.name}
                        onChange={(e) => setEditingCompany({...editingCompany, name: e.target.value})}
                        placeholder="Company name"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm font-medium text-gray-700">Industry</Label>
                      <Input
                        value={editingCompany.industry}
                        onChange={(e) => setEditingCompany({...editingCompany, industry: e.target.value})}
                        placeholder="e.g., Technology, Healthcare"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-sm font-medium text-gray-700">Website</Label>
                      <Input
                        value={editingCompany.website}
                        onChange={(e) => setEditingCompany({...editingCompany, website: e.target.value})}
                        placeholder="https://company.com"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm font-medium text-gray-700">Address</Label>
                      <Input
                        value={editingCompany.address}
                        onChange={(e) => setEditingCompany({...editingCompany, address: e.target.value})}
                        placeholder="Company address"
                      />
                    </div>
                  </div>
                </div>
              ) : (
                <div className="bg-gray-50 p-4 rounded-lg">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-gray-500">Company Name</p>
                      <p className="font-medium">{deal?.companies?.name || 'No company selected'}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Industry</p>
                      <p className="font-medium">{deal?.companies?.industry || 'Not specified'}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Website</p>
                      <p className="font-medium">{deal?.companies?.website || 'Not specified'}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Address</p>
                      <p className="font-medium">{deal?.companies?.address || 'Not specified'}</p>
                    </div>
                  </div>
                </div>
              )}
            </TabsContent>
          </Tabs>
          
          <div className="flex justify-end gap-3 pt-6 border-t">
            <Button variant="outline" onClick={() => setIsEditModalOpen(false)}>Cancel</Button>
            <Button onClick={handleSaveEdit} className="bg-blue-500 hover:bg-blue-600">Save Changes</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Add Task Modal */}
      <Dialog open={isAddTaskModalOpen} onOpenChange={setIsAddTaskModalOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-2">
              <Plus className="w-5 h-5 text-blue-600" />
              <span>Add New Task</span>
            </DialogTitle>
            <DialogDescription>
              Create a new task for this deal
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label className="text-sm font-medium text-gray-700">Task Description *</Label>
              <Textarea 
                value={newTask.description} 
                onChange={(e) => setNewTask({...newTask, description: e.target.value})}
                placeholder="Describe what needs to be done..."
                className="min-h-[80px]"
                rows={3}
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-sm font-medium text-gray-700">Due Date</Label>
                <Input 
                  type="date" 
                  value={newTask.due_date} 
                  onChange={(e) => setNewTask({...newTask, due_date: e.target.value})}
                />
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-medium text-gray-700">Assign To</Label>
                <Select value={newTask.assigned_to} onValueChange={(v) => setNewTask({...newTask, assigned_to: v})}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select user..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="unassigned">Unassigned</SelectItem>
                    {teamMembers.map(m => (
                      <SelectItem key={m.id} value={m.id}>
                        {m.first_name} {m.last_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button variant="outline" onClick={() => setIsAddTaskModalOpen(false)}>Cancel</Button>
            <Button onClick={handleSaveTask} className="bg-teal-600 hover:bg-teal-700">Create Task</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Log Activity Modal */}
      <Dialog open={isLogActivityModalOpen} onOpenChange={setIsLogActivityModalOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-2">
              <Phone className="w-5 h-5 text-orange-600" />
              <span>Log Activity</span>
            </DialogTitle>
            <DialogDescription>
              Record an interaction or activity for this deal
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label className="text-sm font-medium text-gray-700">Activity Type</Label>
              <div className="grid grid-cols-3 gap-2">
                <Button 
                  variant={newActivity.type === 'call' ? 'default' : 'outline'}
                  onClick={() => setNewActivity({...newActivity, type: 'call'})}
                  className="flex items-center justify-center"
                >
                  <Phone className="w-4 h-4 mr-1" />
                  Call
                </Button>
                <Button 
                  variant={newActivity.type === 'email' ? 'default' : 'outline'}
                  onClick={() => setNewActivity({...newActivity, type: 'email'})}
                  className="flex items-center justify-center"
                >
                  <Mail className="w-4 h-4 mr-1" />
                  Email
                </Button>
                <Button 
                  variant={newActivity.type === 'meeting' ? 'default' : 'outline'}
                  onClick={() => setNewActivity({...newActivity, type: 'meeting'})}
                  className="flex items-center justify-center"
                >
                  <User className="w-4 h-4 mr-1" />
                  Meeting
                </Button>
              </div>
            </div>
            
            <div className="space-y-2">
              <Label className="text-sm font-medium text-gray-700">Date of Activity</Label>
              <Input 
                type="date" 
                value={newActivity.date} 
                onChange={(e) => setNewActivity({...newActivity, date: e.target.value})}
              />
            </div>
            
            <div className="space-y-2">
              <Label className="text-sm font-medium text-gray-700">Notes / Outcome</Label>
              <Textarea 
                value={newActivity.notes} 
                onChange={(e) => setNewActivity({...newActivity, notes: e.target.value})}
                placeholder="What happened? What was discussed? What are the next steps?"
                className="min-h-[100px]"
                rows={4}
              />
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button variant="outline" onClick={() => setIsLogActivityModalOpen(false)}>Cancel</Button>
            <Button onClick={handleSaveActivity} className="bg-teal-500 hover:bg-teal-600">Log Activity</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Add Note Modal */}
      <Dialog open={isAddNoteModalOpen} onOpenChange={setIsAddNoteModalOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-2">
              <MessageSquare className="w-5 h-5 text-green-600" />
              <span>Add Note</span>
            </DialogTitle>
            <DialogDescription>
              Add a note or comment about this deal
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label className="text-sm font-medium text-gray-700">Note</Label>
              <Textarea 
                value={newNote.content} 
                onChange={(e) => setNewNote({...newNote, content: e.target.value})}
                placeholder="Write your note here..."
                className="min-h-[120px]"
                rows={5}
              />
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button variant="outline" onClick={() => setIsAddNoteModalOpen(false)}>Cancel</Button>
            <Button 
              onClick={handleSaveNote}
              className="bg-teal-400 hover:bg-teal-500"
            >
              Add Note
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Quick Edit Contact Modal */}
      <Dialog open={isQuickEditContactOpen} onOpenChange={setIsQuickEditContactOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-2">
              <Edit className="w-5 h-5 text-blue-600" />
              <span>Quick Edit Contact</span>
            </DialogTitle>
            <DialogDescription>
              Edit contact information without leaving this page
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label className="text-sm font-medium text-gray-700">Name *</Label>
              <Input 
                value={quickEditContact.name} 
                onChange={(e) => setQuickEditContact({...quickEditContact, name: e.target.value})}
                placeholder="Contact name"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium text-gray-700">Email</Label>
              <Input 
                type="email"
                value={quickEditContact.email} 
                onChange={(e) => setQuickEditContact({...quickEditContact, email: e.target.value})}
                placeholder="contact@example.com"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium text-gray-700">Phone</Label>
              <Input 
                value={quickEditContact.phone} 
                onChange={(e) => setQuickEditContact({...quickEditContact, phone: e.target.value})}
                placeholder="+1 (555) 123-4567"
              />
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button variant="outline" onClick={() => setIsQuickEditContactOpen(false)}>Cancel</Button>
            <Button 
              onClick={handleSaveQuickEditContact}
              className="bg-blue-600 hover:bg-blue-700"
            >
              Save Changes
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}