'use client'

// Placeholder ContactSelector component to prevent phantom errors
// This component was causing browser cache issues

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

interface Contact {
  id: string
  name: string
  email: string
  company_id?: string
  companies?: {
    name: string
  }
}

export function ContactSelector() {
  const [contacts, setContacts] = useState<Contact[]>([])
  const supabase = createClient()

  const loadContacts = async () => {
    try {
      console.log('ContactSelector: Loading contacts...')
      
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        console.log('ContactSelector: No authenticated user')
        return
      }

      // Try basic contacts query first
      const { data: basicContactsData, error: basicError } = await supabase
        .from('contacts')
        .select('id, name, email, company_id')
        .eq('user_id', user.id)
        .order('name')

      if (basicError) {
        console.log('Basic contacts query failed:', basicError)
        // Don't throw, just continue
      }

      if (basicContactsData) {
        console.log('✅ ContactSelector: Basic contacts loaded successfully:', basicContactsData.length)
        setContacts(basicContactsData)
        return
      }

      // Fallback: try with companies join
      const { data: allContactsData, error: allError } = await supabase
        .from('contacts')
        .select(`
          id,
          name, 
          email,
          company_id,
          companies (
            name
          )
        `)
        .eq('user_id', user.id)
        .order('name')

      if (allError) {
        console.log('All contacts queries failed:', allError)
        setContacts([])
        return
      }

      console.log('✅ ContactSelector: All contacts loaded successfully:', allContactsData?.length || 0)
      setContacts((allContactsData as unknown as Contact[]) || [])

    } catch (mainError) {
      console.log('All contacts queries failed:', mainError)
      // Set empty array if everything fails
      setContacts([])
    }
  }

  useEffect(() => {
    loadContacts()
  }, [])

  return (
    <div className="p-4">
      <h3 className="text-lg font-medium mb-4">Contact Selector</h3>
      <p className="text-gray-500 mb-4">
        This is a placeholder component to prevent browser cache errors.
      </p>
      <div className="space-y-2">
        {contacts.length === 0 ? (
          <p className="text-gray-400">No contacts found</p>
        ) : (
          contacts.map(contact => (
            <div key={contact.id} className="p-2 border rounded">
              <div className="font-medium">{contact.name}</div>
              <div className="text-sm text-gray-500">{contact.email}</div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}

export default ContactSelector