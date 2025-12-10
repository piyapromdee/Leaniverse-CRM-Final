'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Target } from 'lucide-react'

export function TestKPIWidget() {
  console.log('🧪 TestKPIWidget - Component mounting')
  const [leadsCount, setLeadsCount] = useState(0)
  const [loading, setLoading] = useState(true)
  
  useEffect(() => {
    console.log('🧪 TestKPIWidget - useEffect running')
    const fetchLeads = async () => {
      try {
        const response = await fetch('/api/leads')
        const data = await response.json()
        console.log('🧪 TestKPIWidget - API response:', data)
        
        // Count leads that are not converted or lost
        const newLeads = (data.leads || []).filter((lead: any) => 
          !['converted', 'lost'].includes(lead.status)
        )
        console.log('🧪 TestKPIWidget - New leads count:', newLeads.length)
        setLeadsCount(newLeads.length)
      } catch (error) {
        console.error('🧪 TestKPIWidget - Error:', error)
      } finally {
        setLoading(false)
      }
    }
    fetchLeads()
  }, [])
  
  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="flex items-center">
          <Target className="w-5 h-5 mr-2 text-blue-500" />
          New Leads KPI
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-center py-8">
          {loading ? (
            <p>Loading...</p>
          ) : (
            <>
              <div className="text-3xl font-bold text-blue-600">{leadsCount}</div>
              <p className="text-sm text-gray-600">New Leads</p>
              <p className="text-xs text-gray-500 mt-2">
                (Excludes converted/lost leads)
              </p>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  )
}