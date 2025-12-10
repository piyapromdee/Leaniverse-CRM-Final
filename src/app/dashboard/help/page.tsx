'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Calculator, Lightbulb, Target, Award, ArrowRight, BarChart3, TrendingUp, Users, Building2 } from 'lucide-react'

export default function HelpPage() {
  return (
    <div className="space-y-6 p-4 md:p-6 lg:px-12 lg:py-8 min-h-screen">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Help & Guide</h1>
          <p className="text-gray-600">Complete documentation for your CRM system</p>
        </div>
        <Badge variant="secondary" className="bg-blue-100 text-blue-800">
          📖 Documentation Hub
        </Badge>
      </div>

      <Tabs defaultValue="getting-started" className="w-full">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="getting-started">Getting Started</TabsTrigger>
          <TabsTrigger value="lead-scoring">Lead Scoring</TabsTrigger>
          <TabsTrigger value="conversions">Lead to Deal</TabsTrigger>
          <TabsTrigger value="pipeline">Deal Pipeline</TabsTrigger>
          <TabsTrigger value="dashboard">Dashboard Guide</TabsTrigger>
        </TabsList>

        <TabsContent value="getting-started" className="space-y-6 mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Lightbulb className="w-5 h-5 text-blue-600" />
                CRM Basics for New Users
              </CardTitle>
              <CardDescription>
                Essential definitions and concepts to get you started with the CRM system
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <h4 className="font-semibold text-gray-900 flex items-center gap-2">
                    <Target className="w-4 h-4 text-green-600" />
                    Core Concepts
                  </h4>
                  
                  <div className="space-y-3">
                    <div className="p-3 bg-blue-50 rounded-lg">
                      <div className="font-medium text-blue-800">🎯 Lead</div>
                      <div className="text-sm text-blue-700 mt-1">
                        A potential customer who has shown interest in your product/service but hasn't made a purchase yet. Leads are managed by marketing teams to nurture and qualify before passing to sales.
                      </div>
                    </div>
                    
                    <div className="p-3 bg-green-50 rounded-lg">
                      <div className="font-medium text-green-800">💼 Deal</div>
                      <div className="text-sm text-green-700 mt-1">
                        A qualified sales opportunity with a potential customer. Deals have monetary value and move through stages in your sales pipeline until they're won or lost.
                      </div>
                    </div>
                    
                    <div className="p-3 bg-purple-50 rounded-lg">
                      <div className="font-medium text-purple-800">👥 Contact</div>
                      <div className="text-sm text-purple-700 mt-1">
                        Individual people you do business with - including leads, customers, partners, and vendors. Contains personal information and communication history.
                      </div>
                    </div>
                    
                    <div className="p-3 bg-orange-50 rounded-lg">
                      <div className="font-medium text-orange-800">🏢 Company</div>
                      <div className="text-sm text-orange-700 mt-1">
                        Organizations you do business with. Companies can have multiple contacts and deals associated with them.
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="space-y-4">
                  <h4 className="font-semibold text-gray-900 flex items-center gap-2">
                    <BarChart3 className="w-4 h-4 text-green-600" />
                    Sales Process
                  </h4>
                  
                  <div className="space-y-3">
                    <div className="p-3 bg-yellow-50 rounded-lg">
                      <div className="font-medium text-yellow-800">📊 Lead Scoring</div>
                      <div className="text-sm text-yellow-700 mt-1">
                        Automatic rating system (0-100) that evaluates lead quality based on source, contact info, job title, and priority. Higher scores indicate better prospects.
                      </div>
                    </div>
                    
                    <div className="p-3 bg-indigo-50 rounded-lg">
                      <div className="font-medium text-indigo-800">🔄 Lead Qualification</div>
                      <div className="text-sm text-indigo-700 mt-1">
                        Process of evaluating if a lead is ready to become a sales opportunity. Qualified leads can be converted to deals.
                      </div>
                    </div>
                    
                    <div className="p-3 bg-pink-50 rounded-lg">
                      <div className="font-medium text-pink-800">🚀 Sales Pipeline</div>
                      <div className="text-sm text-pink-700 mt-1">
                        Visual representation of deals moving through stages: Discovery → Proposal → Negotiation → Closed Won/Lost.
                      </div>
                    </div>
                    
                    <div className="p-3 bg-teal-50 rounded-lg">
                      <div className="font-medium text-teal-800">📈 Activities</div>
                      <div className="text-sm text-teal-700 mt-1">
                        Logged actions and events in your CRM - calls, emails, meetings, status changes. Helps track engagement history.
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="font-semibold text-gray-900 flex items-center gap-2">
                  <Award className="w-4 h-4 text-gray-600" />
                  Workflow: From Lead to Customer
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-5 gap-2 mt-3">
                  <div className="text-center p-2 bg-blue-100 rounded text-xs">
                    <div className="font-medium">1. Lead Creation</div>
                    <div className="text-gray-600">Marketing captures interest</div>
                  </div>
                  <div className="text-center p-2 bg-yellow-100 rounded text-xs">
                    <div className="font-medium">2. Lead Scoring</div>
                    <div className="text-gray-600">System rates quality</div>
                  </div>
                  <div className="text-center p-2 bg-purple-100 rounded text-xs">
                    <div className="font-medium">3. Qualification</div>
                    <div className="text-gray-600">Marketing qualifies lead</div>
                  </div>
                  <div className="text-center p-2 bg-green-100 rounded text-xs">
                    <div className="font-medium">4. Conversion</div>
                    <div className="text-gray-600">Convert to deal</div>
                  </div>
                  <div className="text-center p-2 bg-orange-100 rounded text-xs">
                    <div className="font-medium">5. Sales Process</div>
                    <div className="text-gray-600">Move through pipeline</div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="lead-scoring" className="space-y-6 mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calculator className="w-5 h-5 text-blue-600" />
                Lead Scoring System
              </CardTitle>
              <CardDescription>
                How leads are automatically scored from 0-100 based on quality indicators
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <h4 className="font-semibold text-gray-900 flex items-center gap-2">
                    <Target className="w-4 h-4 text-green-600" />
                    Source Quality Points
                  </h4>
                  <div className="space-y-2">
                    <div className="flex justify-between p-2 bg-green-50 rounded">
                      <span>Referral</span>
                      <Badge className="bg-green-100 text-green-800">+25 pts</Badge>
                    </div>
                    <div className="flex justify-between p-2 bg-blue-50 rounded">
                      <span>LinkedIn</span>
                      <Badge className="bg-blue-100 text-blue-800">+20 pts</Badge>
                    </div>
                    <div className="flex justify-between p-2 bg-gray-50 rounded">
                      <span>Website</span>
                      <Badge>+15 pts</Badge>
                    </div>
                    <div className="flex justify-between p-2 bg-gray-50 rounded">
                      <span>Google Ads</span>
                      <Badge>+10 pts</Badge>
                    </div>
                    <div className="flex justify-between p-2 bg-gray-50 rounded">
                      <span>Facebook Ads</span>
                      <Badge>+8 pts</Badge>
                    </div>
                    <div className="flex justify-between p-2 bg-gray-50 rounded">
                      <span>Email Marketing</span>
                      <Badge>+5 pts</Badge>
                    </div>
                    <div className="flex justify-between p-2 bg-red-50 rounded">
                      <span>Cold Outreach</span>
                      <Badge className="bg-red-100 text-red-800">+3 pts</Badge>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <h4 className="font-semibold text-gray-900 flex items-center gap-2">
                    <Target className="w-4 h-4 text-green-600" />
                    Contact Information
                  </h4>
                  <div className="space-y-2">
                    <div className="flex justify-between p-2 bg-gray-50 rounded">
                      <span>Has Company Name</span>
                      <Badge>+10 pts</Badge>
                    </div>
                    <div className="flex justify-between p-2 bg-gray-50 rounded">
                      <span>Has Email</span>
                      <Badge>+10 pts</Badge>
                    </div>
                    <div className="flex justify-between p-2 bg-gray-50 rounded">
                      <span>Has Phone</span>
                      <Badge>+10 pts</Badge>
                    </div>
                  </div>

                  <h4 className="font-semibold text-gray-900 flex items-center gap-2 mt-6">
                    <Target className="w-4 h-4 text-green-600" />
                    Job Title Importance
                  </h4>
                  <div className="space-y-2">
                    <div className="flex justify-between p-2 bg-green-50 rounded">
                      <span>CEO/Founder/President</span>
                      <Badge className="bg-green-100 text-green-800">+25 pts</Badge>
                    </div>
                    <div className="flex justify-between p-2 bg-blue-50 rounded">
                      <span>Manager/Director/Head</span>
                      <Badge className="bg-blue-100 text-blue-800">+15 pts</Badge>
                    </div>
                    <div className="flex justify-between p-2 bg-gray-50 rounded">
                      <span>Lead/Senior roles</span>
                      <Badge>+10 pts</Badge>
                    </div>
                    <div className="flex justify-between p-2 bg-gray-50 rounded">
                      <span>Other titles</span>
                      <Badge>+5 pts</Badge>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-blue-50 p-4 rounded-lg">
                <h4 className="font-semibold text-gray-900 flex items-center gap-2">
                  <Calculator className="w-4 h-4 text-blue-600" />
                  Scoring Formula
                </h4>
                <div className="font-mono text-sm bg-white p-2 rounded border mt-2">
                  Total Score = Source Points + Contact Points + Job Title Points + Priority Points
                </div>
                <div className="text-sm text-blue-700 mt-2">Maximum score is capped at 100 points</div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-yellow-50 p-4 rounded-lg">
                  <h4 className="font-semibold text-gray-900 flex items-center gap-2">
                    <Lightbulb className="w-4 h-4 text-yellow-600" />
                    Score Interpretation
                  </h4>
                  <ul className="space-y-2 mt-2">
                    <li className="text-sm text-yellow-800 flex items-start gap-2">
                      <Award className="w-4 h-4 text-yellow-600 mt-0.5 flex-shrink-0" />
                      <strong>80-100:</strong> High-quality leads - immediate attention
                    </li>
                    <li className="text-sm text-yellow-800 flex items-start gap-2">
                      <Award className="w-4 h-4 text-yellow-600 mt-0.5 flex-shrink-0" />
                      <strong>60-79:</strong> Qualified prospects - follow-up needed
                    </li>
                    <li className="text-sm text-yellow-800 flex items-start gap-2">
                      <Award className="w-4 h-4 text-yellow-600 mt-0.5 flex-shrink-0" />
                      <strong>40-59:</strong> Medium potential - nurture with content
                    </li>
                    <li className="text-sm text-yellow-800 flex items-start gap-2">
                      <Award className="w-4 h-4 text-yellow-600 mt-0.5 flex-shrink-0" />
                      <strong>0-39:</strong> Low priority - long-term nurturing
                    </li>
                  </ul>
                </div>
                
                <div className="bg-green-50 p-4 rounded-lg">
                  <h4 className="font-semibold text-gray-900 flex items-center gap-2">
                    <Target className="w-4 h-4 text-green-600" />
                    Best Practices
                  </h4>
                  <ul className="space-y-2 mt-2">
                    <li className="text-sm text-green-800 flex items-start gap-2">
                      <Award className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                      Referrals typically score highest (trust factor)
                    </li>
                    <li className="text-sm text-green-800 flex items-start gap-2">
                      <Award className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                      CEO/Founder titles add significant value
                    </li>
                    <li className="text-sm text-green-800 flex items-start gap-2">
                      <Award className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                      Complete contact info improves scores
                    </li>
                    <li className="text-sm text-green-800 flex items-start gap-2">
                      <Award className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                      Review and update priority levels regularly
                    </li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="conversions" className="space-y-6 mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ArrowRight className="w-5 h-5 text-green-600" />
                Lead to Deal Conversion
              </CardTitle>
              <CardDescription>
                How to convert qualified leads into sales opportunities
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <h4 className="font-semibold text-gray-900 flex items-center gap-2">
                  <Target className="w-4 h-4 text-green-600" />
                  Conversion Process
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="text-center p-4 bg-blue-50 rounded-lg">
                    <div className="w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center mx-auto mb-2">1</div>
                    <div className="text-sm font-medium">Lead Status</div>
                    <div className="text-xs text-gray-600">Must be "qualified"</div>
                  </div>
                  <div className="text-center p-4 bg-green-50 rounded-lg">
                    <div className="w-8 h-8 bg-green-600 text-white rounded-full flex items-center justify-center mx-auto mb-2">2</div>
                    <div className="text-sm font-medium">Click Convert</div>
                    <div className="text-xs text-gray-600">Green button appears</div>
                  </div>
                  <div className="text-center p-4 bg-purple-50 rounded-lg">
                    <div className="w-8 h-8 bg-purple-600 text-white rounded-full flex items-center justify-center mx-auto mb-2">3</div>
                    <div className="text-sm font-medium">Deal Created</div>
                    <div className="text-xs text-gray-600">In Discovery stage</div>
                  </div>
                  <div className="text-center p-4 bg-gray-50 rounded-lg">
                    <div className="w-8 h-8 bg-gray-600 text-white rounded-full flex items-center justify-center mx-auto mb-2">4</div>
                    <div className="text-sm font-medium">Lead Updated</div>
                    <div className="text-xs text-gray-600">Status = "converted"</div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-blue-50 p-4 rounded-lg">
                  <h4 className="font-semibold text-gray-900 flex items-center gap-2">
                    <Target className="w-4 h-4 text-blue-600" />
                    When to Convert
                  </h4>
                  <ul className="space-y-2 mt-2">
                    <li className="text-sm text-blue-800 flex items-start gap-2">
                      <Award className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
                      Lead has expressed genuine purchase intent
                    </li>
                    <li className="text-sm text-blue-800 flex items-start gap-2">
                      <Award className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
                      Budget and timeline have been discussed
                    </li>
                    <li className="text-sm text-blue-800 flex items-start gap-2">
                      <Award className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
                      Decision maker has been identified
                    </li>
                    <li className="text-sm text-blue-800 flex items-start gap-2">
                      <Award className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
                      Lead has moved beyond information gathering
                    </li>
                  </ul>
                </div>
                
                <div className="bg-yellow-50 p-4 rounded-lg">
                  <h4 className="font-semibold text-gray-900 flex items-center gap-2">
                    <Lightbulb className="w-4 h-4 text-yellow-600" />
                    🧪 Testing Steps
                  </h4>
                  <ol className="space-y-2 mt-2">
                    <li className="text-sm text-yellow-800"><strong>1.</strong> Create lead: Referral + CEO + Urgent = ~100 score</li>
                    <li className="text-sm text-yellow-800"><strong>2.</strong> Edit lead status → "qualified"</li>
                    <li className="text-sm text-yellow-800"><strong>3.</strong> Click green "Convert" button</li>
                    <li className="text-sm text-yellow-800"><strong>4.</strong> Verify deal appears in DISCOVERY stage</li>
                    <li className="text-sm text-yellow-800"><strong>5.</strong> Confirm lead shows "converted" status</li>
                    <li className="text-sm text-yellow-800"><strong>6.</strong> Check Recent Activity for conversion log</li>
                  </ol>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="pipeline" className="space-y-6 mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-purple-600" />
                Deal Pipeline Stages
              </CardTitle>
              <CardDescription>
                Understanding the sales process stages
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                <div className="text-center p-4 bg-blue-50 rounded-lg">
                  <div className="text-lg font-bold text-blue-600">DISCOVERY</div>
                  <div className="text-xs text-gray-600 mt-2 mb-3">Initial contact and needs assessment</div>
                  <div className="text-xs text-left space-y-1">
                    <div className="font-medium text-blue-700">Activities:</div>
                    <div className="text-blue-600">• Qualify budget & timeline</div>
                    <div className="text-blue-600">• Understand pain points</div>
                    <div className="text-blue-600">• Identify decision makers</div>
                    <div className="text-blue-600">• Demo product/service</div>
                  </div>
                </div>
                <div className="text-center p-4 bg-yellow-50 rounded-lg">
                  <div className="text-lg font-bold text-yellow-600">PROPOSAL</div>
                  <div className="text-xs text-gray-600 mt-2 mb-3">Presenting solution and pricing</div>
                  <div className="text-xs text-left space-y-1">
                    <div className="font-medium text-yellow-700">Activities:</div>
                    <div className="text-yellow-600">• Create custom proposal</div>
                    <div className="text-yellow-600">• Present pricing options</div>
                    <div className="text-yellow-600">• Address objections</div>
                    <div className="text-yellow-600">• Define implementation</div>
                  </div>
                </div>
                <div className="text-center p-4 bg-purple-50 rounded-lg">
                  <div className="text-lg font-bold text-purple-600">NEGOTIATION</div>
                  <div className="text-xs text-gray-600 mt-2 mb-3">Terms and contract discussions</div>
                  <div className="text-xs text-left space-y-1">
                    <div className="font-medium text-purple-700">Activities:</div>
                    <div className="text-purple-600">• Negotiate terms</div>
                    <div className="text-purple-600">• Adjust pricing</div>
                    <div className="text-purple-600">• Legal/procurement review</div>
                    <div className="text-purple-600">• Final approvals</div>
                  </div>
                </div>
                <div className="text-center p-4 bg-green-50 rounded-lg">
                  <div className="text-lg font-bold text-green-600">CLOSED WON</div>
                  <div className="text-xs text-gray-600 mt-2 mb-3">Deal successfully closed</div>
                  <div className="text-xs text-left space-y-1">
                    <div className="font-medium text-green-700">Next Steps:</div>
                    <div className="text-green-600">• Contract signed</div>
                    <div className="text-green-600">• Payment received</div>
                    <div className="text-green-600">• Handoff to delivery</div>
                    <div className="text-green-600">• Customer onboarding</div>
                  </div>
                </div>
                <div className="text-center p-4 bg-red-50 rounded-lg">
                  <div className="text-lg font-bold text-red-600">CLOSED LOST</div>
                  <div className="text-xs text-gray-600 mt-2 mb-3">Deal was not won</div>
                  <div className="text-xs text-left space-y-1">
                    <div className="font-medium text-red-700">Follow-up:</div>
                    <div className="text-red-600">• Document reasons</div>
                    <div className="text-red-600">• Set future follow-up</div>
                    <div className="text-red-600">• Learn from feedback</div>
                    <div className="text-red-600">• Maintain relationship</div>
                  </div>
                </div>
              </div>
              
              <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="font-semibold text-gray-900 flex items-center gap-2">
                  <Calculator className="w-4 h-4 text-gray-600" />
                  Pipeline Management Tips
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-3">
                  <div className="space-y-2">
                    <div className="font-medium text-gray-800">Moving Deals Forward:</div>
                    <ul className="text-sm text-gray-700 space-y-1">
                      <li>• Set clear next steps with deadlines</li>
                      <li>• Regular follow-ups with prospects</li>
                      <li>• Keep deal values updated</li>
                      <li>• Update stage based on actual progress</li>
                    </ul>
                  </div>
                  <div className="space-y-2">
                    <div className="font-medium text-gray-800">Common Mistakes:</div>
                    <ul className="text-sm text-gray-700 space-y-1">
                      <li>• Leaving deals in wrong stages too long</li>
                      <li>• Not updating deal values</li>
                      <li>• Missing follow-up dates</li>
                      <li>• Not documenting reasons for losses</li>
                    </ul>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="dashboard" className="space-y-6 mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-green-600" />
                Dashboard Monitoring Guide
              </CardTitle>
              <CardDescription>
                Using the dashboard to monitor your sales performance
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-green-50 p-4 rounded-lg">
                  <h4 className="font-semibold text-gray-900 flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-green-600" />
                    Recent Activity Tracking
                  </h4>
                  <p className="text-sm text-green-800 mt-2">
                    Real-time activity feed shows:
                  </p>
                  <ul className="space-y-1 mt-2 ml-4">
                    <li className="text-sm text-green-800">• <strong>Lead activities:</strong> Created, updated, qualified, converted</li>
                    <li className="text-sm text-green-800">• <strong>Deal activities:</strong> Created, stage changes, value updates</li>
                    <li className="text-sm text-green-800">• <strong>Task activities:</strong> Created, completed, status changes</li>
                    <li className="text-sm text-green-800">• <strong>Contact activities:</strong> Added, updated, communications</li>
                  </ul>
                  <p className="text-sm text-green-800 mt-2">
                    <strong>Note:</strong> All activities are logged automatically with timestamps.
                  </p>
                </div>
                
                <div className="bg-blue-50 p-4 rounded-lg">
                  <h4 className="font-semibold text-gray-900 flex items-center gap-2">
                    <BarChart3 className="w-4 h-4 text-blue-600" />
                    Dashboard Widgets
                  </h4>
                  <div className="space-y-2 mt-2">
                    <div className="text-sm text-blue-800">
                      <strong>Lead Sources Chart:</strong> Shows where leads come from
                    </div>
                    <div className="text-sm text-blue-800">
                      <strong>Deal Pipeline:</strong> Value and count by stage
                    </div>
                    <div className="text-sm text-blue-800">
                      <strong>Top Leads:</strong> Highest scoring prospects
                    </div>
                    <div className="text-sm text-blue-800">
                      <strong>Recent Activity:</strong> Latest system actions
                    </div>
                    <div className="text-sm text-blue-800">
                      <strong>Metrics Summary:</strong> Key performance indicators
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="bg-purple-50 p-4 rounded-lg">
                <h4 className="font-semibold text-gray-900 flex items-center gap-2">
                  <Award className="w-4 h-4 text-purple-600" />
                  Using Your CRM Dashboard Effectively
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-3">
                  <div className="space-y-2">
                    <div className="font-medium text-purple-800">📊 Monitor Key Metrics:</div>
                    <ul className="text-sm text-purple-700 space-y-1">
                      <li>• Lead conversion rates by source</li>
                      <li>• Average deal size and time to close</li>
                      <li>• Pipeline velocity and bottlenecks</li>
                      <li>• Activity levels and engagement</li>
                    </ul>
                  </div>
                  <div className="space-y-2">
                    <div className="font-medium text-purple-800">🚨 Spot Issues Early:</div>
                    <ul className="text-sm text-purple-700 space-y-1">
                      <li>• Deals stuck in stages too long</li>
                      <li>• Low lead scoring averages</li>
                      <li>• Declining activity levels</li>
                      <li>• Missed follow-up dates</li>
                    </ul>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}