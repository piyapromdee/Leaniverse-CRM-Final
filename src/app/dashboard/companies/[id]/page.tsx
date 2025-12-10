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
import { 
  ArrowLeft, 
  Building, 
  Globe, 
  Mail, 
  Phone, 
  MapPin,
  Users,
  DollarSign,
  TrendingUp,
  Calendar,
  Edit,
  Save,
  X,
  Award,
  Target,
  Activity,
  FileText,
  Plus,
  Briefcase,
  Hash
} from 'lucide-react'
import Link from 'next/link'
import PageHeader from '@/components/page-header'

interface Company {
  id: string
  name: string
  industry: string
  website: string
  email: string
  phone: string
  address: string
  city: string
  state: string
  country: string
  postal_code: string
  employee_count: string
  annual_revenue: string
  notes?: string | null  // Made optional since column was just added
  status: string
  created_at: string
  updated_at: string
}

interface Contact {
  id: string
  name: string
  email: string
  phone: string
  position: string
  status: string
}

interface Deal {
  id: string
  title: string
  stage: string
  value: number
  probability: number
  expected_close_date: string
  status: string
  contact_name?: string
}

export default function CompanyDetailPage() {
  const params = useParams()
  const router = useRouter()
  const supabase = createClient()
  const companyId = params.id as string

  const [company, setCompany] = useState<Company | null>(null)
  const [contacts, setContacts] = useState<Contact[]>([])
  const [deals, setDeals] = useState<Deal[]>([])
  const [loading, setLoading] = useState(true)
  const [isEditing, setIsEditing] = useState(false)
  const [editedCompany, setEditedCompany] = useState<Company | null>(null)
  const [showNoteDialog, setShowNoteDialog] = useState(false)
  const [newNote, setNewNote] = useState('')
  const [isAddingNote, setIsAddingNote] = useState(false)

  useEffect(() => {
    loadCompanyData()
  }, [companyId])

  const loadCompanyData = async () => {
    setLoading(true)
    try {
      // Load company details
      const { data: companyData, error: companyError } = await supabase
        .from('companies')
        .select('*')
        .eq('id', companyId)
        .single()

      if (companyError) {
        console.error('Error loading company:', companyError)
        router.push('/dashboard/companies')
        return
      }

      setCompany(companyData)
      setEditedCompany(companyData)

      // Load contacts for this company
      const { data: contactsData, error: contactsError } = await supabase
        .from('contacts')
        .select('*')
        .eq('company_id', companyId)
        .order('name')

      if (!contactsError && contactsData) {
        setContacts(contactsData)
      }

      // Load deals for this company
      const { data: dealsData, error: dealsError } = await supabase
        .from('deals')
        .select(`
          *,
          contacts(name)
        `)
        .eq('company_id', companyId)
        .order('created_at', { ascending: false })

      if (!dealsError && dealsData) {
        const formattedDeals = dealsData.map(deal => ({
          ...deal,
          contact_name: deal.contacts?.name
        }))
        setDeals(formattedDeals)
      }

    } catch (error) {
      console.error('Error loading company data:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSaveCompany = async () => {
    if (!editedCompany) return

    try {
      const { error } = await supabase
        .from('companies')
        .update({
          name: editedCompany.name,
          industry: editedCompany.industry,
          website: editedCompany.website,
          email: editedCompany.email,
          phone: editedCompany.phone,
          address: editedCompany.address,
          city: editedCompany.city,
          state: editedCompany.state,
          country: editedCompany.country,
          postal_code: editedCompany.postal_code,
          employee_count: editedCompany.employee_count,
          annual_revenue: editedCompany.annual_revenue,
          notes: editedCompany.notes,
          status: editedCompany.status,
          updated_at: new Date().toISOString()
        })
        .eq('id', companyId)

      if (error) {
        console.error('Error updating company:', error)
        return
      }

      setCompany(editedCompany)
      setIsEditing(false)
      loadCompanyData()
    } catch (error) {
      console.error('Error saving company:', error)
    }
  }

  const handleAddNote = async () => {
    if (!newNote.trim() || !company) {
      console.log('Add Note cancelled: no note content or company missing')
      return
    }

    if (isAddingNote) {
      console.log('Add Note prevented: already in progress')
      return
    }

    setIsAddingNote(true)
    console.log('🚀 [COMPANY ADD NOTE] Starting note addition...')
    console.log('🚀 [COMPANY ADD NOTE] Company ID:', companyId)
    console.log('🚀 [COMPANY ADD NOTE] Note content:', newNote)

    try {
      const combinedNotes = (company.notes && company.notes.trim()) 
        ? `${company.notes}\n\n[${new Date().toLocaleString()}]\n${newNote}` 
        : `[${new Date().toLocaleString()}]\n${newNote}`
      
      console.log('🚀 [COMPANY ADD NOTE] Combined notes:', combinedNotes)
      
      const { data, error } = await supabase
        .from('companies')
        .update({
          notes: combinedNotes,
          updated_at: new Date().toISOString()
        })
        .eq('id', companyId)
        .select()

      console.log('🚀 [COMPANY ADD NOTE] Database response:', { data, error })

      if (error) {
        console.error('🔥 [COMPANY ADD NOTE] Database error:', error)
        alert(`Error adding note: ${error.message}`)
        return
      }

      console.log('✅ [COMPANY ADD NOTE] Note added successfully!')
      setCompany({ ...company, notes: combinedNotes })
      setNewNote('')
      setShowNoteDialog(false)
      if (editedCompany) {
        setEditedCompany({ ...editedCompany, notes: combinedNotes })
      }
      alert('Note added successfully!')
    } catch (error: any) {
      console.error('🔥 [COMPANY ADD NOTE] Unexpected error:', error)
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
      case 'client': return 'bg-purple-100 text-purple-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const calculateTotalDealValue = () => {
    return deals.reduce((sum, deal) => sum + (deal.value || 0), 0)
  }

  const calculateOpenDeals = () => {
    return deals.filter(deal => deal.status === 'open').length
  }

  const calculateWonDeals = () => {
    return deals.filter(deal => deal.status === 'won').length
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading company details...</p>
        </div>
      </div>
    )
  }

  if (!company) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p className="text-gray-600">Company not found</p>
          <Button 
            onClick={() => router.push('/dashboard/companies')}
            className="mt-4"
          >
            Back to Companies
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      <PageHeader
        title="Company Details"
        description={company.name}
        backUrl="/dashboard/companies"
      />

      <div className="mb-6 flex items-center justify-between">
        <Button
          variant="ghost"
          onClick={() => router.back()}
          className="flex items-center gap-2"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </Button>
        <div className="flex gap-2">
          {!isEditing ? (
            <Button
              onClick={() => setIsEditing(true)}
              className="flex items-center gap-2"
            >
              <Edit className="w-4 h-4" />
              Edit Company
            </Button>
          ) : (
            <>
              <Button
                variant="outline"
                onClick={() => {
                  setIsEditing(false)
                  setEditedCompany(company)
                }}
                className="flex items-center gap-2"
              >
                <X className="w-4 h-4" />
                Cancel
              </Button>
              <Button
                onClick={handleSaveCompany}
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
                  <Building className="w-5 h-5 text-teal-600" />
                  Company Information
                </CardTitle>
                <Badge className={getStatusColor(company.status)}>
                  {company.status || 'Active'}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {isEditing ? (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Company Name</Label>
                      <Input
                        value={editedCompany?.name || ''}
                        onChange={(e) => setEditedCompany(prev => prev ? {...prev, name: e.target.value} : null)}
                      />
                    </div>
                    <div>
                      <Label>Industry</Label>
                      <Input
                        value={editedCompany?.industry || ''}
                        onChange={(e) => setEditedCompany(prev => prev ? {...prev, industry: e.target.value} : null)}
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Email</Label>
                      <Input
                        type="email"
                        value={editedCompany?.email || ''}
                        onChange={(e) => setEditedCompany(prev => prev ? {...prev, email: e.target.value} : null)}
                      />
                    </div>
                    <div>
                      <Label>Phone</Label>
                      <Input
                        value={editedCompany?.phone || ''}
                        onChange={(e) => setEditedCompany(prev => prev ? {...prev, phone: e.target.value} : null)}
                      />
                    </div>
                  </div>
                  <div>
                    <Label>Website</Label>
                    <Input
                      value={editedCompany?.website || ''}
                      onChange={(e) => setEditedCompany(prev => prev ? {...prev, website: e.target.value} : null)}
                    />
                  </div>
                  <div>
                    <Label>Address</Label>
                    <Input
                      value={editedCompany?.address || ''}
                      onChange={(e) => setEditedCompany(prev => prev ? {...prev, address: e.target.value} : null)}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>City</Label>
                      <Input
                        value={editedCompany?.city || ''}
                        onChange={(e) => setEditedCompany(prev => prev ? {...prev, city: e.target.value} : null)}
                      />
                    </div>
                    <div>
                      <Label>State/Province</Label>
                      <Input
                        value={editedCompany?.state || ''}
                        onChange={(e) => setEditedCompany(prev => prev ? {...prev, state: e.target.value} : null)}
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Country</Label>
                      <Input
                        value={editedCompany?.country || ''}
                        onChange={(e) => setEditedCompany(prev => prev ? {...prev, country: e.target.value} : null)}
                      />
                    </div>
                    <div>
                      <Label>Postal Code</Label>
                      <Input
                        value={editedCompany?.postal_code || ''}
                        onChange={(e) => setEditedCompany(prev => prev ? {...prev, postal_code: e.target.value} : null)}
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Employee Count</Label>
                      <Select
                        value={editedCompany?.employee_count || ''}
                        onValueChange={(value) => setEditedCompany(prev => prev ? {...prev, employee_count: value} : null)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select range" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="1-10">1-10</SelectItem>
                          <SelectItem value="11-50">11-50</SelectItem>
                          <SelectItem value="51-200">51-200</SelectItem>
                          <SelectItem value="201-500">201-500</SelectItem>
                          <SelectItem value="501-1000">501-1000</SelectItem>
                          <SelectItem value="1000+">1000+</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Annual Revenue</Label>
                      <Input
                        value={editedCompany?.annual_revenue || ''}
                        onChange={(e) => setEditedCompany(prev => prev ? {...prev, annual_revenue: e.target.value} : null)}
                        placeholder="e.g., $1M - $5M"
                      />
                    </div>
                  </div>
                  <div>
                    <Label>Status</Label>
                    <Select
                      value={editedCompany?.status || 'active'}
                      onValueChange={(value) => setEditedCompany(prev => prev ? {...prev, status: value} : null)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="active">Active</SelectItem>
                        <SelectItem value="inactive">Inactive</SelectItem>
                        <SelectItem value="prospect">Prospect</SelectItem>
                        <SelectItem value="client">Client</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </>
              ) : (
                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <p className="text-sm text-gray-500">Company Name</p>
                    <p className="font-medium">{company.name}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Industry</p>
                    <p className="font-medium">{company.industry || 'Not specified'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Email</p>
                    {company.email ? (
                      <a href={`mailto:${company.email}`} className="font-medium text-teal-600 hover:underline">
                        {company.email}
                      </a>
                    ) : (
                      <p className="font-medium text-gray-400">Not specified</p>
                    )}
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Phone</p>
                    {company.phone ? (
                      <a href={`tel:${company.phone}`} className="font-medium text-teal-600 hover:underline">
                        {company.phone}
                      </a>
                    ) : (
                      <p className="font-medium text-gray-400">Not specified</p>
                    )}
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Website</p>
                    {company.website ? (
                      <a 
                        href={company.website.startsWith('http') ? company.website : `https://${company.website}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-medium text-teal-600 hover:underline flex items-center gap-1"
                      >
                        <Globe className="w-4 h-4" />
                        {company.website}
                      </a>
                    ) : (
                      <p className="font-medium text-gray-400">Not specified</p>
                    )}
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Employee Count</p>
                    <p className="font-medium flex items-center gap-1">
                      <Users className="w-4 h-4 text-gray-400" />
                      {company.employee_count || 'Not specified'}
                    </p>
                  </div>
                  <div className="col-span-2">
                    <p className="text-sm text-gray-500">Address</p>
                    <p className="font-medium flex items-start gap-1">
                      <MapPin className="w-4 h-4 text-gray-400 mt-0.5" />
                      <span>
                        {company.address || 'Not specified'}
                        {(company.city || company.state || company.postal_code) && (
                          <>
                            {company.address && <br />}
                            {[company.city, company.state, company.postal_code].filter(Boolean).join(', ')}
                          </>
                        )}
                        {company.country && (
                          <>
                            <br />
                            {company.country}
                          </>
                        )}
                      </span>
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Annual Revenue</p>
                    <p className="font-medium flex items-center gap-1">
                      <DollarSign className="w-4 h-4 text-gray-400" />
                      {company.annual_revenue || 'Not specified'}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Member Since</p>
                    <p className="font-medium">
                      {new Date(company.created_at).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                      })}
                    </p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <Tabs defaultValue="contacts" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="contacts">Contacts ({contacts.length})</TabsTrigger>
              <TabsTrigger value="deals">Deals ({deals.length})</TabsTrigger>
              <TabsTrigger value="notes">Notes</TabsTrigger>
            </TabsList>

            <TabsContent value="contacts" className="mt-4">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>Company Contacts</CardTitle>
                      <CardDescription>All contacts associated with this company</CardDescription>
                    </div>
                    <Button
                      size="sm"
                      onClick={() => router.push(`/dashboard/contacts?company=${companyId}`)}
                      className="flex items-center gap-2"
                    >
                      <Plus className="w-4 h-4" />
                      Add Contact
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  {contacts.length > 0 ? (
                    <div className="space-y-4">
                      {contacts.map(contact => (
                        <Link
                          key={contact.id}
                          href={`/dashboard/contacts/${contact.id}`}
                          className="block p-4 border rounded-lg hover:bg-gray-50 transition-colors"
                        >
                          <div className="flex items-center justify-between">
                            <div>
                              <h4 className="font-semibold text-gray-900">{contact.name}</h4>
                              <p className="text-sm text-gray-600">{contact.position || 'No position'}</p>
                              <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
                                {contact.email && (
                                  <span className="flex items-center gap-1">
                                    <Mail className="w-3 h-3" />
                                    {contact.email}
                                  </span>
                                )}
                                {contact.phone && (
                                  <span className="flex items-center gap-1">
                                    <Phone className="w-3 h-3" />
                                    {contact.phone}
                                  </span>
                                )}
                              </div>
                            </div>
                            <Badge className={getStatusColor(contact.status)}>
                              {contact.status || 'Active'}
                            </Badge>
                          </div>
                        </Link>
                      ))}
                    </div>
                  ) : (
                    <p className="text-gray-500 text-center py-8">No contacts found for this company</p>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="deals" className="mt-4">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>Related Deals</CardTitle>
                      <CardDescription>All deals associated with this company</CardDescription>
                    </div>
                    <Button
                      size="sm"
                      onClick={() => router.push(`/dashboard/deals?company=${companyId}`)}
                      className="flex items-center gap-2"
                    >
                      <Plus className="w-4 h-4" />
                      Create Deal
                    </Button>
                  </div>
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
                              {deal.contact_name && (
                                <p className="text-sm text-gray-600">Contact: {deal.contact_name}</p>
                              )}
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
                            <Badge className={
                              deal.status === 'won' ? 'bg-green-100 text-green-800' : 
                              deal.status === 'lost' ? 'bg-red-100 text-red-800' : 
                              'bg-blue-100 text-blue-800'
                            }>
                              {deal.status}
                            </Badge>
                          </div>
                        </Link>
                      ))}
                    </div>
                  ) : (
                    <p className="text-gray-500 text-center py-8">No deals associated with this company</p>
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
                      <CardDescription>Additional information about this company</CardDescription>
                    </div>
                    <Button
                      size="sm"
                      onClick={() => setShowNoteDialog(true)}
                      className="flex items-center gap-2"
                    >
                      <FileText className="w-4 h-4" />
                      Add Note
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  {company.notes ? (
                    <div className="whitespace-pre-wrap text-gray-700 bg-gray-50 p-4 rounded-lg">
                      {company.notes}
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
                Company Metrics
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
                <p className="text-sm text-gray-500">Open Deals</p>
                <p className="text-2xl font-bold">{calculateOpenDeals()}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Won Deals</p>
                <p className="text-2xl font-bold text-green-600">{calculateWonDeals()}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Total Contacts</p>
                <p className="text-2xl font-bold">{contacts.length}</p>
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
                onClick={() => router.push(`/dashboard/contacts?company=${companyId}`)}
              >
                <Users className="w-4 h-4 mr-2" />
                Add Contact
              </Button>
              <Button 
                className="w-full justify-start" 
                variant="outline"
                onClick={() => router.push(`/dashboard/deals?company=${companyId}`)}
              >
                <DollarSign className="w-4 h-4 mr-2" />
                Create Deal
              </Button>
              <Button 
                className="w-full justify-start" 
                variant="outline"
                onClick={() => {
                  // Open Google Calendar to schedule meeting for this company
                  const meetingUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=Meeting with ${encodeURIComponent(company?.name || 'Company')}&details=Business meeting with ${encodeURIComponent(company?.name || 'Company')}`
                  
                  const calendarWindow = window.open(meetingUrl, '_blank')
                  
                  // Check if popup was blocked
                  if (!calendarWindow || calendarWindow.closed || typeof calendarWindow.closed == 'undefined') {
                    // Fallback: copy URL to clipboard
                    navigator.clipboard.writeText(meetingUrl).then(() => {
                      alert(`Calendar link copied to clipboard!\n\nPlease paste it in your browser to create the meeting.`)
                    }).catch(() => {
                      alert(`Please copy this calendar link:\n\n${meetingUrl}`)
                    })
                  }
                }}
              >
                <Calendar className="w-4 h-4 mr-2" />
                Schedule Meeting
              </Button>
              <Button 
                className="w-full justify-start" 
                variant="outline"
                onClick={() => {
                  // Get primary contact email or use company email if available
                  const emailAddress = company?.email || ''
                  if (emailAddress) {
                    window.open(`mailto:${emailAddress}?subject=Regarding ${encodeURIComponent(company?.name || 'your company')}`, '_blank')
                  } else {
                    alert('No email address found for this company. Please add an email address in the company details.')
                  }
                }}
              >
                <Mail className="w-4 h-4 mr-2" />
                Send Email
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Hash className="w-5 h-5 text-teal-600" />
                Company ID
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs font-mono text-gray-500 break-all">
                {company.id}
              </p>
            </CardContent>
          </Card>
        </div>
      </div>

      <Dialog open={showNoteDialog} onOpenChange={setShowNoteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Note</DialogTitle>
            <DialogDescription>
              Add a note about this company. Notes are timestamped automatically.
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
            <Button variant="outline" onClick={() => setShowNoteDialog(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleAddNote} 
              disabled={isAddingNote}
              className="bg-teal-600 hover:bg-teal-700"
            >
              {isAddingNote ? 'Adding Note...' : 'Add Note'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}