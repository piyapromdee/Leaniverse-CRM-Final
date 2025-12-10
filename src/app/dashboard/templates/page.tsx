'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { RichTextEditor } from '@/components/ui/rich-text-editor'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Code, Eye, Save, Palette, Type, Image, Layout, Plus, Trash2, Copy, Edit, Mail, FileText } from 'lucide-react'
import { brandColors } from '@/lib/email-templates'
import { createClient } from '@/lib/supabase/client'

interface CustomTemplate {
  id: string
  name: string
  description: string
  category: string
  subject: string
  content: string
  variables: string[]
  created_at: string
  updated_at: string
}

export default function TemplatesPage() {
  const [templates, setTemplates] = useState<CustomTemplate[]>([])
  const [isCreating, setIsCreating] = useState(false)
  const [editingTemplate, setEditingTemplate] = useState<CustomTemplate | null>(null)
  const [previewTemplate, setPreviewTemplate] = useState<CustomTemplate | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  
  const [newTemplate, setNewTemplate] = useState({
    name: '',
    description: '',
    category: 'custom',
    subject: '',
    content: '',
    variables: [] as string[]
  })
  
  const supabase = createClient()
  
  // Load custom templates
  useEffect(() => {
    loadTemplates()
  }, [])
  
  const loadTemplates = async () => {
    try {
      setIsLoading(true)
      
      // First try localStorage for any saved templates
      const stored = localStorage.getItem('emailTemplates')
      if (stored) {
        const localTemplates = JSON.parse(stored)
        if (localTemplates.length > 0) {
          setTemplates(localTemplates)
          setIsLoading(false)
          return
        }
      }
      
      const { data, error } = await supabase
        .from('email_templates')
        .select('*')
        .order('created_at', { ascending: false })
      
      if (error) {
        console.error('Error loading templates:', error)
        // Use default templates if database fails
        const defaultTemplates: CustomTemplate[] = [
          {
            id: 'welcome-template',
            name: 'Welcome Email',
            description: 'Welcome new leads and customers',
            category: 'welcome',
            subject: 'Welcome to {{company_name}}, {{first_name}}!',
            content: `Hi {{first_name}},

Welcome to {{company_name}}! We're excited to have you on board.

Our team is here to help you get the most out of our CRM solution. Here's what you can expect:

• Personalized onboarding support
• Access to our comprehensive knowledge base  
• Regular product updates and improvements

If you have any questions, don't hesitate to reach out to our support team.

Best regards,
The {{company_name}} Team`,
            variables: ['first_name', 'company_name'],
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          },
          {
            id: 'follow-up-template',
            name: 'Follow-up Email',
            description: 'Follow up with prospects after initial contact',
            category: 'follow_up',
            subject: 'Following up on our conversation, {{first_name}}',
            content: `Hi {{first_name}},

I wanted to follow up on our recent conversation about {{topic}}.

Based on what you shared about {{company_name}}, I believe our CRM solution could help you:

• Streamline your sales process
• Better track customer interactions
• Increase conversion rates

Would you like to schedule a 15-minute demo to see how it works?

Best regards,
{{sender_name}}`,
            variables: ['first_name', 'company_name', 'topic', 'sender_name'],
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          },
          {
            id: 'demo-reminder-template',
            name: 'Demo Reminder',
            description: 'Remind prospects about upcoming demo',
            category: 'reminder',
            subject: 'Demo reminder: {{company_name}} CRM - Tomorrow at {{demo_time}}',
            content: `Hi {{first_name}},

This is a friendly reminder about our CRM demo scheduled for tomorrow at {{demo_time}}.

We'll be covering:
• How to set up your sales pipeline
• Lead management best practices  
• Reporting and analytics features
• Q&A session

Demo details:
• Date: {{demo_date}}
• Time: {{demo_time}}
• Duration: 30 minutes

Looking forward to showing you how our CRM can help {{company_name}} grow!

Best regards,
{{sender_name}}`,
            variables: ['first_name', 'company_name', 'demo_time', 'demo_date', 'sender_name'],
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          }
        ]
        setTemplates(defaultTemplates)
        localStorage.setItem('emailTemplates', JSON.stringify(defaultTemplates))
      } else {
        setTemplates(data || [])
      }
    } catch (error) {
      console.error('Error loading templates:', error)
      // Fallback to empty array
      setTemplates([])
    } finally {
      setIsLoading(false)
    }
  }
  
  const saveTemplate = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      
      const templateData = {
        ...newTemplate,
        user_id: user?.id || 'local-user',
        variables: newTemplate.variables,
        updated_at: new Date().toISOString()
      }
      
      let success = false
      
      // Try saving to database first
      if (user) {
        try {
          if (editingTemplate) {
            const { error } = await supabase
              .from('email_templates')
              .update(templateData)
              .eq('id', editingTemplate.id)
            
            if (!error) success = true
          } else {
            const { error } = await supabase
              .from('email_templates')
              .insert([{ ...templateData, created_at: new Date().toISOString() }])
            
            if (!error) success = true
          }
        } catch (dbError) {
          console.error('Database save failed:', dbError)
        }
      }
      
      // Fallback to localStorage if database fails or no user
      if (!success) {
        const currentTemplates = [...templates]
        
        if (editingTemplate) {
          const index = currentTemplates.findIndex(t => t.id === editingTemplate.id)
          if (index !== -1) {
            currentTemplates[index] = { ...editingTemplate, ...templateData }
          }
        } else {
          const newId = `local-${Date.now()}`
          const newTemplate = {
            id: newId,
            ...templateData,
            created_at: new Date().toISOString()
          }
          currentTemplates.unshift(newTemplate)
        }
        
        // Save to localStorage
        localStorage.setItem('emailTemplates', JSON.stringify(currentTemplates))
        setTemplates(currentTemplates)
      } else {
        // Reload from database if successful
        loadTemplates()
      }
      
      resetForm()
      setIsCreating(false)
      setEditingTemplate(null)
    } catch (error) {
      console.error('Error saving template:', error)
    }
  }
  
  const deleteTemplate = async (id: string) => {
    if (!confirm('Are you sure you want to delete this template?')) return
    
    try {
      let success = false
      
      // Try deleting from database first
      try {
        const { error } = await supabase
          .from('email_templates')
          .delete()
          .eq('id', id)
        
        if (!error) success = true
      } catch (dbError) {
        console.error('Database delete failed:', dbError)
      }
      
      // Fallback to localStorage if database fails
      if (!success) {
        const currentTemplates = templates.filter(t => t.id !== id)
        localStorage.setItem('emailTemplates', JSON.stringify(currentTemplates))
        setTemplates(currentTemplates)
      } else {
        loadTemplates()
      }
    } catch (error) {
      console.error('Error deleting template:', error)
    }
  }
  
  const resetForm = () => {
    setNewTemplate({
      name: '',
      description: '',
      category: 'custom',
      subject: '',
      content: '',
      variables: []
    })
  }
  
  const duplicateTemplate = async (template: CustomTemplate) => {
    try {
      const duplicateData = {
        name: `${template.name} (Copy)`,
        description: template.description,
        category: template.category,
        subject: template.subject,
        content: template.content,
        variables: template.variables
      }
      
      console.log('Duplicating template:', duplicateData)
      
      // Save directly to database
      const response = await fetch('/api/email-templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(duplicateData)
      })
      
      if (response.ok) {
        const newTemplate = await response.json()
        console.log('Template duplicated successfully:', newTemplate)
        loadTemplates() // Refresh the list
        alert('Template duplicated successfully!')
      } else {
        const error = await response.text()
        console.error('Failed to duplicate template:', error)
        
        // Fallback: duplicate locally using localStorage
        const currentTemplates = [...templates]
        const newId = `local-${Date.now()}`
        const newTemplate = {
          id: newId,
          ...duplicateData,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }
        currentTemplates.unshift(newTemplate)
        
        // Save to localStorage
        localStorage.setItem('emailTemplates', JSON.stringify(currentTemplates))
        setTemplates(currentTemplates)
        
        alert('Template duplicated successfully (saved locally)!')
      }
    } catch (error) {
      console.error('Error duplicating template:', error)
      
      // Fallback: duplicate locally using localStorage
      const currentTemplates = [...templates]
      const newId = `local-${Date.now()}`
      const newTemplate = {
        id: newId,
        name: `${template.name} (Copy)`,
        description: template.description,
        category: template.category,
        subject: template.subject,
        content: template.content,
        variables: template.variables,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }
      currentTemplates.unshift(newTemplate)
      
      // Save to localStorage
      localStorage.setItem('emailTemplates', JSON.stringify(currentTemplates))
      setTemplates(currentTemplates)
      
      alert('Template duplicated successfully (saved locally)!')
    }
  }
  
  const insertBlock = (blockType: string) => {
    // Use fallback colors if brandColors is not available
    const colors = brandColors || {
      primary: '#14b8a6',
      primaryDark: '#0f766e',
      text: '#1f2937',
      textLight: '#6b7280',
      backgroundLight: '#f0fdfa',
      border: '#e5e7eb'
    }
    
    const blocks = {
      header: `
        <div style="text-align: center; padding: 30px; background: linear-gradient(135deg, ${colors.primary} 0%, ${colors.primaryDark} 100%);">
          <img src="/dummi-co-logo-new.jpg" alt="Dummi & Co" style="max-width: 180px;">
        </div>
      `,
      title: `<h1 style="color: ${colors.text}; font-size: 28px; margin-bottom: 20px;">{{title}}</h1>`,
      paragraph: `<p style="color: ${colors.textLight}; font-size: 16px; line-height: 1.6; margin-bottom: 15px;">{{content}}</p>`,
      button: `
        <div style="text-align: center; margin: 30px 0;">
          <a href="{{link}}" style="display: inline-block; padding: 12px 30px; background: ${colors.primary}; color: white; text-decoration: none; border-radius: 6px; font-weight: 600;">{{button_text}}</a>
        </div>
      `,
      divider: `<hr style="border: none; border-top: 1px solid ${colors.border}; margin: 30px 0;">`,
      highlight: `
        <div style="background-color: ${colors.backgroundLight}; border-left: 4px solid ${colors.primary}; padding: 20px; margin: 20px 0; border-radius: 4px;">
          <p style="margin: 0;">{{highlight_text}}</p>
        </div>
      `,
      footer: `
        <div style="background-color: ${colors.backgroundLight}; padding: 30px; text-align: center; border-top: 1px solid ${colors.border};">
          <p style="font-size: 14px; color: ${colors.textLight};">© 2024 Dummi & Co. All rights reserved.</p>
        </div>
      `
    }
    
    setNewTemplate({
      ...newTemplate,
      content: newTemplate.content + (blocks[blockType as keyof typeof blocks] || '')
    })
  }
  
  const extractVariables = (content: string) => {
    const matches = content.match(/{{([^}]+)}}/g)
    return matches ? [...new Set(matches.map(m => m.replace(/[{}]/g, '')))] : []
  }
  
  useEffect(() => {
    const variables = extractVariables(newTemplate.content + newTemplate.subject)
    setNewTemplate(prev => ({ ...prev, variables }))
  }, [newTemplate.content, newTemplate.subject])
  
  // Show loading state while templates are being fetched
  if (isLoading) {
    return (
      <div className="space-y-8 ml-8 mr-8">
        <div className="border-b border-gray-200 pb-8 pt-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 flex items-center mb-6">
                <FileText className="w-6 h-6 mr-3 text-teal-600" />
                Email Templates
              </h1>
              <p className="text-gray-600">
                Loading templates...
              </p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-8 ml-8 mr-8">
      {/* Page Header */}
      <div className="border-b border-gray-200 pb-8 pt-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center mb-6">
              <FileText className="w-6 h-6 mr-3 text-teal-600" />
              Email Templates
            </h1>
            <p className="text-gray-600">
              Create and manage custom email templates for your campaigns
            </p>
          </div>
          <div className="flex items-center space-x-3">
            <Button onClick={() => setIsCreating(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Create Template
            </Button>
          </div>
        </div>
      </div>
      
      {/* Templates Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {templates.map((template) => (
          <Card key={template.id} className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span className="text-lg">{template.name}</span>
                <Badge variant="outline">{template.category}</Badge>
              </CardTitle>
              <CardDescription>{template.description}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <p className="text-sm text-gray-600">
                  <strong>Subject:</strong> {template.subject}
                </p>
                <p className="text-xs text-gray-500">
                  Variables: {template.variables.join(', ') || 'None'}
                </p>
                <div className="flex items-center space-x-2">
                  <Button size="sm" variant="outline" onClick={() => setPreviewTemplate(template)}>
                    <Eye className="w-4 h-4 mr-1" />
                    Preview
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => {
                    setNewTemplate({
                      name: template.name,
                      description: template.description,
                      category: template.category,
                      subject: template.subject,
                      content: template.content,
                      variables: template.variables
                    })
                    setEditingTemplate(template)
                    setIsCreating(true)
                  }}>
                    <Edit className="w-4 h-4 mr-1" />
                    Edit
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => duplicateTemplate(template)}>
                    <Copy className="w-4 h-4 mr-1" />
                    Duplicate
                  </Button>
                  <Button 
                    size="sm" 
                    variant="destructive" 
                    onClick={() => deleteTemplate(template.id)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
        
        {templates.length === 0 && (
          <div className="col-span-full text-center py-12">
            <Mail className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No templates yet</h3>
            <p className="text-gray-500 mb-4">Create your first custom email template</p>
            <Button onClick={() => setIsCreating(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Create Template
            </Button>
          </div>
        )}
      </div>
      
      {/* Create/Edit Template Dialog */}
      <Dialog open={isCreating} onOpenChange={(open) => {
        setIsCreating(open)
        if (!open) {
          resetForm()
          setEditingTemplate(null)
        }
      }}>
        <DialogContent className="!max-w-[90vw] !w-[90vw] max-h-[90vh] overflow-hidden sm:!max-w-[90vw]">
          <DialogHeader className="pb-6">
            <DialogTitle className="text-2xl">
              {editingTemplate ? 'Edit Template' : 'Create New Template'}
            </DialogTitle>
            <DialogDescription className="text-base mt-2">
              Build professional email templates with our visual editor
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 max-h-[70vh] overflow-y-auto">
            {/* Left Panel - Template Info */}
            <div className="lg:col-span-4 space-y-5">
              <div className="space-y-3">
                <Label className="text-sm font-medium">Template Name</Label>
                <Input
                  value={newTemplate.name}
                  onChange={(e) => setNewTemplate({ ...newTemplate, name: e.target.value })}
                  placeholder="e.g., Summer Sale"
                  className="mt-1"
                />
              </div>
              
              <div className="space-y-3">
                <Label className="text-sm font-medium">Description</Label>
                <Input
                  value={newTemplate.description}
                  onChange={(e) => setNewTemplate({ ...newTemplate, description: e.target.value })}
                  placeholder="Brief description"
                  className="mt-1"
                />
              </div>
              
              <div className="space-y-3">
                <Label className="text-sm font-medium">Category</Label>
                <Select value={newTemplate.category} onValueChange={(value) => setNewTemplate({ ...newTemplate, category: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="custom">Custom</SelectItem>
                    <SelectItem value="promotional">Promotional</SelectItem>
                    <SelectItem value="newsletter">Newsletter</SelectItem>
                    <SelectItem value="transactional">Transactional</SelectItem>
                    <SelectItem value="welcome">Welcome</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-3">
                <Label className="text-sm font-medium">Subject Line</Label>
                <Input
                  value={newTemplate.subject}
                  onChange={(e) => setNewTemplate({ ...newTemplate, subject: e.target.value })}
                  placeholder="e.g., {{first_name}}, check this out!"
                  className="mt-1"
                />
              </div>
              
              {/* Quick Insert Blocks */}
              <div className="border rounded-lg p-4 bg-gray-50">
                <h4 className="font-medium text-sm mb-3 text-gray-700">Quick Insert Blocks</h4>
                <div className="space-y-1.5">
                  <button 
                    onClick={() => insertBlock('header')}
                    className="w-full flex items-center px-3 py-2 text-sm text-left hover:bg-white hover:shadow-sm border border-gray-200 rounded-md transition-all"
                  >
                    <Layout className="w-4 h-4 mr-2.5 text-gray-500" />
                    Header with Logo
                  </button>
                  <button 
                    onClick={() => insertBlock('title')}
                    className="w-full flex items-center px-3 py-2 text-sm text-left hover:bg-white hover:shadow-sm border border-gray-200 rounded-md transition-all"
                  >
                    <Type className="w-4 h-4 mr-2.5 text-gray-500" />
                    Title
                  </button>
                  <button 
                    onClick={() => insertBlock('paragraph')}
                    className="w-full flex items-center px-3 py-2 text-sm text-left hover:bg-white hover:shadow-sm border border-gray-200 rounded-md transition-all"
                  >
                    <Type className="w-4 h-4 mr-2.5 text-gray-500" />
                    Paragraph
                  </button>
                  <button 
                    onClick={() => insertBlock('button')}
                    className="w-full flex items-center px-3 py-2 text-sm text-left hover:bg-white hover:shadow-sm border border-gray-200 rounded-md transition-all"
                  >
                    <Plus className="w-4 h-4 mr-2.5 text-gray-500" />
                    Button
                  </button>
                  <button 
                    onClick={() => insertBlock('highlight')}
                    className="w-full flex items-center px-3 py-2 text-sm text-left hover:bg-white hover:shadow-sm border border-gray-200 rounded-md transition-all"
                  >
                    <Layout className="w-4 h-4 mr-2.5 text-gray-500" />
                    Highlight Box
                  </button>
                  <button 
                    onClick={() => insertBlock('divider')}
                    className="w-full flex items-center px-3 py-2 text-sm text-left hover:bg-white hover:shadow-sm border border-gray-200 rounded-md transition-all"
                  >
                    <Layout className="w-4 h-4 mr-2.5 text-gray-500" />
                    Divider
                  </button>
                  <button 
                    onClick={() => insertBlock('footer')}
                    className="w-full flex items-center px-3 py-2 text-sm text-left hover:bg-white hover:shadow-sm border border-gray-200 rounded-md transition-all"
                  >
                    <Layout className="w-4 h-4 mr-2.5 text-gray-500" />
                    Footer
                  </button>
                </div>
              </div>
              
              {/* Variables */}
              {newTemplate.variables.length > 0 && (
                <div className="border rounded-lg p-4 bg-gray-50">
                  <h4 className="font-medium mb-2 text-sm">Detected Variables</h4>
                  <div className="flex flex-wrap gap-1">
                    {newTemplate.variables.map((variable, idx) => (
                      <Badge key={idx} variant="secondary" className="text-xs">
                        {`{{${variable}}}`}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>
            
            {/* Right Panel - Content Editor */}
            <div className="lg:col-span-8 space-y-5">
              <Tabs defaultValue="editor">
                <TabsList>
                  <TabsTrigger value="editor">Editor</TabsTrigger>
                  <TabsTrigger value="preview">Preview</TabsTrigger>
                </TabsList>
                
                <TabsContent value="editor" className="space-y-4">
                  <div className="space-y-3">
                    <Label className="text-sm font-medium">Email Content</Label>
                    <RichTextEditor
                      content={newTemplate.content}
                      onChange={(content) => setNewTemplate({ ...newTemplate, content })}
                      placeholder="Start typing your email content..."
                    />
                  </div>
                </TabsContent>
                
                <TabsContent value="preview">
                  <div className="border rounded-lg overflow-hidden">
                    <div className="bg-gray-100 p-4 border-b">
                      <div className="max-w-2xl mx-auto">
                        <p className="text-sm text-gray-600 mb-1">Subject:</p>
                        <p className="font-medium">{newTemplate.subject || 'No subject'}</p>
                      </div>
                    </div>
                    <iframe
                      srcDoc={`
                        <!DOCTYPE html>
                        <html>
                        <head>
                          <meta charset="UTF-8">
                          <meta name="viewport" content="width=device-width, initial-scale=1.0">
                        </head>
                        <body style="margin: 0; padding: 20px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: ${brandColors?.backgroundLight || '#f0fdfa'};">
                          <div style="max-width: 600px; margin: 0 auto; background-color: white; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.07);">
                            ${newTemplate.content}
                          </div>
                        </body>
                        </html>
                      `}
                      className="w-full h-[450px]"
                      title="Template Preview"
                    />
                  </div>
                </TabsContent>
              </Tabs>
              
              <div className="flex justify-end space-x-3 pt-4 border-t">
                <Button variant="outline" onClick={() => {
                  resetForm()
                  setIsCreating(false)
                  setEditingTemplate(null)
                }}>
                  Cancel
                </Button>
                <Button onClick={saveTemplate} className="bg-teal-500 hover:bg-teal-600">
                  <Save className="w-4 h-4 mr-2" />
                  {editingTemplate ? 'Update Template' : 'Save Template'}
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
      
      {/* Preview Dialog */}
      <Dialog open={!!previewTemplate} onOpenChange={() => setPreviewTemplate(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle>{previewTemplate?.name}</DialogTitle>
            <DialogDescription>{previewTemplate?.description}</DialogDescription>
          </DialogHeader>
          
          {previewTemplate && (
            <div className="border rounded-lg overflow-hidden">
              <div className="bg-gray-100 p-4 border-b">
                <div className="max-w-2xl mx-auto">
                  <p className="text-sm text-gray-600 mb-1">Subject:</p>
                  <p className="font-medium">{previewTemplate.subject}</p>
                </div>
              </div>
              <iframe
                srcDoc={`
                  <!DOCTYPE html>
                  <html>
                  <head>
                    <meta charset="UTF-8">
                    <meta name="viewport" content="width=device-width, initial-scale=1.0">
                  </head>
                  <body style="margin: 0; padding: 20px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: ${brandColors?.backgroundLight || '#f0fdfa'};">
                    <div style="max-width: 600px; margin: 0 auto; background-color: white;">
                      ${previewTemplate.content}
                    </div>
                  </body>
                  </html>
                `}
                className="w-full h-[500px]"
                title="Template Preview"
              />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}