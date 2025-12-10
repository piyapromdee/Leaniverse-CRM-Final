'use client'

import React, { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { DateRangePicker } from '@/components/ui/date-range-picker'
import { Target, TrendingUp, TrendingDown, Percent, Phone, Activity, Calendar } from 'lucide-react'
import { DateRange } from 'react-day-picker'
import { subDays } from 'date-fns'

const formatCurrency = (amount: number) => `฿${amount.toLocaleString()}`;

export default function SalesDashboardPage() {
  const [allDeals, setAllDeals] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
    to: new Date(),
  });

  useEffect(() => {
    const supabase = createClient();
    const fetchAllDashboardData = async () => {
      setIsLoading(true);
      const { data: dealsData, error: dealsError } = await supabase.from('deals').select(`*, company:companies(name)`);
      if (dealsError) console.error("Error fetching deals:", dealsError);
      else setAllDeals(dealsData || []);
      setIsLoading(false);
    };
    fetchAllDashboardData();
  }, []);

  const filteredDeals = React.useMemo(() => {
    if (!dateRange?.from) return [];

    const startDate = dateRange.from;
    const endDate = dateRange.to ? new Date(dateRange.to.setHours(23, 59, 59, 999)) : startDate;
    
    return allDeals.filter(deal => {
      const dealDate = new Date(deal.created_at);
      return dealDate >= startDate && dealDate <= endDate;
    });
  }, [allDeals, dateRange]);

  const openDeals = filteredDeals.filter(d => d.stage !== 'won' && d.stage !== 'lost');
  const openDealsValue = openDeals.reduce((sum, deal) => sum + deal.value, 0);
  const wonDeals = filteredDeals.filter(d => d.stage === 'won');
  const lostDeals = filteredDeals.filter(d => d.stage === 'lost');
  const totalClosedDeals = wonDeals.length + lostDeals.length;
  const conversionRate = totalClosedDeals > 0 ? ((wonDeals.length / totalClosedDeals) * 100).toFixed(1) : "0.0";
  const recentWins = [...wonDeals].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()).slice(0, 3);
  const recentLosses = [...lostDeals].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()).slice(0, 3);

  const topMetrics = [
    { title: `Open Deals Value`, value: formatCurrency(openDealsValue), icon: Target, href: '/dashboard/deals?status=open' },
    { title: `Deals Won`, value: wonDeals.length, icon: TrendingUp, href: '/dashboard/deals?status=won' },
    { title: `Conversion Rate`, value: `${conversionRate}%`, icon: Percent, href: '/dashboard/deals' },
    { title: `Deals Lost`, value: lostDeals.length, icon: TrendingDown, href: '/dashboard/deals?status=lost' }
  ];

  if (isLoading) {
    return <div className="flex justify-center items-center h-screen">Loading...</div>;
  }
  
  return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div><h1 className="text-3xl font-bold">Sales Dashboard</h1><p className="text-gray-500">Your daily action hub with advanced date filtering</p></div>
          <div className="flex items-center space-x-2">
            <DateRangePicker date={dateRange} onDateChange={setDateRange} />
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {topMetrics.map(metric => {
                const Icon = metric.icon;
                return (<Link href={metric.href} key={metric.title}><Card className="hover:bg-gray-50 hover:shadow-lg transition-all"><CardHeader><CardTitle className="text-base flex items-center"><Icon className="w-5 h-5 mr-2" /> {metric.title}</CardTitle></CardHeader><CardContent><p className="text-3xl font-bold">{metric.value}</p></CardContent></Card></Link>)
            })}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card><CardHeader><CardTitle>🏆 Recent Wins</CardTitle><CardDescription>Latest won deals in the selected period</CardDescription></CardHeader><CardContent className="space-y-4">{recentWins.length > 0 ? recentWins.map(deal => (<div key={deal.id} className="flex justify-between items-center p-3 bg-green-50 rounded-lg"><div><p className="font-semibold">{deal.company?.name || 'N/A'}</p><p className="text-sm text-gray-600">{deal.title}</p></div><p className="font-bold text-green-600">{formatCurrency(deal.value)}</p></div>)) : <p className="text-gray-500 p-3">No wins in this period.</p>}</CardContent></Card>
          <Card><CardHeader><CardTitle>❌ Recent Losses</CardTitle><CardDescription>Latest lost deals in the selected period</CardDescription></CardHeader><CardContent className="space-y-4">{recentLosses.length > 0 ? recentLosses.map(deal => (<div key={deal.id} className="flex justify-between items-center p-3 bg-red-50 rounded-lg"><div><p className="font-semibold">{deal.company?.name || 'N/A'}</p><p className="text-sm text-gray-600">{deal.title}</p></div><p className="font-bold text-red-600">{formatCurrency(deal.value)}</p></div>)) : <p className="text-gray-500 p-3">No losses in this period.</p>}</CardContent></Card>
        </div>
      </div>
  );
}