'use client'

import React, { useState, useEffect, useMemo } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from '@/components/ui/command'
import { Users, Search, Plus, Edit, Trash2, Mail, Phone, Building, Globe, Activity, ChevronDown, Check, Building2 } from 'lucide-react'
import PageHeader from '@/components/page-header'
import { cn } from '@/lib/utils'

// Helper function to generate initials for avatars
const getInitials = (name: string) => {
  return name
    .split(' ')
    .map(word => word.charAt(0))
    .join('')
    .toUpperCase()
}

// Contacts page with searchable company input
export default function ContactsPage() {
  const supabase = createClient()
  const searchParams = useSearchParams()
  const router = useRouter()
  const companyFilter = searchParams.get('company')
  const [contacts, setContacts] = useState<any[]>([])
  const [companies, setCompanies] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [sortBy, setSortBy] = useState('name')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc')
  const [statusFilter, setStatusFilter] = useState('all')
  const [companySearchTerm, setCompanySearchTerm] = useState('')
  const [showCreateCompanyInline, setShowCreateCompanyInline] = useState(false)
  const [isCompanyDropdownOpen, setIsCompanyDropdownOpen] = useState(false)
  const [newCompanyData, setNewCompanyData] = useState({
    name: '',
    industry: '',
    status: 'prospect' as 'prospect' | 'active' | 'inactive'
  })
  
  // Load contacts and companies from Supabase when component mounts
  useEffect(() => {
    console.log('🔄 [CONTACTS] Component mounted, loading data...')
    loadContactsFromDatabase()
    loadCompaniesFromDatabase()
  }, [companyFilter]) // Reload when company filter changes

  
  const loadContactsFromDatabase = async () => {
    console.log('🔄 [DEBUG] Loading contacts via API...')
    console.log('🔍 [DEBUG] Company filter:', companyFilter)
    try {
      // Build API URL with optional company filter
      let apiUrl = '/api/contacts'
      if (companyFilter) {
        apiUrl += `?company_id=${companyFilter}`
      }

      const response = await fetch(apiUrl)

      if (!response.ok) {
        console.error('❌ [DEBUG] API Error:', response.status, response.statusText)
        return
      }

      const responseData = await response.json()
      console.log('✅ [DEBUG] Loaded contacts from API:', responseData)

      // Handle both { contacts: [...] } and direct array formats
      const contactsArray = responseData.contacts || responseData || []

      // Transform database data to match UI format
      const formattedContacts = contactsArray.map((contact: any) => ({
        ...contact,
        company: contact.companies?.name || contact.company?.name || 'No Company',
        avatar: getInitials(contact.name || 'Unknown'),
        lastContact: contact.updated_at ? new Date(contact.updated_at).toLocaleDateString() : 'N/A'
      }))

      console.log('✅ [DEBUG] Formatted contacts count:', formattedContacts.length)
      // Use only database data (no mock data)
      setContacts(formattedContacts)
    } catch (err) {
      console.error('❌ [DEBUG] Unexpected error loading contacts:', err)
    }
  }
  
  const loadCompaniesFromDatabase = async () => {
    console.log('🔄 [DEBUG] Loading companies via API...')
    try {
      const response = await fetch('/api/companies')

      if (!response.ok) {
        console.error('❌ [DEBUG] API Error:', response.status, response.statusText)
        return
      }

      const responseData = await response.json()
      console.log('✅ [DEBUG] Loaded companies from API:', responseData)

      // Handle both { companies: [...] } and direct array formats
      const companiesData = responseData.companies || responseData || []

      // Then get contact counts for each company using direct Supabase count
      const companiesWithCounts = await Promise.all(
        companiesData.map(async (company: any) => {
          const { count, error: countError } = await supabase
            .from('contacts')
            .select('id', { count: 'exact', head: true })
            .eq('company_id', company.id)

          if (countError) {
            console.error(`❌ [DEBUG] Error counting contacts for company ${company.id}:`, countError)
            return {
              ...company,
              contactCount: 0
            }
          }

          console.log(`✅ [DEBUG] Company "${company.name}" has ${count} contacts`)
          return {
            ...company,
            contactCount: count || 0
          }
        })
      )

      console.log('✅ [DEBUG] Companies with contact counts:', companiesWithCounts)

      // Set companies with contact counts directly from database only
      setCompanies(companiesWithCounts)
      console.log('✅ [DEBUG] Final companies with counts:', companiesWithCounts.map((c: any) => ({ name: c.name, contactCount: c.contactCount })))
    } catch (err) {
      console.error('❌ [DEBUG] Unexpected error loading companies:', err)
    }
  }
  // Read tab from URL parameter, default to 'contacts'
  const initialTab = searchParams.get('tab') === 'companies' ? 'companies' : 'contacts'
  const [activeTab, setActiveTab] = useState(initialTab)
  const [isContactModalOpen, setIsContactModalOpen] = useState(false)
  const [isCompanyModalOpen, setIsCompanyModalOpen] = useState(false)
  const [editingContact, setEditingContact] = useState<any>(null)
  const [editingCompany, setEditingCompany] = useState<any>(null)
  
  const [contactForm, setContactForm] = useState({
    name: '',
    company_id: null as string | null,
    company_name: '', // For UI display purposes
    email: '',
    phone: '',
    status: 'Manager'
  })
  
  
  const [companyForm, setCompanyForm] = useState({
    name: '',
    industry: '',
    size: '',
    website: '',
    phone: '',
    status: 'customer'
  })

  // Filter and sort contacts
  const filteredContacts = useMemo(() => {
    let filtered = contacts.filter(contact => {
      // Text search
      const matchesSearch = contact.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           contact.company.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           contact.email.toLowerCase().includes(searchTerm.toLowerCase())
      
      // Status filter
      const matchesStatus = statusFilter === 'all' || contact.status === statusFilter
      
      return matchesSearch && matchesStatus
    })
    
    // Sorting logic
    filtered.sort((a, b) => {
      let valueA, valueB
      switch (sortBy) {
        case 'name':
          valueA = a.name.toLowerCase()
          valueB = b.name.toLowerCase()
          break
        case 'company':
          valueA = a.company?.toLowerCase() || ''
          valueB = b.company?.toLowerCase() || ''
          break
        case 'created_at':
          valueA = new Date(a.created_at).getTime()
          valueB = new Date(b.created_at).getTime()
          break
        case 'updated_at':
          valueA = new Date(a.updated_at || a.created_at).getTime()
          valueB = new Date(b.updated_at || b.created_at).getTime()
          break
        default:
          valueA = a.name.toLowerCase()
          valueB = b.name.toLowerCase()
      }
      
      if (valueA < valueB) return sortOrder === 'asc' ? -1 : 1
      if (valueA > valueB) return sortOrder === 'asc' ? 1 : -1
      return 0
    })
    
    return filtered
  }, [contacts, searchTerm, sortBy, sortOrder, statusFilter])

  const filteredCompanies = useMemo(() => {
    let filtered = companies.filter(company => {
      // Text search
      const matchesSearch = company.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           company.industry?.toLowerCase().includes(searchTerm.toLowerCase())
      
      return matchesSearch
    })
    
    // Sorting logic for companies
    filtered.sort((a, b) => {
      let valueA, valueB
      switch (sortBy) {
        case 'name':
          valueA = a.name.toLowerCase()
          valueB = b.name.toLowerCase()
          break
        case 'company':
        case 'industry':
          valueA = a.industry?.toLowerCase() || ''
          valueB = b.industry?.toLowerCase() || ''
          break
        case 'created_at':
          valueA = new Date(a.created_at).getTime()
          valueB = new Date(b.created_at).getTime()
          break
        case 'updated_at':
          valueA = new Date(a.updated_at || a.created_at).getTime()
          valueB = new Date(b.updated_at || b.created_at).getTime()
          break
        default:
          valueA = a.name.toLowerCase()
          valueB = b.name.toLowerCase()
      }
      
      if (valueA < valueB) return sortOrder === 'asc' ? -1 : 1
      if (valueA > valueB) return sortOrder === 'asc' ? 1 : -1
      return 0
    })
    
    return filtered
  }, [companies, searchTerm, sortBy, sortOrder])

  // Smart company filtering for Create and Link workflow
  const filteredCompaniesForSelection = useMemo(() => {
    if (!companySearchTerm.trim()) return companies.slice(0, 10) // Show first 10 if no search
    
    const searchLower = companySearchTerm.toLowerCase()
    const filtered = companies.filter(company =>
      company.name.toLowerCase().includes(searchLower) ||
      company.industry?.toLowerCase().includes(searchLower)
    )
    
    // Check if search term exactly matches any existing company
    const exactMatch = companies.some(c => 
      c.name.toLowerCase() === searchLower
    )
    
    // Add "Create new" option if no exact match and search term is meaningful
    if (companySearchTerm.trim().length >= 2 && !exactMatch) {
      return [
        ...filtered,
        {
          id: '__create_new__',
          name: `+ Create "${companySearchTerm}"`,
          industry: '',
          isCreateOption: true,
          searchTerm: companySearchTerm
        }
      ]
    }
    
    return filtered
  }, [companies, companySearchTerm])

  // Handler functions
  const handleCreateCompanyInline = async () => {
    try {
      setLoading(true)
      console.log('🚀 [CREATE COMPANY INLINE] Starting company creation:', newCompanyData)
      
      // Get current user for RLS policy compliance
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      const companyData = {
        name: newCompanyData.name.trim(),
        industry: newCompanyData.industry.trim() || null,
        status: newCompanyData.status,
        user_id: user.id
      }

      console.log('🔍 [CREATE COMPANY INLINE] Company data to insert:', companyData)

      const { data, error } = await supabase
        .from('companies')
        .insert([companyData])
        .select()
        .single()

      if (error) {
        console.error('🔥 [CREATE COMPANY INLINE] Supabase error:', error)
        throw error
      }

      console.log('✅ [CREATE COMPANY INLINE] Company created successfully:', data)

      // Update companies list in state
      const newCompanyWithCount = { ...data, contactCount: 0 }
      setCompanies(prev => [...prev, newCompanyWithCount])
      
      // Link to contact form
      setContactForm({
        ...contactForm,
        company_id: data.id.toString(),
        company_name: data.name
      })
      
      // Reset inline form and close
      setShowCreateCompanyInline(false)
      setNewCompanyData({ name: '', industry: '', status: 'prospect' })
      setCompanySearchTerm('')
      setIsCompanyDropdownOpen(false)
      
      console.log('✅ [CREATE COMPANY INLINE] Company linked to contact form')
      
    } catch (error: any) {
      console.error('🔥 [CREATE COMPANY INLINE] Failed to create company:', error)
      alert(`Failed to create company: ${error.message}`)
    } finally {
      setLoading(false)
    }
  }

  const handleAddContact = () => {
    setEditingContact(null)
    setLoading(false) // Ensure loading state is reset 
    
    // Pre-select company if there's a company filter
    let defaultCompanyId = null
    let defaultCompanyName = ''
    
    if (companyFilter) {
      const filteredCompany = companies.find(c => c.id === companyFilter)
      if (filteredCompany) {
        defaultCompanyId = filteredCompany.id
        defaultCompanyName = filteredCompany.name
      }
    }
    
    // Reset form to empty state
    setContactForm({ 
      name: '', 
      company_id: defaultCompanyId, 
      company_name: defaultCompanyName, 
      email: '', 
      phone: '', 
      status: 'Manager' 
    });
    setIsContactModalOpen(true)
  }

  const handleEditContact = (contact: any) => {
    setEditingContact(contact)
    setLoading(false) // Ensure loading state is reset
    setContactForm({
      name: contact.name || '',
      company_id: contact.company_id || null,
      company_name: contact.company || contact.company_name || '',
      email: contact.email || '',
      phone: contact.phone || '',
      status: contact.status || 'Manager'
    })
    setIsContactModalOpen(true)
  }

  const handleSaveContact = async () => {
    console.log("🚀 [DEBUG] 1. === STARTING handleSaveContact function ===")
    console.log("[DEBUG] 1.1. Current contactForm state:", JSON.stringify(contactForm, null, 2))
    console.log("[DEBUG] 1.2. Is editing existing contact?", !!editingContact)
    console.log("[DEBUG] 1.3. Available companies:", companies.length, companies.map(c => ({ id: c.id, name: c.name })))
    
    // Detailed validation
    if (!contactForm.name || !contactForm.email) {
      console.error("🔥 [DEBUG] VALIDATION FAILED:")
      console.error("- Name:", contactForm.name)
      console.error("- Email:", contactForm.email)
      alert("Please fill in all required fields (Name and Email)")
      return
    }
    
    console.log("✅ [DEBUG] 1.4. Validation passed")

    setLoading(true)
    console.log("🔄 [DEBUG] 1.5. Loading state set to true")
    
    // Quick connectivity test
    console.log("[DEBUG] 1.6. Testing Supabase connectivity...")
    try {
      const connectivityTest = await supabase.from('contacts').select('id').limit(1)
      console.log("[DEBUG] 1.7. Connectivity test result:", connectivityTest.error ? 'FAILED' : 'SUCCESS')
      if (connectivityTest.error) {
        throw new Error(`Connection test failed: ${connectivityTest.error.message}`)
      }
    } catch (connectError) {
      console.error("[DEBUG] 1.8. Connectivity test error:", connectError)
      throw new Error(`Unable to connect to database. Please check your internet connection and try again.`)
    }
    
    try {
      if (editingContact) {
        console.log("[DEBUG] 2.0. === UPDATING EXISTING CONTACT ===")
        console.log("[DEBUG] 2.1. Contact ID to update:", editingContact.id)
        
        // Get current user for RLS policy compliance (UPDATE operations might need it too)
        console.log("[DEBUG] 2.2. Verifying user authentication...")
        let user, userError
        
        try {
          const authResult = await supabase.auth.getUser()
          user = authResult.data.user
          userError = authResult.error
        } catch (fetchError) {
          console.error("[DEBUG] 2.3. Network error during auth check:", fetchError)
          throw new Error(`Network error: Unable to verify authentication. Please check your internet connection.`)
        }
        
        if (userError) {
          console.error("[DEBUG] 2.4. Error getting user:", userError)
          throw new Error(`Authentication error: ${userError.message}`)
        }

        if (!user) {
          console.error("[DEBUG] 2.5. No user found - user not logged in")
          throw new Error("You must be logged in to save a contact. Please refresh the page and try again.")
        }

        console.log("[DEBUG] 2.5. User authenticated for update:")
        console.log("- User ID:", user.id)
        console.log("- User email:", user.email)
        
        // Map position/role values to database-compatible status values
        const mapPositionToStatus = (position: string) => {
          // Map positions to appropriate status values that satisfy the database constraint
          switch (position.toLowerCase()) {
            case 'ceo':
            case 'cto':
            case 'manager':
            case 'director':
            case 'developer':
            case 'designer':
            case 'sales manager':
            case 'marketing manager':
              return 'customer' // All active employees
            case 'assistant':
            case 'other':
              return 'customer' // Default to active
            default:
              return 'customer' // Fallback to active
          }
        }
        
        const updateData = {
          name: contactForm.name,
          company_id: contactForm.company_id === '' ? null : contactForm.company_id, // Handle empty string as null
          email: contactForm.email,
          phone: contactForm.phone || null, // Handle empty phone as null
          status: 'customer' // FORCE to 'active' for testing
        }
        
        console.log("[DEBUG] 2.5.5. Position mapping for update:")
        console.log("- Original position:", contactForm.status)
        console.log("- Mapped to status:", mapPositionToStatus(contactForm.status))
        
        console.log("[DEBUG] 2.6. Update data to send to Supabase:", JSON.stringify(updateData, null, 2))
        
        console.log("[DEBUG] 2.7. About to call Supabase UPDATE...")
        const { data, error } = await supabase
          .from('contacts')
          .update(updateData)
          .eq('id', editingContact.id)
          .select(`
            *,
            company:companies(id, name)
          `)

        console.log("[DEBUG] 2.8. Supabase UPDATE response:")
        console.log("- Data:", data)
        console.log("- Error:", error)

        if (error) {
          console.error("💥 [DEBUG] 2.9. UPDATE Error occurred:")
          console.error("- Error code:", error.code)
          console.error("- Error message:", error.message)
          console.error("- Error details:", error.details)
          
          // Provide user-friendly error messages
          if (error.message?.includes('contacts_status_check')) {
            throw new Error('Invalid contact status. The position value could not be saved. Please try again.')
          } else if (error.message?.includes('unique') && error.message?.includes('email')) {
            throw new Error('A contact with this email already exists. Please use a different email address.')
          } else if (error.message?.includes('foreign key')) {
            throw new Error('Invalid company selection. Please select a valid company or leave it empty.')
          } else {
            throw new Error(`Database error: ${error.message}`)
          }
        }

        console.log("✅ [DEBUG] 2.10. Successfully updated contact in Supabase:", data)
        
        // Update local state
        setContacts(contacts.map(contact =>
          contact.id === editingContact.id
            ? { ...contact, ...contactForm, avatar: getInitials(contactForm.name) }
            : contact
        ))
        
        console.log("✅ [DEBUG] 2.11. Local contacts state updated for existing contact")
        
      } else {
        console.log("[DEBUG] 3.0. === CREATING NEW CONTACT ===")
        
        // 1. Get current user for RLS policy compliance
        console.log("[DEBUG] 3.1. Getting current user for RLS policy...")
        let user, userError
        
        try {
          const authResult = await supabase.auth.getUser()
          user = authResult.data.user
          userError = authResult.error
        } catch (fetchError) {
          console.error("[DEBUG] 3.2. Network error during auth check:", fetchError)
          throw new Error(`Network error: Unable to verify authentication. Please check your internet connection.`)
        }
        
        if (userError) {
          console.error("[DEBUG] 3.3. Error getting user:", userError)
          throw new Error(`Authentication error: ${userError.message}`)
        }

        if (!user) {
          console.error("[DEBUG] 3.4. No user found - user not logged in")
          throw new Error("You must be logged in to create a contact. Please refresh the page and try again.")
        }

        console.log("[DEBUG] 3.4. User authenticated successfully:")
        console.log("- User ID:", user.id)
        console.log("- User email:", user.email)
        
        // 2. Create contact data with user_id for RLS policy
        // Map position/role values to database-compatible status values
        const mapPositionToStatus = (position: string) => {
          // Map positions to appropriate status values that satisfy the database constraint
          switch (position.toLowerCase()) {
            case 'ceo':
            case 'cto':
            case 'manager':
            case 'director':
            case 'developer':
            case 'designer':
            case 'sales manager':
            case 'marketing manager':
              return 'customer' // All active employees
            case 'assistant':
            case 'other':
              return 'customer' // Default to active
            default:
              return 'customer' // Fallback to active
          }
        }
        
        const mappedStatus = mapPositionToStatus(contactForm.status)
        console.log("[DEBUG] 3.4.4. Final status check before creating newContactData:")
        console.log("- Mapped status value:", mappedStatus)
        console.log("- Will use status:", mappedStatus)
        
        // Handle company creation if user typed a new company name
        let finalCompanyId = contactForm.company_id
        if (!finalCompanyId && contactForm.company_name && contactForm.company_name.trim()) {
          console.log("[DEBUG] 3.4.5. Creating new company:", contactForm.company_name)
          
          const newCompanyData = {
            name: contactForm.company_name.trim(),
            industry: 'Other',
            status: 'prospect',
            user_id: user.id
          }
          
          const { data: companyData, error: companyError } = await supabase
            .from('companies')
            .insert([newCompanyData])
            .select()
            .single()
          
          if (companyError) {
            console.error("[DEBUG] 3.4.6. Error creating company:", companyError)
            throw new Error(`Failed to create company: ${companyError.message}`)
          }
          
          finalCompanyId = companyData.id
          console.log("[DEBUG] 3.4.7. Created new company with ID:", finalCompanyId)
          
          // Refresh companies list
          await loadCompaniesFromDatabase()
        }
        
        // Create complete contact data
        const newContactData = {
          name: contactForm.name.trim(),
          email: contactForm.email.trim(),
          phone: contactForm.phone || null,
          company_id: finalCompanyId || null,
          status: 'customer', // Use valid database constraint value
          user_id: user.id  // Add user_id for RLS policy compliance
        }
        
        console.log("[DEBUG] 3.4.3. Complete contact data for creation:")
        console.log("- name:", newContactData.name)
        console.log("- email:", newContactData.email) 
        console.log("- phone:", newContactData.phone)
        console.log("- company_id:", newContactData.company_id)
        console.log("- status:", newContactData.status)
        console.log("- user_id:", newContactData.user_id)
        
        console.log("[DEBUG] 3.4.5. Position mapping DEBUG:")
        console.log("- Original position:", contactForm.status)
        console.log("- Original position type:", typeof contactForm.status)
        console.log("- Original position lowercase:", contactForm.status?.toLowerCase())
        console.log("- Mapped to status:", mappedStatus)
        console.log("- Mapped status type:", typeof mappedStatus)
        console.log("- Is mapped status 'active'?", mappedStatus === 'active')
        
        console.log("[DEBUG] 3.5. Final contact data to send:", JSON.stringify(newContactData, null, 2))
        
        console.log("[DEBUG] 3.9. About to call Supabase INSERT with user_id...")
        
        const { data, error } = await supabase
          .from('contacts')
          .insert([newContactData])
          .select(`
            *,
            company:companies(id, name)
          `)

        console.log("[DEBUG] 3.10. Supabase INSERT response received:")
        console.log("- Data:", data)
        console.log("- Error:", error)
        console.log("- Data type:", typeof data)
        console.log("- Data length:", data?.length)

        if (error) {
          console.error("💥 [DEBUG] 3.11. INSERT Error occurred:")
          console.error("- Error code:", error.code)
          console.error("- Error message:", error.message)
          console.error("- Error details:", error.details)
          console.error("- Error hint:", error.hint)
          console.error("- Full error object:", JSON.stringify(error, null, 2))
          
          // Provide user-friendly error messages
          if (error.message?.includes('contacts_status_check') || error.message?.includes('check constraint')) {
            throw new Error('Invalid contact status. Please try again with a different position/role.')
          } else if (error.message?.includes('unique') && error.message?.includes('email')) {
            throw new Error('A contact with this email already exists. Please use a different email address.')
          } else if (error.message?.includes('foreign key')) {
            throw new Error('Invalid company selection. Please select a valid company or leave it empty.')
          } else if (error.message?.includes('not-null constraint')) {
            throw new Error('Required field is missing. Please fill in all required fields.')
          } else {
            throw new Error(`Unable to save contact. Please try again. (${error.message})`)
          }
        }

        if (!data || data.length === 0) {
          console.error("💥 [DEBUG] 3.12. No data returned from INSERT")
          throw new Error("No data returned from database after insert")
        }

        console.log("✅ [DEBUG] 3.13. Successfully saved contact to Supabase:", JSON.stringify(data[0], null, 2))

        // Update UI immediately with the returned data
        const savedContact = {
          ...data[0],
          company: data[0].company?.name || 'No Company',
          avatar: getInitials(contactForm.name),
          lastContact: 'Just added'
        }
        
        console.log("[DEBUG] 3.13. Prepared savedContact object:", JSON.stringify(savedContact, null, 2))
        
        setContacts(prevContacts => {
          const newContacts = [...prevContacts, savedContact]
          console.log("[DEBUG] 3.14. Updating contacts state. New count will be:", newContacts.length)
          return newContacts
        })
        
        console.log("✅ [DEBUG] 3.15. Contacts state has been updated.")
        
        // Also reload from database to ensure data consistency
        console.log("[DEBUG] 3.16. Scheduling database reload in 500ms...")
        setTimeout(() => {
          console.log("[DEBUG] 3.17. Executing delayed database reload...")
          loadContactsFromDatabase()
        }, 500)

        // Dispatch custom event to notify other components
        const event = new CustomEvent('contactAdded', {
          detail: { name: contactForm.name, company: contactForm.company_name }
        })
        console.log("[DEBUG] 3.18. Dispatching contactAdded event:", event.detail)
        window.dispatchEvent(event)
      }
      
      console.log("[DEBUG] 4.0. === FINALIZING ===")
      
      // Reset form state and clear editing contact
      setContactForm({
        name: '',
        company_id: null,
        company_name: '',
        email: '',
        phone: '',
        status: 'Manager'
      })
      setEditingContact(null)
      setIsContactModalOpen(false)
      console.log("✅ [DEBUG] 4.1. Modal closed and form reset successfully.")
      
    } catch (err: any) {
      console.error("🔥 [DEBUG] === ERROR HANDLING ===")
      console.error("🔥 [DEBUG] CAUGHT AN ERROR IN CATCH BLOCK 🔥")
      console.error("Error type:", typeof err)
      console.error("Error constructor:", err.constructor?.name)
      console.error("Error message:", err.message)
      console.error("Error stack:", err.stack)
      console.error("Full error object:", JSON.stringify(err, null, 2))
      
      // Show user-friendly error message
      const errorMessage = err.message || 'Unknown error occurred'
      console.error("🔥 [DEBUG] Showing alert with message:", errorMessage)
      alert(`Failed to save contact. Error: ${errorMessage}. Please check the console for details.`)
    } finally {
      console.log("[DEBUG] 5.0. === CLEANUP ===")
      setLoading(false)
      console.log("[DEBUG] 5.1. Loading state set to false")
      console.log("🏁 [DEBUG] === handleSaveContact function completed ===")
    }
  }

  const handleDeleteContact = async (contactId: string | number) => {
    console.log(`🚀 [DEBUG] 1. Executing handleDeleteContact for ID: ${contactId}`);
    console.log(`🚀 [DEBUG] 1.1. Contact ID type: ${typeof contactId}`);

    // Check if this is a mock data contact (numeric ID) vs database contact (UUID string)
    const isNumericId = typeof contactId === 'number';
    const isUuidString = typeof contactId === 'string' && contactId.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);
    
    console.log(`🔍 [DEBUG] 1.2. ID Analysis:`);
    console.log(`  - Is numeric (mock data): ${isNumericId}`);
    console.log(`  - Is UUID string (database): ${isUuidString}`);

    if (!confirm('Are you sure you want to delete this contact?')) {
      console.log("🟡 [DEBUG] User cancelled deletion.");
      return;
    }

    // Handle mock data contacts (cannot be deleted from database)
    if (isNumericId) {
      console.log("⚠️ [DEBUG] 1.3. This is a mock data contact with numeric ID - only removing from UI");
      setContacts(prevContacts => prevContacts.filter(c => c.id !== contactId));
      console.log("✅ [DEBUG] Mock contact removed from UI only.");
      return;
    }

    // Handle database contacts (UUID string)
    if (!isUuidString) {
      console.error("🔥 [DEBUG] 1.4. Invalid ID format - not a valid UUID string:", contactId);
      alert(`Invalid contact ID format. Expected UUID string but got: ${contactId} (${typeof contactId})`);
      return;
    }

    try {
      console.log(`🚀 [DEBUG] 1.5. About to call Supabase DELETE for UUID: ${contactId}`);
      
      const { error } = await supabase
        .from('contacts')
        .delete()
        .eq('id', contactId);

      if (error) {
        // โยน Error เพื่อให้ catch block ทำงาน
        throw error;
      }

      console.log("✅ [DEBUG] 2. Successfully sent delete command to Supabase.");

      // อัปเดต UI ทันที
      setContacts(prevContacts => prevContacts.filter(c => String(c.id) !== String(contactId)));
      console.log("✅ [DEBUG] 3. Contacts state has been updated.");

    } catch (err: any) {
      console.error("🔥 [DEBUG] CAUGHT AN ERROR IN CATCH BLOCK 🔥");
      console.error("Error details:", JSON.stringify(err, null, 2));
      alert("Failed to delete contact. Please check the console for details and refresh the page.");
      // หากเกิด Error ให้โหลดข้อมูลใหม่เพื่อให้ UI ตรงกับฐานข้อมูล
      loadContactsFromDatabase(); 
    }
  };

  const handleAddCompany = () => {
    setEditingCompany(null)
    setCompanyForm({ name: '', industry: '', size: '', website: '', phone: '', status: 'customer' })
    setIsCompanyModalOpen(true)
  }

  const handleEditCompany = (company: any) => {
    setEditingCompany(company)
    setCompanyForm({
      name: company.name || '',
      industry: company.industry || '',
      size: company.size || '',
      website: company.website || '',
      phone: company.phone || '',
      status: company.status || 'active'
    })
    setIsCompanyModalOpen(true)
  }

  const handleSaveCompany = async () => {
    console.log("🚀 [DEBUG] 1. Executing handleSaveCompany function...")
    console.log("[DEBUG] Data to be saved:", companyForm)
    
    if (!companyForm.name) {
      console.error("🔥 [DEBUG] Missing required field: company name")
      alert("Please fill in the company name")
      return
    }

    setLoading(true)
    
    try {
      if (editingCompany) {
        console.log("[DEBUG] 2.0. === UPDATING EXISTING COMPANY ===")
        console.log("[DEBUG] 2.1. Company ID to update:", editingCompany.id)
        
        // Get current user for RLS policy compliance (UPDATE operations might need it too)
        console.log("[DEBUG] 2.2. Verifying user authentication...")
        const { data: { user }, error: userError } = await supabase.auth.getUser()
        
        if (userError) {
          console.error("[DEBUG] 2.3. Error getting user:", userError)
          throw new Error(`Authentication error: ${userError.message}`)
        }

        if (!user) {
          console.error("[DEBUG] 2.4. No user found - user not logged in")
          throw new Error("You must be logged in to update a company")
        }

        console.log("[DEBUG] 2.5. User authenticated for update:")
        console.log("- User ID:", user.id)
        console.log("- User email:", user.email)
        
        const normalizedCompanyName = companyForm.name
          .replace(/([a-z])([A-Z])/g, '$1 $2') // Add space between lowercase and uppercase
          .replace(/([a-zA-Z])([0-9])/g, '$1 $2') // Add space between letters and numbers
          .replace(/([0-9])([a-zA-Z])/g, '$1 $2') // Add space between numbers and letters
          .replace(/\s+/g, ' ') // Replace multiple spaces with single space
          .trim() // Remove leading/trailing spaces
        
        const updateData = {
          name: normalizedCompanyName,
          industry: companyForm.industry,
          size: companyForm.size,
          website: companyForm.website,
          phone: companyForm.phone,
          status: companyForm.status
        }
        
        console.log("[DEBUG] 2.6. Update data to send to Supabase:", JSON.stringify(updateData, null, 2))
        console.log("[DEBUG] 2.7. Status value details:")
        console.log("- Type:", typeof companyForm.status)
        console.log("- Value:", companyForm.status)
        console.log("- Is valid status?", ['prospect', 'active', 'inactive'].includes(companyForm.status))
        
        console.log("[DEBUG] 2.8. About to call Supabase UPDATE...")
        const { data, error } = await supabase
          .from('companies')
          .update(updateData)
          .eq('id', editingCompany.id)
          .select()

        if (error) {
          throw error
        }

        console.log("✅ [DEBUG] 2.9. Successfully updated company in Supabase:", JSON.stringify(data[0], null, 2))
        
        // Update local state
        setCompanies(companies.map(company =>
          company.id === editingCompany.id
            ? { ...company, ...companyForm }
            : company
        ))
        
      } else {
        console.log("[DEBUG] 3.0. === CREATING NEW COMPANY ===")
        
        // 1. Get current user for RLS policy compliance
        console.log("[DEBUG] 3.1. Getting current user for RLS policy...")
        const { data: { user }, error: userError } = await supabase.auth.getUser()
        
        if (userError) {
          console.error("[DEBUG] 3.2. Error getting user:", userError)
          throw new Error(`Authentication error: ${userError.message}`)
        }

        if (!user) {
          console.error("[DEBUG] 3.3. No user found - user not logged in")
          throw new Error("You must be logged in to create a company")
        }

        console.log("[DEBUG] 3.4. User authenticated successfully:")
        console.log("- User ID:", user.id)
        console.log("- User email:", user.email)
        
        // 2. Create company data with user_id for RLS policy
        const normalizedCompanyName = companyForm.name
          .replace(/([a-z])([A-Z])/g, '$1 $2') // Add space between lowercase and uppercase
          .replace(/([a-zA-Z])([0-9])/g, '$1 $2') // Add space between letters and numbers
          .replace(/([0-9])([a-zA-Z])/g, '$1 $2') // Add space between numbers and letters
          .replace(/\s+/g, ' ') // Replace multiple spaces with single space
          .trim() // Remove leading/trailing spaces
        
        const newCompanyData = {
          name: normalizedCompanyName,
          industry: companyForm.industry,
          size: companyForm.size,
          website: companyForm.website,
          phone: companyForm.phone,
          status: companyForm.status,
          user_id: user.id  // Add user_id for RLS policy compliance
        }
        
        console.log("[DEBUG] 3.5. Company data with user_id:", JSON.stringify(newCompanyData, null, 2))
        console.log("[DEBUG] 3.6. Status value details:")
        console.log("- Type:", typeof companyForm.status)
        console.log("- Value:", companyForm.status)
        console.log("- Is valid status?", ['prospect', 'active', 'inactive'].includes(companyForm.status))
        console.log("[DEBUG] 3.7. User ID details:")
        console.log("- Type:", typeof user.id)
        console.log("- Value:", user.id)
        console.log("- Is valid UUID?", /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(user.id))
        
        console.log("[DEBUG] 3.8. About to call Supabase INSERT with user_id...")
        const { data, error } = await supabase
          .from('companies')
          .insert([newCompanyData])
          .select()

        if (error) {
          throw error
        }

        console.log("✅ [DEBUG] 3.9. Successfully saved company to Supabase:", JSON.stringify(data[0], null, 2))

        // Update UI immediately with the returned data
        const savedCompany = {
          ...data[0],
          contactCount: 0,
          dealValue: 0
        }
        
        setCompanies(prevCompanies => [...prevCompanies, savedCompany])
        console.log("✅ [DEBUG] 3.10. Companies state has been updated.")
        
        // Also reload from database to ensure data consistency
        setTimeout(() => loadCompaniesFromDatabase(), 500)
      }
      
      // Reset form state and clear editing company
      setCompanyForm({
        name: '',
        industry: '',
        size: '',
        website: '',
        phone: '',
        status: 'customer'
      })
      setEditingCompany(null)
      setIsCompanyModalOpen(false)
      console.log("✅ [DEBUG] 4. Modal closed and form reset successfully.")
      
    } catch (err: any) {
      console.error("🔥 [DEBUG] CAUGHT AN ERROR IN CATCH BLOCK 🔥")
      console.error("Error details:", JSON.stringify(err, null, 2))
      alert(`Failed to save company. Error: ${err.message || 'Unknown error'}. Please check the console for details.`)
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteCompany = async (companyId: string | number) => {
    console.log(`🚀 [DEBUG] 1. Executing handleDeleteCompany for ID: ${companyId}`);
    console.log(`🚀 [DEBUG] 1.1. Company ID type: ${typeof companyId}`);

    // Check if this is a mock data company (numeric ID) vs database company (UUID string)
    const isNumericId = typeof companyId === 'number';
    const isUuidString = typeof companyId === 'string' && companyId.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);
    
    console.log(`🔍 [DEBUG] 1.2. ID Analysis:`);
    console.log(`  - Is numeric (mock data): ${isNumericId}`);
    console.log(`  - Is UUID string (database): ${isUuidString}`);

    if (!confirm('Are you sure you want to delete this company?')) {
      console.log("🟡 [DEBUG] User cancelled deletion.");
      return;
    }

    // Handle mock data companies (cannot be deleted from database)
    if (isNumericId) {
      console.log("⚠️ [DEBUG] 1.3. This is a mock data company with numeric ID - only removing from UI");
      setCompanies(prevCompanies => prevCompanies.filter(c => c.id !== companyId));
      console.log("✅ [DEBUG] Mock company removed from UI only.");
      return;
    }

    // Handle database companies (UUID string)
    if (!isUuidString) {
      console.error("🔥 [DEBUG] 1.4. Invalid ID format - not a valid UUID string:", companyId);
      alert(`Invalid company ID format. Expected UUID string but got: ${companyId} (${typeof companyId})`);
      return;
    }

    try {
      console.log(`🚀 [DEBUG] 1.5. About to call Supabase DELETE for UUID: ${companyId}`);
      
      const { error } = await supabase
        .from('companies')
        .delete()
        .eq('id', companyId);

      if (error) {
        // โยน Error เพื่อให้ catch block ทำงาน
        throw error;
      }

      console.log("✅ [DEBUG] 2. Successfully sent delete command to Supabase.");

      // อัปเดต UI ทันที
      setCompanies(prevCompanies => prevCompanies.filter(c => String(c.id) !== String(companyId)));
      console.log("✅ [DEBUG] 3. Companies state has been updated.");

    } catch (err: any) {
      console.error("🔥 [DEBUG] CAUGHT AN ERROR IN CATCH BLOCK 🔥");
      console.error("Error details:", JSON.stringify(err, null, 2));
      alert("Failed to delete company. Please check the console for details and refresh the page.");
      // หากเกิด Error ให้โหลดข้อมูลใหม่เพื่อให้ UI ตรงกับฐานข้อมูล
      loadCompaniesFromDatabase(); 
    }
  };


  const getPositionColor = (position: string) => {
    switch (position.toLowerCase()) {
      case 'ceo': return 'bg-purple-100 text-purple-800'
      case 'cto': return 'bg-blue-100 text-blue-800'
      case 'manager': return 'bg-green-100 text-green-800'
      case 'director': return 'bg-indigo-100 text-indigo-800'
      case 'developer': return 'bg-cyan-100 text-cyan-800'
      case 'designer': return 'bg-pink-100 text-pink-800'
      case 'sales manager': return 'bg-orange-100 text-orange-800'
      case 'marketing manager': return 'bg-yellow-100 text-yellow-800'
      case 'assistant': return 'bg-gray-100 text-gray-800'
      default: return 'bg-slate-100 text-slate-800'
    }
  }

  const getCompanyStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'active': return 'bg-green-100 text-green-800'
      case 'prospect': return 'bg-blue-100 text-blue-800'
      case 'inactive': return 'bg-gray-100 text-gray-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getCompanyStatusDisplayName = (status: string) => {
    switch (status.toLowerCase()) {
      case 'active': return 'Active'
      case 'prospect': return 'Prospect'
      case 'inactive': return 'Inactive'
      default: return status
    }
  }

  return (
    <>
      <div className="space-y-6 p-4 md:p-6 lg:px-12 lg:py-8 min-h-screen">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Contacts & Companies</h1>
            <p className="text-gray-600">Manage both individual contacts and company organizations</p>
          </div>
        </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <div className="flex items-center justify-between">
          <TabsList className="grid w-full max-w-md grid-cols-2">
            <TabsTrigger value="contacts">Contacts</TabsTrigger>
            <TabsTrigger value="companies">Companies</TabsTrigger>
          </TabsList>
          
          <Button 
            onClick={activeTab === 'contacts' ? handleAddContact : handleAddCompany}
            className="bg-teal-500 hover:bg-teal-600"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add {activeTab === 'contacts' ? 'Contact' : 'Company'}
          </Button>
        </div>


        <TabsContent value="contacts" className="space-y-6">
          {/* Search and Filter Controls */}
          <Card>
            <CardContent className="p-4">
              <div className="flex flex-col gap-4">
                {/* Search Input */}
                <div className="flex gap-4">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <Input
                      placeholder="Search contacts by name, company, or email..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>
                
                {/* Sorting and Filtering Controls */}
                <div className="flex gap-3 flex-wrap">
                  <Select value={sortBy} onValueChange={setSortBy}>
                    <SelectTrigger className="w-[160px]">
                      <SelectValue placeholder="Sort by" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="name">Name</SelectItem>
                      <SelectItem value="company">Company</SelectItem>
                      <SelectItem value="created_at">Created Date</SelectItem>
                      <SelectItem value="updated_at">Last Contact</SelectItem>
                    </SelectContent>
                  </Select>
                  
                  <Select value={sortOrder} onValueChange={(value) => setSortOrder(value as 'asc' | 'desc')}>
                    <SelectTrigger className="w-[140px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {sortBy === 'name' || sortBy === 'company' ? (
                        <>
                          <SelectItem value="asc">A to Z</SelectItem>
                          <SelectItem value="desc">Z to A</SelectItem>
                        </>
                      ) : (
                        <>
                          <SelectItem value="desc">Newest First</SelectItem>
                          <SelectItem value="asc">Oldest First</SelectItem>
                        </>
                      )}
                    </SelectContent>
                  </Select>
                  
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-[140px]">
                      <SelectValue placeholder="Filter by status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Positions</SelectItem>
                      <SelectItem value="CEO">CEO</SelectItem>
                      <SelectItem value="CTO">CTO</SelectItem>
                      <SelectItem value="Manager">Manager</SelectItem>
                      <SelectItem value="Director">Director</SelectItem>
                      <SelectItem value="Developer">Developer</SelectItem>
                      <SelectItem value="Designer">Designer</SelectItem>
                      <SelectItem value="Sales Manager">Sales Manager</SelectItem>
                      <SelectItem value="Marketing Manager">Marketing Manager</SelectItem>
                      <SelectItem value="Assistant">Assistant</SelectItem>
                      <SelectItem value="customer">Customer</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>
          
          {/* Contacts Table */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Users className="h-5 w-5 text-teal-600" />
                <span>All Contacts ({filteredContacts.length})</span>
              </CardTitle>
              <CardDescription>
                Individual contacts and their details
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {filteredContacts.map((contact) => (
                  <div key={contact.id} className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm hover:shadow-md hover:bg-gray-50 transition-all duration-200">
                    <div className="flex items-center justify-between">
                      <div 
                        className="flex items-center space-x-4 flex-1 cursor-pointer"
                        onClick={() => router.push(`/dashboard/contacts/${contact.id}`)}
                      >
                        <div className="w-12 h-12 bg-teal-500 rounded-full flex items-center justify-center text-white font-bold text-lg">
                          {contact.avatar}
                        </div>
                        <div className="flex-1">
                          <h3 className="font-bold text-gray-900 text-lg hover:text-teal-600 transition-colors">{contact.name}</h3>
                          <div className="flex items-center space-x-2 mt-1">
                            <Building className="w-4 h-4 text-gray-500" />
                            <span className="text-gray-600 font-medium">{contact.company}</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center space-x-3">
                        <Badge className={getPositionColor(contact.status)}>
                          {contact.status}
                        </Badge>
                        <div className="flex space-x-2">
                          <Button 
                            size="sm" 
                            variant="outline" 
                            onClick={() => handleEditContact(contact)}
                            className="hover:bg-teal-50 hover:border-teal-300"
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button 
                            size="sm" 
                            variant="outline" 
                            onClick={() => handleDeleteContact(contact.id)}
                            className="text-red-600 hover:text-red-700 hover:bg-red-50 hover:border-red-300"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                    <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t border-gray-100">
                      <div className="flex items-center space-x-2">
                        <Mail className="w-4 h-4 text-gray-400" />
                        <span className="text-gray-700 text-sm">{contact.email}</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Phone className="w-4 h-4 text-gray-400" />
                        <span className="text-gray-700 text-sm">{contact.phone}</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Activity className="w-4 h-4 text-gray-400" />
                        <span className="text-gray-600 text-sm">Last contact: {contact.lastContact}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="companies" className="space-y-6">
          {/* Search and Filter Controls */}
          <Card>
            <CardContent className="p-4">
              <div className="flex flex-col gap-4">
                {/* Search Input */}
                <div className="flex gap-4">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <Input
                      placeholder="Search companies by name or industry..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>
                
                {/* Sorting Controls */}
                <div className="flex gap-3 flex-wrap">
                  <Select value={sortBy} onValueChange={setSortBy}>
                    <SelectTrigger className="w-[160px]">
                      <SelectValue placeholder="Sort by" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="name">Name</SelectItem>
                      <SelectItem value="industry">Industry</SelectItem>
                      <SelectItem value="created_at">Created Date</SelectItem>
                      <SelectItem value="updated_at">Last Contact</SelectItem>
                    </SelectContent>
                  </Select>
                  
                  <Select value={sortOrder} onValueChange={(value) => setSortOrder(value as 'asc' | 'desc')}>
                    <SelectTrigger className="w-[140px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {sortBy === 'name' || sortBy === 'industry' ? (
                        <>
                          <SelectItem value="asc">A to Z</SelectItem>
                          <SelectItem value="desc">Z to A</SelectItem>
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
            </CardContent>
          </Card>
          
          {/* Companies Table */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Building className="h-5 w-5 text-teal-600" />
                <span>All Companies ({filteredCompanies.length})</span>
              </CardTitle>
              <CardDescription>
                Company organizations and their information
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {filteredCompanies.map((company) => (
                  <div key={company.id} className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm hover:shadow-md hover:bg-gray-50 transition-all duration-200">
                    <div className="flex items-center justify-between">
                      <div 
                        className="flex items-center space-x-4 flex-1 cursor-pointer"
                        onClick={() => router.push(`/dashboard/companies/${company.id}`)}
                      >
                        <div className="w-12 h-12 bg-blue-500 rounded-lg flex items-center justify-center text-white">
                          <Building className="w-6 h-6" />
                        </div>
                        <div className="flex-1">
                          <h3 className="font-bold text-gray-900 text-lg hover:text-blue-600 transition-colors">{company.name}</h3>
                          <p className="text-gray-600 font-medium">{company.industry}</p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-3">
                        <Badge className={getCompanyStatusColor(company.status)}>
                          {getCompanyStatusDisplayName(company.status)}
                        </Badge>
                        <div className="flex space-x-2">
                          <Button 
                            size="sm" 
                            variant="outline" 
                            onClick={() => handleEditCompany(company)}
                            className="hover:bg-blue-50 hover:border-blue-300"
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button 
                            size="sm" 
                            variant="outline" 
                            onClick={() => handleDeleteCompany(company.id)}
                            className="text-red-600 hover:text-red-700 hover:bg-red-50 hover:border-red-300"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                    <div className="mt-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 pt-4 border-t border-gray-100">
                      <div className="flex items-center space-x-2">
                        <Globe className="w-4 h-4 text-gray-400" />
                        <span className="text-gray-700 text-sm">{company.website}</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Phone className="w-4 h-4 text-gray-400" />
                        <span className="text-gray-700 text-sm">{company.phone}</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Users className="w-4 h-4 text-gray-400" />
                        <span className="text-gray-700 text-sm">{company.contactCount} contacts</span>
                      </div>
                    </div>
                    <div className="mt-3 pt-3 border-t border-gray-100">
                      <span className="text-sm text-gray-600">Company size: {company.size}</span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Contact Modal */}
      <Dialog open={isContactModalOpen} onOpenChange={(open) => {
        if (!open) {
          // Reset form when dialog closes
          setContactForm({
            name: '',
            company_id: null,
            company_name: '',
            email: '',
            phone: '',
            status: 'Manager'
          })
          setEditingContact(null)
          setLoading(false) // Reset loading state
          
          // Reset Create and Link workflow state
          setCompanySearchTerm('')
          setShowCreateCompanyInline(false)
          setNewCompanyData({ name: '', industry: '', status: 'prospect' })
          setIsCompanyDropdownOpen(false)
        }
        setIsContactModalOpen(open)
      }}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>{editingContact ? 'Edit Contact' : 'Add New Contact'}</DialogTitle>
            <DialogDescription>
              {editingContact ? 'Update contact information and details' : 'Add a new contact to your CRM system'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="contactName" className="mb-2 block">Full Name *</Label>
                <input
                  id="contactName"
                  type="text"
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  value={contactForm.name || ''}
                  onChange={(e) => {
                    const value = e.target.value;
                    setContactForm(prev => ({...prev, name: value}));
                  }}
                  placeholder="John Smith"
                />
              </div>
              <div>
                <Label htmlFor="contactCompany" className="mb-2 block">Company</Label>
                <Popover open={isCompanyDropdownOpen} onOpenChange={setIsCompanyDropdownOpen}>
                  <PopoverTrigger asChild>
                    <div className="relative">
                      <input
                        type="text"
                        placeholder="Search or create company..."
                        value={companySearchTerm || contactForm.company_name || ''}
                        onChange={(e) => {
                          const value = e.target.value
                          setCompanySearchTerm(value)
                          // Update contact form with the typed company name
                          setContactForm({
                            ...contactForm,
                            company_name: value,
                            company_id: null // Clear company_id since this is a new/typed company
                          })
                          if (!isCompanyDropdownOpen) {
                            setIsCompanyDropdownOpen(true)
                          }
                        }}
                        onFocus={() => setIsCompanyDropdownOpen(true)}
                        className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                      />
                      <ChevronDown className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 opacity-50" />
                    </div>
                  </PopoverTrigger>
                  <PopoverContent className="w-full p-0">
                    <Command>
                      <CommandInput 
                        placeholder="Search companies..." 
                        value={companySearchTerm}
                        onValueChange={setCompanySearchTerm}
                        className="hidden"
                      />
                      <CommandEmpty>
                        <div className="p-2">
                          <Button
                            variant="ghost"
                            className="w-full justify-start"
                            onClick={() => {
                              setNewCompanyData({...newCompanyData, name: companySearchTerm})
                              setShowCreateCompanyInline(true)
                              setIsCompanyDropdownOpen(false)
                            }}
                          >
                            <Plus className="mr-2 h-4 w-4" />
                            Create "{companySearchTerm}"
                          </Button>
                        </div>
                      </CommandEmpty>
                      <CommandGroup>
                        <CommandItem
                          onSelect={() => {
                            setContactForm({
                              ...contactForm,
                              company_id: null,
                              company_name: ''
                            })
                            setCompanySearchTerm('')
                            setIsCompanyDropdownOpen(false)
                          }}
                        >
                          <Check className={cn("mr-2 h-4 w-4", !contactForm.company_id ? "opacity-100" : "opacity-0")} />
                          No Company
                        </CommandItem>
                        {filteredCompaniesForSelection.map((company) => (
                          <CommandItem
                            key={company.id}
                            onSelect={() => {
                              setContactForm({
                                ...contactForm,
                                company_id: company.id,
                                company_name: company.name
                              })
                              setCompanySearchTerm('')
                              setIsCompanyDropdownOpen(false)
                            }}
                          >
                            <Check className={cn("mr-2 h-4 w-4", contactForm.company_id === company.id ? "opacity-100" : "opacity-0")} />
                            {company.name}
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </Command>
                  </PopoverContent>
                </Popover>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="contactEmail" className="mb-2 block">Email *</Label>
                <input
                  id="contactEmail"
                  type="text"
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  value={contactForm.email || ''}
                  onChange={(e) => {
                    const value = e.target.value;
                    setContactForm(prev => ({...prev, email: value}));
                  }}
                  placeholder="john@example.com"
                />
              </div>
              <div>
                <Label htmlFor="contactPhone" className="mb-2 block">Phone</Label>
                <Input
                  id="contactPhone"
                  value={contactForm.phone}
                  onChange={(e) => setContactForm({...contactForm, phone: e.target.value})}
                  placeholder="+66 2-123-4567"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="contactPosition" className="mb-2 block">Position/Role</Label>
              <Select value={contactForm.status} onValueChange={(value) => setContactForm({...contactForm, status: value})}>
                <SelectTrigger>
                  <SelectValue placeholder="Select position" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="CEO">CEO</SelectItem>
                  <SelectItem value="CTO">CTO</SelectItem>
                  <SelectItem value="Manager">Manager</SelectItem>
                  <SelectItem value="Director">Director</SelectItem>
                  <SelectItem value="Developer">Developer</SelectItem>
                  <SelectItem value="Designer">Designer</SelectItem>
                  <SelectItem value="Sales Manager">Sales Manager</SelectItem>
                  <SelectItem value="Marketing Manager">Marketing Manager</SelectItem>
                  <SelectItem value="Assistant">Assistant</SelectItem>
                  <SelectItem value="Other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="flex space-x-2 pt-4">
              <Button onClick={() => {
                setContactForm({
                  name: '',
                  company_id: null,
                  company_name: '',
                  email: '',
                  phone: '',
                  status: 'Manager'
                })
                setEditingContact(null)
                setIsContactModalOpen(false)
              }} variant="outline" className="flex-1">
                Cancel
              </Button>
              <Button 
                onClick={handleSaveContact}
                className="flex-1 bg-teal-500 hover:bg-teal-600"
                disabled={!contactForm.name || contactForm.name.trim() === '' || !contactForm.email || contactForm.email.trim() === '' || loading}
              >
                {loading ? 'Saving...' : (editingContact ? 'Update' : 'Create')} Contact
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Company Modal */}
      <Dialog open={isCompanyModalOpen} onOpenChange={(open) => {
        if (!open) {
          // Reset form when dialog closes
          setCompanyForm({
            name: '',
            industry: '',
            size: '',
            website: '',
            phone: '',
            status: 'customer'
          })
          setEditingCompany(null)
        }
        setIsCompanyModalOpen(open)
      }}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>{editingCompany ? 'Edit Company' : 'Add New Company'}</DialogTitle>
            <DialogDescription>
              {editingCompany ? 'Update company information and details' : 'Add a new company to your database'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="companyName" className="mb-2 block">Company Name *</Label>
                <Input
                  id="companyName"
                  value={companyForm.name}
                  onChange={(e) => setCompanyForm({...companyForm, name: e.target.value})}
                  placeholder="TechCorp Solutions"
                />
              </div>
              <div>
                <Label htmlFor="companyIndustry" className="mb-2 block">Industry</Label>
                <Input
                  id="companyIndustry"
                  value={companyForm.industry}
                  onChange={(e) => setCompanyForm({...companyForm, industry: e.target.value})}
                  placeholder="Technology"
                />
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="companySize" className="mb-2 block">Company Size</Label>
                <Select value={companyForm.size} onValueChange={(value) => setCompanyForm({...companyForm, size: value})}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select size" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1-10 employees">1-10 employees</SelectItem>
                    <SelectItem value="11-50 employees">11-50 employees</SelectItem>
                    <SelectItem value="51-200 employees">51-200 employees</SelectItem>
                    <SelectItem value="200+ employees">200+ employees</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="companyStatus" className="mb-2 block">Status</Label>
                <Select value={companyForm.status || 'active'} onValueChange={(value) => {
                  console.log("[DEBUG] Company status changed to:", value)
                  setCompanyForm({...companyForm, status: value})
                }}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="prospect">Prospect</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="companyWebsite" className="mb-2 block">Website</Label>
                <Input
                  id="companyWebsite"
                  value={companyForm.website}
                  onChange={(e) => setCompanyForm({...companyForm, website: e.target.value})}
                  placeholder="www.techcorp.com"
                />
              </div>
              <div>
                <Label htmlFor="companyPhone" className="mb-2 block">Phone</Label>
                <Input
                  id="companyPhone"
                  value={companyForm.phone}
                  onChange={(e) => setCompanyForm({...companyForm, phone: e.target.value})}
                  placeholder="+66 2-123-4567"
                />
              </div>
            </div>
            
            <div className="flex space-x-2 pt-4">
              <Button onClick={() => {
                setCompanyForm({
                  name: '',
                  industry: '',
                  size: '',
                  website: '',
                  phone: '',
                  status: 'customer'
                })
                setEditingCompany(null)
                setIsCompanyModalOpen(false)
              }} variant="outline" className="flex-1">
                Cancel
              </Button>
              <Button 
                onClick={handleSaveCompany} 
                className="flex-1 bg-blue-500 hover:bg-blue-600"
                disabled={!companyForm.name || loading}
              >
                {loading ? 'Saving...' : (editingCompany ? 'Update' : 'Create')} Company
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
      </div>
    </>
  )
}