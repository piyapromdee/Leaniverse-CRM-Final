'use client'

import { useState, useEffect } from 'react'
import AdminLayout from '@/components/admin-layout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Send,
  Users,
  TrendingUp,
  Settings,
  Eye,
  Plus,
  Trash2
} from 'lucide-react'

interface EmailTemplate {
  id: string
  name: string
  subject: string
  content: string
  type: 'lead_followup' | 'welcome' | 'promotion' | 'newsletter' | 'custom'
  created_at: string
  updated_at: string
}

interface Campaign {
  id: string
  name: string
  template_id: string
  template_name?: string
  subject?: string
  content?: string
  recipients?: string
  status: 'draft' | 'scheduled' | 'sent' | 'active'
  sent_count: number
  open_rate: number
  click_rate: number
  scheduled_at?: string
  created_at: string
}

export default function AdminEmailMarketing() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [templates, setTemplates] = useState<EmailTemplate[]>([])
  const [loading, setLoading] = useState(true)

  // Modal state
  const [previewDialogOpen, setPreviewDialogOpen] = useState(false)
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [selectedCampaign, setSelectedCampaign] = useState<Campaign | null>(null)

  // Edit form state
  const [editForm, setEditForm] = useState({
    name: '',
    subject: '',
    recipients: '',
    template_id: '',
    content: ''
  })

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      setLoading(true)
      // For now, we'll use mock data since email marketing tables don't exist yet
      // In a real implementation, you would fetch from email_campaigns and email_templates tables

      const mockTemplates: EmailTemplate[] = [
        {
          id: '1',
          name: 'Lead Follow-up',
          subject: 'Thank you for your interest in our CRM solution',
          content: 'Hi {first_name},\n\nThank you for reaching out about our AI-powered CRM solution...',
          type: 'lead_followup',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        },
        {
          id: '2',
          name: 'Welcome Email',
          subject: 'Welcome to Dummi & Co CRM!',
          content: 'Welcome {first_name}!\n\nWe are excited to have you on board...',
          type: 'welcome',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        },
        {
          id: '3',
          name: 'Promotional Offer',
          subject: 'Special Offer: 20% Off CRM Premium',
          content: 'Hi {first_name},\n\nWe have an exclusive offer just for you! Get 20% off our Premium CRM package...',
          type: 'promotion',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }
      ]

      const mockCampaigns: Campaign[] = [
        {
          id: '1',
          name: 'Q4 Lead Nurture Campaign',
          template_id: '1',
          template_name: 'Lead Follow-up',
          subject: 'Thank you for your interest in our CRM solution',
          content: 'Hi {first_name},\n\nThank you for reaching out about our AI-powered CRM solution. We understand that managing customer relationships can be challenging, and we\'re here to help.\n\nOur CRM includes:\n• Lead tracking and management\n• Automated email campaigns\n• Sales pipeline visualization\n• Real-time analytics\n\nWould you like to schedule a demo?\n\nBest regards,\nThe Dummi & Co Team',
          recipients: 'leads@example.com, sales@example.com',
          status: 'active',
          sent_count: 245,
          open_rate: 24.5,
          click_rate: 8.2,
          created_at: new Date().toISOString()
        },
        {
          id: '2',
          name: 'New Customer Welcome Series',
          template_id: '2',
          template_name: 'Welcome Email',
          subject: 'Welcome to Dummi & Co CRM!',
          content: 'Welcome {first_name}!\n\nWe are excited to have you on board. Your account is now active and ready to use.\n\nHere are some quick steps to get started:\n1. Complete your profile\n2. Import your contacts\n3. Set up your first campaign\n4. Explore our dashboard\n\nIf you have any questions, our support team is here to help.\n\nWelcome aboard!\nThe Dummi & Co Team',
          recipients: 'customers@example.com',
          status: 'sent',
          sent_count: 89,
          open_rate: 42.7,
          click_rate: 15.3,
          created_at: new Date().toISOString()
        }
      ]

      setTemplates(mockTemplates)
      setCampaigns(mockCampaigns)
    } catch (error) {
      console.error('Error fetching email marketing data:', error)
    } finally {
      setLoading(false)
    }
  }

  const getStatusColor = (status: Campaign['status']) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800'
      case 'sent': return 'bg-blue-100 text-blue-800'
      case 'scheduled': return 'bg-yellow-100 text-yellow-800'
      case 'draft': return 'bg-gray-100 text-gray-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  // Handler functions
  const handlePreview = (campaign: Campaign) => {
    setSelectedCampaign(campaign)
    setPreviewDialogOpen(true)
  }

  const handleEdit = (campaign: Campaign) => {
    setSelectedCampaign(campaign)
    setEditForm({
      name: campaign.name,
      subject: campaign.subject || '',
      recipients: campaign.recipients || '',
      template_id: campaign.template_id || '',
      content: campaign.content || ''
    })
    setEditDialogOpen(true)
  }

  const handleDelete = (campaign: Campaign) => {
    setSelectedCampaign(campaign)
    setDeleteDialogOpen(true)
  }

  const handleSaveEdit = async () => {
    if (!selectedCampaign) return

    try {
      const updatedCampaign = {
        ...selectedCampaign,
        name: editForm.name,
        subject: editForm.subject,
        recipients: editForm.recipients
      }

      setCampaigns(campaigns.map(c => c.id === selectedCampaign.id ? updatedCampaign : c))
      setEditDialogOpen(false)
      setSelectedCampaign(null)
      alert('Campaign updated successfully')
    } catch (error) {
      console.error('Error updating campaign:', error)
      alert('Failed to update campaign')
    }
  }

  const handleConfirmDelete = async () => {
    if (!selectedCampaign) return

    try {
      setCampaigns(campaigns.filter(c => c.id !== selectedCampaign.id))
      setDeleteDialogOpen(false)
      setSelectedCampaign(null)
      alert('Campaign deleted successfully')
    } catch (error) {
      console.error('Error deleting campaign:', error)
      alert('Failed to delete campaign')
    }
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Email Marketing Campaigns</h1>
          <p className="text-gray-600 mt-2">
            Monitor and manage your email marketing campaigns for lead nurturing and customer engagement.
          </p>
        </div>

      {/* Campaign Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Campaigns</CardTitle>
            <Send className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{campaigns.length}</div>
            <p className="text-xs text-muted-foreground">Active campaigns</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Emails Sent</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {campaigns.reduce((sum, c) => sum + c.sent_count, 0)}
            </div>
            <p className="text-xs text-muted-foreground">Total delivered</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Open Rate</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {campaigns.length > 0 
                ? Math.round(campaigns.reduce((sum, c) => sum + c.open_rate, 0) / campaigns.length)
                : 0}%
            </div>
            <p className="text-xs text-muted-foreground">Email opens</p>
          </CardContent>
        </Card>
      </div>

      {/* Email Campaigns Section */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Email Campaigns</CardTitle>
              <CardDescription>
                Manage your email marketing campaigns and track performance.
              </CardDescription>
            </div>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              New Campaign
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {campaigns.map(campaign => (
              <div key={campaign.id} className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-semibold">{campaign.name}</h3>
                    <Badge className={getStatusColor(campaign.status)}>
                      {campaign.status}
                    </Badge>
                  </div>
                  <p className="text-sm text-gray-600 mb-1">
                    Template: {campaign.template_name}
                  </p>
                  <div className="flex gap-4 text-xs text-gray-500">
                    <span>Sent: {campaign.sent_count}</span>
                    <span>Open Rate: {campaign.open_rate}%</span>
                    <span>Click Rate: {campaign.click_rate}%</span>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handlePreview(campaign)}
                    title="Preview Email"
                  >
                    <Eye className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleEdit(campaign)}
                    title="Edit Campaign"
                  >
                    <Settings className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDelete(campaign)}
                    title="Delete Campaign"
                    className="hover:text-red-600"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Preview Email Modal */}
      <Dialog open={previewDialogOpen} onOpenChange={setPreviewDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Campaign Preview: {selectedCampaign?.name}</DialogTitle>
            <DialogDescription>
              Preview the email content that will be sent to recipients
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label className="text-sm font-semibold text-gray-700">Subject Line</Label>
              <div className="p-3 bg-gray-50 border rounded-md">
                <p className="text-sm font-medium">{selectedCampaign?.subject}</p>
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-semibold text-gray-700">Email Content</Label>
              <div className="p-4 bg-white border rounded-md">
                <div className="prose prose-sm max-w-none">
                  <pre className="whitespace-pre-wrap font-sans text-sm text-gray-700">
                    {selectedCampaign?.content}
                  </pre>
                </div>
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-semibold text-gray-700">Recipients</Label>
              <div className="p-3 bg-gray-50 border rounded-md">
                <p className="text-sm text-gray-600">{selectedCampaign?.recipients}</p>
              </div>
            </div>
            <div className="flex items-center gap-4 text-xs text-gray-500">
              <span>Template: {selectedCampaign?.template_name}</span>
              <span>Status: {selectedCampaign?.status}</span>
              <span>Sent: {selectedCampaign?.sent_count}</span>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPreviewDialogOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Campaign Modal */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Campaign</DialogTitle>
            <DialogDescription>
              Update campaign settings and content
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-campaign-name">Campaign Name</Label>
              <Input
                id="edit-campaign-name"
                value={editForm.name}
                onChange={(e) => setEditForm({...editForm, name: e.target.value})}
                placeholder="e.g. Q4 Lead Nurture Campaign"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-subject">Email Subject</Label>
              <Input
                id="edit-subject"
                value={editForm.subject}
                onChange={(e) => setEditForm({...editForm, subject: e.target.value})}
                placeholder="e.g. Thank you for your interest"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-recipients">Recipients</Label>
              <Textarea
                id="edit-recipients"
                value={editForm.recipients}
                onChange={(e) => setEditForm({...editForm, recipients: e.target.value})}
                placeholder="e.g. leads@example.com, sales@example.com"
                rows={3}
              />
              <p className="text-xs text-gray-500">
                Separate multiple email addresses with commas
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveEdit}>
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Campaign Confirmation */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Campaign?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete the campaign "{selectedCampaign?.name}"?
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              className="bg-red-600 hover:bg-red-700"
            >
              Delete Campaign
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      </div>
    </AdminLayout>
  )
}