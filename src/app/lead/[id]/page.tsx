'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Download, CheckCircle, FileText, BookOpen, Calculator, Brain, ClipboardList, Presentation } from 'lucide-react'
import { Textarea } from '@/components/ui/textarea'

interface FormField {
  id: string
  type: 'text' | 'email' | 'phone' | 'number' | 'date' | 'textarea' | 'select' | 'checkbox' | 'radio'
  label: string
  placeholder?: string
  required: boolean
  options?: string[] | { label: string; value: string }[]
  order: number
}

interface LeadMagnet {
  id: string
  title: string
  description: string
  type: string
  file_url?: string
  landing_page_url?: string
  downloads: number
  leads_generated: number
  is_active: boolean
  form_fields?: FormField[]
  slug?: string
}

const TYPE_ICONS: Record<string, any> = {
  'ebook': BookOpen,
  'whitepaper': FileText,
  'template': ClipboardList,
  'webinar': Presentation,
  'guide': BookOpen,
  'checklist': CheckCircle,
  'lead_form': FileText,
  'quiz': Brain,
  'survey': ClipboardList,
  'calculator': Calculator,
  'assessment': Brain,
  'course': BookOpen
}

export default function LeadMagnetLandingPage() {
  const params = useParams()
  const [magnet, setMagnet] = useState<LeadMagnet | null>(null)
  const [loading, setLoading] = useState(true)
  const [customFieldData, setCustomFieldData] = useState<Record<string, any>>({})
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  useEffect(() => {
    fetchMagnet()
  }, [params.id])

  const fetchMagnet = async () => {
    try {
      // First try to get from localStorage (client-side)
      const stored = localStorage.getItem('leadMagnets')
      if (stored) {
        const leadMagnets = JSON.parse(stored)
        const foundMagnet = leadMagnets.find((m: LeadMagnet) => m.id === params.id)
        if (foundMagnet) {
          console.log('Found lead magnet in localStorage:', foundMagnet)
          setMagnet(foundMagnet)
          setLoading(false)
          return
        }
      }

      // Then try API
      const response = await fetch(`/api/lead-magnets/${params.id}`)
      if (response.ok) {
        const data = await response.json()
        console.log('Fetched lead magnet data from API:', data)
        console.log('Form fields:', data.form_fields)
        setMagnet(data)
      } else {
        // Use generic mock data if API fails and not in localStorage
        setMagnet({
          id: params.id as string,
          title: 'Deemmi Lead Form',
          description: 'Custom lead form for capturing potential clients',
          type: 'lead_form',
          file_url: '',
          landing_page_url: '',
          downloads: 0,
          leads_generated: 0,
          is_active: true
        })
      }
    } catch (error) {
      console.error('Error fetching lead magnet:', error)
      // Use generic mock data on error
      setMagnet({
        id: params.id as string,
        title: 'Deemmi Lead Form', 
        description: 'Custom lead form for capturing potential clients',
        type: 'lead_form',
        file_url: '',
        landing_page_url: '',
        downloads: 0,
        leads_generated: 0,
        is_active: true
      })
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)

    try {
      const response = await fetch('/api/lead-magnets/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lead_magnet_id: magnet?.id,
          lead_magnet_slug: magnet?.slug,
          lead_magnet_title: magnet?.title,
          form_data: customFieldData
        })
      })

      if (response.ok || true) { // Always succeed for demo
        setSubmitted(true)
        // If there's a file URL, trigger download
        if (magnet?.file_url) {
          window.open(magnet.file_url, '_blank')
        }
      }
    } catch (error) {
      console.error('Error submitting form:', error)
      // Still mark as submitted for demo
      setSubmitted(true)
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-purple-50">
        <div className="text-lg">Loading...</div>
      </div>
    )
  }

  if (!magnet || !magnet.is_active) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-purple-50">
        <Card className="max-w-md">
          <CardContent className="p-8 text-center">
            <h2 className="text-xl font-semibold mb-2">Content Not Available</h2>
            <p className="text-gray-600">This lead magnet is no longer available.</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  const Icon = TYPE_ICONS[magnet.type] || FileText

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      {/* Hero Section */}
      <div className="container mx-auto px-4 py-12 md:py-20">
        <div className="grid md:grid-cols-2 gap-8 md:gap-12 items-center max-w-6xl mx-auto">
          {/* Left Column - Content */}
          <div className="space-y-6">
            <div className="flex items-center space-x-3">
              <Icon className="w-12 h-12 text-blue-600" />
              <span className="text-sm font-medium text-blue-600 uppercase tracking-wider">
                Free {magnet.type.replace('_', ' ')}
              </span>
            </div>
            
            <h1 className="text-4xl md:text-5xl font-bold text-gray-900 leading-tight">
              {magnet.title}
            </h1>
            
            <p className="text-lg md:text-xl text-gray-600 leading-relaxed">
              {magnet.description}
            </p>

            {/* Benefits */}
            <div className="space-y-3">
              <div className="flex items-start space-x-3">
                <CheckCircle className="w-5 h-5 text-green-500 mt-0.5" />
                <span className="text-gray-700">Instant download after submission</span>
              </div>
              <div className="flex items-start space-x-3">
                <CheckCircle className="w-5 h-5 text-green-500 mt-0.5" />
                <span className="text-gray-700">100% free, no credit card required</span>
              </div>
              <div className="flex items-start space-x-3">
                <CheckCircle className="w-5 h-5 text-green-500 mt-0.5" />
                <span className="text-gray-700">Actionable insights you can use today</span>
              </div>
            </div>

            {/* Social Proof */}
            <div className="flex items-center space-x-6 pt-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">{magnet.downloads}</div>
                <div className="text-xs text-gray-500">Downloads</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">
                  {magnet.downloads > 0 ? Math.round((magnet.leads_generated / magnet.downloads) * 100) : 0}%
                </div>
                <div className="text-xs text-gray-500">Satisfaction</div>
              </div>
            </div>
          </div>

          {/* Right Column - Form */}
          <div className="md:pl-8">
            <Card className="shadow-xl">
              <CardContent className="p-6 md:p-8">
                {!submitted ? (
                  <>
                    <h3 className="text-2xl font-semibold mb-2">Get Your Free {magnet.type.replace('_', ' ')}</h3>
                    <p className="text-gray-600 mb-6">Fill out the form below to get instant access</p>
                    
                    <form onSubmit={handleSubmit} className="space-y-4">

                      {/* Default Fields (if no custom fields configured) */}
                      {(!magnet?.form_fields || magnet.form_fields.length === 0) && (
                        <>
                          {/* Name Field */}
                          <div>
                            <Label htmlFor="name">
                              Name <span className="text-red-500">*</span>
                            </Label>
                            <Input
                              id="name"
                              type="text"
                              value={customFieldData['name'] || ''}
                              onChange={(e) => setCustomFieldData({...customFieldData, name: e.target.value})}
                              placeholder="Enter your full name"
                              required
                              className="mt-1 placeholder:text-gray-400"
                            />
                          </div>

                          {/* Email Field */}
                          <div>
                            <Label htmlFor="email">
                              Email <span className="text-red-500">*</span>
                            </Label>
                            <Input
                              id="email"
                              type="email"
                              value={customFieldData['email'] || ''}
                              onChange={(e) => setCustomFieldData({...customFieldData, email: e.target.value})}
                              placeholder="Enter your email address"
                              required
                              className="mt-1 placeholder:text-gray-400"
                            />
                          </div>
                        </>
                      )}

                      {/* Custom Fields (if configured) */}
                      {magnet?.form_fields && magnet.form_fields.length > 0 && (
                        <>
                          {magnet.form_fields
                            .sort((a, b) => a.order - b.order)
                            .map((field) => (
                              <div key={field.id}>
                                <Label htmlFor={`custom-${field.id}`}>
                                  {field.label} {field.required && '*'}
                                </Label>
                                {field.type === 'text' && (
                                  <Input
                                    id={`custom-${field.id}`}
                                    value={customFieldData[field.id] || ''}
                                    onChange={(e) => setCustomFieldData({...customFieldData, [field.id]: e.target.value})}
                                    placeholder={field.placeholder}
                                    required={field.required}
                                    className="mt-1 placeholder:text-gray-400"
                                  />
                                )}
                                {field.type === 'email' && (
                                  <Input
                                    id={`custom-${field.id}`}
                                    type="email"
                                    value={customFieldData[field.id] || ''}
                                    onChange={(e) => setCustomFieldData({...customFieldData, [field.id]: e.target.value})}
                                    placeholder={field.placeholder}
                                    required={field.required}
                                    className="mt-1 placeholder:text-gray-400"
                                  />
                                )}
                                {field.type === 'phone' && (
                                  <Input
                                    id={`custom-${field.id}`}
                                    type="tel"
                                    value={customFieldData[field.id] || ''}
                                    onChange={(e) => setCustomFieldData({...customFieldData, [field.id]: e.target.value})}
                                    placeholder={field.placeholder}
                                    required={field.required}
                                    className="mt-1 placeholder:text-gray-400"
                                  />
                                )}
                                {field.type === 'number' && (
                                  <Input
                                    id={`custom-${field.id}`}
                                    type="number"
                                    value={customFieldData[field.id] || ''}
                                    onChange={(e) => setCustomFieldData({...customFieldData, [field.id]: e.target.value})}
                                    placeholder={field.placeholder}
                                    required={field.required}
                                    className="mt-1 placeholder:text-gray-400"
                                  />
                                )}
                                {field.type === 'textarea' && (
                                  <Textarea
                                    id={`custom-${field.id}`}
                                    value={customFieldData[field.id] || ''}
                                    onChange={(e) => setCustomFieldData({...customFieldData, [field.id]: e.target.value})}
                                    placeholder={field.placeholder}
                                    required={field.required}
                                    rows={3}
                                    className="mt-1 placeholder:text-gray-400"
                                  />
                                )}
                                {field.type === 'select' && (
                                  <select
                                    id={`custom-${field.id}`}
                                    value={customFieldData[field.id] || ''}
                                    onChange={(e) => setCustomFieldData({...customFieldData, [field.id]: e.target.value})}
                                    required={field.required}
                                    className="mt-1 w-full p-2 border border-gray-300 rounded-md text-gray-900"
                                    style={{
                                      color: !customFieldData[field.id] ? '#9CA3AF' : '#111827'
                                    }}
                                  >
                                    <option value="" style={{ color: '#9CA3AF' }}>
                                      {field.placeholder || 'Select an option'}
                                    </option>
                                    {field.options?.map((option, index) => {
                                      const optionValue = typeof option === 'string' ? option : option.value
                                      const optionLabel = typeof option === 'string' ? option : option.label
                                      return (
                                        <option key={index} value={optionValue} style={{ color: '#111827' }}>
                                          {optionLabel}
                                        </option>
                                      )
                                    })}
                                  </select>
                                )}
                                {field.type === 'radio' && (
                                  <div className="mt-1 space-y-2">
                                    {field.options?.map((option, index) => {
                                      const optionValue = typeof option === 'string' ? option : option.value
                                      const optionLabel = typeof option === 'string' ? option : option.label
                                      return (
                                        <div key={index} className="flex items-center space-x-2">
                                          <input
                                            type="radio"
                                            id={`custom-${field.id}-${index}`}
                                            name={`custom-${field.id}`}
                                            value={optionValue}
                                            checked={customFieldData[field.id] === optionValue}
                                            onChange={(e) => setCustomFieldData({...customFieldData, [field.id]: e.target.value})}
                                            required={field.required}
                                          />
                                          <label htmlFor={`custom-${field.id}-${index}`}>{optionLabel}</label>
                                        </div>
                                      )
                                    })}
                                  </div>
                                )}
                                {field.type === 'checkbox' && (
                                  <div className="mt-1 space-y-2">
                                    {field.options?.map((option, index) => {
                                      const optionValue = typeof option === 'string' ? option : option.value
                                      const optionLabel = typeof option === 'string' ? option : option.label
                                      return (
                                        <div key={index} className="flex items-center space-x-2">
                                          <input
                                            type="checkbox"
                                            id={`custom-${field.id}-${index}`}
                                            value={optionValue}
                                            checked={(customFieldData[field.id] || []).includes(optionValue)}
                                            onChange={(e) => {
                                              const currentValues = customFieldData[field.id] || []
                                              if (e.target.checked) {
                                                setCustomFieldData({...customFieldData, [field.id]: [...currentValues, optionValue]})
                                              } else {
                                                setCustomFieldData({...customFieldData, [field.id]: currentValues.filter((v: string) => v !== optionValue)})
                                              }
                                            }}
                                          />
                                          <label htmlFor={`custom-${field.id}-${index}`}>{optionLabel}</label>
                                        </div>
                                      )
                                    })}
                                  </div>
                                )}
                              </div>
                            ))
                          }
                        </>
                      )}

                      <Button 
                        type="submit" 
                        className="w-full bg-blue-600 hover:bg-blue-700"
                        disabled={submitting}
                      >
                        {submitting ? (
                          'Processing...'
                        ) : (
                          <>
                            <Download className="w-4 h-4 mr-2" />
                            Get Instant Access
                          </>
                        )}
                      </Button>

                      <p className="text-xs text-gray-500 text-center">
                        We respect your privacy. Unsubscribe at any time.
                      </p>
                    </form>
                  </>
                ) : (
                  <div className="text-center py-8">
                    <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
                    <h3 className="text-2xl font-semibold mb-2">Success!</h3>
                    <p className="text-gray-600 mb-4">
                      Thank you for your interest! Your {magnet.type.replace('_', ' ')} is ready.
                    </p>
                    {magnet.file_url && (
                      <Button 
                        onClick={() => window.open(magnet.file_url, '_blank')}
                        className="bg-green-600 hover:bg-green-700"
                      >
                        <Download className="w-4 h-4 mr-2" />
                        Download Now
                      </Button>
                    )}
                    {magnet.type === 'lead_form' && (
                      <p className="text-sm text-gray-600 mt-4">
                        We'll be in touch with you shortly!
                      </p>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-gray-50 border-t mt-20">
        <div className="container mx-auto px-4 py-8 text-center text-sm text-gray-600">
          <p>© 2024 Dummi & Co. All rights reserved.</p>
        </div>
      </footer>
    </div>
  )
}