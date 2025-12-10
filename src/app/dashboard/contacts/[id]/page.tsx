'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command'
import {
  ArrowLeft,
  Mail,
  Phone,
  Building,
  Globe,
  User,
  Edit,
  Save,
  X,
  Calendar,
  DollarSign,
  Activity,
  FileText,
  MessageSquare,
  Clock,
  TrendingUp,
  Target,
  Award,
  ChevronDown,
  Plus,
  Check,
  MousePointerClick,
  Eye
} from 'lucide-react'
import Link from 'next/link'
import PageHeader from '@/components/page-header'

interface Contact {
  id: string
  name: string
  email: string
  phone: string
  company_id: string | null
  company_name?: string
  position: string
  address: string
  website: string
  notes: string
  status: string
  created_at: string
  updated_at: string
  company?: {
    id: string
    name: string
    industry: string
  }
}

interface Deal {
  id: string
  title: string
  stage: string
  value: number
  probability: number
  expected_close_date: string
  status: string
}

interface Activity {
  id: string
  type: string
  description: string
  created_at: string
  user_name?: string
  metadata?: {
    campaign_id?: string
    campaign_name?: string
    link_url?: string
    timestamp?: string
    [key: string]: any
  }
}

export default function ContactDetailPage() {
  const params = useParams()
  const router = useRouter()
  const supabase = createClient()
  const contactId = params.id as string

  const [contact, setContact] = useState<Contact | null>(null)
  const [deals, setDeals] = useState<Deal[]>([])
  const [activities, setActivities] = useState<Activity[]>([])
  const [notes, setNotes] = useState<string>('')
  const [loading, setLoading] = useState(true)
  const [isEditing, setIsEditing] = useState(false)
  const [editedContact, setEditedContact] = useState<Contact | null>(null)
  const [companies, setCompanies] = useState<any[]>([])
  const [showNoteDialog, setShowNoteDialog] = useState(false)
  const [newNote, setNewNote] = useState('')
  const [isAddingNote, setIsAddingNote] = useState(false)
  const [isCompanyDropdownOpen, setIsCompanyDropdownOpen] = useState(false)
  const [companySearchTerm, setCompanySearchTerm] = useState('')

  useEffect(() => {
    loadContactData()
    loadCompanies()
  }, [contactId])

  const loadContactData = async () => {
    setLoading(true)
    try {
      // Get current user for filtering
      const { data: { user }, error: userError } = await supabase.auth.getUser()
      if (userError || !user) {
        console.error('Error getting user:', userError)
        router.push('/dashboard/contacts')
        return
      }

      // Load contact details (filtered by user)
      const { data: contactData, error: contactError } = await supabase
        .from('contacts')
        .select(`
          *,
          company:companies(id, name, industry)
        `)
        .eq('id', contactId)
        .eq('user_id', user.id)  // Filter by current user
        .single()

      if (contactError) {
        console.error('Error loading contact:', contactError)
        router.push('/dashboard/contacts')
        return
      }

      setContact(contactData)
      setEditedContact(contactData)
      setNotes(contactData.notes || '')

      // Load related deals (filtered by user)
      const { data: dealsData, error: dealsError } = await supabase
        .from('deals')
        .select('*')
        .eq('contact_id', contactId)
        .eq('user_id', user.id)  // Filter by current user
        .order('created_at', { ascending: false })

      if (!dealsError && dealsData) {
        setDeals(dealsData)
      }

      // Load real activities from database
      console.log('🔍 [CONTACT DETAILS] Loading activities for contact:', contactId, 'user:', user.id)
      const { data: activitiesData, error: activitiesError } = await supabase
        .from('activities')
        .select('id, action_type, description, created_at, metadata, user_id')
        .eq('contact_id', contactId)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(50)

      if (!activitiesError && activitiesData) {
        console.log('✅ [CONTACT DETAILS] Loaded activities:', activitiesData.length)
        // Transform database activities to match the Activity interface
        const transformedActivities = activitiesData.map((activity: any) => ({
          id: activity.id,
          type: activity.action_type,
          description: activity.description,
          created_at: activity.created_at,
          metadata: activity.metadata
        }))
        setActivities(transformedActivities)
      } else {
        console.error('❌ [CONTACT DETAILS] Error loading activities:', activitiesError)
        setActivities([])
      }

    } catch (error) {
      console.error('Error loading contact data:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadCompanies = async () => {
    try {
      const { data, error } = await supabase
        .from('companies')
        .select('id, name')
        .order('name')

      if (!error && data) {
        setCompanies(data)
      }
    } catch (error) {
      console.error('Error loading companies:', error)
    }
  }

  const handleSaveContact = async () => {
    if (!editedContact) return

    try {
      // Get current user for creating new company
      const { data: { user }, error: userError } = await supabase.auth.getUser()
      if (userError || !user) {
        console.error('Error getting user:', userError)
        return
      }

      let finalCompanyId = editedContact.company_id

      // If user typed a new company name (company_name exists but company_id is null)
      if (!finalCompanyId && editedContact.company_name && editedContact.company_name.trim()) {
        console.log('Creating new company:', editedContact.company_name)
        
        const { data: newCompany, error: companyError } = await supabase
          .from('companies')
          .insert([{
            name: editedContact.company_name.trim(),
            industry: 'Other',
            status: 'prospect',
            user_id: user.id,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          }])
          .select()
          .single()

        if (companyError) {
          console.error('Error creating company:', companyError)
          return
        }

        if (newCompany) {
          finalCompanyId = newCompany.id
          console.log('New company created with ID:', finalCompanyId)
        }
      }

      const { error } = await supabase
        .from('contacts')
        .update({
          name: editedContact.name,
          email: editedContact.email,
          phone: editedContact.phone,
          company_id: finalCompanyId,
          position: editedContact.position,
          address: editedContact.address,
          website: editedContact.website,
          notes: editedContact.notes,
          status: editedContact.status,
          updated_at: new Date().toISOString()
        })
        .eq('id', contactId)

      if (error) {
        console.error('Error updating contact:', error)
        return
      }

      setContact({...editedContact, company_id: finalCompanyId})
      setIsEditing(false)
      setCompanySearchTerm('') // Clear search term
      loadContactData()
      loadCompanies() // Reload companies to include new one
    } catch (error) {
      console.error('Error saving contact:', error)
    }
  }

  const handleAddNote = async () => {
    if (!newNote.trim()) {
      alert('Please enter a note before saving')
      return
    }

    // Prevent double-submission
    if (isAddingNote) return
    
    setIsAddingNote(true)

    try {
      // Show loading state
      const noteToAdd = newNote.trim()
      const timestamp = new Date().toLocaleString()
      const combinedNotes = notes ? `${notes}\n\n[${timestamp}]\n${noteToAdd}` : `[${timestamp}]\n${noteToAdd}`
      
      console.log('Adding note for contact:', contactId)
      console.log('Note content:', noteToAdd)
      
      const { data, error } = await supabase
        .from('contacts')
        .update({
          notes: combinedNotes,
          updated_at: new Date().toISOString()
        })
        .eq('id', contactId)
        .select()
        .single()

      if (error) {
        console.error('Database error:', error)
        alert(`Failed to add note: ${error.message}`)
        return
      }

      if (data) {
        console.log('Note added successfully:', data)
        setNotes(combinedNotes)
        setNewNote('')
        setShowNoteDialog(false)
        if (editedContact) {
          setEditedContact({ ...editedContact, notes: combinedNotes })
        }
        // Show success feedback
        alert('Note added successfully!')
      }
    } catch (error: any) {
      console.error('Error adding note:', error)
      alert(`Error adding note: ${error.message || 'Unknown error'}`)
    } finally {
      setIsAddingNote(false)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'active': return 'bg-green-100 text-green-800'
      case 'inactive': return 'bg-gray-100 text-gray-800'
      case 'prospect': return 'bg-blue-100 text-blue-800'
      case 'lead': return 'bg-purple-100 text-purple-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'email': return <Mail className="w-4 h-4 text-blue-500" />
      case 'email_opened': return <Eye className="w-4 h-4 text-teal-500" />
      case 'email_clicked': return <MousePointerClick className="w-4 h-4 text-purple-500" />
      case 'call': return <Phone className="w-4 h-4 text-green-500" />
      case 'meeting': return <Calendar className="w-4 h-4 text-orange-500" />
      default: return <MessageSquare className="w-4 h-4 text-gray-500" />
    }
  }

  const getActivityStyle = (type: string) => {
    switch (type) {
      case 'email_opened': return 'bg-teal-50 border-teal-200'
      case 'email_clicked': return 'bg-purple-50 border-purple-200'
      case 'email': return 'bg-blue-50 border-blue-200'
      case 'call': return 'bg-green-50 border-green-200'
      case 'meeting': return 'bg-orange-50 border-orange-200'
      default: return 'bg-gray-50 border-gray-200'
    }
  }

  const calculateTotalDealValue = () => {
    return deals.reduce((sum, deal) => sum + (deal.value || 0), 0)
  }

  const calculateAvgDealProbability = () => {
    if (deals.length === 0) return 0
    const totalProb = deals.reduce((sum, deal) => sum + (deal.probability || 0), 0)
    return Math.round(totalProb / deals.length)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading contact details...</p>
        </div>
      </div>
    )
  }

  if (!contact) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p className="text-gray-600">Contact not found</p>
          <Button 
            onClick={() => router.push('/dashboard/contacts')}
            className="mt-4"
          >
            Back to Contacts
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      <PageHeader
        title="Contact Details"
        description={contact.name}
        backUrl="/dashboard/contacts"
      />

      <div className="mb-6 flex items-center justify-between">
        <Button
          variant="ghost"
          onClick={() => router.push('/dashboard/contacts')}
          className="flex items-center gap-2"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Contacts
        </Button>
        <div className="flex gap-2">
          {!isEditing ? (
            <Button
              onClick={() => setIsEditing(true)}
              className="flex items-center gap-2"
            >
              <Edit className="w-4 h-4" />
              Edit Contact
            </Button>
          ) : (
            <>
              <Button
                variant="outline"
                onClick={() => {
                  setIsEditing(false)
                  setEditedContact(contact)
                }}
                className="flex items-center gap-2"
              >
                <X className="w-4 h-4" />
                Cancel
              </Button>
              <Button
                onClick={handleSaveContact}
                className="flex items-center gap-2 bg-teal-600 hover:bg-teal-700"
              >
                <Save className="w-4 h-4" />
                Save Changes
              </Button>
            </>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <User className="w-5 h-5 text-teal-600" />
                  Contact Information
                </CardTitle>
                <Badge className={getStatusColor(contact.status)}>
                  {contact.status || 'Active'}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {isEditing ? (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="mb-2 block">Name</Label>
                      <Input
                        value={editedContact?.name || ''}
                        onChange={(e) => setEditedContact(prev => prev ? {...prev, name: e.target.value} : null)}
                      />
                    </div>
                    <div>
                      <Label className="mb-2 block">Position</Label>
                      <Input
                        value={editedContact?.position || ''}
                        onChange={(e) => setEditedContact(prev => prev ? {...prev, position: e.target.value} : null)}
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="mb-2 block">Email</Label>
                      <Input
                        type="email"
                        value={editedContact?.email || ''}
                        onChange={(e) => setEditedContact(prev => prev ? {...prev, email: e.target.value} : null)}
                      />
                    </div>
                    <div>
                      <Label className="mb-2 block">Phone</Label>
                      <Input
                        value={editedContact?.phone || ''}
                        onChange={(e) => setEditedContact(prev => prev ? {...prev, phone: e.target.value} : null)}
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="mb-2 block">Company</Label>
                      <Popover open={isCompanyDropdownOpen} onOpenChange={setIsCompanyDropdownOpen}>
                        <PopoverTrigger asChild>
                          <div className="relative">
                            <input
                              type="text"
                              placeholder="Search or create company..."
                              value={companySearchTerm || companies.find(c => c.id === editedContact?.company_id)?.name || ''}
                              onChange={(e) => {
                                const value = e.target.value
                                setCompanySearchTerm(value)
                                // Clear company_id when user types (creating new company)
                                if (editedContact) {
                                  setEditedContact({...editedContact, company_id: null, company_name: value})
                                }
                                if (!isCompanyDropdownOpen) {
                                  setIsCompanyDropdownOpen(true)
                                }
                              }}
                              onFocus={() => {
                                setIsCompanyDropdownOpen(true)
                                // Set search term to current company name when focusing
                                const currentCompany = companies.find(c => c.id === editedContact?.company_id)
                                if (currentCompany) {
                                  setCompanySearchTerm(currentCompany.name)
                                }
                              }}
                              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                            />
                            <ChevronDown className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 opacity-50" />
                          </div>
                        </PopoverTrigger>
                        <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                          <Command>
                            <CommandInput 
                              placeholder="Search companies..." 
                              value={companySearchTerm}
                              onValueChange={setCompanySearchTerm}
                            />
                            <CommandList>
                              <CommandEmpty>
                                <div 
                                  className="px-2 py-3 text-sm cursor-pointer hover:bg-accent rounded-sm flex items-center gap-2"
                                  onClick={() => {
                                    if (editedContact && companySearchTerm) {
                                      setEditedContact({...editedContact, company_name: companySearchTerm, company_id: null})
                                      setIsCompanyDropdownOpen(false)
                                    }
                                  }}
                                >
                                  <Plus className="h-4 w-4" />
                                  <span>Create "{companySearchTerm}"</span>
                                </div>
                              </CommandEmpty>
                              <CommandGroup>
                                {companies
                                  .filter(company => 
                                    company.name.toLowerCase().includes(companySearchTerm.toLowerCase())
                                  )
                                  .map((company) => (
                                    <CommandItem
                                      key={company.id}
                                      onSelect={() => {
                                        if (editedContact) {
                                          setEditedContact({...editedContact, company_id: company.id, company_name: company.name})
                                        }
                                        setCompanySearchTerm(company.name)
                                        setIsCompanyDropdownOpen(false)
                                      }}
                                    >
                                      <Check
                                        className={`mr-2 h-4 w-4 ${
                                          editedContact?.company_id === company.id ? 'opacity-100' : 'opacity-0'
                                        }`}
                                      />
                                      {company.name}
                                    </CommandItem>
                                  ))}
                              </CommandGroup>
                            </CommandList>
                          </Command>
                        </PopoverContent>
                      </Popover>
                    </div>
                    <div>
                      <Label className="mb-2 block">Status</Label>
                      <Select
                        value={editedContact?.status || 'active'}
                        onValueChange={(value) => setEditedContact(prev => prev ? {...prev, status: value} : null)}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="active">Active</SelectItem>
                          <SelectItem value="inactive">Inactive</SelectItem>
                          <SelectItem value="prospect">Prospect</SelectItem>
                          <SelectItem value="lead">Lead</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div>
                    <Label className="mb-2 block">Address</Label>
                    <Input
                      value={editedContact?.address || ''}
                      onChange={(e) => setEditedContact(prev => prev ? {...prev, address: e.target.value} : null)}
                    />
                  </div>
                  <div>
                    <Label className="mb-2 block">Website</Label>
                    <Input
                      value={editedContact?.website || ''}
                      onChange={(e) => setEditedContact(prev => prev ? {...prev, website: e.target.value} : null)}
                    />
                  </div>
                </>
              ) : (
                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <p className="text-sm text-gray-500">Name</p>
                    <p className="font-medium">{contact.name}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Position</p>
                    <p className="font-medium">{contact.position || 'Not specified'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Email</p>
                    {contact.email ? (
                      <a href={`mailto:${contact.email}`} className="font-medium text-teal-600 hover:underline">
                        {contact.email}
                      </a>
                    ) : (
                      <p className="font-medium text-gray-400">Not specified</p>
                    )}
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Phone</p>
                    {contact.phone ? (
                      <a href={`tel:${contact.phone}`} className="font-medium text-teal-600 hover:underline">
                        {contact.phone}
                      </a>
                    ) : (
                      <p className="font-medium text-gray-400">Not specified</p>
                    )}
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Company</p>
                    <p className="font-medium">{contact.company?.name || 'No company'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Industry</p>
                    <p className="font-medium">{contact.company?.industry || 'Not specified'}</p>
                  </div>
                  <div className="col-span-2">
                    <p className="text-sm text-gray-500">Address</p>
                    <p className="font-medium">{contact.address || 'Not specified'}</p>
                  </div>
                  <div className="col-span-2">
                    <p className="text-sm text-gray-500">Website</p>
                    {contact.website ? (
                      <a 
                        href={contact.website.startsWith('http') ? contact.website : `https://${contact.website}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-medium text-teal-600 hover:underline flex items-center gap-1"
                      >
                        <Globe className="w-4 h-4" />
                        {contact.website}
                      </a>
                    ) : (
                      <p className="font-medium text-gray-400">Not specified</p>
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <Tabs defaultValue="deals" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="deals">Deals ({deals.length})</TabsTrigger>
              <TabsTrigger value="activities">Activities</TabsTrigger>
              <TabsTrigger value="notes">Notes</TabsTrigger>
            </TabsList>

            <TabsContent value="deals" className="mt-4">
              <Card>
                <CardHeader>
                  <CardTitle>Related Deals</CardTitle>
                  <CardDescription>All deals associated with this contact</CardDescription>
                </CardHeader>
                <CardContent>
                  {deals.length > 0 ? (
                    <div className="space-y-4">
                      {deals.map(deal => (
                        <Link
                          key={deal.id}
                          href={`/dashboard/deals/${deal.id}`}
                          className="block p-4 border rounded-lg hover:bg-gray-50 transition-colors"
                        >
                          <div className="flex items-center justify-between">
                            <div>
                              <h4 className="font-semibold text-gray-900">{deal.title}</h4>
                              <div className="flex items-center gap-4 mt-2 text-sm text-gray-600">
                                <span className="flex items-center gap-1">
                                  <Target className="w-4 h-4" />
                                  {deal.stage}
                                </span>
                                <span className="flex items-center gap-1">
                                  <DollarSign className="w-4 h-4" />
                                  ${deal.value?.toLocaleString() || 0}
                                </span>
                                <span className="flex items-center gap-1">
                                  <TrendingUp className="w-4 h-4" />
                                  {deal.probability}%
                                </span>
                              </div>
                            </div>
                            <Badge className={deal.status === 'won' ? 'bg-green-100 text-green-800' : deal.status === 'lost' ? 'bg-red-100 text-red-800' : 'bg-blue-100 text-blue-800'}>
                              {deal.status}
                            </Badge>
                          </div>
                        </Link>
                      ))}
                    </div>
                  ) : (
                    <p className="text-gray-500 text-center py-8">No deals associated with this contact</p>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="activities" className="mt-4">
              <Card>
                <CardHeader>
                  <CardTitle>Activity Timeline</CardTitle>
                  <CardDescription>Recent interactions and activities</CardDescription>
                </CardHeader>
                <CardContent>
                  {activities.length > 0 ? (
                    <div className="space-y-4">
                      {activities.map(activity => (
                        <div key={activity.id} className={`flex gap-4 p-4 border rounded-lg ${getActivityStyle(activity.type)}`}>
                          <div className="flex-shrink-0 w-10 h-10 bg-white rounded-full flex items-center justify-center border-2 border-current">
                            {getActivityIcon(activity.type)}
                          </div>
                          <div className="flex-1">
                            <p className="font-medium text-gray-900">{activity.description}</p>
                            {/* Show campaign link if available */}
                            {(activity.type === 'email_opened' || activity.type === 'email_clicked') && activity.metadata?.campaign_name && (
                              <p className="text-sm text-gray-600 mt-1">
                                Campaign: <span className="font-medium">{activity.metadata.campaign_name}</span>
                                {activity.type === 'email_clicked' && activity.metadata?.link_url && (
                                  <span className="ml-2 text-purple-600">→ {new URL(activity.metadata.link_url).hostname}</span>
                                )}
                              </p>
                            )}
                            <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
                              <span className="flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                {new Date(activity.created_at).toLocaleString()}
                              </span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-gray-500 text-center py-8">No activities recorded yet</p>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="notes" className="mt-4">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>Notes</CardTitle>
                      <CardDescription>Additional information about this contact</CardDescription>
                    </div>
                    <Button
                      size="sm"
                      onClick={() => {
                        setNewNote('') // Clear any previous note
                        setIsAddingNote(false) // Reset loading state
                        setShowNoteDialog(true)
                      }}
                      className="flex items-center gap-2"
                    >
                      <FileText className="w-4 h-4" />
                      Add Note
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  {notes ? (
                    <div className="whitespace-pre-wrap text-gray-700 bg-gray-50 p-4 rounded-lg">
                      {notes}
                    </div>
                  ) : (
                    <p className="text-gray-500 text-center py-8">No notes available</p>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Award className="w-5 h-5 text-teal-600" />
                Performance Metrics
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-sm text-gray-500">Total Deal Value</p>
                <p className="text-2xl font-bold text-teal-600">
                  ${calculateTotalDealValue().toLocaleString()}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Number of Deals</p>
                <p className="text-2xl font-bold">{deals.length}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Average Win Probability</p>
                <p className="text-2xl font-bold">{calculateAvgDealProbability()}%</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Contact Since</p>
                <p className="font-medium">
                  {new Date(contact.created_at).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  })}
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="w-5 h-5 text-teal-600" />
                Quick Actions
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button 
                className="w-full justify-start" 
                variant="outline"
                onClick={() => contact?.email && window.open(`mailto:${contact.email}`, '_blank')}
                disabled={!contact?.email}
              >
                <Mail className="w-4 h-4 mr-2" />
                Send Email
              </Button>
              <Button 
                className="w-full justify-start" 
                variant="outline"
                onClick={() => contact?.phone && window.open(`tel:${contact.phone}`, '_self')}
                disabled={!contact?.phone}
              >
                <Phone className="w-4 h-4 mr-2" />
                Log Call
              </Button>
              <Button 
                className="w-full justify-start" 
                variant="outline"
                onClick={() => {
                  // Create a calendar event or show next steps
                  const meetingUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=Meeting with ${encodeURIComponent(contact?.name || '')}&details=Follow up meeting with ${encodeURIComponent(contact?.name || '')} from ${encodeURIComponent(contact?.company?.name || '')}`
                  
                  // Show a more helpful dialog with next steps
                  if (confirm(`Schedule meeting with ${contact?.name}?\n\nNext steps:\n1. A calendar link will open\n2. Adjust time and add details\n3. Send invitation to ${contact?.email}\n\nClick OK to open calendar`)) {
                    // Try to open calendar, with fallback for popup blockers
                    const calendarWindow = window.open(meetingUrl, '_blank')
                    
                    // Check if popup was blocked
                    if (!calendarWindow || calendarWindow.closed || typeof calendarWindow.closed == 'undefined') {
                      // Fallback: copy URL to clipboard and show instructions
                      navigator.clipboard.writeText(meetingUrl).then(() => {
                        alert(`Calendar link copied to clipboard!\n\nCalendar link has been copied. Please paste it in your browser to create the meeting.\n\nNext steps:\n• Paste the link in your browser\n• Adjust time and add details\n• Send invitation to ${contact?.email}`)
                      }).catch(() => {
                        // If clipboard fails, show the URL
                        alert(`Please copy this calendar link:\n\n${meetingUrl}\n\nNext steps:\n• Paste this link in your browser\n• Adjust time and add details\n• Send invitation to ${contact?.email}`)
                      })
                    } else {
                      // Calendar opened successfully
                      setTimeout(() => {
                        alert(`✅ Meeting scheduled!\n\nNext steps:\n• Send calendar invite to ${contact?.email}\n• Prepare meeting agenda\n• Add follow-up task after meeting`)
                      }, 1000)
                    }
                  }
                }}
              >
                <Calendar className="w-4 h-4 mr-2" />
                Schedule Meeting
              </Button>
              <Button 
                className="w-full justify-start" 
                variant="outline"
                onClick={() => router.push(`/dashboard/deals?contact=${contactId}`)}
              >
                <DollarSign className="w-4 h-4 mr-2" />
                Create Deal
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>

      <Dialog open={showNoteDialog} onOpenChange={setShowNoteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Note</DialogTitle>
            <DialogDescription>
              Add a note about this contact. Notes are timestamped automatically.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Textarea
              value={newNote}
              onChange={(e) => setNewNote(e.target.value)}
              placeholder="Enter your note here..."
              rows={4}
            />
          </div>
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => {
                setShowNoteDialog(false)
                setNewNote('')
                setIsAddingNote(false)
              }}
              disabled={isAddingNote}
            >
              Cancel
            </Button>
            <Button 
              onClick={handleAddNote} 
              className="bg-teal-600 hover:bg-teal-700"
              disabled={isAddingNote || !newNote.trim()}
            >
              {isAddingNote ? 'Adding...' : 'Add Note'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}