'use client'

import { useState, useEffect } from 'react'
import AdminLayout from '@/components/admin-layout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from '@/components/ui/dialog'
import {
  Mail,
  Plus,
  Edit,
  Eye,
  Copy,
  Trash2,
  X
} from 'lucide-react'
import dynamic from 'next/dynamic'

// Dynamically import RichTextEditor to avoid SSR issues
const RichTextEditor = dynamic(() => import('@/components/campaigns/RichTextEditor'), {
  ssr: false,
  loading: () => <div className="border rounded-lg p-4 min-h-[300px] flex items-center justify-center"><span className="text-gray-400">Loading editor...</span></div>
})

interface EmailTemplate {
  id: string
  name: string
  subject: string
  content: string
  type: 'lead_followup' | 'welcome' | 'promotion' | 'newsletter' | 'custom'
  created_at: string
  updated_at: string
}

export default function AdminEmailTemplates() {
  const [templates, setTemplates] = useState<EmailTemplate[]>([])
  const [loading, setLoading] = useState(true)
  const [templateDialogOpen, setTemplateDialogOpen] = useState(false)
  const [editingTemplate, setEditingTemplate] = useState<EmailTemplate | null>(null)
  const [previewTemplate, setPreviewTemplate] = useState<EmailTemplate | null>(null)
  const [previewDialogOpen, setPreviewDialogOpen] = useState(false)
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)
  const [templateToDelete, setTemplateToDelete] = useState<EmailTemplate | null>(null)
  const [activeFilter, setActiveFilter] = useState<EmailTemplate['type'] | 'all'>('all')

  const [templateForm, setTemplateForm] = useState({
    name: '',
    subject: '',
    content: '',
    type: 'custom' as EmailTemplate['type']
  })

  useEffect(() => {
    fetchTemplates()
  }, [])

  const fetchTemplates = async () => {
    try {
      setLoading(true)
      // For now, we'll use mock data since email marketing tables don't exist yet
      // In a real implementation, you would fetch from email_templates table

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
        }
      ]

      setTemplates(mockTemplates)
    } catch (error) {
      console.error('Error fetching email templates:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleCreateTemplate = async () => {
    try {
      // In real implementation, save to database
      const newTemplate: EmailTemplate = {
        id: Date.now().toString(),
        ...templateForm,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }

      setTemplates([...templates, newTemplate])
      setTemplateForm({ name: '', subject: '', content: '', type: 'custom' })
      setTemplateDialogOpen(false)
      alert('Email template created successfully')
    } catch (error) {
      console.error('Error creating template:', error)
      alert('Failed to create email template')
    }
  }

  const handleUpdateTemplate = async () => {
    if (!editingTemplate) return

    try {
      const updatedTemplate = {
        ...editingTemplate,
        ...templateForm,
        updated_at: new Date().toISOString()
      }

      setTemplates(templates.map(t => t.id === editingTemplate.id ? updatedTemplate : t))
      setEditingTemplate(null)
      setTemplateForm({ name: '', subject: '', content: '', type: 'custom' })
      setTemplateDialogOpen(false)
      alert('Email template updated successfully')
    } catch (error) {
      console.error('Error updating template:', error)
      alert('Failed to update email template')
    }
  }

  const openEditTemplate = (template: EmailTemplate) => {
    setEditingTemplate(template)
    setTemplateForm({
      name: template.name,
      subject: template.subject,
      content: template.content,
      type: template.type
    })
    setTemplateDialogOpen(true)
  }

  const openPreviewTemplate = (template: EmailTemplate) => {
    setPreviewTemplate(template)
    setPreviewDialogOpen(true)
  }

  const duplicateTemplate = (template: EmailTemplate) => {
    const newTemplate: EmailTemplate = {
      id: Date.now().toString(),
      name: `${template.name} (Copy)`,
      subject: template.subject,
      content: template.content,
      type: template.type,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }
    setTemplates([...templates, newTemplate])
    alert('Template duplicated successfully')
  }

  const openDeleteConfirm = (template: EmailTemplate) => {
    setTemplateToDelete(template)
    setDeleteConfirmOpen(true)
  }

  const handleDeleteTemplate = () => {
    if (!templateToDelete) return

    // In real implementation, delete from database
    setTemplates(templates.filter(t => t.id !== templateToDelete.id))
    setDeleteConfirmOpen(false)
    setTemplateToDelete(null)
  }

  // Filter templates based on active filter
  const filteredTemplates = activeFilter === 'all'
    ? templates
    : templates.filter(t => t.type === activeFilter)

  const getTypeColor = (type: EmailTemplate['type']) => {
    switch (type) {
      case 'lead_followup': return 'bg-purple-100 text-purple-800'
      case 'welcome': return 'bg-green-100 text-green-800'
      case 'promotion': return 'bg-red-100 text-red-800'
      case 'newsletter': return 'bg-blue-100 text-blue-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Email Templates</h1>
          <p className="text-gray-600 mt-2">
            Create and manage reusable email templates for different types of communications.
          </p>
        </div>

        {/* Stats Cards - Clickable Filters */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <Card
            className={`cursor-pointer transition-all hover:shadow-md ${activeFilter === 'all' ? 'ring-2 ring-teal-500 bg-teal-50' : ''}`}
            onClick={() => setActiveFilter('all')}
          >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">All Templates</CardTitle>
              <Mail className="h-4 w-4 text-teal-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{templates.length}</div>
              <p className="text-xs text-muted-foreground">
                {activeFilter === 'all' ? '✓ Showing all' : 'Click to show all'}
              </p>
            </CardContent>
          </Card>

          <Card
            className={`cursor-pointer transition-all hover:shadow-md ${activeFilter === 'lead_followup' ? 'ring-2 ring-purple-500 bg-purple-50' : ''}`}
            onClick={() => setActiveFilter('lead_followup')}
          >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Lead Follow-ups</CardTitle>
              <Mail className="h-4 w-4 text-purple-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {templates.filter(t => t.type === 'lead_followup').length}
              </div>
              <p className="text-xs text-muted-foreground">
                {activeFilter === 'lead_followup' ? '✓ Filtered' : 'Click to filter'}
              </p>
            </CardContent>
          </Card>

          <Card
            className={`cursor-pointer transition-all hover:shadow-md ${activeFilter === 'welcome' ? 'ring-2 ring-green-500 bg-green-50' : ''}`}
            onClick={() => setActiveFilter('welcome')}
          >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Welcome</CardTitle>
              <Mail className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {templates.filter(t => t.type === 'welcome').length}
              </div>
              <p className="text-xs text-muted-foreground">
                {activeFilter === 'welcome' ? '✓ Filtered' : 'Click to filter'}
              </p>
            </CardContent>
          </Card>

          <Card
            className={`cursor-pointer transition-all hover:shadow-md ${activeFilter === 'promotion' ? 'ring-2 ring-red-500 bg-red-50' : ''}`}
            onClick={() => setActiveFilter('promotion')}
          >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Promotions</CardTitle>
              <Mail className="h-4 w-4 text-red-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {templates.filter(t => t.type === 'promotion').length}
              </div>
              <p className="text-xs text-muted-foreground">
                {activeFilter === 'promotion' ? '✓ Filtered' : 'Click to filter'}
              </p>
            </CardContent>
          </Card>

          <Card
            className={`cursor-pointer transition-all hover:shadow-md ${activeFilter === 'newsletter' ? 'ring-2 ring-blue-500 bg-blue-50' : ''}`}
            onClick={() => setActiveFilter('newsletter')}
          >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Newsletters</CardTitle>
              <Mail className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {templates.filter(t => t.type === 'newsletter').length}
              </div>
              <p className="text-xs text-muted-foreground">
                {activeFilter === 'newsletter' ? '✓ Filtered' : 'Click to filter'}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Email Templates Section */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  {activeFilter === 'all' ? 'All Email Templates' : `${activeFilter.replace('_', ' ')} Templates`}
                  {activeFilter !== 'all' && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setActiveFilter('all')}
                      className="h-6 px-2 text-xs"
                    >
                      <X className="h-3 w-3 mr-1" />
                      Clear filter
                    </Button>
                  )}
                </CardTitle>
                <CardDescription>
                  {activeFilter === 'all'
                    ? 'Manage your email templates for campaigns and automated communications.'
                    : `Showing ${filteredTemplates.length} ${activeFilter.replace('_', ' ')} template${filteredTemplates.length !== 1 ? 's' : ''}`
                  }
                </CardDescription>
              </div>
              <Dialog open={templateDialogOpen} onOpenChange={setTemplateDialogOpen}>
                <DialogTrigger asChild>
                  <Button onClick={() => {
                    setEditingTemplate(null)
                    setTemplateForm({ name: '', subject: '', content: '', type: 'custom' })
                  }}>
                    <Plus className="h-4 w-4 mr-2" />
                    New Template
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>
                      {editingTemplate ? 'Edit Template' : 'Create New Template'}
                    </DialogTitle>
                  </DialogHeader>
                  <div className="grid gap-4 py-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="template-name">Template Name</Label>
                        <Input
                          id="template-name"
                          value={templateForm.name}
                          onChange={(e) => setTemplateForm({...templateForm, name: e.target.value})}
                          placeholder="e.g. Lead Follow-up Email"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="template-type">Type</Label>
                        <select
                          className="w-full p-2 border border-gray-200 rounded-md"
                          value={templateForm.type}
                          onChange={(e) => setTemplateForm({...templateForm, type: e.target.value as EmailTemplate['type']})}
                        >
                          <option value="custom">Custom</option>
                          <option value="lead_followup">Lead Follow-up</option>
                          <option value="welcome">Welcome</option>
                          <option value="promotion">Promotion</option>
                          <option value="newsletter">Newsletter</option>
                        </select>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="template-subject">Email Subject</Label>
                      <Input
                        id="template-subject"
                        value={templateForm.subject}
                        onChange={(e) => setTemplateForm({...templateForm, subject: e.target.value})}
                        placeholder="e.g. Thank you for your interest in our CRM"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="template-content">Email Content</Label>
                      <RichTextEditor
                        content={templateForm.content}
                        onChange={(html) => setTemplateForm({...templateForm, content: html})}
                        placeholder="Start writing your email content... Use {{first_name}}, {{last_name}}, {{company}} for personalization"
                      />
                    </div>
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={() => setTemplateDialogOpen(false)}>
                      Cancel
                    </Button>
                    <Button onClick={editingTemplate ? handleUpdateTemplate : handleCreateTemplate}>
                      {editingTemplate ? 'Update Template' : 'Create Template'}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {filteredTemplates.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <Mail className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                  <p>No {activeFilter !== 'all' ? activeFilter.replace('_', ' ') : ''} templates found</p>
                  <Button
                    variant="outline"
                    className="mt-4"
                    onClick={() => {
                      setActiveFilter('all')
                      setEditingTemplate(null)
                      setTemplateForm({ name: '', subject: '', content: '', type: activeFilter !== 'all' ? activeFilter : 'custom' })
                      setTemplateDialogOpen(true)
                    }}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Create {activeFilter !== 'all' ? activeFilter.replace('_', ' ') : ''} Template
                  </Button>
                </div>
              ) : (
                filteredTemplates.map(template => (
                  <div key={template.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 transition-colors">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold">{template.name}</h3>
                        <Badge className={getTypeColor(template.type)}>
                          {template.type.replace('_', ' ')}
                        </Badge>
                      </div>
                      <p className="text-sm text-gray-600 mb-1">{template.subject}</p>
                      <p className="text-xs text-gray-500">
                        Created {new Date(template.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openPreviewTemplate(template)}
                        title="Preview Template"
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => duplicateTemplate(template)}
                        title="Duplicate Template"
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openEditTemplate(template)}
                        title="Edit Template"
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openDeleteConfirm(template)}
                        title="Delete Template"
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        {/* Preview Modal */}
        <Dialog open={previewDialogOpen} onOpenChange={setPreviewDialogOpen}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Eye className="h-5 w-5 text-teal-600" />
                Preview: {previewTemplate?.name}
              </DialogTitle>
              <DialogDescription>
                Preview how this email template will appear to recipients
              </DialogDescription>
            </DialogHeader>
            {previewTemplate && (
              <div className="space-y-4">
                {/* Email Header Info */}
                <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-gray-600 w-20">Subject:</span>
                    <span className="text-sm text-gray-900">{previewTemplate.subject}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-gray-600 w-20">Type:</span>
                    <Badge className={getTypeColor(previewTemplate.type)}>
                      {previewTemplate.type.replace('_', ' ')}
                    </Badge>
                  </div>
                </div>

                {/* Email Content Preview */}
                <div className="border rounded-lg overflow-hidden">
                  <div className="bg-gray-100 px-4 py-2 border-b flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-600">Email Content</span>
                    <span className="text-xs text-gray-500">Variables like {'{first_name}'} will be replaced with actual data</span>
                  </div>
                  {previewTemplate.content.includes('<') ? (
                    // HTML content - render in iframe
                    <iframe
                      srcDoc={previewTemplate.content}
                      className="w-full h-[400px] bg-white"
                      title="Email Preview"
                    />
                  ) : (
                    // Plain text content
                    <div className="p-4 bg-white whitespace-pre-wrap text-sm text-gray-800 min-h-[200px]">
                      {previewTemplate.content}
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="flex justify-end gap-2 pt-2">
                  <Button variant="outline" onClick={() => setPreviewDialogOpen(false)}>
                    Close
                  </Button>
                  <Button onClick={() => {
                    setPreviewDialogOpen(false)
                    openEditTemplate(previewTemplate)
                  }}>
                    <Edit className="h-4 w-4 mr-2" />
                    Edit Template
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation Modal */}
        <Dialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-red-600">
                <Trash2 className="h-5 w-5" />
                Delete Template
              </DialogTitle>
              <DialogDescription>
                Are you sure you want to delete this template? This action cannot be undone.
              </DialogDescription>
            </DialogHeader>
            {templateToDelete && (
              <div className="py-4">
                <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{templateToDelete.name}</span>
                    <Badge className={getTypeColor(templateToDelete.type)}>
                      {templateToDelete.type.replace('_', ' ')}
                    </Badge>
                  </div>
                  <p className="text-sm text-gray-600">{templateToDelete.subject}</p>
                </div>
              </div>
            )}
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setDeleteConfirmOpen(false)}>
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={handleDeleteTemplate}
                className="bg-red-600 hover:bg-red-700"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete Template
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  )
}
