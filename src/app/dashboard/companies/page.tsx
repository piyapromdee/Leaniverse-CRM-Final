'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { 
  Building, 
  Search, 
  Plus, 
  Users, 
  DollarSign,
  Globe,
  Phone,
  Mail,
  MapPin,
  TrendingUp
} from 'lucide-react'
import Link from 'next/link'
import PageHeader from '@/components/page-header'

interface Company {
  id: string
  name: string
  industry: string
  website: string
  email: string
  phone: string
  city: string
  state: string
  country: string
  employee_count: string
  annual_revenue: string
  status: string
  created_at: string
  contact_count?: number
  deal_count?: number
  total_deal_value?: number
}

export default function CompaniesPage() {
  const supabase = createClient()
  const [companies, setCompanies] = useState<Company[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [showAddDialog, setShowAddDialog] = useState(false)
  const [newCompany, setNewCompany] = useState({
    name: '',
    industry: '',
    website: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    state: '',
    country: '',
    postal_code: '',
    employee_count: '',
    annual_revenue: '',
    status: 'active'
  })

  useEffect(() => {
    loadCompanies()
  }, [])

  const loadCompanies = async () => {
    setLoading(true)
    try {
      // Get current user for filtering
      const { data: { user }, error: userError } = await supabase.auth.getUser()
      if (userError || !user) {
        console.error('Error getting user:', userError)
        return
      }

      // Load companies
      const { data: companiesData, error: companiesError } = await supabase
        .from('companies')
        .select('*')
        .order('created_at', { ascending: false })

      if (companiesError) {
        console.error('Error loading companies:', companiesError)
        return
      }

      // Load contact counts and deal metrics for each company
      const companiesWithMetrics = await Promise.all(
        companiesData.map(async (company) => {
          // Get contact count (filtered by current user)
          const { count: contactCount } = await supabase
            .from('contacts')
            .select('id', { count: 'exact' })
            .eq('company_id', company.id)
            .eq('user_id', user.id)

          // Get deal metrics (filtered by current user)
          const { data: dealsData } = await supabase
            .from('deals')
            .select('value, status')
            .eq('company_id', company.id)
            .eq('user_id', user.id)

          const dealCount = dealsData?.length || 0
          const totalDealValue = dealsData?.reduce((sum, deal) => sum + (deal.value || 0), 0) || 0

          return {
            ...company,
            contact_count: contactCount || 0,
            deal_count: dealCount,
            total_deal_value: totalDealValue
          }
        })
      )

      setCompanies(companiesWithMetrics)
    } catch (error) {
      console.error('Error loading companies:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleAddCompany = async () => {
    if (!newCompany.name.trim()) return

    try {
      const normalizedCompanyName = newCompany.name.trim()
        .replace(/([a-z])([A-Z])/g, '$1 $2') // Add space between lowercase and uppercase
        .replace(/([a-zA-Z])([0-9])/g, '$1 $2') // Add space between letters and numbers
        .replace(/([0-9])([a-zA-Z])/g, '$1 $2') // Add space between numbers and letters
        .replace(/\s+/g, ' ') // Replace multiple spaces with single space
        .trim() // Remove leading/trailing spaces
      
      const { error } = await supabase
        .from('companies')
        .insert([{
          ...newCompany,
          name: normalizedCompanyName,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }])

      if (error) {
        console.error('Error adding company:', error)
        return
      }

      setShowAddDialog(false)
      setNewCompany({
        name: '',
        industry: '',
        website: '',
        email: '',
        phone: '',
        address: '',
        city: '',
        state: '',
        country: '',
        postal_code: '',
        employee_count: '',
        annual_revenue: '',
        status: 'active'
      })
      loadCompanies()
    } catch (error) {
      console.error('Error adding company:', error)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'active': return 'bg-green-100 text-green-800'
      case 'inactive': return 'bg-gray-100 text-gray-800'
      case 'prospect': return 'bg-blue-100 text-blue-800'
      case 'client': return 'bg-purple-100 text-purple-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const filteredCompanies = companies.filter(company =>
    company.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    company.industry?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    company.city?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading companies...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      <PageHeader
        title="Companies"
        description="Manage your company accounts"
      />

      <div className="mb-6 flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          <Input
            placeholder="Search companies..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Button 
          onClick={() => setShowAddDialog(true)}
          className="bg-teal-600 hover:bg-teal-700 flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Add Company
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredCompanies.map(company => (
          <Link
            key={company.id}
            href={`/dashboard/companies/${company.id}`}
            className="block hover:no-underline"
          >
            <Card className="h-full hover:shadow-lg transition-shadow cursor-pointer">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-teal-100 rounded-lg flex items-center justify-center">
                      <Building className="w-6 h-6 text-teal-600" />
                    </div>
                    <div>
                      <CardTitle className="text-lg">{company.name}</CardTitle>
                      <p className="text-sm text-gray-500">{company.industry || 'No industry'}</p>
                    </div>
                  </div>
                  <Badge className={getStatusColor(company.status)}>
                    {company.status || 'Active'}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {company.city && (
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <MapPin className="w-4 h-4" />
                      <span>
                        {[company.city, company.state, company.country]
                          .filter(Boolean)
                          .join(', ')}
                      </span>
                    </div>
                  )}
                  {company.website && (
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Globe className="w-4 h-4" />
                      <span className="truncate">{company.website}</span>
                    </div>
                  )}
                  {company.email && (
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Mail className="w-4 h-4" />
                      <span className="truncate">{company.email}</span>
                    </div>
                  )}
                  {company.phone && (
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Phone className="w-4 h-4" />
                      <span>{company.phone}</span>
                    </div>
                  )}
                </div>
                
                <div className="mt-4 pt-4 border-t grid grid-cols-3 gap-2 text-center">
                  <div>
                    <p className="text-2xl font-bold text-gray-900">{company.contact_count || 0}</p>
                    <p className="text-xs text-gray-500">Contacts</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-gray-900">{company.deal_count || 0}</p>
                    <p className="text-xs text-gray-500">Deals</p>
                  </div>
                  <div>
                    <p className="text-lg font-bold text-teal-600">
                      ${((company.total_deal_value || 0) / 1000).toFixed(0)}k
                    </p>
                    <p className="text-xs text-gray-500">Value</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      {filteredCompanies.length === 0 && (
        <Card className="mt-8">
          <CardContent className="text-center py-12">
            <Building className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No companies found</h3>
            <p className="text-gray-500 mb-4">
              {searchTerm ? 'Try adjusting your search terms' : 'Get started by adding your first company'}
            </p>
            {!searchTerm && (
              <Button 
                onClick={() => setShowAddDialog(true)}
                className="bg-teal-600 hover:bg-teal-700"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add First Company
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add New Company</DialogTitle>
            <DialogDescription>
              Enter company information to add to your CRM
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="name">Company Name *</Label>
                <Input
                  id="name"
                  value={newCompany.name}
                  onChange={(e) => setNewCompany({...newCompany, name: e.target.value})}
                  placeholder="Acme Corporation"
                />
              </div>
              <div>
                <Label htmlFor="industry">Industry</Label>
                <Input
                  id="industry"
                  value={newCompany.industry}
                  onChange={(e) => setNewCompany({...newCompany, industry: e.target.value})}
                  placeholder="Technology"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={newCompany.email}
                  onChange={(e) => setNewCompany({...newCompany, email: e.target.value})}
                  placeholder="contact@company.com"
                />
              </div>
              <div>
                <Label htmlFor="phone">Phone</Label>
                <Input
                  id="phone"
                  value={newCompany.phone}
                  onChange={(e) => setNewCompany({...newCompany, phone: e.target.value})}
                  placeholder="+1 (555) 123-4567"
                />
              </div>
            </div>
            <div>
              <Label htmlFor="website">Website</Label>
              <Input
                id="website"
                value={newCompany.website}
                onChange={(e) => setNewCompany({...newCompany, website: e.target.value})}
                placeholder="https://www.company.com"
              />
            </div>
            <div>
              <Label htmlFor="address">Address</Label>
              <Input
                id="address"
                value={newCompany.address}
                onChange={(e) => setNewCompany({...newCompany, address: e.target.value})}
                placeholder="123 Main Street"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="city">City</Label>
                <Input
                  id="city"
                  value={newCompany.city}
                  onChange={(e) => setNewCompany({...newCompany, city: e.target.value})}
                  placeholder="San Francisco"
                />
              </div>
              <div>
                <Label htmlFor="state">State/Province</Label>
                <Input
                  id="state"
                  value={newCompany.state}
                  onChange={(e) => setNewCompany({...newCompany, state: e.target.value})}
                  placeholder="CA"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="country">Country</Label>
                <Input
                  id="country"
                  value={newCompany.country}
                  onChange={(e) => setNewCompany({...newCompany, country: e.target.value})}
                  placeholder="United States"
                />
              </div>
              <div>
                <Label htmlFor="postal_code">Postal Code</Label>
                <Input
                  id="postal_code"
                  value={newCompany.postal_code}
                  onChange={(e) => setNewCompany({...newCompany, postal_code: e.target.value})}
                  placeholder="94102"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="employee_count">Employee Count</Label>
                <Select
                  value={newCompany.employee_count}
                  onValueChange={(value) => setNewCompany({...newCompany, employee_count: value})}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select range" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1-10">1-10</SelectItem>
                    <SelectItem value="11-50">11-50</SelectItem>
                    <SelectItem value="51-200">51-200</SelectItem>
                    <SelectItem value="201-500">201-500</SelectItem>
                    <SelectItem value="501-1000">501-1000</SelectItem>
                    <SelectItem value="1000+">1000+</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="annual_revenue">Annual Revenue</Label>
                <Input
                  id="annual_revenue"
                  value={newCompany.annual_revenue}
                  onChange={(e) => setNewCompany({...newCompany, annual_revenue: e.target.value})}
                  placeholder="$1M - $5M"
                />
              </div>
            </div>
            <div>
              <Label htmlFor="status">Status</Label>
              <Select
                value={newCompany.status}
                onValueChange={(value) => setNewCompany({...newCompany, status: value})}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                  <SelectItem value="prospect">Prospect</SelectItem>
                  <SelectItem value="client">Client</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddDialog(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleAddCompany}
              className="bg-teal-600 hover:bg-teal-700"
              disabled={!newCompany.name.trim()}
            >
              Add Company
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}