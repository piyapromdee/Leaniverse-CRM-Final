'use client'

import { useState, useEffect } from 'react'
import AdminLayout from '@/components/admin-layout'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { 
  CreditCard, 
  CheckCircle, 
  XCircle, 
  AlertCircle, 
  ExternalLink,
  Loader2,
  DollarSign,
  Globe,
  Shield
} from 'lucide-react'

interface StripeAccount {
  id: string
  stripe_account_id: string
  charges_enabled: boolean
  payouts_enabled: boolean
  details_submitted: boolean
  country: string
  default_currency: string
  business_profile?: {
    name?: string
    support_email?: string
    url?: string
  }
  livemode: boolean
  created_at: string
}

export default function StripeConnectionPage() {
  const [stripeAccount, setStripeAccount] = useState<StripeAccount | null>(null)
  const [loading, setLoading] = useState(true)
  const [connecting, setConnecting] = useState(false)
  const [showManualSetup, setShowManualSetup] = useState(false)
  const [accountId, setAccountId] = useState('')
  const [showDisconnectDialog, setShowDisconnectDialog] = useState(false)
  const [disconnecting, setDisconnecting] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  useEffect(() => {
    fetchStripeAccount()
  }, [])

  const fetchStripeAccount = async () => {
    setLoading(true)
    setError('')
    
    try {
      const response = await fetch('/api/stripe/account')
      const result = await response.json()

      if (response.ok) {
        setStripeAccount(result.account)
      } else if (response.status !== 404) {
        setError(result.error || 'Failed to fetch Stripe account')
      }
    } catch (error) {
      setError('An unexpected error occurred')
      console.error('Error fetching Stripe account:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleConnectStripe = async () => {
    setShowManualSetup(true)
  }

  const handleManualSetup = async (e: React.FormEvent) => {
    e.preventDefault()
    setConnecting(true)
    setError('')
    
    try {
      const response = await fetch('/api/stripe/manual-setup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accountId })
      })
      
      const result = await response.json()

      if (response.ok) {
        setMessage('Stripe account connected successfully')
        setShowManualSetup(false)
        setAccountId('')
        await fetchStripeAccount() // Refresh the account data
      } else {
        setError(result.error || 'Failed to connect Stripe account')
      }
    } catch (error) {
      setError('An unexpected error occurred')
      console.error('Error connecting to Stripe:', error)
    } finally {
      setConnecting(false)
    }
  }

  const handleDisconnectStripe = async () => {
    setShowDisconnectDialog(false)
    setDisconnecting(true)
    setError('')
    
    try {
      const response = await fetch('/api/stripe/disconnect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      })
      
      const result = await response.json()

      if (response.ok) {
        setStripeAccount(null)
        setMessage('Stripe account disconnected successfully')
      } else {
        setError(result.error || 'Failed to disconnect Stripe account')
      }
    } catch (error) {
      setError('An unexpected error occurred')
      console.error('Error disconnecting Stripe:', error)
    } finally {
      setDisconnecting(false)
    }
  }

  const getAccountStatus = () => {
    if (!stripeAccount) return null

    if (stripeAccount.charges_enabled && stripeAccount.payouts_enabled) {
      return { status: 'active', label: 'Active', color: 'bg-green-100 text-green-800' }
    } else if (stripeAccount.details_submitted) {
      return { status: 'pending', label: 'Pending Verification', color: 'bg-yellow-100 text-yellow-800' }
    } else {
      return { status: 'incomplete', label: 'Setup Required', color: 'bg-red-100 text-red-800' }
    }
  }

  const accountStatus = getAccountStatus()

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center min-h-96">
          <div className="text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
            <p>Loading Stripe connection...</p>
          </div>
        </div>
      </AdminLayout>
    )
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <p className="text-gray-600">Connect a Stripe account globally for the entire platform to start accepting payments</p>
        </div>

        {/* Global Messages */}
        {error && (
          <div className="text-sm text-red-600 bg-red-50 p-3 rounded-md flex items-center">
            <AlertCircle className="h-4 w-4 mr-2" />
            {error}
          </div>
        )}
        {message && (
          <div className="text-sm text-green-600 bg-green-50 p-3 rounded-md flex items-center">
            <CheckCircle className="h-4 w-4 mr-2" />
            {message}
          </div>
        )}

        {/* Connection Status Card */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <CreditCard className="h-5 w-5" />
                <CardTitle>Global Stripe Account</CardTitle>
              </div>
              {accountStatus && (
                <Badge className={accountStatus.color}>
                  {accountStatus.label}
                </Badge>
              )}
            </div>
            <CardDescription>
              {stripeAccount 
                ? 'A Stripe account is connected globally for the entire platform'
                : 'Connect a Stripe account to enable payment processing for all users on the platform'
              }
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {!stripeAccount ? (
              // Not Connected State
              <div className="text-center py-8">
                <div className="mx-auto w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                  <CreditCard className="h-8 w-8 text-gray-400" />
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">No Global Stripe Account</h3>
                <p className="text-gray-600 mb-6 max-w-md mx-auto">
                  Connect a Stripe account to enable payment processing platform-wide. 
                  This will allow you to create products that any user can purchase.
                </p>
                <Button 
                  onClick={handleConnectStripe} 
                  disabled={connecting}
                  size="lg"
                  className="bg-purple-600 hover:bg-purple-700"
                >
                  {connecting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Connecting...
                    </>
                  ) : (
                    <>
                      <CreditCard className="mr-2 h-4 w-4" />
                      Connect with Stripe
                    </>
                  )}
                </Button>
                <div className="flex items-center justify-center space-x-4 mt-6 text-sm text-gray-500">
                  <div className="flex items-center">
                    <Shield className="h-4 w-4 mr-1" />
                    Secure
                  </div>
                  <div className="flex items-center">
                    <CheckCircle className="h-4 w-4 mr-1" />
                    Trusted by millions
                  </div>
                </div>
              </div>
            ) : (
              // Connected State
              <div className="space-y-6">
                {/* Account Overview */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="text-center p-4 border rounded-lg">
                    <div className="flex items-center justify-center mb-2">
                      {stripeAccount.charges_enabled ? (
                        <CheckCircle className="h-6 w-6 text-green-500" />
                      ) : (
                        <XCircle className="h-6 w-6 text-red-500" />
                      )}
                    </div>
                    <p className="text-sm font-medium">Charges</p>
                    <p className="text-xs text-gray-500">
                      {stripeAccount.charges_enabled ? 'Enabled' : 'Disabled'}
                    </p>
                  </div>
                  <div className="text-center p-4 border rounded-lg">
                    <div className="flex items-center justify-center mb-2">
                      {stripeAccount.payouts_enabled ? (
                        <CheckCircle className="h-6 w-6 text-green-500" />
                      ) : (
                        <XCircle className="h-6 w-6 text-red-500" />
                      )}
                    </div>
                    <p className="text-sm font-medium">Payouts</p>
                    <p className="text-xs text-gray-500">
                      {stripeAccount.payouts_enabled ? 'Enabled' : 'Disabled'}
                    </p>
                  </div>
                  <div className="text-center p-4 border rounded-lg">
                    <div className="flex items-center justify-center mb-2">
                      {stripeAccount.details_submitted ? (
                        <CheckCircle className="h-6 w-6 text-green-500" />
                      ) : (
                        <AlertCircle className="h-6 w-6 text-yellow-500" />
                      )}
                    </div>
                    <p className="text-sm font-medium">Details</p>
                    <p className="text-xs text-gray-500">
                      {stripeAccount.details_submitted ? 'Submitted' : 'Incomplete'}
                    </p>
                  </div>
                </div>

                <Separator />

                {/* Account Details */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-3">
                    <div>
                      <p className="text-sm font-medium text-gray-500">Account ID</p>
                      <p className="text-sm font-mono bg-gray-50 p-2 rounded">
                        {stripeAccount.stripe_account_id}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-500">Business Name</p>
                      <p className="text-sm">
                        {stripeAccount.business_profile?.name || 'Not provided'}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-500">Support Email</p>
                      <p className="text-sm">
                        {stripeAccount.business_profile?.support_email || 'Not provided'}
                      </p>
                    </div>
                  </div>
                  <div className="space-y-3">
                    <div>
                      <p className="text-sm font-medium text-gray-500">Country</p>
                      <div className="flex items-center">
                        <Globe className="h-4 w-4 mr-1" />
                        <p className="text-sm">{stripeAccount.country?.toUpperCase()}</p>
                      </div>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-500">Default Currency</p>
                      <div className="flex items-center">
                        <DollarSign className="h-4 w-4 mr-1" />
                        <p className="text-sm">{stripeAccount.default_currency?.toUpperCase()}</p>
                      </div>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-500">Environment</p>
                      <Badge variant={stripeAccount.livemode ? 'default' : 'secondary'}>
                        {stripeAccount.livemode ? 'Live' : 'Test'}
                      </Badge>
                    </div>
                  </div>
                </div>

                <Separator />

                {/* Actions */}
                <div className="flex flex-col sm:flex-row gap-3">
                  {!stripeAccount.details_submitted && (
                    <Button variant="default" asChild>
                      <a 
                        href={`https://dashboard.stripe.com/connect/accounts/${stripeAccount.stripe_account_id}`}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        Complete Setup in Stripe
                        <ExternalLink className="ml-2 h-4 w-4" />
                      </a>
                    </Button>
                  )}
                  <Button variant="outline" asChild>
                    <a 
                      href={`https://dashboard.stripe.com/connect/accounts/${stripeAccount.stripe_account_id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      View in Stripe Dashboard
                      <ExternalLink className="ml-2 h-4 w-4" />
                    </a>
                  </Button>
                  <Button 
                    variant="destructive" 
                    onClick={() => setShowDisconnectDialog(true)}
                    disabled={disconnecting}
                  >
                    {disconnecting ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Disconnecting...
                      </>
                    ) : (
                      'Disconnect Stripe Account'
                    )}
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>


        {/* Manual Setup Dialog */}
        <Dialog open={showManualSetup} onOpenChange={setShowManualSetup}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Connect Stripe Account</DialogTitle>
              <DialogDescription>
                Enter your Stripe Account ID to connect your account manually.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleManualSetup} className="space-y-4">
              <div>
                <Label htmlFor="accountId">Stripe Account ID</Label>
                <Input
                  id="accountId"
                  value={accountId}
                  onChange={(e) => setAccountId(e.target.value)}
                  placeholder="acct_1234567890"
                  required
                />
                <p className="text-sm text-gray-500 mt-1">
                  Find this at <a href="https://dashboard.stripe.com/settings/account" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">dashboard.stripe.com/settings/account</a>
                </p>
              </div>
              <div className="flex justify-end space-x-2">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setShowManualSetup(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={connecting}>
                  {connecting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Connecting...
                    </>
                  ) : (
                    'Connect Account'
                  )}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>

        {/* Disconnect Confirmation Dialog */}
        <Dialog open={showDisconnectDialog} onOpenChange={setShowDisconnectDialog}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Disconnect Stripe Account</DialogTitle>
              <DialogDescription>
                Are you sure you want to disconnect the Stripe account? This action cannot be undone.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="bg-red-50 border border-red-200 rounded-md p-4">
                <div className="flex items-start">
                  <AlertCircle className="h-5 w-5 text-red-600 mt-0.5 mr-3" />
                  <div className="text-sm text-red-800">
                    <p className="font-medium mb-1">This will:</p>
                    <ul className="list-disc list-inside space-y-1">
                      <li>Disable all payment processing platform-wide</li>
                      <li>Mark all products and pricing as inactive (they will be preserved)</li>
                      <li>Disconnect the Stripe integration completely</li>
                      <li>Products can be reactivated when you reconnect Stripe</li>
                    </ul>
                  </div>
                </div>
              </div>
              <div className="flex justify-end space-x-2">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setShowDisconnectDialog(false)}
                >
                  Cancel
                </Button>
                <Button 
                  variant="destructive" 
                  onClick={handleDisconnectStripe}
                  disabled={disconnecting}
                >
                  {disconnecting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Disconnecting...
                    </>
                  ) : (
                    'Yes, Disconnect Account'
                  )}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  )
}