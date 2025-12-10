'use client'

import React, { useState, useEffect } from 'react'
import { createClient, getUser } from '@/lib/supabase/client'
import { startNotificationMonitoring } from '@/lib/notification-service'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { DateRangePicker } from '@/components/ui/date-range-picker'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Target, TrendingUp, AlertTriangle, BarChartHorizontal, CheckSquare, Briefcase, Flame, Filter, Calendar, Clock, Users, Globe, Activity, BarChart3, PieChart, UserPlus, Star, ArrowRight, Shield } from 'lucide-react'
// Import new widgets (SAFE - can be easily removed)
import DealsAtRiskWidget from '@/components/dashboard/DealsAtRiskWidget'
import PipelineVelocityWidget from '@/components/dashboard/PipelineVelocityWidget'
// Import Sales Performance widgets (Sales role only)
import MyRecentWinsWidget from '@/components/dashboard/MyRecentWinsWidget'
import MyCommissionWidget from '@/components/dashboard/MyCommissionWidget'
// Import Sales Forecasting widgets
import SalesForecastWidget from '@/components/dashboard/SalesForecastWidget'
import SalesKPIWidget from '@/components/dashboard/SalesKPIWidget'
import { RecentActivityWidget } from '@/components/dashboard/RecentActivityWidget'
import { TestKPIWidget } from '@/components/dashboard/TestKPIWidget'
import { NewLeadsKPIWidget } from '@/components/dashboard/NewLeadsKPIWidget'
import { DateRange } from 'react-day-picker'
import { format, formatDistanceToNow, addDays } from 'date-fns'
import { useFilterStore } from '@/store/filter-store'
import { HelpSidebar } from '@/components/ui/help-sidebar'
import { IndustryBanner } from '@/components/ui/industry-banner'

// --- Helper Functions & Card Components (No Changes) ---
const formatCurrency = (amount: number | undefined) => `฿${(amount || 0).toLocaleString()}`;
const formatTime = (timeString: string) => { 
  if (!timeString) return ''; 
  try {
    if (timeString.includes('T')) {
      const date = new Date(timeString);
      return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
    } else {
      const [hours, minutes] = timeString.split(':'); 
      return `${hours}:${minutes}`;
    }
  } catch (e) {
    return timeString;
  }
};
const KpiCard = ({ title, value, description, icon: Icon, href, colorScheme }: any) => ( <Link href={href} className="block h-full"><Card className="h-full bg-white hover:shadow-md hover:scale-[1.01] transition-all duration-200 group border border-gray-100 overflow-hidden flex flex-col p-0"><div className={`p-2 ${colorScheme.header}`}><div className="flex items-center"><Icon className={`h-4 w-4 ${colorScheme.icon} mr-2`} /><h3 className={`text-xs font-semibold ${colorScheme.text}`}>{title}</h3></div></div><div className="p-3 flex-grow flex flex-col justify-center"><p className="text-xl font-bold text-gray-800">{value}</p><p className="text-xs text-gray-500 mt-1">{description}</p></div></Card></Link> );
const ComparisonGraphCard = ({ won, lost, href }: { won: number, lost: number, href: string }) => { const total = won + lost; const wonPercent = total > 0 ? (won / total) * 100 : 0; return ( <Link href={href} className="block h-full"><Card className="h-full bg-white hover:shadow-lg hover:scale-[1.02] transition-all duration-300 group border border-gray-100 overflow-hidden flex flex-col p-0"><div className="p-3 bg-gray-50 border-b"><div className="flex items-center"><BarChartHorizontal className="h-5 w-5 text-gray-500 mr-2" /><h3 className="text-sm font-semibold text-gray-700">Won vs. Lost</h3></div></div><div className="p-4 flex-grow flex flex-col justify-center"><div className="w-full bg-red-200 rounded-full h-2.5 mb-2"><div className="bg-green-300 h-2.5 rounded-full" style={{ width: `${wonPercent}%` }}></div></div><div className="flex justify-between items-center text-sm"><span className="font-semibold text-green-600">{won} Won</span><span className="font-semibold text-red-600">{lost} Lost</span></div></div></Card></Link> ); };
const UpcomingAgendaCard = ({ agendaItems }: { agendaItems: any[] }) => (
    <Card className="h-full bg-white border border-gray-100 shadow-sm flex flex-col">
      <CardHeader className="p-4 border-b">
        <CardTitle className="text-base font-semibold text-gray-800 flex items-center">
          <Calendar className="h-5 w-5 text-gray-500 mr-3" />
          Upcoming Agenda
        </CardTitle>
      </CardHeader>
      <CardContent className="p-4 flex-grow overflow-y-auto max-h-80">
        {agendaItems.length > 0 ? (
          <ul className="space-y-3">
            {agendaItems.slice(0, 10).map((item, index) => (
              <li key={`agenda-${item.type}-${item.id}-${index}`} className="flex items-start space-x-3 p-3 bg-gray-50 rounded-md border border-gray-200">
                {item.type === 'appointment' ? (
                  <Clock className="h-5 w-5 text-blue-500 mt-1 flex-shrink-0" />
                ) : (
                  <CheckSquare className="h-5 w-5 text-gray-400 mt-1 flex-shrink-0" />
                )}
                <div className="flex-grow">
                  <p className="text-sm font-medium text-gray-800">{item.title}</p>
                  <div className="flex items-center gap-2 text-xs text-gray-500 mt-1">
                    {item.date && format(new Date(item.date), 'MMM dd')}
                    {item.start_time && (
                      <span className="text-blue-600 font-semibold">{formatTime(item.start_time)}</span>
                    )}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <div className="text-center py-10 h-full flex flex-col justify-center items-center">
            <Calendar className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-sm text-gray-500 font-medium">No upcoming tasks or appointments!</p>
          </div>
        )}
      </CardContent>
      <div className="p-4 border-t mt-auto flex-shrink-0">
        <Link href="/dashboard/calendar">
          <Button variant="outline" className="w-full">View Calendar</Button>
        </Link>
      </div>
    </Card>
);

const UpcomingTasksCard = ({ tasks, overdueTasks }: { tasks: any[], overdueTasks: any[] }) => {
  const allTasks = [...overdueTasks, ...tasks];
  const overdueCount = overdueTasks.length;
  
  return (
    <Card className="h-full bg-white border border-gray-100 shadow-sm flex flex-col">
      <CardHeader className="p-4 border-b">
        <CardTitle className="text-base font-semibold text-gray-800 flex items-center justify-between">
          <div className="flex items-center">
            <CheckSquare className="h-5 w-5 text-blue-500 mr-3" />
            Upcoming Tasks
          </div>
          {overdueCount > 0 && (
            <span className="bg-red-100 text-red-800 px-2 py-1 rounded-full text-xs font-medium">
              {overdueCount} overdue
            </span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="p-4 flex-grow overflow-y-auto max-h-80">
        {allTasks.length > 0 ? (
          <ul className="space-y-3">
            {allTasks.slice(0, 10).map(task => {
              const isOverdue = task.date && new Date(task.date) < new Date() && task.status !== 'completed';
              return (
                <li key={task.id} className={`flex items-start space-x-3 p-3 rounded-md border ${
                  isOverdue 
                    ? 'bg-red-50 border-red-200' 
                    : 'bg-gray-50 border-gray-200'
                }`}>
                  {isOverdue ? (
                    <AlertTriangle className="h-5 w-5 text-red-500 mt-1 flex-shrink-0" />
                  ) : (
                    <CheckSquare className="h-5 w-5 text-blue-500 mt-1 flex-shrink-0" />
                  )}
                  <div className="flex-grow">
                    <p className="text-sm font-medium text-gray-800">{task.title}</p>
                    <div className="flex items-center gap-2 text-xs text-gray-500 mt-1">
                      {task.date && (
                        <span className={isOverdue ? 'text-red-600 font-medium' : ''}>
                          {isOverdue ? 'Due: ' : ''}{format(new Date(task.date), 'MMM dd')}
                          {isOverdue && (
                            <span className="text-red-600 ml-1">
                              ({Math.abs(Math.floor((new Date().getTime() - new Date(task.date).getTime()) / (1000 * 60 * 60 * 24)))} days ago)
                            </span>
                          )}
                        </span>
                      )}
                      <span className={`px-2 py-1 rounded-full ${
                        isOverdue 
                          ? 'bg-red-100 text-red-800' 
                          : task.status === 'pending' 
                            ? 'bg-yellow-100 text-yellow-800' 
                            : task.status === 'in_progress' 
                              ? 'bg-blue-100 text-blue-800' 
                              : 'bg-green-100 text-green-800'
                      }`}>
                        {isOverdue 
                          ? 'Overdue' 
                          : task.status === 'pending' 
                            ? 'To Do' 
                            : task.status === 'in_progress' 
                              ? 'In Progress' 
                              : 'Completed'
                        }
                      </span>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        ) : (
          <div className="text-center py-10 h-full flex flex-col justify-center items-center">
            <CheckSquare className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-sm text-gray-500 font-medium">No upcoming tasks!</p>
          </div>
        )}
      </CardContent>
      <div className="p-4 border-t mt-auto flex-shrink-0">
        <Link href="/dashboard/tasks">
          <Button variant="outline" className="w-full">View All Tasks</Button>
        </Link>
      </div>
    </Card>
  );
};


const HotDealsCard = ({ deals }: { deals: any[] }) => { 
  const getClientName = (deal: any) => {
    // First try company name from the companies table
    if (deal.company?.name) return deal.company.name;
    
    // Extract client name from deal title (common pattern: "Client Name - Project")
    if (deal.title) {
      const parts = deal.title.split(' - ');
      if (parts.length > 1) return parts[0];
      // If no dash, use the first part of the title
      const words = deal.title.split(' ');
      return words[0];
    }
    
    // Fallback to a generic client name
    return 'Client';
  };

  return ( <Card className="h-full bg-white border border-gray-100 shadow-sm flex flex-col"><CardHeader className="p-4 border-b"><CardTitle className="text-base font-semibold text-gray-800 flex items-center"><Flame className="h-5 w-5 text-orange-500 mr-3" />Hot Deals</CardTitle></CardHeader><CardContent className="p-4 flex-grow overflow-y-auto">{deals.length > 0 ? ( <ul className="space-y-3">{deals.map(deal => ( <li key={deal.id}><Link href={`/dashboard/deals/${deal.id}`} className="block p-3 bg-gray-50 rounded-md border border-gray-200 hover:bg-gray-100 transition-colors"><div className="flex justify-between items-center"><span className="text-sm font-semibold text-gray-800 truncate pr-2">{getClientName(deal)}</span><span className="text-sm font-bold text-blue-600 flex-shrink-0">{formatCurrency(deal.value)}</span></div><p className="text-xs text-gray-500 mt-1 truncate">{deal.title}</p></Link></li> ))}</ul> ) : ( <div className="text-center py-10 h-full flex flex-col justify-center items-center"><Briefcase className="w-12 h-12 text-gray-300 mx-auto mb-3" /><p className="text-sm text-gray-500 font-medium">No active deals in the pipeline.</p></div> )}</CardContent><div className="p-4 border-t mt-auto flex-shrink-0"><Link href="/dashboard/deals"><Button variant="outline" className="w-full">View All Deals</Button></Link></div></Card> ); };
const TopLeadsCard = ({ leads }: { leads: any[] }) => { 
  const getLeadName = (lead: any) => {
    // Always show Name & Surname as heading (like Hot Deals)
    const fullName = `${lead.first_name || ''} ${lead.last_name || ''}`.trim();
    if (fullName) return fullName;
    if (lead.email) return lead.email;
    return 'Unknown Lead';
  };
  
  return ( <Card className="h-full bg-white border border-gray-100 shadow-sm flex flex-col"><CardHeader className="p-4 border-b"><CardTitle className="text-base font-semibold text-gray-800 flex items-center"><Star className="h-5 w-5 text-teal-500 mr-3" />Top Leads</CardTitle></CardHeader><CardContent className="p-4 flex-grow overflow-y-auto">{leads.length > 0 ? ( <ul className="space-y-3">{leads.map(lead => ( <li key={lead.id}><Link href={`/dashboard/leads`} className="block p-3 bg-gray-50 rounded-md border border-gray-200 hover:bg-gray-100 transition-colors"><div className="flex justify-between items-center"><span className="text-sm font-semibold text-gray-800 truncate pr-2">{getLeadName(lead)}</span><div className="flex items-center"><Star className="h-3 w-3 text-teal-500 mr-1" /><span className="text-sm font-bold text-teal-600 flex-shrink-0">{lead.score !== null && lead.score !== undefined ? lead.score : 0}</span></div></div><p className="text-xs text-gray-500 mt-1 truncate">{lead.email || 'No email'} • {lead.status}</p></Link></li> ))}</ul> ) : ( <div className="text-center py-10 h-full flex flex-col justify-center items-center"><UserPlus className="w-12 h-12 text-gray-300 mx-auto mb-3" /><p className="text-sm text-gray-500 font-medium">No leads found.</p></div> )}</CardContent><div className="p-4 border-t mt-auto flex-shrink-0"><Link href="/dashboard/leads"><Button variant="outline" className="w-full">View All Leads</Button></Link></div></Card> );
};

const DealsClosingSoonCard = ({ deals }: { deals: any[] }) => { 
  const getClientName = (deal: any) => {
    // First try company name from the companies table
    if (deal.company?.name) return deal.company.name;
    
    // Extract client name from deal title (common pattern: "Client Name - Project")
    if (deal.title) {
      const parts = deal.title.split(' - ');
      if (parts.length > 1) return parts[0];
      // If no dash, use the first part of the title
      const words = deal.title.split(' ');
      return words[0];
    }
    
    // Fallback to a generic client name
    return 'Client';
  };

  const getDaysUntilClose = (closeDate: string) => {
    if (!closeDate) return null;
    const today = new Date();
    const close = new Date(closeDate);
    const diffTime = close.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const getUrgencyColor = (daysUntil: number | null) => {
    if (daysUntil === null) return 'text-gray-500';
    if (daysUntil < 0) return 'text-red-600'; // Overdue
    if (daysUntil <= 3) return 'text-red-500'; // Very urgent
    if (daysUntil <= 7) return 'text-orange-500'; // Urgent
    return 'text-blue-500'; // Normal
  };

  return ( 
    <Card className="h-full bg-white border border-gray-100 shadow-sm flex flex-col">
      <CardHeader className="p-4 border-b">
        <CardTitle className="text-base font-semibold text-gray-800 flex items-center">
          <Clock className="h-5 w-5 text-orange-500 mr-3" />
          Deals Closing Soon
        </CardTitle>
      </CardHeader>
      <CardContent className="p-4 flex-grow overflow-y-auto">
        {deals.length > 0 ? (
          <ul className="space-y-3">
            {deals.map(deal => {
              const daysUntil = getDaysUntilClose(deal.expected_close_date);
              return (
                <li key={deal.id}>
                  <Link href={`/dashboard/deals/${deal.id}`} className="block p-3 bg-gray-50 rounded-md border border-gray-200 hover:bg-gray-100 transition-colors">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-semibold text-gray-800 truncate pr-2">{getClientName(deal)}</span>
                      <span className="text-sm font-bold text-blue-600 flex-shrink-0">{formatCurrency(deal.value)}</span>
                    </div>
                    <p className="text-xs text-gray-500 mt-1 truncate">{deal.title}</p>
                    <div className="flex justify-between items-center mt-2">
                      <span className="text-xs text-gray-400">
                        {deal.expected_close_date ? format(new Date(deal.expected_close_date), 'MMM dd') : 'No date set'}
                      </span>
                      <span className={`text-xs font-semibold ${getUrgencyColor(daysUntil)}`}>
                        {daysUntil === null ? 'No date' : 
                         daysUntil < 0 ? `${Math.abs(daysUntil)} days overdue` :
                         daysUntil === 0 ? 'Due today' :
                         daysUntil === 1 ? 'Due tomorrow' :
                         `${daysUntil} days left`}
                      </span>
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        ) : (
          <div className="text-center py-10 h-full flex flex-col justify-center items-center">
            <Clock className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-sm text-gray-500 font-medium">No deals closing soon.</p>
          </div>
        )}
      </CardContent>
      <div className="p-4 border-t mt-auto flex-shrink-0">
        <Link href="/dashboard/deals">
          <Button variant="outline" className="w-full">View All Deals</Button>
        </Link>
      </div>
    </Card>
  );
};
const UserFilter = ({ teamMembers, selectedUserId, onUserChange }: { teamMembers: any[], selectedUserId: string, onUserChange: (userId: string) => void }) => ( <div className="flex items-center space-x-2"><Users className="h-5 w-5 text-gray-500" /><Select value={selectedUserId} onValueChange={onUserChange}><SelectTrigger className="w-[180px] bg-white"><SelectValue placeholder="Select member..." /></SelectTrigger><SelectContent><SelectItem value="all">All Members</SelectItem>{teamMembers.map(member => ( <SelectItem key={member.id} value={member.id}>{member.first_name || 'User'} {member.last_name || ''}</SelectItem> ))}</SelectContent></Select></div> );
const ChannelFilter = ({ channels, selectedChannel, onChannelChange }: { channels: string[], selectedChannel: string, onChannelChange: (channel: string) => void }) => ( <div className="flex items-center space-x-2"><Globe className="h-5 w-5 text-gray-500" /><Select value={selectedChannel} onValueChange={onChannelChange}><SelectTrigger className="w-[180px] bg-white"><SelectValue placeholder="Select channel..." /></SelectTrigger><SelectContent><SelectItem value="all">All Channels</SelectItem>{channels.map(channel => ( <SelectItem key={channel} value={channel}>{channel}</SelectItem> ))}</SelectContent></Select></div> );

// Channel Analytics Components
const TopChannelsChart = ({ channelData, leadMagnetNames }: { 
  channelData: { channel: string, count: number, percentage: number }[], 
  leadMagnetNames: {[key: string]: string} 
}) => {
  const maxCount = channelData.length > 0 ? Math.max(...channelData.map(d => d.count)) : 1;
  
  return (
    <Card className="h-full bg-white border border-gray-100 shadow-sm">
      <CardHeader className="p-4 border-b">
        <CardTitle className="text-base font-semibold text-gray-800 flex items-center">
          <BarChart3 className="h-5 w-5 text-blue-500 mr-3" />
          Top 5 Lead Sources
        </CardTitle>
      </CardHeader>
      <CardContent className="p-6">
        {channelData.length > 0 ? (
          <div className="space-y-4">
            {channelData.map((item, index) => (
              <div key={item.channel} className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-gray-700">
                    {(() => {
                      // Check if it's in the lead magnet names mapping
                      if (leadMagnetNames[item.channel]) {
                        return leadMagnetNames[item.channel];
                      }
                      
                      // Handle deemmi lead form variations
                      if (item.channel.toLowerCase().includes('deemmi-lead-form') || 
                          item.channel.toLowerCase().includes('deemmi_lead_form')) {
                        return 'Deemmi Lead Form';
                      }
                      
                      // Clean up technical IDs (remove timestamps and make readable)
                      if (item.channel.includes('-copy-') || item.channel.match(/\d{10,}/)) {
                        // Extract the base name before "-copy-" or long numbers
                        const baseName = item.channel.split('-copy-')[0]
                          .replace(/[-_]/g, ' ')
                          .replace(/\b\w/g, l => l.toUpperCase());
                        return baseName;
                      }
                      
                      // Default: capitalize and clean up the channel name
                      return item.channel
                        .replace(/[-_]/g, ' ')
                        .replace(/\b\w/g, l => l.toUpperCase());
                    })()}
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-gray-900">{item.count}</span>
                    <span className="text-xs text-gray-500">({item.percentage}%)</span>
                  </div>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className={`h-2 rounded-full ${
                      index === 0 ? 'bg-blue-400' :
                      index === 1 ? 'bg-green-300' :
                      index === 2 ? 'bg-yellow-400' :
                      index === 3 ? 'bg-purple-400' : 'bg-gray-400'
                    }`}
                    style={{ width: `${(item.count / maxCount) * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <BarChart3 className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-sm text-gray-500">No channel data available</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

const ConversionByChannelChart = ({ conversionData }: { conversionData: { channel: string, total: number, won: number, rate: number }[] }) => {
  return (
    <Card className="h-full bg-white border border-gray-100 shadow-sm">
      <CardHeader className="p-4 border-b">
        <CardTitle className="text-base font-semibold text-gray-800 flex items-center">
          <TrendingUp className="h-5 w-5 text-green-500 mr-3" />
          Conversion Rate by Channel
        </CardTitle>
      </CardHeader>
      <CardContent className="p-6">
        {conversionData.length > 0 ? (
          <div className="space-y-4">
            {conversionData.map((item, index) => (
              <div key={item.channel} className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-gray-700">{item.channel}</span>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-gray-500">{item.won}/{item.total}</span>
                    <span className={`text-sm font-bold ${
                      item.rate >= 70 ? 'text-green-700' :
                      item.rate >= 50 ? 'text-yellow-700' :
                      item.rate >= 30 ? 'text-orange-700' : 'text-red-700'
                    }`}>
                      {item.rate}%
                    </span>
                  </div>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className={`h-2 rounded-full ${
                      item.rate >= 70 ? 'bg-green-300' :
                      item.rate >= 50 ? 'bg-yellow-400' :
                      item.rate >= 30 ? 'bg-orange-400' : 'bg-red-400'
                    }`}
                    style={{ width: `${item.rate}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <TrendingUp className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-sm text-gray-500">No conversion data available</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

const InsightsCard = ({ metrics, deals, leads }: { metrics: any, deals: any[], leads: any[] }) => {
  const insights = React.useMemo(() => {
    const insights: string[] = [];
    
    // Lead conversion insights
    const totalLeads = leads.length;
    const convertedLeads = deals.filter(d => d.converted_from_lead_id).length;
    const conversionRate = totalLeads > 0 ? (convertedLeads / totalLeads) * 100 : 0;
    
    if (conversionRate < 15 && totalLeads > 0) {
      insights.push("💡 Consider improving lead qualification - your conversion rate is below 15%");
    } else if (conversionRate > 25) {
      insights.push("🎯 Excellent conversion rate! Consider scaling your lead generation");
    }
    
    // Deal pipeline insights
    const activeDeals = deals.filter(d => d.stage !== 'won' && d.stage !== 'lost');
    const wonDeals = deals.filter(d => d.stage === 'won');
    const avgDealValue = wonDeals.length > 0 ? wonDeals.reduce((sum, d) => sum + (d.value || 0), 0) / wonDeals.length : 0;
    
    if (activeDeals.length > 20) {
      insights.push("⚠️ Large pipeline! Focus on closing high-value deals first");
    }
    
    if (avgDealValue > 100000) {
      insights.push("💰 High-value deals detected - consider offering premium support");
    }
    
    // Lead source insights  
    const leadsBySource = leads.reduce((acc, lead) => {
      const source = lead.source || 'Unknown';
      acc[source] = (acc[source] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    const topSource = Object.entries(leadsBySource).sort(([,a], [,b]) => (b as number) - (a as number))[0];
    if (topSource && (topSource[1] as number) > totalLeads * 0.4 && totalLeads > 5) {
      insights.push(`📈 ${topSource[0]} is your top channel - consider doubling down here`);
    }
    
    // Activity insights
    const newLeadsToday = leads.filter(l => {
      const leadDate = new Date(l.created_at);
      const today = new Date();
      return leadDate.toDateString() === today.toDateString();
    }).length;
    
    if (newLeadsToday > 5) {
      insights.push("🔥 Great lead flow today - make sure to follow up within 24h");
    } else if (newLeadsToday === 0 && leads.length > 0) {
      insights.push("🎯 No new leads today - time to boost marketing efforts");
    }
    
    return insights.slice(0, 4); // Max 4 insights
  }, [metrics, deals, leads]);

  return (
    <Card className="h-full bg-gradient-to-br from-purple-50 to-blue-50 border border-purple-100">
      <CardHeader className="p-4 border-b border-purple-100">
        <CardTitle className="text-base font-semibold text-gray-800 flex items-center">
          <TrendingUp className="h-5 w-5 text-purple-500 mr-3" />
          AI Insights
        </CardTitle>
      </CardHeader>
      <CardContent className="p-4">
        {insights.length > 0 ? (
          <div className="space-y-3">
            {insights.map((insight, index) => (
              <div key={index} className="flex items-start space-x-2 p-3 bg-white/60 rounded-lg border border-purple-100">
                <div className="flex-grow">
                  <p className="text-sm text-gray-700">{insight}</p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <TrendingUp className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-sm text-gray-500">Analyzing your data for insights...</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

// --- RecentActivityCard Component ---
const RecentActivityCard = ({ activities }: { activities: any[] }) => { 
    const [showAll, setShowAll] = React.useState(false);
    const displayedActivities = showAll ? activities : activities.slice(0, 5);
    
    
    const getActivityIcon = (activity: any) => { 
        const { type, action_type } = activity;
        
        // Icon based on action type for more specific representation
        if (action_type) {
            switch (action_type) {
                case 'deal_created': return <Target className="h-4 w-4 text-blue-500" />;
                case 'deal_updated': return <Target className="h-4 w-4 text-blue-600" />;
                case 'deal_deleted': return <Target className="h-4 w-4 text-red-500" />;
                case 'deal_stage_changed': return <Target className="h-4 w-4 text-purple-500" />;
                case 'deal_value_changed': return <Target className="h-4 w-4 text-green-500" />;
                
                case 'task_created': return <CheckSquare className="h-4 w-4 text-green-500" />;
                case 'task_updated': return <CheckSquare className="h-4 w-4 text-green-600" />;
                case 'task_deleted': return <CheckSquare className="h-4 w-4 text-red-500" />;
                case 'task_completed': return <CheckSquare className="h-4 w-4 text-green-700" />;
                case 'task_status_changed': 
                case 'task_moved': return <CheckSquare className="h-4 w-4 text-orange-500" />;
                
                // Lead activities
                case 'lead_created': return <UserPlus className="h-4 w-4 text-teal-500" />;
                case 'lead_updated': return <UserPlus className="h-4 w-4 text-teal-600" />;
                case 'lead_deleted': return <UserPlus className="h-4 w-4 text-red-500" />;
                case 'lead_status_changed': return <UserPlus className="h-4 w-4 text-orange-500" />;
                case 'lead_converted': return <ArrowRight className="h-4 w-4 text-green-500" />;
                
                default: break;
            }
        }
        
        // Fallback to entity type
        switch (type || activity.entity_type) { 
            case 'deal': return <Target className="h-4 w-4 text-blue-500" />; 
            case 'task': return <CheckSquare className="h-4 w-4 text-green-500" />; 
            case 'lead': return <UserPlus className="h-4 w-4 text-teal-500" />;
            default: return <Activity className="h-4 w-4 text-gray-500" />; 
        } 
    }; 
    
    // Determine the correct link based on the activity type
    const getActivityLink = (activity: any) => {
        const entityType = activity.type || activity.entity_type;
        
        if (entityType === 'deal') {
            return `/dashboard/deals/${activity.entity_id || activity.id}`;
        }
        if (entityType === 'task') {
            return `/dashboard/tasks`; // Can be updated to link to a specific task later
        }
        if (entityType === 'lead') {
            return `/dashboard/leads`;
        }
        return '/dashboard'; // Fallback link
    };

    return ( 
        <Card className="h-full bg-white border border-gray-100 shadow-sm flex flex-col">
            <CardHeader className="p-4 border-b">
                <CardTitle className="text-base font-semibold text-gray-800 flex items-center justify-between">
                    <div className="flex items-center">
                        <Activity className="h-5 w-5 text-gray-500 mr-3" />
                        Recent Activity
                    </div>
                    {activities.length > 5 && (
                        <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={() => setShowAll(!showAll)}
                            className="text-blue-600 hover:text-blue-700 border-blue-200 hover:bg-blue-50 text-xs px-3 py-1"
                        >
                            {showAll ? 'View Less' : `View More (${activities.length - 5})`}
                        </Button>
                    )}
                </CardTitle>
            </CardHeader>
            <CardContent className="p-4 flex-grow overflow-y-auto">
                {activities.length > 0 ? ( 
                    <ul className="space-y-2">
                        {displayedActivities.map((activity, index) => ( 
                            <li key={`activity-${activity.type}-${activity.id}-${activity.created_at}-${index}`}>
                                <Link href={getActivityLink(activity)} className="block p-2 rounded-md hover:bg-gray-100 transition-colors">
                                    <div className="flex items-start space-x-3">
                                        <div className="flex-shrink-0 mt-1">{getActivityIcon(activity)}</div>
                                        <div className="flex-grow">
                                            <p className="text-sm font-medium text-gray-800">{activity.description}</p>
                                            <p className="text-xs text-gray-500">{formatDistanceToNow(new Date(activity.created_at), { addSuffix: true })}</p>
                                        </div>
                                    </div>
                                </Link>
                            </li> 
                        ))}
                    </ul> 
                ) : ( 
                    <div className="text-center py-10 h-full flex flex-col justify-center items-center">
                        <Activity className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                        <p className="text-sm text-gray-500 font-medium">No recent activity</p>
                    </div> 
                )}
            </CardContent>
        </Card> 
    ); 
};

export default function DashboardPage() {
  console.log('🏁 Dashboard: Component rendering...');
  const supabase = createClient();
  
  // Force immediate debug to check if component is working
  console.log('🔥 Dashboard: Component instantiated');
  const { dateRange, selectedUserId, selectedChannel, setDateRange, setSelectedUserId, setSelectedChannel } = useFilterStore();
  const [userProfile, setUserProfile] = useState<any | null>(null);
  const [teamMembers, setTeamMembers] = useState<any[]>([]);
  const [allDeals, setAllDeals] = useState<any[]>([]);
  const [allOverdueTasks, setAllOverdueTasks] = useState<any[]>([]);
  const [allUpcomingAgenda, setAllUpcomingAgenda] = useState<any[]>([]);
  const [allUpcomingTasks, setAllUpcomingTasks] = useState<any[]>([]);
  // Initialize leads state
  const [allLeads, setAllLeads] = useState<any[]>([]);
  const [leadMagnetNames, setLeadMagnetNames] = useState<{[key: string]: string}>({});
  const [recentActivities, setRecentActivities] = useState<any[]>([]);
  const [agendaItems, setAgendaItems] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Simple test to verify client-side execution
  useEffect(() => {
    setTimeout(() => {
      console.log('⚡ DASHBOARD CLIENT SIDE IS WORKING - TIMEOUT EXECUTED');
    }, 1000);
  }, []);

  useEffect(() => {
    console.log('🎯 Dashboard: useEffect triggered - ENTRY POINT');
    console.log('🎯 Dashboard: useEffect DEFINITELY RUNNING - NEW TEST');
    // Start notification monitoring
    const stopNotificationMonitoring = startNotificationMonitoring()
    
    const loadInitialData = async () => {
      try {
        console.log('🚀 Dashboard: Starting data load...');
        setIsLoading(true);
        console.log('🚀 Dashboard: About to call getUser()...');
        const { user, needsSignIn } = await getUser();
        console.log('🚀 Dashboard: getUser() completed:', { userId: user?.id, needsSignIn });
      if (needsSignIn || !user) { 
        setIsLoading(false); 
        if (needsSignIn) {
          window.location.href = '/auth/sign-in';
        }
        return; 
      }
      const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single();
      
      // Admin users can now access the sales dashboard
      // They will have an Admin Panel button to navigate to admin features
      
      setUserProfile(profile);

      // Use APIs with proper org filtering instead of direct queries
      console.log('🔄 Dashboard: Fetching data from APIs with org filtering...');
      
      // Fetch deals from API
      const dealsApiResponse = await fetch('/api/deals');
      const dealsApiData = await dealsApiResponse.json();
      console.log('📊 Dashboard: Deals API response:', {
        count: dealsApiData.deals?.length || 0
      });
      
      // Fetch leads from API
      const leadsApiResponse = await fetch('/api/leads');
      const leadsApiData = await leadsApiResponse.json();
      console.log('📊 Dashboard: Leads API response:', {
        count: leadsApiData.leads?.length || 0,
        total: leadsApiData.total || 0
      });
      
      // Fetch tasks from API
      const tasksApiResponse = await fetch('/api/tasks');
      const tasksApiData = await tasksApiResponse.json();
      console.log('📊 Dashboard: Tasks API response:', {
        count: tasksApiData.tasks?.length || 0
      });
      // Process tasks data for different views
      const allTasks = tasksApiData.tasks || [];
      const today = new Date();
      today.setHours(0, 0, 0, 0); // Start of today
      const todayString = format(today, 'yyyy-MM-dd');
      const next5DaysString = format(addDays(today, 5), 'yyyy-MM-dd');
      
      // Filter tasks for different views
      const overdueTasks = allTasks.filter((task: any) => {
        if (!task.date || task.status === 'completed') return false;
        const taskDate = new Date(task.date);
        taskDate.setHours(0, 0, 0, 0);
        // Task is overdue if its date is before today
        return taskDate < today;
      });
      
      const upcomingAgenda = allTasks.filter((task: any) => 
        task.date && task.date >= todayString && task.status !== 'completed'
      ).slice(0, 20); // Show more agenda items
      
      const upcomingTasks = allTasks.filter((task: any) => 
        task.date && task.date >= todayString && ['pending', 'in_progress'].includes(task.status)
      ).slice(0, 10); // Show more tasks
      
      console.log('🔥 TASK FILTERING DEBUG:', {
        totalTasks: allTasks.length,
        todayString,
        today: today.toISOString(),
        next5DaysString,
        allTasksWithDates: allTasks.filter((t: any) => t.date).length,
        allTasksWithStatus: allTasks.map((t: any) => ({ id: t.id, title: t.title, date: t.date, status: t.status })),
        overdueTasksCount: overdueTasks.length,
        overdueTasks: overdueTasks.map((t: any) => ({ id: t.id, title: t.title, date: t.date, status: t.status })),
        upcomingAgendaFiltered: upcomingAgenda.length,
        upcomingTasksFiltered: upcomingTasks.length
      });
      
      console.log('📅 DASHBOARD DEBUG:', {
        totalTasks: allTasks.length,
        upcomingAgenda: upcomingAgenda.length,
        upcomingTasks: upcomingTasks.length,
        todayString,
        next5DaysString,
        userRole: profile?.role,
        userId: user.id
      });
      
      
      // Get activity logs with org filtering
      console.log('🔍 [ACTIVITY LOGS] About to query activity logs for user:', user.id, 'with profile role:', profile?.role);
      let activityLogsQuery = supabase.from('activity_logs').select('*').order('created_at', { ascending: false }).limit(20);
      
      // TEMPORARY FIX: Force org_id filtering for this specific user since profile update didn't work
      const CORRECT_ORG_ID = '8a6b275c-4265-4c46-a680-8cd4b78f14db';
      if (user.id === '1b0bfda8-d888-4ceb-8170-5cfc156f3277') {
        activityLogsQuery = activityLogsQuery.eq('org_id', CORRECT_ORG_ID);
        console.log('🔍 [ACTIVITY LOGS] TEMP FIX: Filtering by correct org_id:', CORRECT_ORG_ID);
      } else if (profile?.org_id) {
        // Filter activity logs by org_id if available
        activityLogsQuery = activityLogsQuery.eq('org_id', profile.org_id);
      } else if (profile?.role === 'sales') {
        activityLogsQuery = activityLogsQuery.eq('user_id', user.id);
      }
      
      if (profile?.role === 'owner' || profile?.role === 'admin') {
        // Get team members from same organization
        const { data: team } = await supabase
          .from('profiles')
          .select('id, first_name, last_name')
          .eq('org_id', profile.org_id);
        setTeamMembers(team || []);
      }
      
      const { data: activityLogs, error: activityLogsError } = await activityLogsQuery;
      
      console.log('🔍 [ACTIVITY LOGS] Query executed:', {
        activityLogsCount: activityLogs?.length || 0,
        error: activityLogsError,
        userId: user.id,
        first3Activities: activityLogs?.slice(0, 3).map(a => ({
          description: a.description,
          created_at: a.created_at
        }))
      });
      
      // Debug logging for dashboard data fetching
      console.log('🔍 Dashboard Data Fetch Results:', {
        dealsCount: dealsApiData.deals?.length || 0,
        leadsCount: leadsApiData.leads?.length || 0,
        tasksCount: allTasks.length,
        overdueTasksCount: overdueTasks.length
      });
      
      console.log('🔥 SETTING STATE:', {
        dealsCount: dealsApiData.deals?.length || 0,
        leadsCount: leadsApiData.leads?.length || 0,
        overdueTasksCount: overdueTasks.length,
        upcomingAgendaCount: upcomingAgenda.length,
        upcomingTasksCount: upcomingTasks.length
      });
      
      setAllDeals(dealsApiData.deals || []);
      setAllLeads(leadsApiData.leads || []);
      setAllOverdueTasks(overdueTasks);
      setAllUpcomingAgenda(upcomingAgenda);
      setAllUpcomingTasks(upcomingTasks);
      
      console.log('🔥 STATE SET COMPLETE - checking state after set');
      
      // Force a debug after state is set
      setTimeout(() => {
        console.log('🔥 STATE CHECK AFTER TIMEOUT:', {
          allDealsLength: allDeals.length,
          allLeadsLength: allLeads.length
        });
      }, 100);
      
      // Fetch lead magnet names for better source display
      try {
        const { data: magnets } = await supabase
          .from('lead_magnets')
          .select('slug, title');
        
        if (magnets) {
          const nameMapping: {[key: string]: string} = {};
          magnets.forEach(magnet => {
            if (magnet.slug) {
              nameMapping[magnet.slug] = magnet.title;
            }
          });
          setLeadMagnetNames(nameMapping);
        }
      } catch (error) {
        console.error('Error fetching lead magnet names:', error);
      }
      
      // Use activity logs fetched above
      const activityLogsData = activityLogs || [];
      
      console.log('🔍 ACTIVITY LOGS DEBUG:', {
        activityLogsCount: activityLogsData.length,
        sampleLogs: activityLogsData.slice(0, 3).map(log => ({
          id: log?.id,
          entity_type: log?.entity_type,
          action_type: log?.action_type,
          description: log?.description,
          created_at: log?.created_at
        }))
      });
      
      let combinedActivities: any[] = [];
      
      if (activityLogsData && activityLogsData.length > 0) {
        // Filter out invalid or incomplete activities
        combinedActivities = activityLogsData
          .filter(log => 
            log && 
            log.description && 
            log.created_at && 
            log.user_id &&
            log.entity_type &&
            log.action_type
          )
          .map(log => ({
            id: log.entity_id || log.id,
            type: log.entity_type,
            description: log.description,
            created_at: log.created_at,
            user_id: log.user_id,
            action_type: log.action_type
          }))
          // Remove duplicates based on description and timestamp
          .filter((activity, index, self) => 
            index === self.findIndex(a => 
              a.description === activity.description && 
              a.created_at === activity.created_at &&
              a.user_id === activity.user_id
            )
          );
      } else {
        // Fallback: Create basic activities from recent deals and tasks
        const recentDeals = (dealsApiData.deals || []).slice(0, 5);
        const recentTasks = (upcomingTasks || []).slice(0, 5);
        
        const dealActivities = recentDeals.map((deal: any) => ({
          id: deal.id,
          type: 'deal',
          description: `Deal "${deal.title}" was created`,
          created_at: deal.created_at,
          user_id: deal.user_id,
          action_type: 'deal_created'
        }));
        
        const taskActivities = recentTasks.map((task: any) => ({
          id: task.id,
          type: 'task',
          description: `Task "${task.title}" was created`,
          created_at: task.created_at,
          user_id: task.user_id,
          action_type: 'task_created'
        }));
        
        combinedActivities = [...dealActivities, ...taskActivities];
      }
      
      // Sort and limit activities
      combinedActivities = combinedActivities
        .sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        .slice(0, 15);
      
      console.log('🔍 FINAL ACTIVITIES DEBUG:', {
        combinedActivitiesCount: combinedActivities.length,
        firstActivity: combinedActivities[0]?.description,
        allDescriptions: combinedActivities.map(a => a.description)
      });
      
      setRecentActivities(combinedActivities);
      
        setIsLoading(false);
        console.log('✅ Dashboard: Data load completed successfully');
      } catch (error) {
        console.error('❌ Dashboard: Error loading data:', error);
        setIsLoading(false);
      }
    };
    
    console.log('🎯 Dashboard: About to call loadInitialData()...');
    loadInitialData().catch(error => {
      console.error('🚨 Dashboard: loadInitialData failed:', error);
      setIsLoading(false);
    });
    
    // Cleanup function
    return () => {
      stopNotificationMonitoring()
    }
  }, []);

  const uniqueChannels = React.useMemo(() => { 
    const normalizeChannel = (channel: string) => {
      if (!channel) return '';
      // Check if it's a lead magnet source and clean it up
      if (channel.toLowerCase().includes('lead-form') || channel.includes('-copy-')) {
        // Clean up lead magnet names
        return channel.split('-copy-')[0]
          .replace(/[-_]/g, ' ')
          .replace(/\b\w/g, l => l.toUpperCase());
      }
      // Convert to proper case
      return channel.toLowerCase().split(' ').map((word: string) => 
        word.charAt(0).toUpperCase() + word.slice(1)
      ).join(' ');
    };
    
    // Get channels from both deals and leads to show all actual sources
    const dealsChannels = allDeals.map(deal => deal.channel).filter(Boolean);
    const leadsChannels = allLeads.map(lead => lead.source).filter(Boolean);
    
    // Combine and normalize all channels
    const allSourcesSet = new Set([
      ...dealsChannels.map(normalizeChannel),
      ...leadsChannels.map(normalizeChannel)
    ]);
    
    // Remove empty strings and sort
    return Array.from(allSourcesSet).filter(channel => channel.length > 0).sort(); 
  }, [allDeals, allLeads]);
  
  const filteredData = React.useMemo(() => {
    console.log('🔥 FILTERED DATA RECALCULATION TRIGGERED');
    console.log('🔍 FILTERED DATA DEBUG - START:', {
      allDealsCount: allDeals.length,
      allLeadsCount: allLeads.length,
      allLeadsFirst3: allLeads.slice(0, 3).map(l => ({ id: l.id, source: l.source, created_at: l.created_at })),
      dateRangeFrom: dateRange?.from,
      dateRangeTo: dateRange?.to,
      selectedUserId,
      selectedChannel,
      userProfileRole: userProfile?.role
    });
    
    let deals = allDeals;
    let leads = allLeads;
    let overdueTasks = allOverdueTasks;
    let upcomingAgenda = allUpcomingAgenda;
    let upcomingTasks = allUpcomingTasks;
    let activities = recentActivities;
    console.log('🔍 ACTIVITIES FILTERING DEBUG:', {
      originalActivitiesCount: recentActivities.length,
      userProfile: userProfile?.role,
      selectedUserId
    });
    
    if (userProfile) {
      if (userProfile.role !== 'sales' && selectedUserId !== 'all') {
        deals = deals.filter(d => d.user_id === selectedUserId);
        leads = leads.filter(l => l.user_id === selectedUserId);
        overdueTasks = overdueTasks.filter(t => t.user_id === selectedUserId);
        upcomingAgenda = upcomingAgenda.filter(a => a.user_id === selectedUserId);
        upcomingTasks = upcomingTasks.filter(t => t.user_id === selectedUserId);
        activities = activities.filter(a => a.user_id === selectedUserId);
        
        console.log('🔍 ACTIVITIES AFTER USER FILTER:', {
          filteredActivitiesCount: activities.length,
          selectedUserId,
          sampleActivity: activities[0]
        });
      }
      // For sales users, DON'T filter leads by user_id to include unassigned lead magnet leads
      // This ensures lead magnet submissions appear in sales dashboard metrics
    }
    if (selectedChannel !== 'all') {
      // Case-insensitive matching for channels
      deals = deals.filter(d => {
        if (!d.channel) return false;
        const normalizedDealChannel = d.channel.toLowerCase().split(' ').map((word: string) => 
          word.charAt(0).toUpperCase() + word.slice(1)
        ).join(' ');
        return normalizedDealChannel === selectedChannel;
      });
      leads = leads.filter(l => {
        if (!l.source) return false;
        const normalizedLeadSource = l.source.toLowerCase().split(' ').map((word: string) => 
          word.charAt(0).toUpperCase() + word.slice(1)
        ).join(' ');
        return normalizedLeadSource === selectedChannel;
      });
    }
    const dealsFilteredByDate = dateRange?.from
      ? deals.filter(deal => {
          const dealDate = new Date(deal.created_at);
          const fromDate = dateRange.from!;
          const toDate = dateRange.to || fromDate;
          const toDateEndOfDay = new Date(toDate);
          toDateEndOfDay.setHours(23, 59, 59, 999);
          return dealDate >= fromDate && dealDate <= toDateEndOfDay;
        })
      : deals;
    const leadsFilteredByDate = dateRange?.from
      ? leads.filter(lead => {
          const leadDate = new Date(lead.created_at);
          const fromDate = dateRange.from!;
          const toDate = dateRange.to || fromDate;
          const toDateEndOfDay = new Date(toDate);
          toDateEndOfDay.setHours(23, 59, 59, 999);
          console.log('🔍 DATE FILTER DEBUG:', {
            leadId: lead.id,
            leadCreatedAt: lead.created_at,
            leadDate: leadDate,
            fromDate: fromDate,
            toDate: toDate,
            isValid: leadDate >= fromDate && leadDate <= toDateEndOfDay
          });
          return leadDate >= fromDate && leadDate <= toDateEndOfDay;
        })
      : leads;
    return { deals, leads, overdueTasks, upcomingAgenda, upcomingTasks, activities, dealsFilteredByDate, leadsFilteredByDate };
  }, [userProfile, selectedUserId, selectedChannel, dateRange, allDeals, allLeads, allOverdueTasks, allUpcomingAgenda, allUpcomingTasks, recentActivities, leadMagnetNames]);

  useEffect(() => { 
    // Process upcoming agenda items (already sorted by date and time)
    const processedAgenda = filteredData.upcomingAgenda.map(item => ({
      ...item,
      type: item.type === 'meeting' ? 'appointment' : 'task'
    }));
    setAgendaItems(processedAgenda); 
  }, [filteredData.upcomingAgenda]);
  
  const metrics = React.useMemo(() => {
    console.log('🎯 METRICS CALCULATION TRIGGERED');
    const dealsForMetrics = filteredData.dealsFilteredByDate;
    const leadsForMetrics = filteredData.leadsFilteredByDate;
    const allFilteredDeals = filteredData.deals;
    const allFilteredLeads = filteredData.leads;
    
    console.log('🎯 METRICS CALCULATION DATA:', {
      dealsForMetricsCount: dealsForMetrics.length,
      leadsForMetricsCount: leadsForMetrics.length,
      allFilteredDealsCount: allFilteredDeals.length,
      allFilteredLeadsCount: allFilteredLeads.length
    });
    const openDeals = dealsForMetrics.filter(d => d.stage !== 'won' && d.stage !== 'lost');
    const openDealsValue = openDeals.reduce((sum, d) => sum + d.value, 0);
    const wonDeals = dealsForMetrics.filter(d => d.stage === 'won');
    const lostDeals = dealsForMetrics.filter(d => d.stage === 'lost');
    const allOpenDealsForHotDeals = allFilteredDeals.filter(d => d.stage !== 'won' && d.stage !== 'lost');
    const hotDeals = [...allOpenDealsForHotDeals].sort((a, b) => b.value - a.value).slice(0, 5); // Changed to show 5 hot deals
    
    // Deals closing soon (within next 30 days)
    const today = new Date();
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(today.getDate() + 30);
    
    const dealsClosingSoon = allOpenDealsForHotDeals
      .filter(deal => deal.expected_close_date && new Date(deal.expected_close_date) <= thirtyDaysFromNow)
      .sort((a, b) => new Date(a.expected_close_date).getTime() - new Date(b.expected_close_date).getTime())
      .slice(0, 5);
    
    // Lead metrics - For admin/owner, count ALL new leads regardless of assignment
    const isAdminOrOwner = userProfile?.role === 'admin' || userProfile?.role === 'owner';
    const newLeads = isAdminOrOwner 
      ? allLeads.filter(l => l.status === 'new')  // Use unfiltered allLeads for admin/owner
      : leadsForMetrics.filter(l => l.status === 'new');  // Use filtered for sales role
    const qualifiedLeads = allFilteredLeads.filter(l => l.status === 'qualified');
    const convertedLeads = leadsForMetrics.filter(l => l.status === 'converted');
    const highScoreLeads = allFilteredLeads
      .filter(l => l.score >= 50) // Lower threshold for testing
      .sort((a, b) => b.score - a.score)
      .slice(0, 5);
    
    // If no high score leads, show the newest leads
    const topLeads = highScoreLeads.length > 0 ? highScoreLeads : 
      allFilteredLeads
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        .slice(0, 5);
    
    // Channel Analytics Calculations for Deals (for conversion rates) - USE DATE FILTERED DATA
    const channelStats = dealsForMetrics.reduce((acc, deal) => {
      // Normalize channel name to lowercase and capitalize first letter
      let channel = deal.channel || 'Unknown';
      // Convert to lowercase first, then capitalize
      channel = channel.toLowerCase();
      channel = channel.charAt(0).toUpperCase() + channel.slice(1);
      
      if (!acc[channel]) {
        acc[channel] = { total: 0, won: 0, lost: 0 };
      }
      acc[channel].total += 1;
      if (deal.stage === 'won') acc[channel].won += 1;
      if (deal.stage === 'lost') acc[channel].lost += 1;
      return acc;
    }, {} as Record<string, { total: number, won: number, lost: number }>);

    // Lead Source Analytics (for Top 5 Lead Sources) - USE DATE FILTERED DATA
    console.log('🔍 LEAD SOURCE MAPPING DEBUG:', {
      leadMagnetNamesCount: Object.keys(leadMagnetNames).length,
      leadMagnetNames: leadMagnetNames,
      sampleLeadSource: leadsForMetrics[0]?.source,
      totalLeadsForMetrics: leadsForMetrics.length,
      leadWebsiteCount: leadsForMetrics.filter(l => l.source === 'deemmi-lead-form-copy-1756086083827').length
    });
    
    const leadSourceStats = leadsForMetrics.reduce((acc, lead) => {
      // Keep original source name for special cases, normalize others
      let source = lead.source || 'Unknown';
      const originalSource = source;
      
      // Check if it's a lead magnet source
      if (leadMagnetNames[source]) {
        source = leadMagnetNames[source];
      } else if (source === 'deemmi-lead-form') {
        source = 'Deemmi Lead Form';
      } else if (source.toLowerCase() === 'website') {
        source = 'Website';
      } else if (source.toLowerCase() === 'referral') {
        source = 'Referral';
      } else {
        // Default normalization for other sources
        source = source.toLowerCase();
        source = source.charAt(0).toUpperCase() + source.slice(1);
      }
      
      if (originalSource.includes('deemmi-lead-form-copy')) {
        console.log('🔍 LEAD MAGNET SOURCE DEBUG:', {
          originalSource,
          mappedSource: source,
          foundInMapping: !!leadMagnetNames[originalSource]
        });
      }
      
      if (!acc[source]) {
        acc[source] = { total: 0 };
      }
      acc[source].total += 1;
      return acc;
    }, {} as Record<string, { total: number }>);

    // Top 5 Lead Sources Data (using date-filtered leads)
    const topChannelsData = Object.entries(leadSourceStats)
      .map(([source, stats]) => {
        const sourceStats = stats as { total: number };
        return {
          channel: source,
          count: sourceStats.total,
          percentage: leadsForMetrics.length > 0 ? Math.round((sourceStats.total / leadsForMetrics.length) * 100) : 0
        };
      })
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    // Debug logging
    console.log('🔍 Dashboard Metrics Debug:', {
      totalLeads: allLeads.length,
      leadsForMetrics: leadsForMetrics.length,
      newLeadsCount: newLeads.length,
      leadSourceStats,
      topChannelsData,
      allLeadsFirst3: allLeads.slice(0, 3).map(l => ({ 
        status: l.status, 
        source: l.source, 
        email: l.email 
      })),
      newLeadsData: newLeads.map(l => ({ 
        status: l.status, 
        source: l.source, 
        email: l.email 
      }))
    });

    // Conversion Rate by Channel Data
    const conversionData = Object.entries(channelStats)
      .map(([channel, stats]) => {
        const channelStats = stats as { total: number, won: number, lost: number };
        return {
          channel,
          total: channelStats.total,
          won: channelStats.won,
          rate: channelStats.total > 0 ? Math.round((channelStats.won / channelStats.total) * 100) : 0
        };
      })
      .filter(item => item.total > 0) // Only show channels with deals
      .sort((a, b) => b.rate - a.rate)
      .slice(0, 5);
    
    // Calculate monthly revenue from won deals this month
    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();
    
    const monthlyRevenue = allFilteredDeals
      .filter(deal => {
        if (deal.stage !== 'won' || !deal.value) return false;
        
        // Check if deal was won this month (using updated_at as won date)
        const dealDate = new Date(deal.updated_at || deal.created_at);
        return dealDate.getMonth() === currentMonth && dealDate.getFullYear() === currentYear;
      })
      .reduce((total, deal) => total + (deal.value || 0), 0);
    
    // Calculate total pipeline value for admin metrics
    const totalPipelineValue = allFilteredDeals
      .filter(deal => deal.stage !== 'won' && deal.stage !== 'lost')
      .reduce((total, deal) => total + (deal.value || 0), 0);
    
    // Calculate average deal size
    const avgDealSize = allFilteredDeals.length > 0 
      ? allFilteredDeals.reduce((total, deal) => total + (deal.value || 0), 0) / allFilteredDeals.length
      : 0;
    
    // Calculate conversion rate
    const totalLeadsWithOutcome = allFilteredLeads.filter(l => ['converted', 'lost'].includes(l.status));
    const convertedLeadsTotal = allFilteredLeads.filter(l => l.status === 'converted');
    const conversionRate = totalLeadsWithOutcome.length > 0 
      ? Math.round((convertedLeadsTotal.length / totalLeadsWithOutcome.length) * 100)
      : 0;
    
    console.log('🎯 FINAL METRICS CALCULATED:', {
      openDealsValue,
      wonDealsCount: wonDeals.length,
      lostDealsCount: lostDeals.length,
      activeDealsCount: openDeals.length,
      newLeadsCount: newLeads.length,
      qualifiedLeadsCount: qualifiedLeads.length,
      convertedLeadsCount: convertedLeads.length,
      hotDealsCount: hotDeals.length,
      topLeadsCount: topLeads.length
    });
    
    return { 
      openDealsValue, 
      wonDealsCount: wonDeals.length, 
      lostDealsCount: lostDeals.length, 
      activeDealsCount: openDeals.length,
      hotDeals,
      dealsClosingSoon,
      topChannelsData,
      conversionData,
      // Lead metrics
      newLeadsCount: newLeads.length,
      qualifiedLeadsCount: qualifiedLeads.length,
      convertedLeadsCount: convertedLeads.length,
      highScoreLeads: topLeads,
      // Admin business metrics
      monthlyRevenue,
      totalPipelineValue,
      avgDealSize,
      conversionRate
    };
  }, [filteredData.deals, filteredData.leads, filteredData.dealsFilteredByDate, filteredData.leadsFilteredByDate, userProfile, allLeads]);

  // Determine dashboard title based on role
  const getDashboardTitle = () => {
    if (!userProfile) return 'Dashboard';
    switch (userProfile.role) {
      case 'owner':
        return 'Owner Dashboard';
      case 'admin':
        return 'Admin Dashboard';
      case 'sales':
        return 'Sales Dashboard';
      default:
        return 'Dashboard';
    }
  };

  const getDashboardSubtitle = () => {
    if (!userProfile) return 'Your daily action hub';
    switch (userProfile.role) {
      case 'owner':
        return 'Business overview and team performance';
      case 'admin':
        return 'System management and team overview';
      case 'sales':
        return 'Your daily action hub';
      default:
        return 'Your daily action hub';
    }
  };

  if (isLoading) return <div className="flex justify-center items-center h-screen">Loading...</div>;

  return (
    <div className="space-y-4 p-3 md:p-4">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{getDashboardTitle()}</h1>
            <p className="text-gray-600">{getDashboardSubtitle()}</p>
          </div>
          <div className="flex flex-col sm:flex-row items-end sm:items-center gap-2">
            {userProfile && (userProfile.role === 'owner' || userProfile.role === 'admin') && (
              <UserFilter teamMembers={teamMembers} selectedUserId={selectedUserId} onUserChange={setSelectedUserId} />
            )}
            <ChannelFilter channels={uniqueChannels} selectedChannel={selectedChannel} onChannelChange={setSelectedChannel} />
            <DateRangePicker date={dateRange} onDateChange={setDateRange} />
          </div>
        </div>
        
        {/* Industry Benchmarks - Admin/Owner only */}
        {userProfile && (userProfile.role === 'admin' || userProfile.role === 'owner') && (
          <IndustryBanner showBenchmarks={true} />
        )}
        
        {/* KPI Cards - Compact Design */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3">
          <NewLeadsKPIWidget />
          <KpiCard title="Active Deals" value={metrics.activeDealsCount} description="Deals in progress" icon={Briefcase} href="/dashboard/deals?status=active" colorScheme={{ header: 'bg-purple-50', text: 'text-purple-800', icon: 'text-purple-600' }} />
          <KpiCard title="Pipeline Value" value={formatCurrency(metrics.openDealsValue)} description="Active deals value" icon={Target} href="/dashboard/deals" colorScheme={{ header: 'bg-blue-50', text: 'text-blue-800', icon: 'text-blue-600' }} />
          <KpiCard title="Deals Won" value={metrics.wonDealsCount} description="Closed this period" icon={TrendingUp} href="/dashboard/deals?status=won" colorScheme={{ header: 'bg-green-50', text: 'text-green-700', icon: 'text-green-500' }} />
          <KpiCard title="Overdue Tasks" value={filteredData.overdueTasks.length} description="Need attention" icon={AlertTriangle} href="/dashboard/tasks?status=overdue" colorScheme={{ header: 'bg-orange-50', text: 'text-orange-800', icon: 'text-orange-600' }} />
        </div>

        {/* ADMIN-SPECIFIC WIDGETS - Only for Admin role - MOVED TO TOP PRIORITY */}
        {userProfile?.role === 'admin' && (
          <>
            <div className="mb-6">
              <h2 className="text-xl font-semibold text-gray-800 mb-4">Team Performance & Business Intelligence</h2>
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <Card className="p-6">
                  <h3 className="text-lg font-semibold text-gray-800 mb-4">Sales Team Overview</h3>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Active Sales Reps</span>
                      <span className="font-semibold text-gray-800">{teamMembers.filter(m => m.role === 'sales').length}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Total Pipeline</span>
                      <span className="font-semibold text-green-600">{formatCurrency(metrics.totalPipelineValue)}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Avg. Deal Size</span>
                      <span className="font-semibold text-blue-600">{formatCurrency(metrics.avgDealSize)}</span>
                    </div>
                  </div>
                </Card>

                <Card className="p-6">
                  <h3 className="text-lg font-semibold text-gray-800 mb-4">Lead Generation</h3>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">New Leads Today</span>
                      <span className="font-semibold text-teal-600">{metrics.newLeadsCount || 0}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Conversion Rate</span>
                      <span className="font-semibold text-purple-600">{metrics.conversionRate || 0}%</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Qualified Leads</span>
                      <span className="font-semibold text-orange-600">{metrics.qualifiedLeadsCount || 0}</span>
                    </div>
                  </div>
                </Card>

                <Card className="p-6">
                  <h3 className="text-lg font-semibold text-gray-800 mb-4">Business Health</h3>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Deals Won This Month</span>
                      <span className="font-semibold text-green-600">{metrics.wonDealsCount || 0}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Revenue This Month</span>
                      <span className="font-semibold text-green-600">{formatCurrency(metrics.monthlyRevenue)}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Active Deals</span>
                      <span className="font-semibold text-blue-600">{metrics.activeDealsCount || 0}</span>
                    </div>
                  </div>
                </Card>
              </div>
            </div>
          </>
        )}


        {/* Lead Management & Action Cards - Only for non-sales/non-admin roles */}
        {userProfile?.role !== 'sales' && userProfile?.role !== 'admin' && (
          <>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <TopLeadsCard leads={metrics.highScoreLeads} />
                <HotDealsCard deals={metrics.hotDeals} />
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <UpcomingAgendaCard agendaItems={agendaItems} />
                <UpcomingTasksCard tasks={filteredData.upcomingTasks} overdueTasks={filteredData.overdueTasks} />
            </div>
          </>
        )}

        {/* SALES DASHBOARD LAYOUT - For Sales role and Admin viewing sales dashboard */}
        {(userProfile?.role === 'sales' || userProfile?.role === 'admin') && (
          <>
            {/* Row 2: Analytics & Forecast (3 columns) - MOVED UP */}
            <div className="mb-6">
              <h2 className="text-xl font-semibold text-gray-800 mb-4">Analytics & Forecast</h2>
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <SalesForecastWidget 
                  dateRange={dateRange?.from ? { from: dateRange.from, to: dateRange.to } : undefined} 
                  key={`forecast-${allDeals.length}-${allDeals.map(d => d.stage).join('-')}`}
                />
                <SalesKPIWidget 
                  dateRange={dateRange?.from ? { from: dateRange.from, to: dateRange.to } : undefined} 
                />
                <MyCommissionWidget />
              </div>
            </div>

            {/* Row 3: Action Items (3 columns) */}
            <div className="mb-6">
              <h2 className="text-xl font-semibold text-gray-800 mb-4">Action Items</h2>
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <UpcomingTasksCard tasks={filteredData.upcomingTasks} overdueTasks={filteredData.overdueTasks} />
                <UpcomingAgendaCard agendaItems={agendaItems} />
                <DealsClosingSoonCard deals={metrics.dealsClosingSoon} />
              </div>
            </div>

            {/* Row 4: Performance & Opportunities (3 columns) */}
            <div className="mb-6">
              <h2 className="text-xl font-semibold text-gray-800 mb-4">Performance & Opportunities</h2>
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <TopLeadsCard leads={metrics.highScoreLeads} />
                <HotDealsCard deals={metrics.hotDeals} />
                <MyRecentWinsWidget />
              </div>
            </div>

            {/* Row 5: Lead Sources & Channel Analytics (2 columns) */}
            <div className="mb-6">
              <h2 className="text-xl font-semibold text-gray-800 mb-4">Lead & Channel Analytics</h2>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <TopChannelsChart channelData={metrics.topChannelsData} leadMagnetNames={leadMagnetNames} />
                <ConversionByChannelChart conversionData={metrics.conversionData} />
              </div>
            </div>

            {/* Row 6: Recent Activity (Full width) */}
            <div className="mb-6">
              <h2 className="text-xl font-semibold text-gray-800 mb-4">Recent Activity</h2>
              <div className="grid grid-cols-1 gap-6">
                <RecentActivityCard activities={filteredData.activities} />
              </div>
            </div>
          </>
        )}
        
        {/* COMMISSION TRACKING - Admin/Owner only */}
        {userProfile && (userProfile.role === 'admin' || userProfile.role === 'owner') && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <MyCommissionWidget />
          </div>
        )}

        {/* Recent Activity for non-sales/non-admin roles only */}
        {userProfile?.role !== 'sales' && userProfile?.role !== 'admin' && (
          <div className="grid grid-cols-1 gap-6">
              <RecentActivityWidget />
          </div>
        )}

      </div>
  );
}