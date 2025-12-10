'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter, usePathname } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Sheet,
  SheetContent,
  SheetTrigger,
} from '@/components/ui/sheet'
import {
  Shield,
  Users,
  Settings,
  CreditCard,
  Menu,
  LogOut,
  User,
  ArrowLeft,
  Package,
  Receipt,
  MessageSquare,
  Mail,
  History,
  MailOpen,
  UserCheck,
  CheckSquare,
  Building2,
  FileText,
  Send,
  Bell,
  GitPullRequest,
  Crown,
} from 'lucide-react'
import { isUserSuperAdmin, ROLES } from '@/lib/roles'

interface User {
  id: string
  email?: string
  user_metadata?: {
    first_name?: string
    last_name?: string
  }
}

interface Profile {
  id: string
  first_name: string | null
  last_name: string | null
  avatar_url: string | null
  role: string
  email?: string
}

// Items to hide from Owner role (operational items)
const OWNER_HIDDEN_ITEMS = ['Tasks & Calendar', 'Assignment Requests']

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [isAdmin, setIsAdmin] = useState(false)
  const [loading, setLoading] = useState(true)
  const [pendingRequests, setPendingRequests] = useState(0)
  const [pendingNotifications, setPendingNotifications] = useState<any[]>([])
  const router = useRouter()
  const pathname = usePathname()
  const supabase = createClient()

  useEffect(() => {
    const initializeAdmin = async (retryCount = 0) => {
      try {
        console.log('AdminLayout: Getting user data...')

        const { data: { user }, error: userError } = await supabase.auth.getUser()

        if (userError) {
          console.error('AdminLayout: Error getting user:', userError)
          // Retry on network errors
          if (retryCount < 2 && userError.message?.includes('fetch')) {
            console.log(`AdminLayout: Retrying... (attempt ${retryCount + 2})`)
            setTimeout(() => initializeAdmin(retryCount + 1), 1000)
            return
          }
          router.push('/auth/sign-in')
          return
        }

        console.log('AdminLayout: User data:', user)

        if (user) {
          setUser(user)

          // Get profile data including avatar and email with error handling
          const { data: profileData, error: profileError } = await supabase
            .from('profiles')
            .select('*, email')
            .eq('id', user.id)
            .single()

          if (profileError) {
            console.error('AdminLayout: Error fetching profile:', profileError)
            // Still allow access if profile fetch fails but user is authenticated
            // The middleware has already verified admin access
            setIsAdmin(true)
          } else if (profileData) {
            setProfile(profileData)
            // Since middleware has already verified admin access, we can trust the user is admin
            console.log('AdminLayout: User verified as admin by middleware, initializing admin panel')
            setIsAdmin(true)
          }
        } else {
          console.log('AdminLayout: No user found, this should not happen due to middleware')
          router.push('/auth/sign-in')
        }
      } catch (error) {
        console.error('AdminLayout: Error getting user data:', error)
        // Retry on network/fetch errors
        if (retryCount < 2 && error instanceof Error && error.message?.includes('fetch')) {
          console.log(`AdminLayout: Retrying after error... (attempt ${retryCount + 2})`)
          setTimeout(() => initializeAdmin(retryCount + 1), 1000)
          return
        }
        // On persistent errors, still try to show admin panel if middleware allowed access
        setIsAdmin(true)
      } finally {
        setLoading(false)
      }
    }

    initializeAdmin()
  }, [supabase, router])

  // Check for pending assignment requests from database
  useEffect(() => {
    if (!user) return

    const checkPendingRequests = async () => {
      try {
        // Query notifications table for pending lead_reassignment_request notifications
        const { data: notifications, error } = await supabase
          .from('notifications')
          .select('*')
          .eq('user_id', user.id)
          .eq('type', 'lead_reassignment_request')
          .eq('is_read', false)
          .order('created_at', { ascending: false })
          .limit(5)
        
        if (error) {
          console.error('Error fetching notifications:', error)
          return // Don't reset state on error to prevent flickering
        }
        
        // Use deep comparison to prevent unnecessary re-renders
        const newCount = notifications?.length || 0
        const notificationData = JSON.stringify(notifications)
        
        setPendingRequests(prev => prev !== newCount ? newCount : prev)
        setPendingNotifications(prev => {
          const prevData = JSON.stringify(prev)
          return prevData !== notificationData ? (notifications || []) : prev
        })
      } catch (error) {
        console.error('Error checking pending requests:', error)
      }
    }
    
    // Check immediately and then every 30 seconds
    checkPendingRequests()
    const interval = setInterval(checkPendingRequests, 30000)
    
    return () => clearInterval(interval)
  }, [user, supabase])

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push('/auth/sign-in')
  }

  const handleDashboardNavigation = () => {
    console.log('🔄 AdminLayout: Navigating to sales dashboard...')
    console.log('🔄 AdminLayout: Current user profile:', profile)
    
    // Navigate to the main sales dashboard for admin users
    router.push('/dashboard')
  }

  const adminNavItems = [
    { name: 'Admin Dashboard', href: '/admin', icon: Shield },
    // CRM Management Section
    { name: 'Lead Management', href: '/admin/leads', icon: UserCheck },
    { name: 'Assignment Requests', href: '/admin/assignment-requests', icon: GitPullRequest, badge: pendingRequests > 0 ? pendingRequests : null },
    { name: 'Deals Overview', href: '/admin/deals', icon: Package },
    { name: 'Tasks & Calendar', href: '/admin/tasks', icon: CheckSquare },
    { name: 'Contacts & Companies', href: '/admin/contacts', icon: Building2 },
    // Team & User Management
    { name: 'Sales Team', href: '/admin/team', icon: Users },
    { name: 'User Management', href: '/admin/users', icon: UserCheck },
    // Business Operations
    { name: 'Email Marketing', href: '/admin/email-marketing', icon: Send },
    { name: 'Email Templates', href: '/admin/email-templates', icon: Mail },
    { name: 'Quotation System', href: '/admin/quotes', icon: FileText },
    // Communication
    { name: 'Team Broadcast', href: '/admin/messenger', icon: MessageSquare },
    { name: 'Email History', href: '/admin/email-history', icon: History },
    { name: 'Email Logs', href: '/admin/email-logs', icon: MailOpen },
    { name: 'Email Config', href: '/admin/email-config', icon: Mail },
    // Financial
    { name: 'Product Catalog', href: '/admin/product-catalog', icon: Package },
    { name: 'Transactions', href: '/admin/transactions', icon: Receipt },
    { name: 'Stripe Integration', href: '/admin/stripe', icon: CreditCard },
    // Settings
    { name: 'System Settings', href: '/admin/settings', icon: Settings },
  ]

  const userInitials = (profile?.first_name?.[0] || '') + (profile?.last_name?.[0] || '') ||
    (user?.user_metadata?.first_name?.[0] || '') + (user?.user_metadata?.last_name?.[0] || '') ||
    user?.email?.[0]?.toUpperCase() || 'A'

  // Check if current user is Owner/Super Admin
  const userEmail = profile?.email || user?.email || ''
  const isOwnerRole = profile?.role === ROLES.OWNER || isUserSuperAdmin(userEmail, profile?.role)

  // Filter nav items based on role
  const filteredNavItems = isOwnerRole
    ? adminNavItems.filter(item => !OWNER_HIDDEN_ITEMS.includes(item.name))
    : adminNavItems

  const Navigation = () => (
    <nav className="space-y-2">
      {filteredNavItems.map((item) => {
        const Icon = item.icon

        return (
          <div key={item.name}>
            <Link
              href={item.href}
              className={`flex items-center space-x-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors hover:bg-gray-50 ${
                pathname === item.href
                  ? 'bg-blue-50 text-blue-700 font-semibold'
                  : 'text-gray-700 hover:text-gray-900'
              }`}
            >
              <Icon className="h-5 w-5" />
              <span className="flex-1">{item.name}</span>
              {item.badge && (
                <Badge className="bg-red-500 text-white text-xs px-1.5 py-0 h-5 min-w-[20px] flex items-center justify-center">
                  {item.badge}
                </Badge>
              )}
            </Link>
          </div>
        )
      })}
    </nav>
  )

  // Show loading while checking admin status
  if (loading) {
    return (
      <div className="min-h-screen bg-blue-50 flex items-center justify-center">
        <div className="text-center">
          <Shield className="h-8 w-8 text-blue-600 mx-auto mb-4 animate-pulse" />
          <p className="text-blue-900">Loading admin panel...</p>
        </div>
      </div>
    )
  }

  // Don't render admin layout for non-admin users
  if (!isAdmin) {
    return null
  }

  return (
    <div className="min-h-screen bg-blue-50">
      {/* Desktop Sidebar */}
      <div className="hidden lg:fixed lg:inset-y-0 lg:flex lg:w-64 lg:flex-col">
        <div className="flex flex-col flex-grow bg-white border-r border-gray-200 pt-5 pb-4 overflow-y-auto">
          <div className="flex items-center flex-shrink-0 px-4">
            <div className="flex items-center space-x-3">
              <div className="relative w-10 h-10 flex-shrink-0">
                <img 
                  src="/dummi-co-logo-new.jpg" 
                  alt="Dummi & Co Logo" 
                  className="w-full h-full object-contain rounded-lg"
                />
              </div>
              <div>
                <h1 className="text-xl font-bold text-blue-900">Admin Panel</h1>
                <p className="text-xs text-blue-600">Dummi & Co Administration</p>
              </div>
            </div>
          </div>
          <div className="mt-6 flex-grow flex flex-col px-4">
            <div className="mb-4 pb-4 border-b border-gray-200">
              <button 
                onClick={handleDashboardNavigation}
                className="flex items-center space-x-2 text-sm text-gray-500 hover:text-blue-600 transition-colors"
              >
                <ArrowLeft className="h-4 w-4" />
                <span>Back to User Dashboard</span>
              </button>
            </div>
            <Navigation />
          </div>
        </div>
      </div>

      {/* Mobile header */}
      <div className="lg:hidden">
        <div className="flex items-center justify-between bg-white border-b border-gray-200 px-4 py-3 shadow-sm">
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon">
                <Menu className="h-6 w-6" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-64 bg-white">
              <div className="py-4">
                <div className="flex items-center space-x-3 mb-6">
                  <div className="relative w-10 h-10 flex-shrink-0">
                    <img 
                      src="/dummi-co-logo-new.jpg" 
                      alt="Dummi & Co Logo" 
                      className="w-full h-full object-contain rounded-lg"
                    />
                  </div>
                  <div>
                    <h1 className="text-xl font-bold text-blue-900">Admin Panel</h1>
                    <p className="text-xs text-blue-600">Dummi & Co Administration</p>
                  </div>
                </div>
                <div className="mb-4 pb-4 border-b border-gray-200">
                  <button 
                    onClick={handleDashboardNavigation}
                    className="flex items-center space-x-2 text-sm text-gray-500 hover:text-blue-600 transition-colors"
                  >
                    <ArrowLeft className="h-4 w-4" />
                    <span>Back to User Dashboard</span>
                  </button>
                </div>
                <Navigation />
              </div>
            </SheetContent>
          </Sheet>
          <div className="flex items-center space-x-2">
            <div className="relative w-6 h-6 flex-shrink-0">
              <img 
                src="/dummi-co-logo-new.jpg" 
                alt="Dummi & Co Logo" 
                className="w-full h-full object-contain rounded"
              />
            </div>
            <h1 className="text-lg font-semibold text-blue-900">Admin Panel</h1>
          </div>
          {/* Mobile Notification Bell */}
          <Button 
            variant="ghost" 
            size="sm"
            className="relative"
            onClick={() => router.push('/admin/leads')}
          >
            <Bell className={`h-5 w-5 ${pendingRequests > 0 ? 'text-red-600 animate-pulse' : 'text-gray-400'}`} />
            {pendingRequests > 0 && (
              <span className="absolute -top-1 -right-1 h-4 w-4 bg-red-500 text-white rounded-full text-[10px] flex items-center justify-center font-bold">
                {pendingRequests}
              </span>
            )}
          </Button>
        </div>
      </div>

      {/* Main content */}
      <div className="lg:pl-64">
        <div className="sticky top-0 z-40">
          <div className="relative flex h-16 items-center justify-between border-b border-gray-200 bg-white px-6 shadow-sm">
            <div className="flex items-center space-x-3">
              <Shield className="h-5 w-5 text-blue-600 lg:hidden" />
              <h2 className="text-lg font-semibold text-blue-900">
                {pathname === '/admin/products' || pathname.startsWith('/admin/products')
                  ? 'Product Management'
                  : pathname === '/admin/stripe/products'
                  ? 'Product Management'
                  : pathname === '/admin/transactions'
                  ? 'Transaction Management'
                  : pathname === '/admin/email-marketing'
                  ? 'Email Marketing'
                  : pathname === '/admin/email-templates'
                  ? 'Email Templates'
                  : pathname === '/admin/quotes'
                  ? 'Quotation System'
                  : pathname === '/admin/messenger'
                  ? 'Team Broadcast'
                  : adminNavItems.find(item => pathname === item.href)?.name || 'Admin Dashboard'}
              </h2>
            </div>
            <div className="flex items-center space-x-4">
              {/* Notification Bell */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button 
                    variant="ghost" 
                    size="sm"
                    className="relative"
                    title={pendingRequests > 0 ? `${pendingRequests} pending reassignment requests` : 'No pending requests'}
                  >
                    <Bell className={`h-5 w-5 ${pendingRequests > 0 ? 'text-red-600 animate-pulse' : 'text-gray-400'}`} />
                    {pendingRequests > 0 && (
                      <span className="absolute -top-1 -right-1 h-5 w-5 bg-red-500 text-white rounded-full text-xs flex items-center justify-center font-bold">
                        {pendingRequests > 9 ? '9+' : pendingRequests}
                      </span>
                    )}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-80" align="end">
                  <DropdownMenuLabel className="font-normal">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold">Notifications</span>
                      {pendingRequests > 0 && (
                        <span className="text-xs bg-red-100 text-red-600 px-2 py-1 rounded">
                          {pendingRequests} pending
                        </span>
                      )}
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  {pendingRequests > 0 ? (
                    <>
                      <div className="px-2 py-1">
                        <p className="text-sm text-gray-600 mb-2">Reassignment Requests:</p>
                        {pendingNotifications.slice(0, 3).map((notification: any) => {
                          const metadata = notification.metadata || {}
                          return (
                            <div 
                              key={notification.id} 
                              className="py-2 px-2 hover:bg-gray-50 rounded cursor-pointer" 
                              onClick={() => router.push('/admin/assignment-requests')}
                            >
                              <p className="text-sm font-medium text-gray-900">
                                {metadata.leadName || 'Unknown Lead'}
                              </p>
                              <p className="text-xs text-gray-500">
                                → {metadata.requestedUserName || 'Unknown User'}
                              </p>
                              <p className="text-xs text-gray-400">
                                from {metadata.requestingUserName || metadata.requestedUserName || 'Unknown'}
                              </p>
                            </div>
                          )
                        })}
                        {pendingRequests > 3 && (
                          <p className="text-xs text-gray-500 text-center mt-2">
                            +{pendingRequests - 3} more...
                          </p>
                        )}
                      </div>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={() => router.push('/admin/assignment-requests')}>
                        <GitPullRequest className="mr-2 h-4 w-4 text-red-600" />
                        <span className="text-red-600">View All Requests</span>
                      </DropdownMenuItem>
                    </>
                  ) : (
                    <div className="px-4 py-6 text-center">
                      <Bell className="h-8 w-8 text-gray-300 mx-auto mb-2" />
                      <p className="text-sm text-gray-500">No pending requests</p>
                    </div>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
              
              <div className="hidden sm:block">
                {isOwnerRole ? (
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                    <Crown className="h-3 w-3 mr-1" />
                    Owner
                  </span>
                ) : (
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                    Administrator
                  </span>
                )}
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={profile?.avatar_url || ''} alt="Profile" />
                      <AvatarFallback className="bg-blue-100 text-blue-900">{userInitials}</AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56" align="end" forceMount>
                  <DropdownMenuLabel className="font-normal">
                    <div className="flex flex-col space-y-1">
                      <p className="text-sm font-medium leading-none">
                        {profile?.first_name && profile?.last_name 
                          ? `${profile.first_name} ${profile.last_name}`
                          : `${user?.user_metadata?.first_name || ''} ${user?.user_metadata?.last_name || ''}`.trim() || user?.email?.split('@')[0] || 'Admin User'
                        }
                      </p>
                      <p className="text-xs leading-none text-muted-foreground">
                        {user?.email}
                      </p>
                      <p className={`text-xs leading-none font-medium ${isOwnerRole ? 'text-purple-600' : 'text-blue-600'}`}>
                        {isOwnerRole ? 'Owner / Super Admin' : 'Administrator'}
                      </p>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleDashboardNavigation}>
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    <span>User Dashboard</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/admin/profile">
                      <User className="mr-2 h-4 w-4" />
                      <span>My Profile</span>
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleSignOut}>
                    <LogOut className="mr-2 h-4 w-4" />
                    <span>Log out</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>
        <main className="flex-1 overflow-x-hidden overflow-y-auto bg-gray-50 px-8 py-6">
          <div className="w-full max-w-screen-2xl mx-auto">
            {children}
          </div>
        </main>
      </div>

    </div>
  )
}