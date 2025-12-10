'use client'

import { useState, useEffect } from 'react'
import AdminLayout from '@/components/admin-layout'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Separator } from '@/components/ui/separator'
import { Settings, Mail, Shield, Bell, Palette, Users, GitBranch, Package, CreditCard, MessageSquare, History, ChevronRight } from 'lucide-react'
import Link from 'next/link'

export default function SystemSettings() {
  // General Settings
  const [appName, setAppName] = useState('')
  const [appDescription, setAppDescription] = useState('')
  const [maintenanceMode, setMaintenanceMode] = useState(false)
  const [allowRegistration, setAllowRegistration] = useState(true)
  
  // Email Settings
  const [emailNotifications, setEmailNotifications] = useState(true)
  
  // Security Settings
  const [forceAdminTwoFA, setForceAdminTwoFA] = useState(true)
  const [sessionTimeout, setSessionTimeout] = useState('30')
  const [autoLogout, setAutoLogout] = useState(true)
  const [passwordMinLength, setPasswordMinLength] = useState('8')
  
  // Notification Settings
  const [systemAlerts, setSystemAlerts] = useState(true)
  const [userNotifications, setUserNotifications] = useState(true)
  const [adminNotifications, setAdminNotifications] = useState(true)
  
  // Theme Settings
  const [primaryColor, setPrimaryColor] = useState('#3b82f6')
  const [darkMode, setDarkMode] = useState(false)
  
  const [loading, setLoading] = useState(false)
  const [initialLoading, setInitialLoading] = useState(true)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  // Load settings from database
  useEffect(() => {
    loadSettings()
  }, [])

  const loadSettings = async () => {
    try {
      setInitialLoading(true)
      const response = await fetch('/api/admin/settings')
      
      if (!response.ok) {
        throw new Error('Failed to fetch settings')
      }
      
      const { settings } = await response.json()
      
      // Update state with loaded settings (values are already parsed from JSONB)
      if (settings.app_name) setAppName(settings.app_name.value)
      if (settings.app_description) setAppDescription(settings.app_description.value)
      if (settings.maintenance_mode) setMaintenanceMode(settings.maintenance_mode.value)
      if (settings.allow_registration) setAllowRegistration(settings.allow_registration.value)
      
      if (settings.email_notifications) setEmailNotifications(settings.email_notifications.value)
      
      if (settings.force_admin_2fa) setForceAdminTwoFA(settings.force_admin_2fa.value)
      if (settings.session_timeout) setSessionTimeout(String(settings.session_timeout.value))
      if (settings.auto_logout) setAutoLogout(settings.auto_logout.value)
      if (settings.password_min_length) setPasswordMinLength(String(settings.password_min_length.value))
      
      if (settings.system_alerts) setSystemAlerts(settings.system_alerts.value)
      if (settings.user_notifications) setUserNotifications(settings.user_notifications.value)
      if (settings.admin_notifications) setAdminNotifications(settings.admin_notifications.value)
      
      if (settings.primary_color) setPrimaryColor(settings.primary_color.value)
      if (settings.dark_mode) setDarkMode(settings.dark_mode.value)
      
    } catch (err) {
      console.error('Failed to load settings:', err)
      setError('Failed to load settings')
    } finally {
      setInitialLoading(false)
    }
  }

  const handleSaveGeneralSettings = async () => {
    setLoading(true)
    setError('')
    setMessage('')

    try {
      const response = await fetch('/api/admin/settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          settings: {
            app_name: appName,
            app_description: appDescription,
            maintenance_mode: maintenanceMode,
            allow_registration: allowRegistration,
          }
        })
      })

      if (!response.ok) {
        throw new Error('Failed to save settings')
      }

      setMessage('General settings saved successfully!')
    } catch (err) {
      console.error('Failed to save general settings:', err)
      setError('Failed to save general settings')
    } finally {
      setLoading(false)
    }
  }

  const handleSaveNotificationSettings = async () => {
    setLoading(true)
    setError('')
    setMessage('')

    try {
      const response = await fetch('/api/admin/settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          settings: {
            email_notifications: emailNotifications,
          }
        })
      })

      if (!response.ok) {
        throw new Error('Failed to save notification settings')
      }

      setMessage('Notification settings saved successfully!')
    } catch (err) {
      console.error('Failed to save notification settings:', err)
      setError('Failed to save notification settings')
    } finally {
      setLoading(false)
    }
  }

  const handleSaveSecuritySettings = async () => {
    setLoading(true)
    setError('')
    setMessage('')

    try {
      const response = await fetch('/api/admin/settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          settings: {
            force_admin_2fa: forceAdminTwoFA,
            session_timeout: parseInt(sessionTimeout),
            auto_logout: autoLogout,
            password_min_length: parseInt(passwordMinLength),
          }
        })
      })

      if (!response.ok) {
        throw new Error('Failed to save security settings')
      }

      setMessage('Security settings saved successfully!')
    } catch (err) {
      console.error('Failed to save security settings:', err)
      setError('Failed to save security settings')
    } finally {
      setLoading(false)
    }
  }

  const handleSaveSystemNotificationSettings = async () => {
    setLoading(true)
    setError('')
    setMessage('')

    try {
      const response = await fetch('/api/admin/settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          settings: {
            system_alerts: systemAlerts,
            user_notifications: userNotifications,
            admin_notifications: adminNotifications,
          }
        })
      })

      if (!response.ok) {
        throw new Error('Failed to save notification settings')
      }

      setMessage('Notification settings saved successfully!')
    } catch (err) {
      console.error('Failed to save notification settings:', err)
      setError('Failed to save notification settings')
    } finally {
      setLoading(false)
    }
  }

  const handleSaveThemeSettings = async () => {
    setLoading(true)
    setError('')
    setMessage('')

    try {
      const response = await fetch('/api/admin/settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          settings: {
            primary_color: primaryColor,
            dark_mode: darkMode,
          }
        })
      })

      if (!response.ok) {
        throw new Error('Failed to save theme settings')
      }

      setMessage('Theme settings saved successfully!')
    } catch (err) {
      console.error('Failed to save theme settings:', err)
      setError('Failed to save theme settings')
    } finally {
      setLoading(false)
    }
  }

  if (initialLoading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-2 text-gray-600">Loading settings...</p>
          </div>
        </div>
      </AdminLayout>
    )
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <p className="text-gray-600">Configure global application settings and preferences</p>
        </div>

        {/* Quick Access Cards */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Quick Access</CardTitle>
            <CardDescription>Jump to frequently used configuration pages</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <Link href="/admin/users" className="group">
                <div className="flex items-center justify-between p-4 border rounded-lg hover:bg-blue-50 hover:border-blue-200 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-100 rounded-lg group-hover:bg-blue-200 transition-colors">
                      <Users className="h-5 w-5 text-blue-600" />
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">User Management</p>
                      <p className="text-xs text-gray-500">Manage users & roles</p>
                    </div>
                  </div>
                  <ChevronRight className="h-5 w-5 text-gray-400 group-hover:text-blue-600" />
                </div>
              </Link>

              <Link href="/admin/team" className="group">
                <div className="flex items-center justify-between p-4 border rounded-lg hover:bg-green-50 hover:border-green-200 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-green-100 rounded-lg group-hover:bg-green-200 transition-colors">
                      <Users className="h-5 w-5 text-green-600" />
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">Sales Team</p>
                      <p className="text-xs text-gray-500">Team performance</p>
                    </div>
                  </div>
                  <ChevronRight className="h-5 w-5 text-gray-400 group-hover:text-green-600" />
                </div>
              </Link>

              <Link href="/admin/deals" className="group">
                <div className="flex items-center justify-between p-4 border rounded-lg hover:bg-purple-50 hover:border-purple-200 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-purple-100 rounded-lg group-hover:bg-purple-200 transition-colors">
                      <GitBranch className="h-5 w-5 text-purple-600" />
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">Pipeline Config</p>
                      <p className="text-xs text-gray-500">Deal stages & pipeline</p>
                    </div>
                  </div>
                  <ChevronRight className="h-5 w-5 text-gray-400 group-hover:text-purple-600" />
                </div>
              </Link>

              <Link href="/admin/product-catalog" className="group">
                <div className="flex items-center justify-between p-4 border rounded-lg hover:bg-orange-50 hover:border-orange-200 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-orange-100 rounded-lg group-hover:bg-orange-200 transition-colors">
                      <Package className="h-5 w-5 text-orange-600" />
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">Product Catalog</p>
                      <p className="text-xs text-gray-500">Products & pricing</p>
                    </div>
                  </div>
                  <ChevronRight className="h-5 w-5 text-gray-400 group-hover:text-orange-600" />
                </div>
              </Link>

              <Link href="/admin/email-config" className="group">
                <div className="flex items-center justify-between p-4 border rounded-lg hover:bg-red-50 hover:border-red-200 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-red-100 rounded-lg group-hover:bg-red-200 transition-colors">
                      <Mail className="h-5 w-5 text-red-600" />
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">Email Config</p>
                      <p className="text-xs text-gray-500">SMTP settings</p>
                    </div>
                  </div>
                  <ChevronRight className="h-5 w-5 text-gray-400 group-hover:text-red-600" />
                </div>
              </Link>

              <Link href="/admin/stripe" className="group">
                <div className="flex items-center justify-between p-4 border rounded-lg hover:bg-indigo-50 hover:border-indigo-200 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-indigo-100 rounded-lg group-hover:bg-indigo-200 transition-colors">
                      <CreditCard className="h-5 w-5 text-indigo-600" />
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">Stripe Integration</p>
                      <p className="text-xs text-gray-500">Payment setup</p>
                    </div>
                  </div>
                  <ChevronRight className="h-5 w-5 text-gray-400 group-hover:text-indigo-600" />
                </div>
              </Link>
            </div>
          </CardContent>
        </Card>

        {/* Global Messages */}
        {error && (
          <div className="text-sm text-red-600 bg-red-50 p-3 rounded-md">{error}</div>
        )}
        {message && (
          <div className="text-sm text-green-600 bg-green-50 p-3 rounded-md">{message}</div>
        )}

        <div className="grid grid-cols-1 gap-6">
          {/* General Settings */}
          <Card>
            <CardHeader>
              <div className="flex items-center space-x-2">
                <Settings className="h-5 w-5" />
                <CardTitle>General Settings</CardTitle>
              </div>
              <CardDescription>Configure basic application settings</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="appName">Application Name</Label>
                  <Input
                    id="appName"
                    type="text"
                    value={appName}
                    onChange={(e) => setAppName(e.target.value)}
                    placeholder="Enter application name"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="appDescription">Application Description</Label>
                  <Input
                    id="appDescription"
                    type="text"
                    value={appDescription}
                    onChange={(e) => setAppDescription(e.target.value)}
                    placeholder="Enter application description"
                  />
                </div>
              </div>
              
              <Separator />
              
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Maintenance Mode</p>
                    <p className="text-sm text-gray-500">Put the application in maintenance mode</p>
                  </div>
                  <Switch
                    checked={maintenanceMode}
                    onCheckedChange={setMaintenanceMode}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">User Registration</p>
                    <p className="text-sm text-gray-500">Allow new user registrations</p>
                  </div>
                  <Switch
                    checked={allowRegistration}
                    onCheckedChange={setAllowRegistration}
                  />
                </div>
              </div>
              
              <Button onClick={handleSaveGeneralSettings} disabled={loading}>
                {loading ? 'Saving...' : 'Save General Settings'}
              </Button>
            </CardContent>
          </Card>

          {/* Email Settings */}
          <Card>
            <CardHeader>
              <div className="flex items-center space-x-2">
                <Mail className="h-5 w-5" />
                <CardTitle>Email Notifications</CardTitle>
              </div>
              <CardDescription>Control system email notifications</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Email Notifications</p>
                  <p className="text-sm text-gray-500">Send system email notifications</p>
                </div>
                <Switch
                  checked={emailNotifications}
                  onCheckedChange={setEmailNotifications}
                />
              </div>
              
              <Separator />
              
              <div className="bg-blue-50 p-4 rounded-lg">
                <div className="flex items-start space-x-3">
                  <Mail className="h-5 w-5 text-blue-600 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-blue-800">SMTP Configuration</p>
                    <p className="text-sm text-blue-600 mt-1">
                      Configure SMTP settings for sending emails through the messenger system.
                    </p>
                    <a 
                      href="/admin/email-config" 
                      className="text-sm text-blue-700 underline hover:text-blue-800 mt-2 inline-block"
                    >
                      → Configure Email Settings
                    </a>
                  </div>
                </div>
              </div>
              
              <Button onClick={handleSaveNotificationSettings} disabled={loading}>
                {loading ? 'Saving...' : 'Save Notification Settings'}
              </Button>
            </CardContent>
          </Card>

          {/* Security Settings */}
          <Card>
            <CardHeader>
              <div className="flex items-center space-x-2">
                <Shield className="h-5 w-5" />
                <CardTitle>Security Settings</CardTitle>
              </div>
              <CardDescription>Security policies and access control</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Force 2FA for Admins</p>
                    <p className="text-sm text-gray-500">Require two-factor authentication for admin users</p>
                  </div>
                  <Switch
                    checked={forceAdminTwoFA}
                    onCheckedChange={setForceAdminTwoFA}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Auto Logout</p>
                    <p className="text-sm text-gray-500">Automatic logout after inactivity</p>
                  </div>
                  <Switch
                    checked={autoLogout}
                    onCheckedChange={setAutoLogout}
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="sessionTimeout">Session Timeout (minutes)</Label>
                  <Input
                    id="sessionTimeout"
                    type="number"
                    value={sessionTimeout}
                    onChange={(e) => setSessionTimeout(e.target.value)}
                    min="5"
                    max="480"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="passwordMinLength">Minimum Password Length</Label>
                  <Input
                    id="passwordMinLength"
                    type="number"
                    value={passwordMinLength}
                    onChange={(e) => setPasswordMinLength(e.target.value)}
                    min="6"
                    max="32"
                  />
                </div>
              </div>
              
              <Button onClick={handleSaveSecuritySettings} disabled={loading}>
                {loading ? 'Saving...' : 'Save Security Settings'}
              </Button>
            </CardContent>
          </Card>

          {/* Notification Settings */}
          <Card>
            <CardHeader>
              <div className="flex items-center space-x-2">
                <Bell className="h-5 w-5" />
                <CardTitle>Notification Settings</CardTitle>
              </div>
              <CardDescription>Configure system notifications and alerts</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">System Alerts</p>
                    <p className="text-sm text-gray-500">Critical system alerts and errors</p>
                  </div>
                  <Switch
                    checked={systemAlerts}
                    onCheckedChange={setSystemAlerts}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">User Notifications</p>
                    <p className="text-sm text-gray-500">User activity notifications</p>
                  </div>
                  <Switch
                    checked={userNotifications}
                    onCheckedChange={setUserNotifications}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Admin Notifications</p>
                    <p className="text-sm text-gray-500">Administrative notifications</p>
                  </div>
                  <Switch
                    checked={adminNotifications}
                    onCheckedChange={setAdminNotifications}
                  />
                </div>
              </div>
              
              <Button onClick={handleSaveSystemNotificationSettings} disabled={loading}>
                {loading ? 'Saving...' : 'Save Notification Settings'}
              </Button>
            </CardContent>
          </Card>

          {/* Theme Settings */}
          <Card>
            <CardHeader>
              <div className="flex items-center space-x-2">
                <Palette className="h-5 w-5" />
                <CardTitle>Theme & Appearance</CardTitle>
              </div>
              <CardDescription>Customize the application's look and feel</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="primaryColor">Primary Color</Label>
                  <div className="flex space-x-2">
                    <Input
                      id="primaryColor"
                      type="color"
                      value={primaryColor}
                      onChange={(e) => setPrimaryColor(e.target.value)}
                      className="w-16 h-10"
                    />
                    <Input
                      type="text"
                      value={primaryColor}
                      onChange={(e) => setPrimaryColor(e.target.value)}
                      placeholder="#3b82f6"
                      className="flex-1"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Dark Mode (Coming Soon)</Label>
                  <div className="flex items-center space-x-2">
                    <Switch
                      checked={darkMode}
                      onCheckedChange={setDarkMode}
                      disabled
                    />
                    <span className="text-sm text-gray-500">Feature in development</span>
                  </div>
                </div>
              </div>
              
              <Button onClick={handleSaveThemeSettings} disabled={loading}>
                {loading ? 'Saving...' : 'Save Theme Settings'}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </AdminLayout>
  )
}