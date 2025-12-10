'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Checkbox } from '@/components/ui/checkbox'
import { Plus, Users, Filter, Edit, Trash2, Mail, RefreshCw, AlertCircle, CheckCircle, Target, Search } from 'lucide-react'

interface ContactList {
  id: string
  name: string
  description?: string
  type: 'static' | 'dynamic'
  contact_count: number
  filter_criteria?: any
  created_at: string
  updated_at: string
}

interface Contact {
  id: string
  name: string
  email: string
  status?: string
  company_id?: string
  position?: string
  created_at: string
  companies?: {
    name: string
  } | null
}

export default function ContactListsPage() {
  const [lists, setLists] = useState<ContactList[]>([])
  const [contacts, setContacts] = useState<Contact[]>([])
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [editingList, setEditingList] = useState<ContactList | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [tablesMissing, setTablesMissing] = useState(false)
  const [newList, setNewList] = useState({
    name: '',
    description: '',
    type: 'dynamic' as 'static' | 'dynamic',
    filter_criteria: {
      status: '',
      company_name: '',
      position: '',
      created_after: '',
      created_before: ''
    }
  })
  const [selectedContacts, setSelectedContacts] = useState<string[]>([])
  const [contactSearchTerm, setContactSearchTerm] = useState('')

  const supabase = createClient()

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      setIsLoading(true)

      const { data: { user }, error: userError } = await supabase.auth.getUser()
      if (userError || !user) {
        console.log('User not authenticated')
        return
      }

      // Load contact lists - handle table not existing
      const { data: listsData, error: listsError } = await supabase
        .from('contact_lists')
        .select('*')
        .eq('user_id', user.id)
        .order('name')

      if (listsError) {
        console.error('Error loading contact lists:', listsError)
        // Check if table doesn't exist
        if (listsError.message?.includes('relation') && listsError.message?.includes('does not exist')) {
          console.log('Contact lists table does not exist. Please run the SQL setup script.')
          setTablesMissing(true)
          setLists([])
        }
      } else {
        setLists(listsData || [])
        setTablesMissing(false)

        // Update counts for all lists to ensure they're accurate
        if (listsData && listsData.length > 0) {
          for (const list of listsData) {
            await updateContactListCount(list.id, list)
          }
          // Reload lists after updating counts
          const { data: updatedLists } = await supabase
            .from('contact_lists')
            .select('*')
            .eq('user_id', user.id)
            .order('name')

          if (updatedLists) {
            setLists(updatedLists)
          }
        }
      }

      // Load all contacts with better error handling
      try {
        // TEMPORARY FIX: Use org_id instead of user_id for data filtering
        const CORRECT_ORG_ID = '8a6b275c-4265-4c46-a680-8cd4b78f14db';
        const ADMIN_USER_ID = '9c351314-9fcd-4f81-8b23-adc3f4c3ba1d';

        let contactsQuery = supabase
          .from('contacts')
          .select(`
            id,
            name,
            email,
            status,
            company_id,
            position,
            created_at,
            companies (
              name
            )
          `)
          .order('name')

        // Apply org_id filter based on user type
        if (user.id === ADMIN_USER_ID) {
          // Admin sees ALL contacts without any filtering
          console.log('🔍 [CONTACT LISTS] Admin user - showing ALL contacts')
        } else if (user.id === '1b0bfda8-d888-4ceb-8170-5cfc156f3277') {
          // Specific sales user with known org_id
          contactsQuery = contactsQuery.eq('org_id', CORRECT_ORG_ID)
          console.log('🔍 [CONTACT LISTS] TEMP FIX: Using org_id filter:', CORRECT_ORG_ID)
        } else {
          // For other users, try org_id first, fallback to user_id
          contactsQuery = contactsQuery.or(`org_id.eq.${user.id},user_id.eq.${user.id}`)
          console.log('🔍 [CONTACT LISTS] Using org_id or user_id filter for user:', user.id)
        }

        const { data: contactsData, error: contactsError } = await contactsQuery

        if (contactsError) {
          console.error('Error loading contacts:', contactsError)
          // Try simple query without join
          const { data: simpleContacts, error: simpleError } = await supabase
            .from('contacts')
            .select('id, name, email, status, company_id, position, created_at')
            .eq('user_id', user.id)
            .order('name')

          if (simpleError) {
            console.error('Simple contacts query also failed:', simpleError)
            setContacts([])
          } else {
            setContacts((simpleContacts || []).map(c => ({ ...c, companies: null as null })))
          }
        } else {
          // Transform companies from array to single object or null
          const transformedContacts = (contactsData || []).map(contact => ({
            ...contact,
            companies: Array.isArray(contact.companies) && contact.companies.length > 0
              ? contact.companies[0]
              : null
          }))
          setContacts(transformedContacts)
        }
      } catch (err) {
        console.error('Error in contacts query:', err)
        setContacts([])
      }

    } catch (error) {
      console.error('Error loading data:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleCreateList = () => {
    if (tablesMissing) {
      alert('Please set up the database tables first by running the SQL script in Supabase.')
      return
    }

    setEditingList(null)
    setNewList({
      name: '',
      description: '',
      type: 'dynamic',
      filter_criteria: {
        status: '',
        company_name: '',
        position: '',
        created_after: '',
        created_before: ''
      }
    })
    setSelectedContacts([])
    setIsModalOpen(true)
  }

  const updateContactListCount = async (listId: string, listData: any) => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      let count = 0

      if (listData.type === 'static') {
        // Count members in contact_list_members table
        const { count: staticCount, error } = await supabase
          .from('contact_list_members')
          .select('*', { count: 'exact', head: true })
          .eq('list_id', listId)
          .eq('status', 'active')

        if (!error) {
          count = staticCount || 0
        }
      } else if (listData.type === 'dynamic' && listData.filter_criteria) {
        // Count contacts that match dynamic criteria
        let query = supabase
          .from('contacts')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', user.id)

        const criteria = listData.filter_criteria

        if (criteria.status && criteria.status !== '') {
          query = query.eq('status', criteria.status)
        }

        if (criteria.position && criteria.position !== '') {
          query = query.ilike('position', `%${criteria.position}%`)
        }

        if (criteria.created_after && criteria.created_after !== '') {
          query = query.gte('created_at', criteria.created_after)
        }

        if (criteria.created_before && criteria.created_before !== '') {
          query = query.lte('created_at', criteria.created_before)
        }

        const { count: dynamicCount, error } = await query

        if (!error) {
          count = dynamicCount || 0
        }
      }

      // Update the contact_count field
      await supabase
        .from('contact_lists')
        .update({ contact_count: count })
        .eq('id', listId)

      return count
    } catch (error) {
      console.error('Error updating contact count:', error)
      return 0
    }
  }

  const handleSaveList = async () => {
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser()
      if (userError || !user) return

      // Validate and ensure type is correct
      const validatedType = (newList.type === 'static' || newList.type === 'dynamic')
        ? newList.type
        : 'dynamic' // fallback to dynamic if invalid

      console.log('=== CREATING/UPDATING CONTACT LIST ===')
      console.log('newList.type:', newList.type)
      console.log('validatedType:', validatedType)

      const listData = {
        name: newList.name,
        description: newList.description,
        type: validatedType,
        filter_criteria: validatedType === 'dynamic' ? newList.filter_criteria : null,
        user_id: user.id,
        updated_at: new Date().toISOString()
      }

      console.log('listData being sent to Supabase:', JSON.stringify(listData, null, 2))

      let savedList
      if (editingList) {
        const { data, error } = await supabase
          .from('contact_lists')
          .update(listData)
          .eq('id', editingList.id)
          .select()
          .single()

        if (error) {
          console.error('=== UPDATE ERROR ===', error)
          throw error
        }
        savedList = data
      } else {
        const { data, error } = await supabase
          .from('contact_lists')
          .insert(listData)
          .select()
          .single()

        if (error) {
          console.error('=== INSERT ERROR ===', error)
          console.error('Error details:', error.details)
          console.error('Error hint:', error.hint)
          console.error('Error message:', error.message)
          throw error
        }
        savedList = data
      }

      console.log('✅ List saved successfully:', savedList)

      // For static lists, handle selected contacts
      if (validatedType === 'static' && !editingList && selectedContacts.length > 0) {
        try {
          const members = selectedContacts.map(contactId => ({
            list_id: savedList.id,
            contact_id: contactId,
            status: 'active'
          }))

          const { error: membersError } = await supabase
            .from('contact_list_members')
            .insert(members)

          if (membersError) {
            console.warn('Error adding members to list:', membersError)
          }
        } catch (membersErr) {
          console.warn('Error with contact_list_members table:', membersErr)
        }
      }

      // Update the contact count
      await updateContactListCount(savedList.id, savedList)

      setIsModalOpen(false)
      loadData()
    } catch (error) {
      console.error('=== COMPLETE ERROR CATCH ===', error)
      console.error('Error type:', typeof error)
      console.error('Error keys:', error ? Object.keys(error) : 'no keys')

      if (error instanceof Error && error.message.includes('relation') && error.message.includes('does not exist')) {
        alert('Database tables not set up yet. Please run the SQL setup script in Supabase.')
      } else {
        const errorMsg = (error as any).message || 'Unknown error'
        let alertMessage = `Failed to save contact list: ${errorMsg}`

        // Add helpful context for constraint errors
        if (errorMsg.includes('contact_lists_type_check') || errorMsg.includes('check constraint')) {
          alertMessage += '\n\n⚠️ DATABASE FIX NEEDED:\n1. Open Supabase Dashboard\n2. Go to SQL Editor\n3. Run the file: FIX_CONTACT_LISTS_COMPLETE.sql\n4. Try again'
        }

        alert(alertMessage)
      }
    }
  }

  // Filter out "All Contacts" list from database to avoid redundancy with the hardcoded card
  const filteredLists = lists.filter(list => {
    // Exclude any list named "All Contacts" (case-insensitive)
    if (list.name.toLowerCase() === 'all contacts') {
      return false
    }

    // Apply search filter
    return (
      list.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (list.description && list.description.toLowerCase().includes(searchTerm.toLowerCase()))
    )
  })

  const getFilteredContacts = () => {
    if (!contactSearchTerm) return contacts

    return contacts.filter(contact => {
      const searchLower = contactSearchTerm.toLowerCase()
      return (
        contact.name?.toLowerCase().includes(searchLower) ||
        contact.email?.toLowerCase().includes(searchLower) ||
        contact.companies?.name?.toLowerCase().includes(searchLower)
      )
    })
  }

  return (
    <div className="space-y-6 p-4 md:p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Contact Lists</h1>
          <p className="text-gray-600">Create and manage dynamic contact segments for targeted campaigns</p>
        </div>
        <Button onClick={handleCreateList}>
          <Plus className="w-4 h-4 mr-2" />
          Create List
        </Button>
      </div>

      {/* Search */}
      <div className="flex items-center space-x-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <Input
            placeholder="Search contact lists..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Lists Grid */}
      {isLoading ? (
        <div className="text-center py-8">Loading contact lists...</div>
      ) : tablesMissing ? (
        <Card>
          <CardContent className="text-center py-8">
            <AlertCircle className="w-12 h-12 text-yellow-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">Database Setup Required</h3>
            <p className="text-gray-500 mb-4">
              The contact lists tables need to be created in your database.
            </p>
            <div className="bg-gray-50 p-4 rounded-lg text-left max-w-2xl mx-auto">
              <p className="text-sm font-medium text-gray-900 mb-2">To set up the database:</p>
              <ol className="text-sm text-gray-600 space-y-2">
                <li>1. Open your Supabase dashboard</li>
                <li>2. Go to the SQL Editor</li>
                <li>3. Copy and run the SQL script from: <code className="bg-gray-200 px-2 py-1 rounded">contact_lists_database_setup.sql</code></li>
                <li>4. Refresh this page after running the script</li>
              </ol>
            </div>
            <Button
              onClick={() => window.location.reload()}
              className="mt-4"
            >
              Refresh Page
            </Button>
          </CardContent>
        </Card>
      ) : filteredLists.length === 0 ? (
        <Card>
          <CardContent className="text-center py-8">
            <Users className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">No contact lists found</p>
            <Button onClick={handleCreateList} className="mt-4">
              Create your first contact list
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* All Contacts Card - Shows Total Count */}
          <Card className="hover:shadow-md transition-shadow cursor-pointer group border-2 border-teal-200 bg-gradient-to-br from-teal-50 to-white">
            <Link href="/dashboard/contacts" className="block">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="flex items-center space-x-2 group-hover:text-teal-600 transition-colors">
                      <span>All Contacts</span>
                      <Badge className="bg-teal-500">Default</Badge>
                    </CardTitle>
                    <CardDescription className="mt-1">
                      Complete contact database
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Users className="w-5 h-5 text-teal-600" />
                      <span className="text-lg font-bold text-teal-700">
                        {contacts.length} contacts
                      </span>
                    </div>
                  </div>
                  <p className="text-xs text-gray-400 mt-4">
                    Click to view all contacts →
                  </p>
                </div>
              </CardContent>
            </Link>
          </Card>

          {/* Custom Contact Lists */}
          {filteredLists.map((list) => (
            <Card key={list.id} className="hover:shadow-md transition-shadow cursor-pointer group">
              <Link href={`/dashboard/contact-lists/${list.id}`} className="block">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="flex items-center space-x-2 group-hover:text-teal-600 transition-colors">
                        <span>{list.name}</span>
                        <Badge variant={list.type === 'dynamic' ? 'default' : 'secondary'}>
                          {list.type}
                        </Badge>
                      </CardTitle>
                      <CardDescription className="mt-1">
                        {list.description || 'No description'}
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <Users className="w-4 h-4 text-gray-500" />
                        <span className="text-sm text-gray-600">
                          {list.contact_count || 0} contacts
                        </span>
                      </div>
                    </div>

                    {list.type === 'dynamic' && list.filter_criteria && (
                      <div className="space-y-2">
                        <p className="text-xs font-medium text-gray-500">FILTERS:</p>
                        <div className="space-y-1">
                          {list.filter_criteria.status && (
                            <Badge variant="outline" className="text-xs">
                              Status: {list.filter_criteria.status}
                            </Badge>
                          )}
                          {list.filter_criteria.company_name && (
                            <Badge variant="outline" className="text-xs">
                              Company: {list.filter_criteria.company_name}
                            </Badge>
                          )}
                          {list.filter_criteria.position && (
                            <Badge variant="outline" className="text-xs">
                              Position: {list.filter_criteria.position}
                            </Badge>
                          )}
                        </div>
                      </div>
                    )}

                    <p className="text-xs text-gray-400 mt-4">
                      Click to view members →
                    </p>
                  </div>
                </CardContent>
              </Link>
            </Card>
          ))}
        </div>
      )}

      {/* Create/Edit Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingList ? 'Edit Contact List' : 'Create New Contact List'}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="list-name">List Name</Label>
              <Input
                id="list-name"
                placeholder="e.g., Hot Leads, VIP Customers"
                value={newList.name}
                onChange={(e) => setNewList({ ...newList, name: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="list-description">Description (Optional)</Label>
              <Textarea
                id="list-description"
                placeholder="Brief description of this contact list..."
                value={newList.description}
                onChange={(e) => setNewList({ ...newList, description: e.target.value })}
                rows={2}
              />
            </div>

            <div className="space-y-2">
              <Label>List Type</Label>
              <Tabs
                value={newList.type}
                onValueChange={(value) => setNewList({ ...newList, type: value as 'static' | 'dynamic' })}
              >
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="dynamic">
                    <Target className="w-4 h-4 mr-2" />
                    Dynamic (Auto-updates)
                  </TabsTrigger>
                  <TabsTrigger value="static">
                    <Users className="w-4 h-4 mr-2" />
                    Static (Manual selection)
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="dynamic" className="space-y-4">
                  <div className="bg-blue-50 p-4 rounded-lg">
                    <div className="flex items-start space-x-2">
                      <AlertCircle className="w-4 h-4 text-blue-500 mt-0.5" />
                      <div>
                        <p className="text-sm font-medium text-blue-900">Dynamic Lists</p>
                        <p className="text-xs text-blue-700">
                          Automatically include contacts that match your criteria.
                          The list updates as contacts are added or changed in your CRM.
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Contact Status</Label>
                      <Select
                        value={newList.filter_criteria.status || 'all'}
                        onValueChange={(value) => setNewList({
                          ...newList,
                          filter_criteria: { ...newList.filter_criteria, status: value === 'all' ? '' : value }
                        })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Any status" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Any status</SelectItem>
                          <SelectItem value="lead">Lead</SelectItem>
                          <SelectItem value="prospect">Prospect</SelectItem>
                          <SelectItem value="customer">Customer</SelectItem>
                          <SelectItem value="inactive">Inactive</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>Company Name Contains</Label>
                      <Input
                        placeholder="e.g., Tech, Corp"
                        value={newList.filter_criteria.company_name}
                        onChange={(e) => setNewList({
                          ...newList,
                          filter_criteria: { ...newList.filter_criteria, company_name: e.target.value }
                        })}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Position Contains</Label>
                      <Input
                        placeholder="e.g., Manager, Director"
                        value={newList.filter_criteria.position}
                        onChange={(e) => setNewList({
                          ...newList,
                          filter_criteria: { ...newList.filter_criteria, position: e.target.value }
                        })}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Created After</Label>
                      <Input
                        type="date"
                        value={newList.filter_criteria.created_after}
                        onChange={(e) => setNewList({
                          ...newList,
                          filter_criteria: { ...newList.filter_criteria, created_after: e.target.value }
                        })}
                      />
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="static" className="space-y-4">
                  <div className="bg-green-50 p-4 rounded-lg">
                    <div className="flex items-start space-x-2">
                      <CheckCircle className="w-4 h-4 text-green-500 mt-0.5" />
                      <div>
                        <p className="text-sm font-medium text-green-900">Static Lists</p>
                        <p className="text-xs text-green-700">
                          Manually select specific contacts. The list only changes when you add or remove contacts.
                        </p>
                      </div>
                    </div>
                  </div>

                  {!editingList && (
                    <div>
                      <div className="flex items-center space-x-2 mb-4">
                        <Label>Select Contacts</Label>
                        <div className="relative flex-1 max-w-xs">
                          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                          <Input
                            placeholder="Search contacts..."
                            value={contactSearchTerm}
                            onChange={(e) => setContactSearchTerm(e.target.value)}
                            className="pl-10"
                          />
                        </div>
                      </div>

                      <div className="h-[200px] border rounded-md p-4 overflow-y-auto">
                        <div className="space-y-2">
                          {getFilteredContacts().map(contact => (
                            <div key={contact.id} className="flex items-center space-x-2">
                              <Checkbox
                                id={contact.id}
                                checked={selectedContacts.includes(contact.id)}
                                onCheckedChange={(checked) => {
                                  if (checked) {
                                    setSelectedContacts([...selectedContacts, contact.id])
                                  } else {
                                    setSelectedContacts(selectedContacts.filter(id => id !== contact.id))
                                  }
                                }}
                              />
                              <Label htmlFor={contact.id} className="text-sm cursor-pointer flex-1">
                                <span className="font-medium">{contact.name || 'No name'}</span>
                                <span className="text-gray-500 ml-2">{contact.email}</span>
                                {contact.companies?.name && (
                                  <span className="text-gray-400 ml-2">({contact.companies.name})</span>
                                )}
                              </Label>
                            </div>
                          ))}
                          {getFilteredContacts().length === 0 && (
                            <div className="text-center py-4 text-gray-500">
                              {contactSearchTerm ? `No contacts match "${contactSearchTerm}"` : 'No contacts available'}
                            </div>
                          )}
                        </div>
                      </div>

                      <p className="text-xs text-gray-500 mt-2">
                        Selected: {selectedContacts.length} contacts
                      </p>
                    </div>
                  )}
                </TabsContent>
              </Tabs>
            </div>

            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => setIsModalOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleSaveList} disabled={!newList.name.trim()}>
                {editingList ? 'Update' : 'Create'} List
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}