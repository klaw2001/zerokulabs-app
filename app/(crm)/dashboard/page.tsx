'use client';

import { useEffect, useState } from 'react';
import { PageHeader } from '@/components/layout/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts';
import {
  Users, Phone, TrendingUp, Target, BarChart2, Download, RefreshCw
} from 'lucide-react';
import { formatDateTime, formatDuration, getScoreColor, getScoreLabel } from '@/lib/utils';

const COLORS = ['#0d9488', '#0891b2', '#7c3aed', '#db2777', '#ea580c', '#65a30d'];

interface AnalyticsData {
  totalLeads: number;
  qualifiedLeads: number;
  totalCalls: number;
  avgScore: number;
  conversionRate: number;
  leadsOverTime: { date: string; count: number }[];
  leadsByType: { type: string; count: number }[];
  callStatusDist: { status: string; count: number }[];
  scoreDistribution: { range: string; count: number }[];
  recentLeads: any[];
  recentCalls: any[];
}

export default function DashboardPage() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/analytics');
      const json = await res.json();
      setData(json);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const handleExport = () => {
    window.open('/api/export?type=leads', '_blank');
  };

  if (loading) {
    return (
      <div>
        <PageHeader title="Dashboard" description="Overview of leads, calls, and activity" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
          {[...Array(5)].map((_, i) => (
            <Card key={i}><CardContent className="p-6"><div className="h-12 bg-slate-100 rounded animate-pulse" /></CardContent></Card>
          ))}
        </div>
      </div>
    );
  }

  if (!data) return <div>Error loading dashboard</div>;

  return (
    <div>
      <PageHeader title="Dashboard" description="Overview of leads, calls, and activity">
        <Button variant="outline" size="sm" onClick={fetchData}>
          <RefreshCw className="w-4 h-4 mr-2" />Refresh
        </Button>
        <Button size="sm" className="bg-teal-600 hover:bg-teal-700" onClick={handleExport}>
          <Download className="w-4 h-4 mr-2" />Export Excel
        </Button>
      </PageHeader>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">Total Leads</p>
                <p className="text-2xl font-bold text-slate-900">{data.totalLeads}</p>
                <p className="text-xs text-slate-400">This month</p>
              </div>
              <div className="w-10 h-10 bg-teal-50 rounded-lg flex items-center justify-center">
                <Users className="w-5 h-5 text-teal-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">Qualified Leads</p>
                <p className="text-2xl font-bold text-slate-900">{data.qualifiedLeads}</p>
                <p className="text-xs text-slate-400">Score &ge; 60</p>
              </div>
              <div className="w-10 h-10 bg-green-50 rounded-lg flex items-center justify-center">
                <Target className="w-5 h-5 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">VAPI Calls</p>
                <p className="text-2xl font-bold text-slate-900">{data.totalCalls}</p>
                <p className="text-xs text-slate-400">Total calls made</p>
              </div>
              <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center">
                <Phone className="w-5 h-5 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">Avg. Score</p>
                <p className="text-2xl font-bold text-slate-900">{data.avgScore}</p>
                <p className="text-xs text-slate-400">Out of 100</p>
              </div>
              <div className="w-10 h-10 bg-purple-50 rounded-lg flex items-center justify-center">
                <BarChart2 className="w-5 h-5 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">Conversion</p>
                <p className="text-2xl font-bold text-slate-900">{data.conversionRate}%</p>
                <p className="text-xs text-slate-400">Intent verified</p>
              </div>
              <div className="w-10 h-10 bg-orange-50 rounded-lg flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-orange-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Leads Over Time (30 Days)</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={data.leadsOverTime}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Line type="monotone" dataKey="count" stroke="#0d9488" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Leads by Inquiry Type</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie
                  data={data.leadsByType}
                  dataKey="count"
                  nameKey="type"
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  label={({ name, percent }: { name?: string; percent?: number }) => `${name ?? ''} ${((percent ?? 0) * 100).toFixed(0)}%`}
                  labelLine={false}
                >
                  {data.leadsByType.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Call Status Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            {data.callStatusDist.length === 0 ? (
              <div className="h-[220px] flex items-center justify-center text-slate-400 text-sm">No call data yet</div>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={data.callStatusDist}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="status" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Bar dataKey="count" fill="#0d9488" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Lead Score Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={data.scoreDistribution}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="range" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="count" fill="#7c3aed" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Recent Leads</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {data.recentLeads.length === 0 ? (
                <p className="text-sm text-slate-400">No leads yet</p>
              ) : data.recentLeads.map((lead: any) => (
                <div key={lead.id} className="flex items-center justify-between py-2 border-b border-slate-50 last:border-0">
                  <div>
                    <p className="text-sm font-medium text-slate-900">{lead.name || 'Unknown'}</p>
                    <p className="text-xs text-slate-400">{lead.inquiry_type || 'N/A'} · {formatDateTime(lead.created_at)}</p>
                  </div>
                  {lead.score != null && (
                    <Badge className={`text-xs ${getScoreColor(lead.score)}`}>
                      {lead.score} · {getScoreLabel(lead.score)}
                    </Badge>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Recent VAPI Calls</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {data.recentCalls.length === 0 ? (
                <p className="text-sm text-slate-400">No calls yet</p>
              ) : data.recentCalls.map((call: any) => (
                <div key={call.id} className="flex items-center justify-between py-2 border-b border-slate-50 last:border-0">
                  <div>
                    <p className="text-sm font-medium text-slate-900">{call.lead_name || 'Unknown'}</p>
                    <p className="text-xs text-slate-400">
                      {call.call_duration ? formatDuration(call.call_duration) : 'N/A'} · {formatDateTime(call.created_at)}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs capitalize">{call.call_status || 'unknown'}</Badge>
                    {call.cost_usd && <span className="text-xs text-slate-400">${parseFloat(call.cost_usd).toFixed(4)}</span>}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
