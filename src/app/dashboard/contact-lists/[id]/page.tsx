'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import { AlertCircle, CheckCircle } from 'lucide-react'
import {
  ArrowLeft,
  Users,
  Search,
  Edit,
  Trash2,
  RefreshCw,
  Target,
  Calendar,
  Building,
  Mail,
  Phone,
  MapPin,
  Filter,
  Download,
  UserPlus
} from 'lucide-react'

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

interface ListMember {
  id: string
  name: string
  email: string
  phone?: string
  status?: string
  position?: string
  created_at: string
  companies?: {
    name: string
    industry?: string
  } | null
  added_at?: string
  member_status?: string
}

interface Contact {
  id: string
  name: string
  email: string
  status?: string
  company_id?: string
  position?: string
  phone?: string
  created_at: string
  companies?: {
    name: string
  } | null
}

export default function ContactListDetailPage() {
  const params = useParams()
  const router = useRouter()
  const listId = params?.id as string

  const [contactList, setContactList] = useState<ContactList | null>(null)
  const [members, setMembers] = useState<ListMember[]>([])
  const [filteredMembers, setFilteredMembers] = useState<ListMember[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedStatus, setSelectedStatus] = useState('all')
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [isContactModalOpen, setIsContactModalOpen] = useState(false)
  const [editingContact, setEditingContact] = useState<Contact | null>(null)
  const [contacts, setContacts] = useState<Contact[]>([])
  const [selectedContacts, setSelectedContacts] = useState<string[]>([])
  const [contactSearchTerm, setContactSearchTerm] = useState('')
  const [editingListData, setEditingListData] = useState({
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

  const supabase = createClient()

  useEffect(() => {
    if (listId) {
      loadListDetails()
    }
  }, [listId])

  useEffect(() => {
    filterMembers()
  }, [members, searchTerm, selectedStatus])

  const loadListDetails = async () => {
    try {
      setIsLoading(true)

      const { data: { user }, error: userError } = await supabase.auth.getUser()
      if (userError || !user) {
        router.push('/auth/sign-in')
        return
      }

      // Load contact list details
      const { data: listData, error: listError } = await supabase
        .from('contact_lists')
        .select('*')
        .eq('id', listId)
        .eq('user_id', user.id)
        .single()

      if (listError) {
        console.error('Error loading contact list:', listError)
        if (listError.code === 'PGRST116') {
          // List not found
          router.push('/dashboard/contact-lists')
          return
        }
      } else {
        setContactList(listData)
      }

      // Load list members based on list type
      if (listData) {
        await loadListMembers(listData)
      }

      // Load all contacts for modal functionality
      await loadAllContacts()

    } catch (error) {
      console.error('Error loading list details:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const loadAllContacts = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: contactsData, error: contactsError } = await supabase
        .from('contacts')
        .select(`
          id,
          name,
          email,
          phone,
          status,
          company_id,
          position,
          created_at,
          companies (
            name
          )
        `)
        .eq('user_id', user.id)
        .order('name')

      if (contactsError) {
        console.error('Error loading contacts:', contactsError)
        const { data: simpleContacts } = await supabase
          .from('contacts')
          .select('id, name, email, phone, status, company_id, position, created_at')
          .eq('user_id', user.id)
          .order('name')

        setContacts((simpleContacts || []).map(c => ({ ...c, companies: null })))
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
    } catch (error) {
      console.error('Error loading contacts:', error)
    }
  }

  const loadListMembers = async (list: ContactList) => {
    try {
      let membersData: ListMember[] = []

      if (list.type === 'static') {
        // For static lists, get members from contact_list_members table
        const { data, error } = await supabase
          .from('contact_list_members')
          .select(`
            added_at,
            status,
            contacts (
              id,
              name,
              email,
              phone,
              status,
              position,
              created_at,
              companies (
                name,
                industry
              )
            )
          `)
          .eq('list_id', listId)
          .eq('status', 'active')

        if (error) {
          console.error('Error loading static list members:', error)
        } else {
          membersData = (data || []).map(item => {
            // Handle contacts as array (Supabase returns joined data as array)
            const contact = Array.isArray(item.contacts) ? item.contacts[0] : item.contacts
            const companies = Array.isArray(contact?.companies) && contact.companies.length > 0
              ? contact.companies[0]
              : null

            return {
              id: contact?.id || '',
              name: contact?.name || '',
              email: contact?.email || '',
              phone: contact?.phone,
              status: contact?.status,
              position: contact?.position,
              created_at: contact?.created_at || '',
              companies: companies,
              added_at: item.added_at,
              member_status: item.status
            }
          }).filter(member => member.id) // Filter out null contacts
        }

      } else if (list.type === 'dynamic') {
        // For dynamic lists, evaluate criteria to get current members
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return

        let query = supabase
          .from('contacts')
          .select(`
            id,
            name,
            email,
            phone,
            status,
            position,
            created_at,
            companies (
              name,
              industry
            )
          `)
          .eq('user_id', user.id)

        // Apply dynamic filters
        if (list.filter_criteria) {
          const criteria = list.filter_criteria

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

          // For company name filter, we need to handle it differently
          if (criteria.company_name && criteria.company_name !== '') {
            // This is a complex join query that might need adjustment based on your schema
            query = query.filter('companies.name', 'ilike', `%${criteria.company_name}%`)
          }
        }

        const { data, error } = await query.order('name')

        if (error) {
          console.error('Error loading dynamic list members:', error)
        } else {
          membersData = (data || []).map(contact => ({
            ...contact,
            id: contact.id || '',
            name: contact.name || '',
            email: contact.email || '',
            companies: Array.isArray(contact.companies) && contact.companies.length > 0
              ? contact.companies[0]
              : null
          }))
        }
      }

      setMembers(membersData)

    } catch (error) {
      console.error('Error loading list members:', error)
    }
  }

  const filterMembers = () => {
    let filtered = members

    // Apply search filter
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase()
      filtered = filtered.filter(member =>
        member.name?.toLowerCase().includes(searchLower) ||
        member.email?.toLowerCase().includes(searchLower) ||
        member.companies?.name?.toLowerCase().includes(searchLower) ||
        member.position?.toLowerCase().includes(searchLower)
      )
    }

    // Apply status filter
    if (selectedStatus !== 'all') {
      filtered = filtered.filter(member => member.status === selectedStatus)
    }

    setFilteredMembers(filtered)
  }

  const updateContactListCount = async (list: ContactList) => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      let count = 0

      if (list.type === 'static') {
        // Count members in contact_list_members table
        const { count: staticCount, error } = await supabase
          .from('contact_list_members')
          .select('*', { count: 'exact', head: true })
          .eq('list_id', listId)
          .eq('status', 'active')

        if (!error) {
          count = staticCount || 0
        }
      } else if (list.type === 'dynamic' && list.filter_criteria) {
        // Count contacts that match dynamic criteria
        let query = supabase
          .from('contacts')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', user.id)

        const criteria = list.filter_criteria

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
      const { data, error } = await supabase
        .from('contact_lists')
        .update({ contact_count: count })
        .eq('id', listId)
        .select()
        .single()

      if (!error && data) {
        setContactList(data)
      }

      return count
    } catch (error) {
      console.error('Error updating contact count:', error)
      return 0
    }
  }

  const handleRefreshList = async () => {
    if (!contactList) return

    setIsRefreshing(true)
    try {
      await loadListMembers(contactList)

      // Update the contact count in the database
      await updateContactListCount(contactList)

    } catch (error) {
      console.error('Error refreshing list:', error)
    } finally {
      setIsRefreshing(false)
    }
  }

  const handleEditList = () => {
    if (!contactList) return

    // Pre-fill the modal with current list data
    setEditingListData({
      name: contactList.name,
      description: contactList.description || '',
      type: contactList.type,
      filter_criteria: contactList.filter_criteria || {
        status: '',
        company_name: '',
        position: '',
        created_after: '',
        created_before: ''
      }
    })

    // For static lists, load current members
    if (contactList.type === 'static') {
      const currentMemberIds = members.map(m => m.id)
      setSelectedContacts(currentMemberIds)
    }

    setIsEditModalOpen(true)
  }

  const handleSaveList = async () => {
    try {
      if (!contactList) return

      // Validate list type
      if (editingListData.type !== 'static' && editingListData.type !== 'dynamic') {
        alert(`Invalid list type: "${editingListData.type}". Must be either "static" or "dynamic".`)
        return
      }

      // Ensure type is properly set
      const validType = editingListData.type === 'static' ? 'static' : 'dynamic'

      const listData = {
        name: editingListData.name,
        description: editingListData.description,
        type: validType,
        filter_criteria: validType === 'dynamic' ? editingListData.filter_criteria : null,
        updated_at: new Date().toISOString()
      }

      console.log('=== SAVING LIST ===')
      console.log('List ID:', listId)
      console.log('List data being sent:', JSON.stringify(listData, null, 2))
      console.log('editingListData.type:', editingListData.type)
      console.log('validType:', validType)

      const response = await supabase
        .from('contact_lists')
        .update(listData)
        .eq('id', listId)
        .select()
        .single()

      console.log('=== SUPABASE RESPONSE ===')
      console.log('Full response:', response)
      console.log('Data:', response.data)
      console.log('Error:', response.error)

      const { data, error } = response

      if (error) {
        console.error('=== ERROR DETAILS ===')
        console.error('Error object:', error)
        console.error('Error keys:', Object.keys(error))
        console.error('Error.message:', error.message)
        console.error('Error.details:', error.details)
        console.error('Error.hint:', error.hint)
        console.error('Error.code:', error.code)
        throw error
      }

      console.log('=== SUCCESS ===')
      console.log('List updated successfully:', data)

      // Update the local state
      setContactList(data)

      // For static lists, update members if needed
      if (validType === 'static') {
        const currentMemberIds = members.map(m => m.id)
        const newMemberIds = selectedContacts

        // Remove members that are no longer selected
        const toRemove = currentMemberIds.filter(id => !newMemberIds.includes(id))
        if (toRemove.length > 0) {
          await supabase
            .from('contact_list_members')
            .delete()
            .eq('list_id', listId)
            .in('contact_id', toRemove)
        }

        // Add new members
        const toAdd = newMemberIds.filter(id => !currentMemberIds.includes(id))
        if (toAdd.length > 0) {
          const newMembers = toAdd.map(contactId => ({
            list_id: listId,
            contact_id: contactId,
            status: 'active'
          }))

          await supabase
            .from('contact_list_members')
            .insert(newMembers)
        }
      }

      // Update the contact count
      await updateContactListCount(data)

      // Reload list members to reflect changes
      await loadListMembers(data)

      setIsEditModalOpen(false)
    } catch (error) {
      console.error('Error saving list:', error)
      console.error('Error type:', typeof error)
      console.error('Error stringified:', JSON.stringify(error, null, 2))

      const errorMessage = error && typeof error === 'object' && 'message' in error
        ? (error as any).message
        : String(error)

      alert('Failed to save contact list: ' + errorMessage)
    }
  }

  const handleDeleteList = async () => {
    if (!confirm('Are you sure you want to delete this contact list? This action cannot be undone.')) {
      return
    }

    try {
      const { error } = await supabase
        .from('contact_lists')
        .delete()
        .eq('id', listId)

      if (error) {
        console.error('Error deleting list:', error)
        alert('Failed to delete contact list')
      } else {
        router.push('/dashboard/contact-lists')
      }
    } catch (error) {
      console.error('Error deleting list:', error)
      alert('Failed to delete contact list')
    }
  }

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

  const handleEditContact = (contact: ListMember) => {
    setEditingContact({
      id: contact.id,
      name: contact.name,
      email: contact.email,
      phone: contact.phone,
      status: contact.status,
      position: contact.position,
      company_id: '',
      created_at: contact.created_at,
      companies: contact.companies
    })
    setIsContactModalOpen(true)
  }

  const handleSaveContact = async () => {
    try {
      if (!editingContact) return

      const contactData = {
        name: editingContact.name,
        email: editingContact.email,
        phone: editingContact.phone,
        status: editingContact.status,
        position: editingContact.position,
        updated_at: new Date().toISOString()
      }

      const { data, error } = await supabase
        .from('contacts')
        .update(contactData)
        .eq('id', editingContact.id)
        .select()
        .single()

      if (error) throw error

      // Update the members list with the new contact data
      setMembers(members.map(member =>
        member.id === editingContact.id
          ? { ...member, ...contactData }
          : member
      ))

      setIsContactModalOpen(false)
      setEditingContact(null)
    } catch (error) {
      console.error('Error saving contact:', error)
      alert('Failed to save contact: ' + (error as any).message)
    }
  }

  const handleDeleteContact = async (contactId: string, contactName: string) => {
    if (!confirm(`Are you sure you want to delete ${contactName}? This will permanently remove the contact from your CRM.`)) {
      return
    }

    try {
      // Delete the contact from the contacts table
      const { error } = await supabase
        .from('contacts')
        .delete()
        .eq('id', contactId)

      if (error) throw error

      // Remove the contact from the local members list
      setMembers(members.filter(member => member.id !== contactId))

      // Update the contact count if needed
      if (contactList) {
        await updateContactListCount(contactList)
      }
    } catch (error) {
      console.error('Error deleting contact:', error)
      alert('Failed to delete contact: ' + (error as any).message)
    }
  }

  const exportMembers = () => {
    if (filteredMembers.length === 0) return

    const csvContent = [
      ['Name', 'Email', 'Phone', 'Company', 'Position', 'Status', 'Added Date'],
      ...filteredMembers.map(member => [
        member.name || '',
        member.email || '',
        member.phone || '',
        member.companies?.name || '',
        member.position || '',
        member.status || '',
        member.added_at ? new Date(member.added_at).toLocaleDateString() :
          new Date(member.created_at).toLocaleDateString()
      ])
    ].map(row => row.map(field => `"${field}"`).join(',')).join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${contactList?.name || 'contact-list'}-members.csv`
    a.click()
    window.URL.revokeObjectURL(url)
  }

  if (isLoading) {
    return (
      <div className="space-y-6 p-4 md:p-6">
        <div className="text-center py-8">Loading contact list details...</div>
      </div>
    )
  }

  if (!contactList) {
    return (
      <div className="space-y-6 p-4 md:p-6">
        <div className="text-center py-8">
          <p className="text-gray-500 mb-4">Contact list not found</p>
          <Link href="/dashboard/contact-lists">
            <Button variant="outline">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Contact Lists
            </Button>
          </Link>
        </div>
      </div>
    )
  }

  const uniqueStatuses = [...new Set(members.map(m => m.status).filter(Boolean))]

  return (
    <div className="space-y-6 p-4 md:p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Link href="/dashboard/contact-lists">
            <Button variant="outline" size="sm">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
          </Link>
          <div>
            <div className="flex items-center space-x-3">
              <h1 className="text-2xl font-bold text-gray-900">{contactList.name}</h1>
              <Badge variant={contactList.type === 'dynamic' ? 'default' : 'secondary'}>
                {contactList.type}
              </Badge>
            </div>
            {contactList.description && (
              <p className="text-gray-600 mt-1">{contactList.description}</p>
            )}
          </div>
        </div>

        <div className="flex items-center space-x-2">
          {contactList.type === 'dynamic' && (
            <Button
              variant="outline"
              onClick={handleRefreshList}
              disabled={isRefreshing}
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          )}
          <Button
            variant="outline"
            onClick={exportMembers}
            disabled={filteredMembers.length === 0}
          >
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>
          <Button
            variant="outline"
            onClick={handleEditList}
          >
            <Edit className="w-4 h-4 mr-2" />
            Edit
          </Button>
          <Button
            variant="outline"
            onClick={handleDeleteList}
            className="text-red-600 hover:text-red-700"
          >
            <Trash2 className="w-4 h-4 mr-2" />
            Delete
          </Button>
        </div>
      </div>

      {/* List Info */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Users className="w-5 h-5" />
            <span>{filteredMembers.length} Members</span>
            {searchTerm || selectedStatus !== 'all' ? (
              <span className="text-sm font-normal text-gray-500">
                (filtered from {members.length} total)
              </span>
            ) : null}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {contactList.type === 'dynamic' && contactList.filter_criteria && (
            <div className="mb-6">
              <h3 className="text-sm font-medium text-gray-900 mb-3">Active Filters:</h3>
              <div className="flex flex-wrap gap-2">
                {contactList.filter_criteria.status && (
                  <Badge variant="outline" className="text-xs">
                    <Filter className="w-3 h-3 mr-1" />
                    Status: {contactList.filter_criteria.status}
                  </Badge>
                )}
                {contactList.filter_criteria.company_name && (
                  <Badge variant="outline" className="text-xs">
                    <Building className="w-3 h-3 mr-1" />
                    Company: {contactList.filter_criteria.company_name}
                  </Badge>
                )}
                {contactList.filter_criteria.position && (
                  <Badge variant="outline" className="text-xs">
                    <UserPlus className="w-3 h-3 mr-1" />
                    Position: {contactList.filter_criteria.position}
                  </Badge>
                )}
                {contactList.filter_criteria.created_after && (
                  <Badge variant="outline" className="text-xs">
                    <Calendar className="w-3 h-3 mr-1" />
                    After: {new Date(contactList.filter_criteria.created_after).toLocaleDateString()}
                  </Badge>
                )}
                {contactList.filter_criteria.created_before && (
                  <Badge variant="outline" className="text-xs">
                    <Calendar className="w-3 h-3 mr-1" />
                    Before: {new Date(contactList.filter_criteria.created_before).toLocaleDateString()}
                  </Badge>
                )}
              </div>
            </div>
          )}

          {/* Search and Filters */}
          <div className="flex items-center space-x-4 mb-6">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="Search members..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>

            {uniqueStatuses.length > 0 && (
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Statuses</option>
                {uniqueStatuses.map(status => (
                  <option key={status} value={status}>{status}</option>
                ))}
              </select>
            )}
          </div>

          {/* Members List */}
          {filteredMembers.length === 0 ? (
            <div className="text-center py-8">
              <Users className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">
                {searchTerm || selectedStatus !== 'all' ? 'No members match your filters' : 'No members in this list'}
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredMembers.map((member) => (
                <div key={member.id} className="border rounded-lg p-4 hover:shadow-sm transition-shadow">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        <h4 className="font-medium text-gray-900">
                          {member.name || 'No name'}
                        </h4>
                        {member.status && (
                          <Badge variant="outline" className="text-xs">
                            {member.status}
                          </Badge>
                        )}
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-sm text-gray-600">
                        <div className="flex items-center space-x-2">
                          <Mail className="w-4 h-4 text-gray-400" />
                          <span>{member.email}</span>
                        </div>

                        {member.phone && (
                          <div className="flex items-center space-x-2">
                            <Phone className="w-4 h-4 text-gray-400" />
                            <span>{member.phone}</span>
                          </div>
                        )}

                        {member.companies?.name && (
                          <div className="flex items-center space-x-2">
                            <Building className="w-4 h-4 text-gray-400" />
                            <span>{member.companies.name}</span>
                          </div>
                        )}

                        {member.position && (
                          <div className="flex items-center space-x-2">
                            <UserPlus className="w-4 h-4 text-gray-400" />
                            <span>{member.position}</span>
                          </div>
                        )}
                      </div>

                      <div className="mt-3 flex items-center space-x-4 text-xs text-gray-500">
                        <div className="flex items-center space-x-1">
                          <Calendar className="w-3 h-3" />
                          <span>
                            {contactList.type === 'static' && member.added_at
                              ? `Added ${new Date(member.added_at).toLocaleDateString()}`
                              : `Contact since ${new Date(member.created_at).toLocaleDateString()}`
                            }
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex-shrink-0 ml-4 flex items-center space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEditContact(member)}
                        className="text-teal-600 hover:text-teal-700 hover:bg-teal-50 border-teal-300"
                        title="Edit contact details"
                      >
                        <Edit className="w-4 h-4 mr-1" />
                        Edit
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDeleteContact(member.id, member.name)}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50 border-red-300"
                        title="Delete contact from CRM"
                      >
                        <Trash2 className="w-4 h-4 mr-1" />
                        Delete
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit List Modal */}
      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Contact List</DialogTitle>
          </DialogHeader>

          <div className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="list-name">List Name</Label>
              <Input
                id="list-name"
                placeholder="e.g., Hot Leads, VIP Customers"
                value={editingListData.name}
                onChange={(e) => setEditingListData({ ...editingListData, name: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="list-description">Description (Optional)</Label>
              <Textarea
                id="list-description"
                placeholder="Brief description of this contact list..."
                value={editingListData.description}
                onChange={(e) => setEditingListData({ ...editingListData, description: e.target.value })}
                rows={2}
              />
            </div>

            <div className="space-y-2">
              <Label>List Type</Label>
              <Tabs
                value={editingListData.type}
                onValueChange={(value) => setEditingListData({ ...editingListData, type: value as 'static' | 'dynamic' })}
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
                        value={editingListData.filter_criteria.status || 'all'}
                        onValueChange={(value) => setEditingListData({
                          ...editingListData,
                          filter_criteria: { ...editingListData.filter_criteria, status: value === 'all' ? '' : value }
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
                        value={editingListData.filter_criteria.company_name}
                        onChange={(e) => setEditingListData({
                          ...editingListData,
                          filter_criteria: { ...editingListData.filter_criteria, company_name: e.target.value }
                        })}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Position Contains</Label>
                      <Input
                        placeholder="e.g., Manager, Director"
                        value={editingListData.filter_criteria.position}
                        onChange={(e) => setEditingListData({
                          ...editingListData,
                          filter_criteria: { ...editingListData.filter_criteria, position: e.target.value }
                        })}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Created After</Label>
                      <Input
                        type="date"
                        value={editingListData.filter_criteria.created_after}
                        onChange={(e) => setEditingListData({
                          ...editingListData,
                          filter_criteria: { ...editingListData.filter_criteria, created_after: e.target.value }
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
                </TabsContent>
              </Tabs>
            </div>

            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => setIsEditModalOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleSaveList} disabled={!editingListData.name.trim()}>
                Update List
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Contact Modal */}
      <Dialog open={isContactModalOpen} onOpenChange={setIsContactModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Contact</DialogTitle>
          </DialogHeader>

          {editingContact && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="contact-name">Name</Label>
                <Input
                  id="contact-name"
                  value={editingContact.name}
                  onChange={(e) => setEditingContact({ ...editingContact, name: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="contact-email">Email</Label>
                <Input
                  id="contact-email"
                  type="email"
                  value={editingContact.email}
                  onChange={(e) => setEditingContact({ ...editingContact, email: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="contact-phone">Phone</Label>
                <Input
                  id="contact-phone"
                  value={editingContact.phone || ''}
                  onChange={(e) => setEditingContact({ ...editingContact, phone: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="contact-position">Position</Label>
                <Input
                  id="contact-position"
                  value={editingContact.position || ''}
                  onChange={(e) => setEditingContact({ ...editingContact, position: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label>Status</Label>
                <Select
                  value={editingContact.status || 'lead'}
                  onValueChange={(value) => setEditingContact({ ...editingContact, status: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="lead">Lead</SelectItem>
                    <SelectItem value="prospect">Prospect</SelectItem>
                    <SelectItem value="customer">Customer</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex justify-end space-x-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setIsContactModalOpen(false)
                    setEditingContact(null)
                  }}
                >
                  Cancel
                </Button>
                <Button onClick={handleSaveContact}>
                  Save Changes
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}