'use client'

import { useState, useEffect } from 'react'
import AdminLayout from '@/components/admin-layout'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import {
  Mail,
  Server,
  Key,
  CheckCircle,
  AlertCircle,
  Settings,
  Save,
  TestTube,
} from 'lucide-react'

interface EmailConfig {
  id: string
  smtp_host: string
  smtp_port: number
  smtp_secure: boolean
  smtp_user: string
  from_email: string
  from_name: string
  reply_to: string
  is_active: boolean
  created_at: string
  updated_at: string
}

export default function EmailConfigPage() {
  const [config, setConfig] = useState<EmailConfig | null>(null)
  const [hasPassword, setHasPassword] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [testing, setTesting] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  // Form state
  const [formData, setFormData] = useState({
    smtp_host: '',
    smtp_port: 587,
    smtp_secure: false,
    smtp_user: '',
    smtp_password: '',
    from_email: '',
    from_name: '',
    reply_to: ''
  })

  useEffect(() => {
    fetchConfig()
  }, [])

  const fetchConfig = async () => {
    setLoading(true)
    setError('')
    try {
      const response = await fetch('/api/admin/email-config')
      const result = await response.json()

      if (!response.ok) {
        setError(result.error || 'Failed to fetch email configuration')
        return
      }

      if (result.config) {
        setConfig(result.config)
        setHasPassword(result.hasPassword)
        setFormData({
          smtp_host: result.config.smtp_host || '',
          smtp_port: result.config.smtp_port || 587,
          smtp_secure: result.config.smtp_secure || false,
          smtp_user: result.config.smtp_user || '',
          smtp_password: '', // Don't populate password for security
          from_email: result.config.from_email || '',
          from_name: result.config.from_name || '',
          reply_to: result.config.reply_to || ''
        })
      }
    } catch (error) {
      console.error('Error fetching config:', error)
      setError('An unexpected error occurred')
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    if (!formData.smtp_host || !formData.smtp_user || !formData.from_email) {
      setError('Please fill in all required fields')
      return
    }

    if (!formData.smtp_password && !hasPassword) {
      setError('SMTP password is required')
      return
    }

    setSaving(true)
    setError('')
    setMessage('')

    try {
      // Don't send empty password if we already have one
      const payload = !formData.smtp_password && hasPassword
        ? (({ smtp_password: _unused, ...rest }) => rest)(formData)
        : { ...formData }

      const response = await fetch('/api/admin/email-config', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      })

      const result = await response.json()

      if (!response.ok) {
        setError(result.error || 'Failed to save email configuration')
        return
      }

      setMessage('Email configuration saved successfully!')
      await fetchConfig()
    } catch (error) {
      console.error('Error saving config:', error)
      setError('An unexpected error occurred while saving')
    } finally {
      setSaving(false)
    }
  }

  const handleTestEmail = async () => {
    if (!config) {
      setError('Please save your configuration first')
      return
    }

    setTesting(true)
    setError('')
    setMessage('')

    try {
      const response = await fetch('/api/admin/email-config/test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      const result = await response.json()

      if (!response.ok) {
        setError(result.error || 'SMTP connection test failed')
        return
      }

      setMessage(result.message)
    } catch (error) {
      console.error('Error testing email:', error)
      setError('Failed to test SMTP connection')
    } finally {
      setTesting(false)
    }
  }

  const clearMessages = () => {
    setError('')
    setMessage('')
  }

  const commonSMTPProviders = [
    { name: 'Gmail', host: 'smtp.gmail.com', port: 587, secure: false },
    { name: 'Outlook/Hotmail', host: 'smtp-mail.outlook.com', port: 587, secure: false },
    { name: 'Yahoo', host: 'smtp.mail.yahoo.com', port: 587, secure: false },
    { name: 'SendGrid', host: 'smtp.sendgrid.net', port: 587, secure: false },
    { name: 'Mailgun', host: 'smtp.mailgun.org', port: 587, secure: false },
  ]

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <p className="text-gray-600">Configure SMTP settings for sending emails from the messenger</p>
          </div>
        </div>

        {/* Global Messages */}
        {error && (
          <div className="text-sm text-red-600 bg-red-50 p-3 rounded-md flex items-center space-x-2">
            <AlertCircle className="h-4 w-4" />
            <span>{error}</span>
          </div>
        )}
        {message && (
          <div className="text-sm text-green-600 bg-green-50 p-3 rounded-md flex items-center space-x-2">
            <CheckCircle className="h-4 w-4" />
            <span>{message}</span>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Configuration Form */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="h-5 w-5" />
                  SMTP Configuration
                </CardTitle>
                <CardDescription>
                  Configure your SMTP server settings to send emails through the messenger system
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {loading ? (
                  <div className="flex justify-center py-8">
                    <div className="text-gray-500">Loading configuration...</div>
                  </div>
                ) : (
                  <>
                    {/* SMTP Server Settings */}
                    <div className="space-y-4">
                      <h3 className="font-medium flex items-center gap-2">
                        <Server className="h-4 w-4" />
                        Server Settings
                      </h3>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="smtp_host">SMTP Host *</Label>
                          <Input
                            id="smtp_host"
                            value={formData.smtp_host}
                            onChange={(e) => {
                              setFormData({ ...formData, smtp_host: e.target.value })
                              clearMessages()
                            }}
                            placeholder="smtp.gmail.com"
                          />
                        </div>
                        
                        <div className="space-y-2">
                          <Label htmlFor="smtp_port">SMTP Port *</Label>
                          <Input
                            id="smtp_port"
                            type="number"
                            value={formData.smtp_port}
                            onChange={(e) => {
                              const port = parseInt(e.target.value) || 587
                              setFormData({ 
                                ...formData, 
                                smtp_port: port,
                                smtp_secure: port === 465 // Auto-set SSL for port 465
                              })
                              clearMessages()
                            }}
                            placeholder="587"
                          />
                        </div>
                      </div>

                      <div className="flex items-center space-x-2">
                        <Switch
                          id="smtp_secure"
                          checked={formData.smtp_secure}
                          onCheckedChange={(checked) => {
                            setFormData({ 
                              ...formData, 
                              smtp_secure: checked,
                              smtp_port: checked ? 465 : 587 // Auto-set port based on SSL
                            })
                            clearMessages()
                          }}
                        />
                        <Label htmlFor="smtp_secure">Use SSL (port 465) - TLS uses port 587</Label>
                      </div>
                    </div>

                    {/* Authentication */}
                    <div className="space-y-4">
                      <h3 className="font-medium flex items-center gap-2">
                        <Key className="h-4 w-4" />
                        Authentication
                      </h3>
                      
                      <div className="space-y-4">
                        <div className="space-y-2">
                          <Label htmlFor="smtp_user">SMTP Username *</Label>
                          <Input
                            id="smtp_user"
                            value={formData.smtp_user}
                            onChange={(e) => {
                              setFormData({ ...formData, smtp_user: e.target.value })
                              clearMessages()
                            }}
                            placeholder="your-email@gmail.com"
                          />
                        </div>
                        
                        <div className="space-y-2">
                          <Label htmlFor="smtp_password">
                            SMTP Password *
                            {hasPassword && (
                              <span className="text-xs text-green-600 ml-2">(Current password is set)</span>
                            )}
                          </Label>
                          <Input
                            id="smtp_password"
                            type="password"
                            value={formData.smtp_password}
                            onChange={(e) => {
                              setFormData({ ...formData, smtp_password: e.target.value })
                              clearMessages()
                            }}
                            placeholder={hasPassword ? "Leave blank to keep current password" : "Enter SMTP password"}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Email Settings */}
                    <div className="space-y-4">
                      <h3 className="font-medium flex items-center gap-2">
                        <Mail className="h-4 w-4" />
                        Email Settings
                      </h3>
                      
                      <div className="space-y-4">
                        <div className="space-y-2">
                          <Label htmlFor="from_email">From Email Address *</Label>
                          <Input
                            id="from_email"
                            type="email"
                            value={formData.from_email}
                            onChange={(e) => {
                              setFormData({ ...formData, from_email: e.target.value })
                              clearMessages()
                            }}
                            placeholder="admin@yourcompany.com"
                          />
                        </div>
                        
                        <div className="space-y-2">
                          <Label htmlFor="from_name">From Name</Label>
                          <Input
                            id="from_name"
                            value={formData.from_name}
                            onChange={(e) => {
                              setFormData({ ...formData, from_name: e.target.value })
                              clearMessages()
                            }}
                            placeholder="Your Company Admin"
                          />
                        </div>
                        
                        <div className="space-y-2">
                          <Label htmlFor="reply_to">Reply-To Email</Label>
                          <Input
                            id="reply_to"
                            type="email"
                            value={formData.reply_to}
                            onChange={(e) => {
                              setFormData({ ...formData, reply_to: e.target.value })
                              clearMessages()
                            }}
                            placeholder="support@yourcompany.com"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex gap-3 pt-4">
                      <Button onClick={handleSave} disabled={saving}>
                        <Save className="mr-2 h-4 w-4" />
                        {saving ? 'Saving...' : 'Save Configuration'}
                      </Button>
                      
                      {config && (
                        <Button variant="outline" onClick={handleTestEmail} disabled={testing}>
                          <TestTube className="mr-2 h-4 w-4" />
                          {testing ? 'Testing...' : 'Test Email'}
                        </Button>
                      )}
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Common Providers */}
          <div>
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Common SMTP Providers</CardTitle>
                <CardDescription>
                  Quick setup for popular email providers
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {commonSMTPProviders.map((provider) => (
                  <div
                    key={provider.name}
                    className="p-3 border rounded-lg cursor-pointer hover:bg-gray-50 transition-colors"
                    onClick={() => {
                      setFormData({
                        ...formData,
                        smtp_host: provider.host,
                        smtp_port: provider.port,
                        smtp_secure: provider.secure
                      })
                      clearMessages()
                    }}
                  >
                    <div className="font-medium">{provider.name}</div>
                    <div className="text-sm text-gray-500">
                      {provider.host}:{provider.port}
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Security Notice */}
            <Card className="mt-6">
              <CardHeader>
                <CardTitle className="text-lg text-amber-600">Security Notice</CardTitle>
              </CardHeader>
              <CardContent className="text-sm space-y-2">
                <p>• Use App Passwords for Gmail (not your regular password)</p>
                <p>• Store credentials securely and avoid sharing them</p>
                <p>• Test configuration before using in production</p>
                <p>• Monitor email sending rates to avoid spam filters</p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </AdminLayout>
  )
}