'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  ArrowLeft,
  Mail,
  Eye,
  MousePointer,
  Users,
  Calendar,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  CheckCircle,
  Clock,
  ExternalLink
} from 'lucide-react'

interface Campaign {
  id: string
  name: string
  subject: string
  content: string
  status: string
  sent_date: string | null
  sent_count: number
  opened_count: number
  clicked_count: number
  bounced_count: number
  unsubscribed_count: number
  contact_list_id: string | null
  contact_list?: {
    name: string
    contact_count: number
  }
  from_name: string
  from_email: string
  created_at: string
  updated_at: string
}

interface CampaignRecipient {
  id: string
  email: string
  first_name: string
  last_name: string
  status: string
  opened_at: string | null
  clicked_at: string | null
  bounced_at: string | null
  unsubscribed_at: string | null
  delivered_at: string | null
}

interface EmailInteraction {
  id: string
  recipient_email: string
  recipient_name: string
  interaction_type: string
  timestamp: string
  user_agent?: string
  ip_address?: string
}

export default function CampaignReportPage() {
  const params = useParams()
  const router = useRouter()
  const campaignId = params?.id as string

  const [campaign, setCampaign] = useState<Campaign | null>(null)
  const [recipients, setRecipients] = useState<CampaignRecipient[]>([])
  const [interactions, setInteractions] = useState<EmailInteraction[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const supabase = createClient()

  useEffect(() => {
    if (campaignId) {
      loadCampaignReport()
    }
  }, [campaignId])

  const loadCampaignReport = async () => {
    try {
      setIsLoading(true)

      const { data: { user }, error: userError } = await supabase.auth.getUser()
      if (userError || !user) {
        router.push('/auth/sign-in')
        return
      }

      // Load campaign details
      const { data: campaignData, error: campaignError } = await supabase
        .from('campaigns')
        .select(`
          *,
          contact_lists (
            name,
            contact_count
          )
        `)
        .eq('id', campaignId)
        .eq('user_id', user.id)
        .single()

      if (campaignError) {
        console.error('Error loading campaign:', campaignError)
        router.push('/dashboard/campaigns')
        return
      }

      setCampaign(campaignData)

      // Load campaign recipients
      const { data: recipientsData, error: recipientsError } = await supabase
        .from('campaign_recipients')
        .select('*')
        .eq('campaign_id', campaignId)
        .order('email')

      if (recipientsError) {
        console.error('Error loading recipients:', recipientsError)
      } else {
        setRecipients(recipientsData || [])
      }

      // Load email interactions (opens, clicks, etc.)
      const { data: interactionsData, error: interactionsError } = await supabase
        .from('email_interactions')
        .select('*')
        .eq('campaign_id', campaignId)
        .order('timestamp', { ascending: false })

      if (interactionsError) {
        console.error('Error loading interactions:', interactionsError)
      } else {
        setInteractions(interactionsData || [])
      }

    } catch (error) {
      console.error('Error loading campaign report:', error)
    } finally {
      setIsLoading(false)
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-6 p-4 md:p-6">
        <div className="text-center py-8">Loading campaign report...</div>
      </div>
    )
  }

  if (!campaign) {
    return (
      <div className="space-y-6 p-4 md:p-6">
        <div className="text-center py-8">
          <p className="text-gray-500">Campaign not found</p>
          <Link href="/dashboard/campaigns">
            <Button variant="outline" className="mt-4">
              Back to Campaigns
            </Button>
          </Link>
        </div>
      </div>
    )
  }

  // Calculate metrics
  const totalRecipients = campaign.sent_count || recipients.length
  const openRate = totalRecipients > 0 ? Math.round((campaign.opened_count / totalRecipients) * 100) : 0
  const clickRate = totalRecipients > 0 ? Math.round((campaign.clicked_count / totalRecipients) * 100) : 0
  const bounceRate = totalRecipients > 0 ? Math.round((campaign.bounced_count / totalRecipients) * 100) : 0
  const unsubscribeRate = totalRecipients > 0 ? Math.round((campaign.unsubscribed_count / totalRecipients) * 100) : 0

  // Get recipients who opened
  const openedRecipients = recipients.filter(r => r.opened_at)

  // Get recipients who clicked
  const clickedRecipients = recipients.filter(r => r.clicked_at)

  // Get recent interactions
  const recentInteractions = interactions.slice(0, 20)

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'sent': return 'bg-green-100 text-green-800'
      case 'draft': return 'bg-gray-100 text-gray-800'
      case 'scheduled': return 'bg-blue-100 text-blue-800'
      case 'sending': return 'bg-yellow-100 text-yellow-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getMetricColor = (value: number, good: number, excellent: number) => {
    if (value >= excellent) return 'text-green-600'
    if (value >= good) return 'text-blue-600'
    return 'text-orange-600'
  }

  const getMetricIcon = (value: number, good: number, excellent: number) => {
    if (value >= excellent) return <TrendingUp className="w-4 h-4 text-green-500" />
    if (value >= good) return <TrendingUp className="w-4 h-4 text-blue-500" />
    return <TrendingDown className="w-4 h-4 text-orange-500" />
  }

  return (
    <div className="space-y-6 p-4 md:p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Link href="/dashboard/campaigns">
            <Button variant="outline" size="sm">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Campaigns
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{campaign.name}</h1>
            <div className="flex items-center space-x-2 mt-1">
              <Badge className={getStatusColor(campaign.status)}>
                {campaign.status}
              </Badge>
              {campaign.sent_date && (
                <span className="text-sm text-gray-500">
                  Sent {new Date(campaign.sent_date).toLocaleDateString()}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Recipients</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalRecipients.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              {campaign.contact_list ? `From ${campaign.contact_list.name}` : 'Custom selection'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Open Rate</CardTitle>
            <div className="flex items-center space-x-1">
              {getMetricIcon(openRate, 20, 25)}
              <Eye className="h-4 w-4 text-muted-foreground" />
            </div>
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${getMetricColor(openRate, 20, 25)}`}>
              {openRate}%
            </div>
            <p className="text-xs text-muted-foreground">
              {campaign.opened_count} of {totalRecipients} opened
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Click Rate</CardTitle>
            <div className="flex items-center space-x-1">
              {getMetricIcon(clickRate, 3, 5)}
              <MousePointer className="h-4 w-4 text-muted-foreground" />
            </div>
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${getMetricColor(clickRate, 3, 5)}`}>
              {clickRate}%
            </div>
            <p className="text-xs text-muted-foreground">
              {campaign.clicked_count} of {totalRecipients} clicked
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Bounce Rate</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${bounceRate > 5 ? 'text-red-600' : 'text-green-600'}`}>
              {bounceRate}%
            </div>
            <p className="text-xs text-muted-foreground">
              {campaign.bounced_count} bounced
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Campaign Details */}
      <Card>
        <CardHeader>
          <CardTitle>Campaign Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-medium text-gray-900 mb-2">Email Details</h4>
              <dl className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <dt className="text-gray-500">Subject:</dt>
                  <dd className="font-medium">{campaign.subject}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-gray-500">From:</dt>
                  <dd className="font-medium">{campaign.from_name} &lt;{campaign.from_email}&gt;</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-gray-500">Created:</dt>
                  <dd>{new Date(campaign.created_at).toLocaleDateString()}</dd>
                </div>
                {campaign.sent_date && (
                  <div className="flex justify-between">
                    <dt className="text-gray-500">Sent:</dt>
                    <dd>{new Date(campaign.sent_date).toLocaleString()}</dd>
                  </div>
                )}
              </dl>
            </div>

            <div>
              <h4 className="font-medium text-gray-900 mb-2">Performance Summary</h4>
              <dl className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <dt className="text-gray-500">Delivery Rate:</dt>
                  <dd className="font-medium">{Math.round(((totalRecipients - campaign.bounced_count) / totalRecipients) * 100)}%</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-gray-500">Engagement Rate:</dt>
                  <dd className="font-medium">{Math.round(((campaign.opened_count + campaign.clicked_count) / totalRecipients) * 100)}%</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-gray-500">Unsubscribe Rate:</dt>
                  <dd className="font-medium">{unsubscribeRate}%</dd>
                </div>
              </dl>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Detailed Reports */}
      <Tabs defaultValue="recipients" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="recipients">All Recipients</TabsTrigger>
          <TabsTrigger value="opened">Opened ({openedRecipients.length})</TabsTrigger>
          <TabsTrigger value="clicked">Clicked ({clickedRecipients.length})</TabsTrigger>
          <TabsTrigger value="activity">Activity Log</TabsTrigger>
        </TabsList>

        <TabsContent value="recipients" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>All Recipients ({recipients.length})</CardTitle>
              <CardDescription>
                Complete list of email recipients and their engagement status
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Recipient
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Opened
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Clicked
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {recipients.map((recipient) => (
                      <tr key={recipient.id}>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div>
                            <div className="text-sm font-medium text-gray-900">
                              {recipient.first_name} {recipient.last_name}
                            </div>
                            <div className="text-sm text-gray-500">{recipient.email}</div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <Badge
                            variant={recipient.status === 'delivered' ? 'default' : 'destructive'}
                          >
                            {recipient.status}
                          </Badge>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {recipient.opened_at ? (
                            <div className="flex items-center">
                              <CheckCircle className="w-4 h-4 text-green-500 mr-1" />
                              {new Date(recipient.opened_at).toLocaleDateString()}
                            </div>
                          ) : (
                            <div className="flex items-center text-gray-400">
                              <Clock className="w-4 h-4 mr-1" />
                              Not opened
                            </div>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {recipient.clicked_at ? (
                            <div className="flex items-center">
                              <CheckCircle className="w-4 h-4 text-green-500 mr-1" />
                              {new Date(recipient.clicked_at).toLocaleDateString()}
                            </div>
                          ) : (
                            <div className="flex items-center text-gray-400">
                              <Clock className="w-4 h-4 mr-1" />
                              Not clicked
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="opened" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Recipients Who Opened ({openedRecipients.length})</CardTitle>
              <CardDescription>
                Contacts who opened your email - great candidates for follow-up
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {openedRecipients.map((recipient) => (
                  <div key={recipient.id} className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                    <div>
                      <div className="font-medium text-gray-900">
                        {recipient.first_name} {recipient.last_name}
                      </div>
                      <div className="text-sm text-gray-500">{recipient.email}</div>
                    </div>
                    <div className="text-sm text-gray-500">
                      Opened {new Date(recipient.opened_at!).toLocaleDateString()}
                    </div>
                  </div>
                ))}
                {openedRecipients.length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    No opens recorded yet
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="clicked" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Recipients Who Clicked ({clickedRecipients.length})</CardTitle>
              <CardDescription>
                Highly engaged contacts who clicked links in your email
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {clickedRecipients.map((recipient) => (
                  <div key={recipient.id} className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                    <div>
                      <div className="font-medium text-gray-900">
                        {recipient.first_name} {recipient.last_name}
                      </div>
                      <div className="text-sm text-gray-500">{recipient.email}</div>
                    </div>
                    <div className="text-sm text-gray-500">
                      Clicked {new Date(recipient.clicked_at!).toLocaleDateString()}
                    </div>
                  </div>
                ))}
                {clickedRecipients.length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    No clicks recorded yet
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="activity" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Recent Activity ({recentInteractions.length})</CardTitle>
              <CardDescription>
                Real-time engagement activity from this campaign
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {recentInteractions.map((interaction) => (
                  <div key={interaction.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center space-x-3">
                      <div className="flex-shrink-0">
                        {interaction.interaction_type === 'open' && <Eye className="w-5 h-5 text-green-500" />}
                        {interaction.interaction_type === 'click' && <MousePointer className="w-5 h-5 text-blue-500" />}
                        {interaction.interaction_type === 'bounce' && <AlertTriangle className="w-5 h-5 text-red-500" />}
                        {interaction.interaction_type === 'unsubscribe' && <ExternalLink className="w-5 h-5 text-orange-500" />}
                      </div>
                      <div>
                        <div className="font-medium text-gray-900">
                          {interaction.recipient_name}
                        </div>
                        <div className="text-sm text-gray-500">
                          {interaction.recipient_email} • {interaction.interaction_type}
                        </div>
                      </div>
                    </div>
                    <div className="text-sm text-gray-500">
                      {new Date(interaction.timestamp).toLocaleString()}
                    </div>
                  </div>
                ))}
                {recentInteractions.length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    No activity recorded yet
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}