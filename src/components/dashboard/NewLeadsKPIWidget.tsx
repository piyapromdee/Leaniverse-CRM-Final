'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Card } from '@/components/ui/card'
import { UserPlus } from 'lucide-react'

export function NewLeadsKPIWidget() {
  console.log('🚀 NewLeadsKPIWidget - Component initialized')
  const [leadsCount, setLeadsCount] = useState(0)
  const [loading, setLoading] = useState(true)
  
  useEffect(() => {
    const fetchLeads = async () => {
      try {
        const response = await fetch('/api/leads')
        const data = await response.json()
        
        console.log('NewLeadsKPI - API response:', data)
        console.log('NewLeadsKPI - Leads:', data.leads)
        
        // Count leads with status "new", "contacted", or "qualified"
        const newLeads = (data.leads || []).filter((lead: any) => 
          ['new', 'contacted', 'qualified'].includes(lead.status)
        )
        
        console.log('NewLeadsKPI - Filtered leads:', newLeads.length)
        console.log('NewLeadsKPI - Lead statuses:', (data.leads || []).map((l: any) => l.status))
        
        setLeadsCount(newLeads.length)
      } catch (error) {
        console.error('NewLeadsKPI - Error fetching leads:', error)
      } finally {
        setLoading(false)
      }
    }
    fetchLeads()
  }, [])
  
  return (
    <Link href="/dashboard/leads?status=new" className="block h-full">
      <Card className="h-full bg-white hover:shadow-md hover:scale-[1.01] transition-all duration-200 group border border-gray-100 overflow-hidden flex flex-col p-0">
        <div className="p-2 bg-teal-50">
          <div className="flex items-center">
            <UserPlus className="h-4 w-4 text-teal-600 mr-2" />
            <h3 className="text-xs font-semibold text-teal-800">New Leads</h3>
          </div>
        </div>
        <div className="p-3 flex-grow flex flex-col justify-center">
          {loading ? (
            <div className="animate-pulse">
              <div className="h-6 bg-gray-200 rounded w-8 mb-1"></div>
              <div className="h-3 bg-gray-200 rounded w-16"></div>
            </div>
          ) : (
            <>
              <p className="text-xl font-bold text-gray-800">{leadsCount}</p>
              <p className="text-xs text-gray-500 mt-1">Active Pipeline</p>
            </>
          )}
        </div>
      </Card>
    </Link>
  )
}