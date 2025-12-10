'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import AdminLayout from '@/components/admin-layout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Users, Building2, UserPlus, TrendingUp, Upload, Download, FileText } from 'lucide-react'
import Link from 'next/link'

export default function AdminContactsOverview() {
  const router = useRouter()
  const [stats, setStats] = useState({
    totalContacts: 0,
    totalCompanies: 0,
    newThisWeek: 0,
    activeEngagements: 0,
    topCompany: '',
    contactGrowth: 0
  })
  const [loading, setLoading] = useState(true)
  const [isImportModalOpen, setIsImportModalOpen] = useState(false)
  const [importFile, setImportFile] = useState<File | null>(null)
  const [importing, setImporting] = useState(false)

  useEffect(() => {
    fetchContactsStats()
  }, [])

  const fetchContactsStats = async () => {
    try {
      const supabase = createClient()

      // Fetch contacts
      const { data: contacts } = await supabase
        .from('contacts')
        .select('*')

      // Fetch companies
      const { data: companies } = await supabase
        .from('companies')
        .select('*')

      // Fetch open deals (not "Closed Won" or "Closed Lost")
      const { data: deals } = await supabase
        .from('deals')
        .select('contact_id, stage')
        .not('stage', 'in', '("won","lost","closed_won","closed_lost")')

      // Fetch open tasks (status "To Do" or "In Progress")
      const { data: tasks } = await supabase
        .from('calendar_events')
        .select('contact_id, status')
        .in('status', ['pending', 'in_progress', 'to_do'])

      if (contacts || companies) {
        // Calculate new contacts this week
        const oneWeekAgo = new Date()
        oneWeekAgo.setDate(oneWeekAgo.getDate() - 7)

        const newThisWeek = (contacts || []).filter(c =>
          new Date(c.created_at) > oneWeekAgo
        ).length

        // Calculate contact growth (this month vs last month)
        const thisMonth = new Date().getMonth()
        const lastMonth = thisMonth === 0 ? 11 : thisMonth - 1

        const thisMonthContacts = (contacts || []).filter(c => {
          const date = new Date(c.created_at)
          return date.getMonth() === thisMonth
        }).length

        const lastMonthContacts = (contacts || []).filter(c => {
          const date = new Date(c.created_at)
          return date.getMonth() === lastMonth
        }).length

        const growth = lastMonthContacts > 0
          ? Math.round(((thisMonthContacts - lastMonthContacts) / lastMonthContacts) * 100)
          : 0

        // Find top company by number of contacts
        const companyContactCounts: Record<string, number> = {}
        ;(contacts || []).forEach(contact => {
          if (contact.company_id) {
            companyContactCounts[contact.company_id] = (companyContactCounts[contact.company_id] || 0) + 1
          }
        })

        const topCompanyId = Object.entries(companyContactCounts)
          .sort(([,a], [,b]) => b - a)[0]?.[0]

        const topCompany = companies?.find(c => c.id === topCompanyId)?.name || 'N/A'

        // Calculate Active Engagements: unique contacts with open deals OR open tasks
        const activeContactIds = new Set<string>()

        // Add contacts from open deals
        ;(deals || []).forEach(deal => {
          if (deal.contact_id) {
            activeContactIds.add(deal.contact_id)
          }
        })

        // Add contacts from open tasks
        ;(tasks || []).forEach(task => {
          if (task.contact_id) {
            activeContactIds.add(task.contact_id)
          }
        })

        setStats({
          totalContacts: contacts?.length || 0,
          totalCompanies: companies?.length || 0,
          newThisWeek,
          activeEngagements: activeContactIds.size,
          topCompany,
          contactGrowth: growth
        })
      }
      setLoading(false)
    } catch (error) {
      console.error('Error fetching contacts stats:', error)
      setLoading(false)
    }
  }

  const handleImportContacts = async () => {
    if (!importFile) {
      alert('Please select a file to import')
      return
    }

    setImporting(true)
    try {
      // TODO: Implement CSV/Excel parsing and bulk import
      // For now, show placeholder message
      await new Promise(resolve => setTimeout(resolve, 1000))
      alert('Import functionality will be implemented with CSV parser. Selected file: ' + importFile.name)
      setIsImportModalOpen(false)
      setImportFile(null)
    } catch (error) {
      console.error('Error importing contacts:', error)
      alert('Error importing contacts. Please try again.')
    } finally {
      setImporting(false)
    }
  }

  const downloadSampleTemplate = () => {
    // Define the CSV headers and sample data
    const headers = ['FullName', 'Email', 'Company', 'Phone', 'Position']
    const sampleData = [
      ['John Doe', 'john.doe@example.com', 'Acme Corporation', '+1-555-0001', 'Sales Manager'],
      ['Jane Smith', 'jane.smith@techcorp.com', 'Tech Corp', '+1-555-0002', 'Marketing Director'],
      ['Mike Johnson', 'mike.j@startup.io', 'Startup Inc', '+1-555-0003', 'CEO']
    ]

    // Create CSV content
    const csvContent = [
      headers.join(','),
      ...sampleData.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n')

    // Create blob and download
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)

    link.setAttribute('href', url)
    link.setAttribute('download', 'contacts_import_template.csv')
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Contacts & Companies Overview</h1>
          <p className="text-gray-600 mt-1">Manage your contact database and company relationships</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <Card
            className="cursor-pointer hover:shadow-lg hover:border-blue-500 transition-all duration-200 hover:scale-105"
            onClick={() => router.push('/dashboard/contacts')}
          >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Contacts</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalContacts}</div>
              <p className="text-xs text-muted-foreground">In database</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Companies</CardTitle>
              <Building2 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalCompanies}</div>
              <p className="text-xs text-muted-foreground">Organizations</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">New This Week</CardTitle>
              <UserPlus className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{stats.newThisWeek}</div>
              <p className="text-xs text-muted-foreground">New contacts</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Engagements</CardTitle>
              <Users className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">{stats.activeEngagements}</div>
              <p className="text-xs text-muted-foreground">Active contacts</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Top Company</CardTitle>
              <Building2 className="h-4 w-4 text-purple-600" />
            </CardHeader>
            <CardContent>
              <div className="text-lg font-bold truncate">{stats.topCompany}</div>
              <p className="text-xs text-muted-foreground">Most contacts</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Growth Rate</CardTitle>
              <TrendingUp className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {stats.contactGrowth > 0 ? '+' : ''}{stats.contactGrowth}%
              </div>
              <p className="text-xs text-muted-foreground">Month over month</p>
            </CardContent>
          </Card>
        </div>

        <div className="flex gap-4">
          <Link href="/dashboard/contacts">
            <Button>View All Contacts</Button>
          </Link>
          <Link href="/dashboard/contacts?tab=companies">
            <Button variant="outline">Manage Companies</Button>
          </Link>
          <Button variant="outline" onClick={() => setIsImportModalOpen(true)}>
            <Upload className="w-4 h-4 mr-2" />
            Import Contacts
          </Button>
        </div>
      </div>

      <Dialog open={isImportModalOpen} onOpenChange={setIsImportModalOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Import Contacts</DialogTitle>
            <DialogDescription>
              Upload a CSV or Excel file to import multiple contacts at once
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {/* Template Download Section */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <FileText className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
                <div className="flex-1">
                  <h4 className="font-semibold text-blue-900 mb-2">Download Sample Template</h4>
                  <p className="text-sm text-blue-700 mb-3">
                    Use our sample template to ensure your data is formatted correctly.
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={downloadSampleTemplate}
                    className="bg-white hover:bg-blue-50 border-blue-300"
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Download Sample CSV Template
                  </Button>
                </div>
              </div>
            </div>

            {/* Column Definitions */}
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
              <h4 className="font-semibold text-gray-900 mb-3">Required Columns</h4>
              <div className="space-y-2 text-sm">
                <div className="flex">
                  <span className="font-medium text-gray-700 w-32">FullName:</span>
                  <span className="text-gray-600">Contact's full name (e.g., "John Doe")</span>
                </div>
                <div className="flex">
                  <span className="font-medium text-gray-700 w-32">Email:</span>
                  <span className="text-gray-600">Valid email address (required)</span>
                </div>
                <div className="flex">
                  <span className="font-medium text-gray-700 w-32">Company:</span>
                  <span className="text-gray-600">Company name (optional)</span>
                </div>
                <div className="flex">
                  <span className="font-medium text-gray-700 w-32">Phone:</span>
                  <span className="text-gray-600">Phone number with country code</span>
                </div>
                <div className="flex">
                  <span className="font-medium text-gray-700 w-32">Position:</span>
                  <span className="text-gray-600">Job title or role (optional)</span>
                </div>
              </div>
            </div>

            {/* Important Note */}
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
              <p className="text-sm text-yellow-800">
                <span className="font-semibold">Note:</span> Please use the exact column headers from the template for successful import. The system will validate your data before importing.
              </p>
            </div>

            {/* File Upload Section */}
            <div className="space-y-2">
              <Label htmlFor="file">Select Your File</Label>
              <Input
                id="file"
                type="file"
                accept=".csv,.xlsx,.xls"
                onChange={(e) => setImportFile(e.target.files?.[0] || null)}
                disabled={importing}
              />
              <p className="text-xs text-muted-foreground">
                Supported formats: CSV, Excel (.xlsx, .xls)
              </p>
            </div>

            {importFile && (
              <div className="text-sm bg-green-50 border border-green-200 rounded-lg p-3">
                <span className="font-medium text-green-800">Selected file: </span>
                <span className="text-green-700">{importFile.name}</span>
              </div>
            )}

            <Button
              onClick={handleImportContacts}
              disabled={importing || !importFile}
              className="w-full"
            >
              <Upload className="w-4 h-4 mr-2" />
              {importing ? 'Importing...' : 'Import Contacts'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  )
}
