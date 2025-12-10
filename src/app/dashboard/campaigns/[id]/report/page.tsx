'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ArrowLeft, Eye, MousePointerClick, Send, Users, Mail, TrendingUp, Search } from 'lucide-react'
import Link from 'next/link'
import PageHeader from '@/components/page-header'

interface ContactEngagement {
  contact_id: string
  name: string
  email: string
  open_count: number
  click_count: number
  first_opened: string | null
  last_opened: string | null
  first_clicked: string | null
  links_clicked: string[]
}

interface CampaignReport {
  campaign: {
    id: string
    name: string
    subject: string
    sent_at: string
    sent_count: number
    opened_count: number
    clicked_count: number
  }
  contactsOpened: ContactEngagement[]
  contactsClicked: ContactEngagement[]
}

export default function CampaignReportPage() {
  const params = useParams()
  const router = useRouter()
  const campaignId = params.id as string

  const [report, setReport] = useState<CampaignReport | null>(null)
  const [loading, setLoading] = useState(true)
  const [searchOpened, setSearchOpened] = useState('')
  const [searchClicked, setSearchClicked] = useState('')

  useEffect(() => {
    loadReport()
  }, [campaignId])

  const loadReport = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/campaigns/${campaignId}/report`)
      const data = await response.json()

      if (response.ok) {
        setReport(data)
      } else {
        console.error('Failed to load report:', data.error)
      }
    } catch (error) {
      console.error('Error loading report:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading campaign report...</p>
        </div>
      </div>
    )
  }

  if (!report) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p className="text-gray-600">Campaign not found</p>
          <Button
            onClick={() => router.push('/dashboard/campaigns')}
            className="mt-4"
          >
            Back to Campaigns
          </Button>
        </div>
      </div>
    )
  }

  const openRate = report.campaign.sent_count > 0
    ? Math.round((report.campaign.opened_count / report.campaign.sent_count) * 100)
    : 0

  const clickRate = report.campaign.sent_count > 0
    ? Math.round((report.campaign.clicked_count / report.campaign.sent_count) * 100)
    : 0

  const filteredOpened = report.contactsOpened.filter(contact =>
    contact.name.toLowerCase().includes(searchOpened.toLowerCase()) ||
    contact.email.toLowerCase().includes(searchOpened.toLowerCase())
  )

  const filteredClicked = report.contactsClicked.filter(contact =>
    contact.name.toLowerCase().includes(searchClicked.toLowerCase()) ||
    contact.email.toLowerCase().includes(searchClicked.toLowerCase())
  )

  return (
    <div className="space-y-6 p-4 md:p-6 lg:px-12 lg:py-8 min-h-screen">
      <PageHeader
        title="Campaign Report"
        description={report.campaign.name}
        backUrl="/dashboard/campaigns"
      />

      {/* Campaign Header Info */}
      <div className="mb-6 bg-white p-6 rounded-lg border">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <h2 className="text-2xl font-bold text-gray-900">{report.campaign.name}</h2>
            <div className="mt-2 space-y-1">
              <p className="text-gray-600 flex items-center">
                <Mail className="w-4 h-4 mr-2" />
                Subject: {report.campaign.subject}
              </p>
              <p className="text-gray-500 text-sm flex items-center">
                <Send className="w-4 h-4 mr-2" />
                Sent: {new Date(report.campaign.sent_at).toLocaleString()}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <Card className="border-l-4 border-blue-500">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center">
              <Send className="w-4 h-4 mr-2 text-blue-500" />
              Total Sent
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{report.campaign.sent_count}</div>
            <p className="text-xs text-gray-500">Recipients</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-teal-500">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center">
              <Eye className="w-4 h-4 mr-2 text-teal-500" />
              Open Rate
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-teal-600">{openRate}%</div>
            <p className="text-xs text-gray-500">{report.campaign.opened_count} opens</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-purple-500">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center">
              <MousePointerClick className="w-4 h-4 mr-2 text-purple-500" />
              Click Rate
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">{clickRate}%</div>
            <p className="text-xs text-gray-500">{report.campaign.clicked_count} clicks</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-green-500">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center">
              <Users className="w-4 h-4 mr-2 text-green-500" />
              Engagement
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {new Set([...report.contactsOpened.map(c => c.contact_id), ...report.contactsClicked.map(c => c.contact_id)]).size}
            </div>
            <p className="text-xs text-gray-500">Unique contacts</p>
          </CardContent>
        </Card>
      </div>

      {/* Contacts Who Opened */}
      <Card className="mb-8">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center">
              <Eye className="w-5 h-5 mr-2 text-teal-500" />
              Contacts Who Opened ({filteredOpened.length})
            </CardTitle>
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  placeholder="Search contacts..."
                  value={searchOpened}
                  onChange={(e) => setSearchOpened(e.target.value)}
                  className="pl-10 w-64"
                />
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {filteredOpened.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b bg-gray-50">
                    <th className="text-left p-3 font-medium text-gray-700">Name</th>
                    <th className="text-left p-3 font-medium text-gray-700">Email</th>
                    <th className="text-left p-3 font-medium text-gray-700">Opens</th>
                    <th className="text-left p-3 font-medium text-gray-700">First Opened</th>
                    <th className="text-left p-3 font-medium text-gray-700">Last Opened</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredOpened.map(contact => (
                    <tr key={contact.contact_id} className="border-b hover:bg-gray-50 transition-colors">
                      <td className="p-3">
                        <Link
                          href={`/dashboard/contacts/${contact.contact_id}`}
                          className="text-teal-600 hover:underline font-medium"
                        >
                          {contact.name}
                        </Link>
                      </td>
                      <td className="p-3 text-sm text-gray-600">{contact.email}</td>
                      <td className="p-3">
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-teal-100 text-teal-800">
                          {contact.open_count}
                        </span>
                      </td>
                      <td className="p-3 text-sm text-gray-600">
                        {contact.first_opened ? new Date(contact.first_opened).toLocaleString() : '-'}
                      </td>
                      <td className="p-3 text-sm text-gray-600">
                        {contact.last_opened ? new Date(contact.last_opened).toLocaleString() : '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-12">
              <Eye className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">
                {searchOpened ? 'No contacts match your search' : 'No opens yet'}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Contacts Who Clicked */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center">
              <MousePointerClick className="w-5 h-5 mr-2 text-purple-500" />
              Contacts Who Clicked ({filteredClicked.length})
            </CardTitle>
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  placeholder="Search contacts..."
                  value={searchClicked}
                  onChange={(e) => setSearchClicked(e.target.value)}
                  className="pl-10 w-64"
                />
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {filteredClicked.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b bg-gray-50">
                    <th className="text-left p-3 font-medium text-gray-700">Name</th>
                    <th className="text-left p-3 font-medium text-gray-700">Email</th>
                    <th className="text-left p-3 font-medium text-gray-700">Clicks</th>
                    <th className="text-left p-3 font-medium text-gray-700">Links Clicked</th>
                    <th className="text-left p-3 font-medium text-gray-700">First Clicked</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredClicked.map(contact => (
                    <tr key={contact.contact_id} className="border-b hover:bg-gray-50 transition-colors">
                      <td className="p-3">
                        <Link
                          href={`/dashboard/contacts/${contact.contact_id}`}
                          className="text-purple-600 hover:underline font-medium"
                        >
                          {contact.name}
                        </Link>
                      </td>
                      <td className="p-3 text-sm text-gray-600">{contact.email}</td>
                      <td className="p-3">
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                          {contact.click_count}
                        </span>
                      </td>
                      <td className="p-3 text-sm text-gray-600 max-w-xs">
                        <div className="flex flex-wrap gap-1">
                          {contact.links_clicked.slice(0, 3).map((link, idx) => {
                            try {
                              const domain = new URL(link).hostname
                              return (
                                <span key={idx} className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-gray-100 text-gray-700">
                                  {domain}
                                </span>
                              )
                            } catch {
                              return (
                                <span key={idx} className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-gray-100 text-gray-700">
                                  {link.substring(0, 30)}...
                                </span>
                              )
                            }
                          })}
                          {contact.links_clicked.length > 3 && (
                            <span className="text-xs text-gray-500">
                              +{contact.links_clicked.length - 3} more
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="p-3 text-sm text-gray-600">
                        {contact.first_clicked ? new Date(contact.first_clicked).toLocaleString() : '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-12">
              <MousePointerClick className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">
                {searchClicked ? 'No contacts match your search' : 'No clicks yet'}
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
