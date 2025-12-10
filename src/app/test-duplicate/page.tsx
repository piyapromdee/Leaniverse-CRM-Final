'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'

export default function TestDuplicatePage() {
  const [result, setResult] = useState<any>(null)
  const [loading, setLoading] = useState(false)

  const testDuplicate = async () => {
    setLoading(true)
    try {
      // First get the leads
      const leadsResponse = await fetch('/api/leads')
      const leadsData = await leadsResponse.json()
      console.log('Leads API response:', leadsData)
      
      // Check if leads is nested in the response
      const leads = leadsData.leads || leadsData
      
      if (!leads || !Array.isArray(leads) || leads.length === 0) {
        setResult({ error: 'No leads found to duplicate', response: leadsData })
        return
      }

      const leadId = leads[0].id
      console.log('First lead:', leads[0])
      console.log('Duplicating lead ID:', leadId)
      
      // Try to duplicate the first lead
      const response = await fetch(`/api/leads/${leadId}/duplicate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      })

      const data = await response.json()
      console.log('Duplicate response:', data)
      setResult(data)
      
      if (data.success) {
        // Refresh leads list
        const newLeadsResponse = await fetch('/api/leads')
        const newLeads = await newLeadsResponse.json()
        setResult({ ...data, totalLeads: newLeads.length })
      }
    } catch (error: any) {
      console.error('Error:', error)
      setResult({ error: error.message })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">Test Lead Duplicate</h1>
      <Button onClick={testDuplicate} disabled={loading}>
        {loading ? 'Duplicating...' : 'Test Duplicate First Lead'}
      </Button>
      {result && (
        <pre className="mt-4 p-4 bg-gray-100 rounded">
          {JSON.stringify(result, null, 2)}
        </pre>
      )}
    </div>
  )
}