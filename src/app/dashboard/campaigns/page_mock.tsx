'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Mail, Plus, Edit, Trash2, Send, Eye, MousePointer, Users, BarChart3, Calendar } from 'lucide-react'

// Sample campaigns data
const initialCampaigns = [
  {
    id: 1,
    name: 'Q1 Product Launch',
    subject: 'Introducing Our Revolutionary CRM Solution',
    content: 'Dear valued customer,\n\nWe\'re excited to announce the launch of our new CRM features...',
    status: 'sent',
    sentDate: '2025-01-10',
    recipients: 156,
    metrics: {
      sent: 156,
      opened: 89,
      clicked: 23
    },
    contactList: 'All Active Customers'
  },
  {
    id: 2,
    name: 'Follow-up Sequence',
    subject: 'Don\'t Miss Out - Schedule Your Demo Today',
    content: 'Hi there,\n\nWe noticed you showed interest in our CRM solution...',
    status: 'draft',
    sentDate: null,
    recipients: 0,
    metrics: {
      sent: 0,
      opened: 0,
      clicked: 0
    },
    contactList: 'Warm Leads'
  },
  {
    id: 3,
    name: 'Customer Success Stories',
    subject: 'See How Companies Like Yours Are Succeeding',
    content: 'Hello,\n\nWe wanted to share some inspiring success stories...',
    status: 'sent',
    sentDate: '2025-01-05',
    recipients: 203,
    metrics: {
      sent: 203,
      opened: 127,
      clicked: 41
    },
    contactList: 'All Contacts'
  },
  {
    id: 4,
    name: 'Monthly Newsletter',
    subject: 'January Updates and Industry Insights',
    content: 'Dear subscriber,\n\nWelcome to our monthly newsletter...',
    status: 'scheduled',
    sentDate: '2025-01-20',
    recipients: 89,
    metrics: {
      sent: 0,
      opened: 0,
      clicked: 0
    },
    contactList: 'Newsletter Subscribers'
  }
]

// Sample contact lists
const contactLists = [
  { name: 'All Contacts', count: 287 },
  { name: 'All Active Customers', count: 156 },
  { name: 'Warm Leads', count: 73 },
  { name: 'Newsletter Subscribers', count: 89 },
  { name: 'High-Value Customers', count: 34 },
  { name: 'Recent Signups', count: 45 }
]

export default function CampaignsPage() {
  const [campaigns, setCampaigns] = useState(initialCampaigns)
  const [searchTerm, setSearchTerm] = useState('')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingCampaign, setEditingCampaign] = useState<any>(null)
  const [newCampaign, setNewCampaign] = useState({
    name: '',
    subject: '',
    content: '',
    contactList: ''
  })

  // Filter campaigns based on search
  const filteredCampaigns = campaigns.filter(campaign =>
    campaign.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    campaign.subject.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'sent': return 'bg-green-100 text-green-800'
      case 'draft': return 'bg-gray-100 text-gray-800'
      case 'scheduled': return 'bg-blue-100 text-blue-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const handleAddCampaign = () => {
    setEditingCampaign(null)
    setNewCampaign({
      name: '',
      subject: '',
      content: '',
      contactList: ''
    })
    setIsModalOpen(true)
  }

  const handleEditCampaign = (campaign: any) => {
    setEditingCampaign(campaign)
    setNewCampaign({
      name: campaign.name,
      subject: campaign.subject,
      content: campaign.content,
      contactList: campaign.contactList
    })
    setIsModalOpen(true)
  }

  const handleSaveCampaign = () => {
    if (editingCampaign) {
      setCampaigns(campaigns.map(campaign => 
        campaign.id === editingCampaign.id 
          ? { ...campaign, ...newCampaign }
          : campaign
      ))
    } else {
      const campaign = {
        id: Date.now(),
        ...newCampaign,
        status: 'draft',
        sentDate: null,
        recipients: 0,
        metrics: {
          sent: 0,
          opened: 0,
          clicked: 0
        }
      }
      setCampaigns([...campaigns, campaign])
    }
    setIsModalOpen(false)
  }

  const handleSendCampaign = (campaignId: number) => {
    setCampaigns(campaigns.map(campaign => 
      campaign.id === campaignId 
        ? { 
            ...campaign, 
            status: 'sent', 
            sentDate: new Date().toISOString().split('T')[0],
            recipients: contactLists.find(list => list.name === campaign.contactList)?.count || 0
          }
        : campaign
    ))
  }

  const handleDeleteCampaign = (campaignId: number) => {
    setCampaigns(campaigns.filter(campaign => campaign.id !== campaignId))
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-GB')
  }

  const calculateOpenRate = (metrics: any) => {
    if (metrics.sent === 0) return 0
    return Math.round((metrics.opened / metrics.sent) * 100)
  }

  const calculateClickRate = (metrics: any) => {
    if (metrics.sent === 0) return 0
    return Math.round((metrics.clicked / metrics.sent) * 100)
  }

  const totalMetrics = campaigns.reduce((acc, campaign) => {
    if (campaign.status === 'sent') {
      acc.sent += campaign.metrics.sent
      acc.opened += campaign.metrics.opened
      acc.clicked += campaign.metrics.clicked
    }
    return acc
  }, { sent: 0, opened: 0, clicked: 0 })

  return (
      <div className="space-y-6 p-4 md:p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Email Campaigns</h1>
          <p className="text-gray-600">Create and track email campaigns to nurture leads and engage customers</p>
        </div>
        <Button onClick={handleAddCampaign} className="bg-teal-500 hover:bg-teal-600">
          <Plus className="w-4 h-4 mr-2" />
          Create Campaign
        </Button>
      </div>

      {/* Overall Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Sent</CardTitle>
            <Send className="h-4 w-4 text-gray-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalMetrics.sent.toLocaleString()}</div>
            <p className="text-xs text-green-600">All campaigns</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Opened</CardTitle>
            <Eye className="h-4 w-4 text-gray-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalMetrics.opened.toLocaleString()}</div>
            <p className="text-xs text-blue-600">{calculateOpenRate(totalMetrics)}% open rate</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Clicked</CardTitle>
            <MousePointer className="h-4 w-4 text-gray-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalMetrics.clicked.toLocaleString()}</div>
            <p className="text-xs text-purple-600">{calculateClickRate(totalMetrics)}% click rate</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Campaigns</CardTitle>
            <BarChart3 className="h-4 w-4 text-gray-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{campaigns.length}</div>
            <p className="text-xs text-gray-600">Total created</p>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <div className="relative">
        <Mail className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
        <Input
          placeholder="Search campaigns..."
          className="pl-10"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      {/* Campaigns List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Mail className="h-5 w-5 text-teal-600" />
            <span>All Campaigns ({filteredCampaigns.length})</span>
          </CardTitle>
          <CardDescription>
            Your email campaigns and their performance metrics
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {filteredCampaigns.map((campaign) => (
              <div key={campaign.id} className="p-4 border border-gray-200 rounded-lg hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <h3 className="font-medium text-gray-900">{campaign.name}</h3>
                      <Badge className={getStatusColor(campaign.status)}>
                        {campaign.status}
                      </Badge>
                    </div>
                    
                    <p className="text-sm text-gray-600 mb-3">{campaign.subject}</p>
                    
                    <div className="flex items-center space-x-6 text-sm text-gray-500">
                      <div className="flex items-center space-x-1">
                        <Users className="w-4 h-4" />
                        <span>{campaign.contactList}</span>
                      </div>
                      
                      {campaign.sentDate && (
                        <div className="flex items-center space-x-1">
                          <Calendar className="w-4 h-4" />
                          <span>Sent: {formatDate(campaign.sentDate)}</span>
                        </div>
                      )}
                      
                      {campaign.status === 'sent' && (
                        <div className="flex items-center space-x-4">
                          <span className="flex items-center space-x-1">
                            <Send className="w-4 h-4" />
                            <span>{campaign.metrics.sent}</span>
                          </span>
                          <span className="flex items-center space-x-1">
                            <Eye className="w-4 h-4" />
                            <span>{campaign.metrics.opened} ({calculateOpenRate(campaign.metrics)}%)</span>
                          </span>
                          <span className="flex items-center space-x-1">
                            <MousePointer className="w-4 h-4" />
                            <span>{campaign.metrics.clicked} ({calculateClickRate(campaign.metrics)}%)</span>
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex space-x-2 ml-4">
                    {campaign.status === 'draft' && (
                      <Button
                        size="sm"
                        onClick={() => handleSendCampaign(campaign.id)}
                        className="bg-green-600 hover:bg-green-700"
                      >
                        <Send className="w-4 h-4 mr-1" />
                        Send
                      </Button>
                    )}
                    
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleEditCampaign(campaign)}
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                    
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleDeleteCampaign(campaign.id)}
                      className="text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
            
            {filteredCampaigns.length === 0 && (
              <div className="text-center py-12">
                <Mail className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No campaigns found</h3>
                <p className="text-gray-600">
                  {searchTerm 
                    ? 'Try adjusting your search criteria.'
                    : 'Create your first email campaign to get started.'
                  }
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Create/Edit Campaign Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>{editingCampaign ? 'Edit Campaign' : 'Create New Campaign'}</DialogTitle>
            <DialogDescription>
              {editingCampaign ? 'Update campaign information and content' : 'Set up a new email marketing campaign'}
            </DialogDescription>
          </DialogHeader>
          
          <Tabs defaultValue="details" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="details">Campaign Details</TabsTrigger>
              <TabsTrigger value="content">Email Content</TabsTrigger>
            </TabsList>
            
            <TabsContent value="details" className="space-y-4">
              <div>
                <Label htmlFor="name">Campaign Name</Label>
                <Input
                  id="name"
                  value={newCampaign.name}
                  onChange={(e) => setNewCampaign({...newCampaign, name: e.target.value})}
                  placeholder="Enter campaign name"
                />
              </div>
              
              <div>
                <Label htmlFor="subject">Email Subject</Label>
                <Input
                  id="subject"
                  value={newCampaign.subject}
                  onChange={(e) => setNewCampaign({...newCampaign, subject: e.target.value})}
                  placeholder="Enter email subject line"
                />
              </div>
              
              <div>
                <Label htmlFor="contactList">Contact List</Label>
                <select
                  id="contactList"
                  value={newCampaign.contactList}
                  onChange={(e) => setNewCampaign({...newCampaign, contactList: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500"
                >
                  <option value="">Select contact list</option>
                  {contactLists.map((list) => (
                    <option key={list.name} value={list.name}>
                      {list.name} ({list.count} contacts)
                    </option>
                  ))}
                </select>
              </div>
            </TabsContent>
            
            <TabsContent value="content" className="space-y-4">
              <div>
                <Label htmlFor="content">Email Content</Label>
                <Textarea
                  id="content"
                  value={newCampaign.content}
                  onChange={(e) => setNewCampaign({...newCampaign, content: e.target.value})}
                  placeholder="Write your email content here..."
                  rows={10}
                  className="font-mono text-sm"
                />
              </div>
              
              <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="font-medium text-gray-900 mb-2">Email Preview</h4>
                <div className="bg-white border border-gray-200 rounded p-4 max-h-48 overflow-y-auto">
                  <div className="text-sm text-gray-600 mb-2">Subject: {newCampaign.subject || '(No subject)'}</div>
                  <div className="whitespace-pre-wrap text-sm">
                    {newCampaign.content || 'Email content will appear here...'}
                  </div>
                </div>
              </div>
            </TabsContent>
          </Tabs>
          
          <div className="flex space-x-2 pt-4">
            <Button onClick={() => setIsModalOpen(false)} variant="outline" className="flex-1">
              Cancel
            </Button>
            <Button onClick={handleSaveCampaign} className="flex-1 bg-teal-500 hover:bg-teal-600">
              {editingCampaign ? 'Update' : 'Create'} Campaign
            </Button>
          </div>
        </DialogContent>
      </Dialog>
      </div>
  )
}