'use client'

import React, { useState, useEffect, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import PageHeader from '@/components/page-header'
import { differenceInDays, format, subMonths, startOfMonth } from 'date-fns'
import { TrendingUp, DollarSign, Clock, Target } from 'lucide-react'

const formatCurrency = (amount: number) => `฿${amount.toLocaleString()}`;

export default function ConversionReportPage() {
  const [deals, setDeals] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const supabase = createClient();
    const fetchData = async () => {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('deals')
        .select(`*, assigned_user:profiles(first_name, last_name)`);
      
      if (error) {
        console.error("Error fetching data for report:", error);
        alert(`Failed to load report data: ${error.message}`);
      } else {
        setDeals(data || []);
      }
      setIsLoading(false);
    };
    fetchData();
  }, []);

  // --- METRIC CALCULATIONS ---
  const wonDeals = deals.filter(d => d.stage === 'won');
  const lostDeals = deals.filter(d => d.stage === 'lost');
  const totalClosed = wonDeals.length + lostDeals.length;
  const overallConversionRate = totalClosed > 0 ? (wonDeals.length / totalClosed) * 100 : 0;
  const avgDealSizeWon = wonDeals.length > 0 ? wonDeals.reduce((sum, d) => sum + d.value, 0) / wonDeals.length : 0;
  
  const avgTimeToClose = useMemo(() => {
    if (wonDeals.length === 0) return 0;
    const totalDays = wonDeals.reduce((sum, d) => {
        if (!d.created_at || !d.updated_at) return sum;
        return sum + differenceInDays(new Date(d.updated_at), new Date(d.created_at));
    }, 0);
    return totalDays / wonDeals.length;
  }, [wonDeals]);


  // --- CHART DATA (Last 6 Months) ---
  const chartData = useMemo(() => {
    const monthlyStats: { [key: string]: { won: number, lost: number } } = {};
    const sixMonthsAgo = startOfMonth(subMonths(new Date(), 5));

    deals.forEach(deal => {
      const dealDate = new Date(deal.updated_at);
      if ((deal.stage === 'won' || deal.stage === 'lost') && dealDate >= sixMonthsAgo) {
        const monthKey = format(dealDate, 'MMM yyyy');
        if (!monthlyStats[monthKey]) monthlyStats[monthKey] = { won: 0, lost: 0 };
        if (deal.stage === 'won') monthlyStats[monthKey].won++;
        if (deal.stage === 'lost') monthlyStats[monthKey].lost++;
      }
    });

    return Object.entries(monthlyStats).map(([name, values]) => ({
      name,
      'Conversion Rate': ((values.won / (values.won + values.lost)) * 100),
    }));
  }, [deals]);

  // --- TABLE DATA ---
  const performanceByStaff = useMemo(() => {
    const staffStats: { [key: string]: { name: string, total: number, won: number } } = {};
    deals.forEach(deal => {
      const name = deal.assigned_user ? `${deal.assigned_user.first_name} ${deal.assigned_user.last_name}`.trim() : 'Unassigned';
      if (!staffStats[name]) staffStats[name] = { name, total: 0, won: 0 };
      if (deal.stage === 'won' || deal.stage === 'lost') staffStats[name].total++;
      if (deal.stage === 'won') staffStats[name].won++;
    });
    return Object.values(staffStats).map(s => ({ ...s, rate: s.total > 0 ? (s.won / s.total) * 100 : 0 }));
  }, [deals]);
  
  const performanceByChannel = useMemo(() => {
    const channelStats: { [key: string]: { name: string, total: number, won: number } } = {};
    deals.forEach(deal => {
        const channel = deal.channel || 'Unknown';
        if (!channelStats[channel]) channelStats[channel] = { name: channel, total: 0, won: 0 };
        if (deal.stage === 'won' || deal.stage === 'lost') channelStats[channel].total++;
        if (deal.stage === 'won') channelStats[channel].won++;
    });
    return Object.values(channelStats).map(s => ({ ...s, rate: s.total > 0 ? (s.won / s.total) * 100 : 0 }));
  }, [deals]);


  if (isLoading) return <div>Loading Report...</div>;

  return (
    <>
      <PageHeader title="Conversion Rate Report" description="Analyze your sales performance and conversion metrics." />
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="bg-white border border-gray-100 shadow-lg hover:shadow-xl transition-shadow">
            <CardHeader className="bg-green-50 -mx-6 -mt-6 mb-6 px-6 pt-6 pb-4 border-b border-green-100">
              <CardTitle className="text-sm font-medium text-green-700 flex items-center w-full">
                <div className="p-2 bg-white rounded-full shadow-sm mr-3">
                  <TrendingUp className="w-4 h-4 text-green-600" />
                </div>
                Overall Conversion Rate
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4 pb-6">
              <p className="text-4xl font-bold text-[#333333] mb-1">{overallConversionRate.toFixed(1)}%</p>
              <p className="text-xs text-gray-600">of total deals won</p>
            </CardContent>
          </Card>
          
          <Card className="bg-white border border-gray-100 shadow-lg hover:shadow-xl transition-shadow">
            <CardHeader className="bg-blue-50 -mx-6 -mt-6 mb-6 px-6 pt-6 pb-4 border-b border-blue-100">
              <CardTitle className="text-sm font-medium text-blue-700 flex items-center w-full">
                <div className="p-2 bg-white rounded-full shadow-sm mr-3">
                  <DollarSign className="w-4 h-4 text-blue-600" />
                </div>
                Average Deal Size (Won)
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4 pb-6">
              <p className="text-4xl font-bold text-[#333333] mb-1">{formatCurrency(avgDealSizeWon)}</p>
              <p className="text-xs text-gray-600">per successful deal</p>
            </CardContent>
          </Card>
          
          <Card className="bg-white border border-gray-100 shadow-lg hover:shadow-xl transition-shadow">
            <CardHeader className="bg-purple-50 -mx-6 -mt-6 mb-6 px-6 pt-6 pb-4 border-b border-purple-100">
              <CardTitle className="text-sm font-medium text-purple-700 flex items-center w-full">
                <div className="p-2 bg-white rounded-full shadow-sm mr-3">
                  <Clock className="w-4 h-4 text-purple-600" />
                </div>
                Average Time to Close
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4 pb-6">
              <p className="text-4xl font-bold text-[#333333] mb-1">{avgTimeToClose.toFixed(1)} days</p>
              <p className="text-xs text-gray-600">from creation to close</p>
            </CardContent>
          </Card>
        </div>

        <Card className="bg-white border border-gray-100 shadow-lg">
          <CardHeader className="bg-blue-50 -mx-6 -mt-6 mb-6 px-6 pt-6 pb-4 border-b border-blue-100">
            <CardTitle className="flex items-center space-x-3 text-xl text-blue-700 w-full">
              <div className="p-2 bg-white rounded-full shadow-sm">
                <TrendingUp className="w-5 h-5 text-blue-600" />
              </div>
              <span>Conversion Rate Trend (Last 6 Months)</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6 bg-white">
            <div style={{ width: '100%', height: 400 }}>
              <ResponsiveContainer>
                <LineChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
                  <CartesianGrid strokeDasharray="2 2" stroke="#e5e7eb" strokeOpacity={0.6} />
                  <XAxis 
                    dataKey="name" 
                    tick={{ fontSize: 12, fill: '#6b7280' }}
                    tickLine={{ stroke: '#d1d5db' }}
                    axisLine={{ stroke: '#d1d5db' }}
                  />
                  <YAxis 
                    unit="%" 
                    domain={[0, 100]}
                    tick={{ fontSize: 12, fill: '#6b7280' }}
                    tickLine={{ stroke: '#d1d5db' }}
                    axisLine={{ stroke: '#d1d5db' }}
                  />
                  <Tooltip 
                    formatter={(value) => [`${Number(value).toFixed(1)}%`, 'Conversion Rate']}
                    labelStyle={{ color: '#333333', fontWeight: '600' }}
                    contentStyle={{
                      backgroundColor: 'white',
                      border: '1px solid #e5e7eb',
                      borderRadius: '8px',
                      boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
                      fontSize: '14px'
                    }}
                  />
                  <Legend 
                    wrapperStyle={{ paddingTop: '20px' }}
                    iconType="line"
                  />
                  <Line 
                    type="monotone" 
                    dataKey="Conversion Rate" 
                    stroke="#3b82f6" 
                    strokeWidth={4}
                    dot={{ fill: '#3b82f6', strokeWidth: 2, r: 6 }}
                    activeDot={{ r: 10, fill: '#3b82f6', stroke: '#ffffff', strokeWidth: 3 }} 
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="bg-white border border-gray-100 shadow-lg">
              <CardHeader className="bg-green-50 -mx-6 -mt-6 mb-6 px-6 pt-6 pb-4 border-b border-green-100">
                <CardTitle className="flex items-center space-x-3 text-xl text-green-700 w-full">
                  <div className="p-2 bg-white rounded-full shadow-sm">
                    <Target className="w-5 h-5 text-green-600" />
                  </div>
                  <span>Performance by Sales Staff</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6 bg-white">
                <div className="overflow-hidden rounded-xl border border-gray-200 shadow-sm">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-gray-50 border-b border-gray-200">
                        <TableHead className="font-bold text-[#333333] py-5 px-6 text-left">Staff Member</TableHead>
                        <TableHead className="font-bold text-[#333333] py-5 px-6 text-center">Total Closed</TableHead>
                        <TableHead className="font-bold text-[#333333] py-5 px-6 text-center">Won</TableHead>
                        <TableHead className="font-bold text-[#333333] py-5 px-6 text-center">Success Rate</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {performanceByStaff.map((staff, index) => (
                        <TableRow key={staff.name} className={`hover:bg-green-50 transition-colors border-b border-gray-100 ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50/30'}`}>
                          <TableCell className="py-5 px-6">
                            <div className="flex items-center space-x-4">
                              <div className="p-2 bg-green-100 rounded-full shadow-sm">
                                <Target className="w-4 h-4 text-green-600" />
                              </div>
                              <span className="font-semibold text-[#333333] text-base">{staff.name}</span>
                            </div>
                          </TableCell>
                          <TableCell className="py-5 px-6 text-center">
                            <span className="inline-flex items-center px-4 py-2 rounded-full text-sm font-bold bg-blue-100 text-blue-800">
                              {staff.total}
                            </span>
                          </TableCell>
                          <TableCell className="py-5 px-6 text-center">
                            <span className="inline-flex items-center px-4 py-2 rounded-full text-sm font-bold bg-green-100 text-green-800">
                              {staff.won}
                            </span>
                          </TableCell>
                          <TableCell className="py-5 px-6 text-center">
                            <div className="flex items-center justify-center space-x-3">
                              <div className={`w-16 h-3 rounded-full bg-gray-200 overflow-hidden shadow-inner`}>
                                <div 
                                  className="h-full bg-green-500 transition-all duration-700 ease-out rounded-full"
                                  style={{ width: `${Math.min(staff.rate, 100)}%` }}
                                ></div>
                              </div>
                              <span className="font-bold text-green-600 text-base min-w-[55px]">{staff.rate.toFixed(1)}%</span>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
            <Card className="bg-white border border-gray-100 shadow-lg">
              <CardHeader className="bg-yellow-50 -mx-6 -mt-6 mb-6 px-6 pt-6 pb-4 border-b border-yellow-100">
                <CardTitle className="flex items-center space-x-3 text-xl text-yellow-700 w-full">
                  <div className="p-2 bg-white rounded-full shadow-sm">
                    <TrendingUp className="w-5 h-5 text-yellow-600" />
                  </div>
                  <span>Performance by Channel</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6 bg-white">
                <div className="overflow-hidden rounded-xl border border-gray-200 shadow-sm">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-gray-50 border-b border-gray-200">
                        <TableHead className="font-bold text-[#333333] py-5 px-6 text-left">Marketing Channel</TableHead>
                        <TableHead className="font-bold text-[#333333] py-5 px-6 text-center">Total Closed</TableHead>
                        <TableHead className="font-bold text-[#333333] py-5 px-6 text-center">Won</TableHead>
                        <TableHead className="font-bold text-[#333333] py-5 px-6 text-center">Success Rate</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {performanceByChannel.map((channel, index) => (
                        <TableRow key={channel.name} className={`hover:bg-yellow-50 transition-colors border-b border-gray-100 ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50/30'}`}>
                          <TableCell className="py-5 px-6">
                            <div className="flex items-center space-x-4">
                              <div className="p-2 bg-yellow-100 rounded-full shadow-sm">
                                <TrendingUp className="w-4 h-4 text-yellow-600" />
                              </div>
                              <span className="font-semibold text-[#333333] text-base">{channel.name}</span>
                            </div>
                          </TableCell>
                          <TableCell className="py-5 px-6 text-center">
                            <span className="inline-flex items-center px-4 py-2 rounded-full text-sm font-bold bg-blue-100 text-blue-800">
                              {channel.total}
                            </span>
                          </TableCell>
                          <TableCell className="py-5 px-6 text-center">
                            <span className="inline-flex items-center px-4 py-2 rounded-full text-sm font-bold bg-green-100 text-green-800">
                              {channel.won}
                            </span>
                          </TableCell>
                          <TableCell className="py-5 px-6 text-center">
                            <div className="flex items-center justify-center space-x-3">
                              <div className={`w-16 h-3 rounded-full bg-gray-200 overflow-hidden shadow-inner`}>
                                <div 
                                  className="h-full bg-yellow-500 transition-all duration-700 ease-out rounded-full"
                                  style={{ width: `${Math.min(channel.rate, 100)}%` }}
                                ></div>
                              </div>
                              <span className="font-bold text-yellow-600 text-base min-w-[55px]">{channel.rate.toFixed(1)}%</span>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
        </div>
      </div>
    </>
  );
}
