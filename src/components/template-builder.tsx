'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Code, Eye, Save, Palette, Type, Image, Layout, Plus, Trash2, Copy } from 'lucide-react'
import { brandColors } from '@/lib/email-templates'

interface TemplateBuilderProps {
  onSave?: (template: any) => void
  initialTemplate?: any
}

export function TemplateBuilder({ onSave, initialTemplate }: TemplateBuilderProps) {
  const [template, setTemplate] = useState({
    name: initialTemplate?.name || '',
    description: initialTemplate?.description || '',
    category: initialTemplate?.category || 'custom',
    subject: initialTemplate?.subject || '',
    preheader: '',
    sections: initialTemplate?.sections || [
      { type: 'header', content: '' },
      { type: 'content', content: '' },
      { type: 'footer', content: '' }
    ]
  })
  
  const [activeSection, setActiveSection] = useState(0)
  const [previewMode, setPreviewMode] = useState(false)
  const [showColorPicker, setShowColorPicker] = useState(false)
  
  // Template building blocks
  const templateBlocks = {
    header: {
      logo_center: `
        <div style="text-align: center; padding: 30px; background: linear-gradient(135deg, ${brandColors.primary} 0%, ${brandColors.primaryDark} 100%);">
          <img src="/dummi-co-logo-new.jpg" alt="Logo" style="max-width: 180px;">
        </div>
      `,
      logo_left: `
        <div style="padding: 30px; background-color: ${brandColors.backgroundLight};">
          <img src="/dummi-co-logo-new.jpg" alt="Logo" style="max-width: 150px;">
        </div>
      `
    },
    content: {
      title: `<h1 style="color: ${brandColors.text}; font-size: 28px; margin-bottom: 20px;">{{title}}</h1>`,
      paragraph: `<p style="color: ${brandColors.textLight}; font-size: 16px; line-height: 1.6; margin-bottom: 15px;">{{content}}</p>`,
      button: `
        <div style="text-align: center; margin: 30px 0;">
          <a href="{{link}}" style="display: inline-block; padding: 12px 30px; background: ${brandColors.primary}; color: white; text-decoration: none; border-radius: 6px; font-weight: 600;">{{button_text}}</a>
        </div>
      `,
      divider: `<hr style="border: none; border-top: 1px solid ${brandColors.border}; margin: 30px 0;">`,
      highlight_box: `
        <div style="background-color: ${brandColors.backgroundLight}; border-left: 4px solid ${brandColors.primary}; padding: 20px; margin: 20px 0; border-radius: 4px;">
          <p style="margin: 0;">{{highlight_text}}</p>
        </div>
      `,
      two_column: `
        <table width="100%" cellpadding="0" cellspacing="0">
          <tr>
            <td width="48%" valign="top">
              <h3>Column 1</h3>
              <p>Content here</p>
            </td>
            <td width="4%"></td>
            <td width="48%" valign="top">
              <h3>Column 2</h3>
              <p>Content here</p>
            </td>
          </tr>
        </table>
      `,
      image: `
        <div style="text-align: center; margin: 20px 0;">
          <img src="{{image_url}}" alt="{{image_alt}}" style="max-width: 100%; height: auto; border-radius: 8px;">
        </div>
      `,
      social_links: `
        <div style="text-align: center; margin: 30px 0;">
          <a href="#" style="display: inline-block; margin: 0 10px;">LinkedIn</a>
          <a href="#" style="display: inline-block; margin: 0 10px;">Twitter</a>
          <a href="#" style="display: inline-block; margin: 0 10px;">Facebook</a>
        </div>
      `
    },
    footer: {
      simple: `
        <div style="background-color: ${brandColors.backgroundLight}; padding: 30px; text-align: center; border-top: 1px solid ${brandColors.border};">
          <p style="font-size: 14px; color: ${brandColors.textLight};">
            © 2024 Dummi & Co. All rights reserved.
          </p>
        </div>
      `,
      detailed: `
        <div style="background-color: ${brandColors.backgroundLight}; padding: 30px; text-align: center; border-top: 1px solid ${brandColors.border};">
          <p style="font-weight: 600; margin-bottom: 10px;">Dummi & Co</p>
          <p style="font-size: 14px; color: ${brandColors.textLight}; margin-bottom: 20px;">
            123 Business Ave, Suite 100, San Francisco, CA 94107
          </p>
          <p style="font-size: 12px; color: ${brandColors.textLight};">
            <a href="{{unsubscribe_link}}" style="color: ${brandColors.primary};">Unsubscribe</a> | 
            <a href="{{preferences_link}}" style="color: ${brandColors.primary};">Update Preferences</a>
          </p>
        </div>
      `
    }
  }
  
  const addSection = (type: string) => {
    const newSections = [...template.sections]
    newSections.push({ type, content: '' })
    setTemplate({ ...template, sections: newSections })
    setActiveSection(newSections.length - 1)
  }
  
  const removeSection = (index: number) => {
    const newSections = template.sections.filter((_: any, i: number) => i !== index)
    setTemplate({ ...template, sections: newSections })
    if (activeSection >= newSections.length) {
      setActiveSection(Math.max(0, newSections.length - 1))
    }
  }
  
  const insertBlock = (blockContent: string) => {
    const newSections = [...template.sections]
    newSections[activeSection].content += blockContent
    setTemplate({ ...template, sections: newSections })
  }
  
  const generateFullHTML = () => {
    const sections = template.sections.map((s: any) => s.content).join('\n')
    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${template.subject}</title>
  <style>
    body { 
      margin: 0; 
      padding: 0; 
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background-color: ${brandColors.backgroundLight};
    }
    .email-container {
      max-width: 600px;
      margin: 0 auto;
      background-color: white;
    }
  </style>
</head>
<body>
  <div class="email-container">
    ${sections}
  </div>
</body>
</html>
    `.trim()
  }
  
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center">
              <Layout className="w-5 h-5 mr-2 text-teal-600" />
              Custom Template Builder
            </span>
            <div className="flex items-center space-x-2">
              <Button
                size="sm"
                variant={previewMode ? 'default' : 'outline'}
                onClick={() => setPreviewMode(!previewMode)}
              >
                <Eye className="w-4 h-4 mr-1" />
                {previewMode ? 'Edit' : 'Preview'}
              </Button>
              <Button
                size="sm"
                variant="default"
                className="bg-teal-500 hover:bg-teal-600"
                onClick={() => onSave?.(template)}
              >
                <Save className="w-4 h-4 mr-1" />
                Save Template
              </Button>
            </div>
          </CardTitle>
          <CardDescription>
            Build professional email templates with drag-and-drop blocks
          </CardDescription>
        </CardHeader>
        
        <CardContent>
          {!previewMode ? (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Left Panel - Template Info */}
              <div className="space-y-4">
                <div>
                  <Label>Template Name</Label>
                  <Input
                    value={template.name}
                    onChange={(e) => setTemplate({ ...template, name: e.target.value })}
                    placeholder="e.g., Summer Sale"
                  />
                </div>
                
                <div>
                  <Label>Category</Label>
                  <Select
                    value={template.category}
                    onValueChange={(value) => setTemplate({ ...template, category: value })}
                  >
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
                
                <div>
                  <Label>Subject Line</Label>
                  <Input
                    value={template.subject}
                    onChange={(e) => setTemplate({ ...template, subject: e.target.value })}
                    placeholder="e.g., {{first_name}}, check this out!"
                  />
                </div>
                
                {/* Building Blocks */}
                <div className="border rounded-lg p-4">
                  <h4 className="font-medium mb-3">Quick Insert Blocks</h4>
                  <div className="space-y-2">
                    <Button
                      size="sm"
                      variant="outline"
                      className="w-full justify-start"
                      onClick={() => insertBlock(templateBlocks.content.title)}
                    >
                      <Type className="w-4 h-4 mr-2" />
                      Title
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="w-full justify-start"
                      onClick={() => insertBlock(templateBlocks.content.paragraph)}
                    >
                      <Type className="w-4 h-4 mr-2" />
                      Paragraph
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="w-full justify-start"
                      onClick={() => insertBlock(templateBlocks.content.button)}
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Button
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="w-full justify-start"
                      onClick={() => insertBlock(templateBlocks.content.image)}
                    >
                      <Image className="w-4 h-4 mr-2" />
                      Image
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="w-full justify-start"
                      onClick={() => insertBlock(templateBlocks.content.highlight_box)}
                    >
                      <Layout className="w-4 h-4 mr-2" />
                      Highlight Box
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="w-full justify-start"
                      onClick={() => insertBlock(templateBlocks.content.divider)}
                    >
                      <Layout className="w-4 h-4 mr-2" />
                      Divider
                    </Button>
                  </div>
                </div>
                
                {/* Variables Help */}
                <div className="border rounded-lg p-4 bg-gray-50">
                  <h4 className="font-medium mb-2 text-sm">Available Variables</h4>
                  <div className="space-y-1 text-xs text-gray-600">
                    <div>{'{{first_name}}'} - Contact's first name</div>
                    <div>{'{{email}}'} - Contact's email</div>
                    <div>{'{{company}}'} - Company name</div>
                    <div>{'{{custom_field}}'} - Any custom field</div>
                  </div>
                </div>
              </div>
              
              {/* Middle Panel - Section Editor */}
              <div className="lg:col-span-2 space-y-4">
                <Tabs value={String(activeSection)} onValueChange={(v) => setActiveSection(Number(v))}>
                  <div className="flex items-center justify-between mb-4">
                    <TabsList>
                      {template.sections.map((section: any, index: number) => (
                        <TabsTrigger key={index} value={String(index)}>
                          {section.type} {index + 1}
                        </TabsTrigger>
                      ))}
                    </TabsList>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => addSection('content')}
                    >
                      <Plus className="w-4 h-4 mr-1" />
                      Add Section
                    </Button>
                  </div>
                  
                  {template.sections.map((section: any, index: number) => (
                    <TabsContent key={index} value={String(index)} className="space-y-4">
                      <div className="flex items-center justify-between">
                        <Label>Section Type: {section.type}</Label>
                        {template.sections.length > 1 && (
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => removeSection(index)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                      
                      <div>
                        <Label>HTML Content</Label>
                        <Textarea
                          value={section.content}
                          onChange={(e) => {
                            const newSections = [...template.sections]
                            newSections[index].content = e.target.value
                            setTemplate({ ...template, sections: newSections })
                          }}
                          placeholder="Enter HTML content or use quick insert blocks..."
                          className="min-h-[400px] font-mono text-sm"
                        />
                      </div>
                      
                      {/* Quick Templates for this section */}
                      {section.type === 'header' && (
                        <div className="flex space-x-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              const newSections = [...template.sections]
                              newSections[index].content = templateBlocks.header.logo_center
                              setTemplate({ ...template, sections: newSections })
                            }}
                          >
                            Logo Center
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              const newSections = [...template.sections]
                              newSections[index].content = templateBlocks.header.logo_left
                              setTemplate({ ...template, sections: newSections })
                            }}
                          >
                            Logo Left
                          </Button>
                        </div>
                      )}
                      
                      {section.type === 'footer' && (
                        <div className="flex space-x-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              const newSections = [...template.sections]
                              newSections[index].content = templateBlocks.footer.simple
                              setTemplate({ ...template, sections: newSections })
                            }}
                          >
                            Simple Footer
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              const newSections = [...template.sections]
                              newSections[index].content = templateBlocks.footer.detailed
                              setTemplate({ ...template, sections: newSections })
                            }}
                          >
                            Detailed Footer
                          </Button>
                        </div>
                      )}
                    </TabsContent>
                  ))}
                </Tabs>
              </div>
            </div>
          ) : (
            /* Preview Mode */
            <div className="border rounded-lg overflow-hidden">
              <div className="bg-gray-100 p-4 border-b">
                <div className="max-w-2xl mx-auto">
                  <p className="text-sm text-gray-600 mb-1">Subject:</p>
                  <p className="font-medium">{template.subject || 'No subject'}</p>
                </div>
              </div>
              <iframe
                srcDoc={generateFullHTML()}
                className="w-full h-[600px]"
                title="Template Preview"
              />
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}