'use client';

import { useEffect, useState, useCallback } from 'react';
import { PageHeader } from '@/components/layout/page-header';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  useReactTable, getCoreRowModel, getFilteredRowModel,
  flexRender, createColumnHelper,
} from '@tanstack/react-table';
import {
  Phone, PhoneCall, MessageSquare, Download,
  CheckCircle2, XCircle, Loader2, PhoneOff,
} from 'lucide-react';
import { formatDateTime, formatDuration, getScoreColor, getScoreLabel } from '@/lib/utils';
import type { Lead } from '@/types';

const INQUIRY_TYPES = ['R&D', 'QC', 'Stability Testing', 'Formulation', 'Regulatory', 'Clinical Trials', 'Other'];

const callStatusColor: Record<string, string> = {
  ended: 'bg-green-100 text-green-800',
  'in-progress': 'bg-blue-100 text-blue-800',
  queued: 'bg-yellow-100 text-yellow-800',
  ringing: 'bg-yellow-100 text-yellow-800',
  failed: 'bg-red-100 text-red-800',
};

const columnHelper = createColumnHelper<Lead>();

export default function LeadsPage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [globalFilter, setGlobalFilter] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [filterCallStatus, setFilterCallStatus] = useState('all');

  const [callDetailsOpen, setCallDetailsOpen] = useState(false);
  const [chatHistoryOpen, setChatHistoryOpen] = useState(false);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [leadDetail, setLeadDetail] = useState<any>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [callingLeadId, setCallingLeadId] = useState<string | null>(null);

  const fetchLeads = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filterType !== 'all') params.set('inquiry_type', filterType);
      if (filterCallStatus !== 'all') params.set('call_status', filterCallStatus);
      const res = await fetch(`/api/leads?${params}`);
      const data = await res.json();
      setLeads(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [filterType, filterCallStatus]);

  useEffect(() => { fetchLeads(); }, [fetchLeads]);

  const fetchLeadDetail = async (lead: Lead) => {
    setDetailLoading(true);
    try {
      const res = await fetch(`/api/leads/${lead.id}`);
      const data = await res.json();
      setLeadDetail(data);
    } catch (e) {
      console.error(e);
    } finally {
      setDetailLoading(false);
    }
  };

  const openCallDetails = async (lead: Lead) => {
    setSelectedLead(lead);
    setCallDetailsOpen(true);
    await fetchLeadDetail(lead);
  };

  const openChatHistory = async (lead: Lead) => {
    setSelectedLead(lead);
    setChatHistoryOpen(true);
    await fetchLeadDetail(lead);
  };

  const triggerCall = async (lead: Lead) => {
    if (!lead.phone) {
      alert('This lead has no phone number. Please add a phone number first.');
      return;
    }
    setCallingLeadId(lead.id);
    try {
      const res = await fetch('/api/vapi/trigger-call', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ leadId: lead.id }),
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error || 'Failed to trigger call');
      } else {
        fetchLeads();
      }
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : 'Unknown error');
    } finally {
      setCallingLeadId(null);
    }
  };

  const updateCallIntent = async (callId: string, updates: Record<string, unknown>) => {
    await fetch(`/api/vapi/calls/${callId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    });
    if (selectedLead) await fetchLeadDetail(selectedLead);
  };

  const columns = [
    columnHelper.accessor('name', {
      header: 'Lead',
      cell: (info) => (
        <div>
          <p className="font-medium text-slate-900">{info.getValue() || 'Unknown'}</p>
          <p className="text-xs text-slate-500">{info.row.original.email || '—'}</p>
          {info.row.original.phone && (
            <p className="text-xs text-slate-400">{info.row.original.phone}</p>
          )}
        </div>
      ),
    }),
    columnHelper.accessor('company', {
      header: 'Company',
      cell: (info) => <span className="text-sm text-slate-600">{info.getValue() || '—'}</span>,
    }),
    columnHelper.accessor('inquiry_type', {
      header: 'Inquiry Type',
      cell: (info) => (
        <Badge variant="outline" className="text-xs">
          {info.getValue() || 'Unknown'}
        </Badge>
      ),
    }),
    columnHelper.accessor('score', {
      header: 'Score',
      cell: (info) => {
        const score = info.getValue();
        if (score == null) return <span className="text-slate-400 text-sm">—</span>;
        return (
          <Badge className={`text-xs ${getScoreColor(score)}`}>
            {score} · {getScoreLabel(score)}
          </Badge>
        );
      },
    }),
    columnHelper.accessor('call_status', {
      header: 'Call Status',
      cell: (info) => {
        const status = info.getValue();
        if (!status) return <span className="text-slate-400 text-xs">No call</span>;
        return (
          <Badge className={`text-xs capitalize ${callStatusColor[status] || 'bg-slate-100 text-slate-700'}`}>
            {status}
          </Badge>
        );
      },
    }),
    columnHelper.accessor('call_duration', {
      header: 'Duration',
      cell: (info) => (
        <span className="text-xs text-slate-600">
          {info.getValue() ? formatDuration(info.getValue()!) : '—'}
        </span>
      ),
    }),
    columnHelper.accessor('intent_verified', {
      header: 'Intent',
      cell: (info) => {
        const val = info.getValue();
        if (val == null && !info.row.original.call_status) return <span className="text-slate-300 text-xs">—</span>;
        if (val === true) return <CheckCircle2 className="w-4 h-4 text-green-500" />;
        if (val === false && info.row.original.call_status) return <XCircle className="w-4 h-4 text-red-400" />;
        return <span className="text-slate-300 text-xs">—</span>;
      },
    }),
    columnHelper.accessor('created_at', {
      header: 'Created',
      cell: (info) => (
        <span className="text-xs text-slate-500">{formatDateTime(info.getValue())}</span>
      ),
    }),
    columnHelper.display({
      id: 'actions',
      header: 'Actions',
      cell: (info) => {
        const lead = info.row.original;
        const isCalling = callingLeadId === lead.id;
        const hasCall = !!lead.call_status;
        return (
          <div className="flex items-center gap-1">
            <Button
              size="sm"
              variant="outline"
              className="h-8 px-2 text-xs"
              onClick={() => triggerCall(lead)}
              disabled={isCalling}
              title={lead.phone ? 'Trigger VAPI call' : 'No phone number'}
            >
              {isCalling ? <Loader2 className="w-3 h-3 animate-spin" /> : <PhoneCall className="w-3 h-3" />}
            </Button>
            {hasCall && (
              <Button
                size="sm"
                variant="outline"
                className="h-8 px-2 text-xs"
                onClick={() => openCallDetails(lead)}
              >
                <Phone className="w-3 h-3" />
              </Button>
            )}
            {lead.conversation_id && (
              <Button
                size="sm"
                variant="outline"
                className="h-8 px-2 text-xs"
                onClick={() => openChatHistory(lead)}
              >
                <MessageSquare className="w-3 h-3" />
              </Button>
            )}
          </div>
        );
      },
    }),
  ];

  const table = useReactTable({
    data: leads,
    columns,
    state: { globalFilter },
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
  });

  const latestCall = leadDetail?.calls?.[0];

  return (
    <div>
      <PageHeader title="Leads" description="Chatbot leads with VAPI voice call integration">
        <Button variant="outline" size="sm" onClick={() => window.open('/api/export?type=leads', '_blank')}>
          <Download className="w-4 h-4 mr-2" />Export Excel
        </Button>
      </PageHeader>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-4">
        <Input
          placeholder="Search leads..."
          value={globalFilter}
          onChange={e => setGlobalFilter(e.target.value)}
          className="w-48"
        />
        <Select value={filterType} onValueChange={v => setFilterType(v ?? 'all')}>
          <SelectTrigger className="w-44"><SelectValue placeholder="All inquiry types" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All inquiry types</SelectItem>
            {INQUIRY_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filterCallStatus} onValueChange={v => setFilterCallStatus(v ?? 'all')}>
          <SelectTrigger className="w-40"><SelectValue placeholder="All call statuses" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All call statuses</SelectItem>
            {['queued', 'ringing', 'in-progress', 'ended', 'failed'].map(s => (
              <SelectItem key={s} value={s}>{s}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              {table.getHeaderGroups().map(hg => (
                <tr key={hg.id} className="border-b border-slate-200 bg-slate-50">
                  {hg.headers.map(h => (
                    <th key={h.id} className="text-left px-4 py-3 text-xs font-semibold text-slate-600 uppercase tracking-wider">
                      {flexRender(h.column.columnDef.header, h.getContext())}
                    </th>
                  ))}
                </tr>
              ))}
            </thead>
            <tbody>
              {loading ? (
                [...Array(5)].map((_, i) => (
                  <tr key={i} className="border-b border-slate-100">
                    {[...Array(9)].map((_, j) => (
                      <td key={j} className="px-4 py-3"><div className="h-4 bg-slate-100 rounded animate-pulse" /></td>
                    ))}
                  </tr>
                ))
              ) : table.getRowModel().rows.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-8 text-center text-slate-400">
                    <PhoneOff className="w-8 h-8 mx-auto mb-2 opacity-30" />
                    No leads found
                  </td>
                </tr>
              ) : (
                table.getRowModel().rows.map(row => (
                  <tr key={row.id} className="border-b border-slate-100 hover:bg-slate-50">
                    {row.getVisibleCells().map(cell => (
                      <td key={cell.id} className="px-4 py-3">
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </td>
                    ))}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <div className="px-4 py-3 border-t border-slate-100 text-xs text-slate-500">
          {leads.length} lead{leads.length !== 1 ? 's' : ''}
        </div>
      </div>

      {/* Call Details Dialog */}
      <Dialog open={callDetailsOpen} onOpenChange={setCallDetailsOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Call Details — {selectedLead?.name}</DialogTitle>
            <DialogDescription>VAPI call information, transcript, and recording</DialogDescription>
          </DialogHeader>
          {detailLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-teal-600" />
            </div>
          ) : latestCall ? (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label className="text-xs text-slate-500">Status</Label>
                  <Badge className={`text-xs capitalize ${callStatusColor[latestCall.call_status] || 'bg-slate-100'}`}>
                    {latestCall.call_status}
                  </Badge>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-slate-500">Duration</Label>
                  <p className="text-sm">{latestCall.call_duration ? formatDuration(latestCall.call_duration) : '—'}</p>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-slate-500">Cost</Label>
                  <p className="text-sm">{latestCall.cost_usd ? `$${parseFloat(latestCall.cost_usd).toFixed(4)}` : '—'}</p>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-slate-500">Phone</Label>
                  <p className="text-sm">{latestCall.phone_number || '—'}</p>
                </div>
              </div>

              {latestCall.recording_url && (
                <div className="space-y-2">
                  <Label className="text-xs text-slate-500">Recording</Label>
                  <audio controls className="w-full" src={latestCall.recording_url}>
                    Your browser does not support audio.
                  </audio>
                </div>
              )}

              {latestCall.transcript && (
                <div className="space-y-2">
                  <Label className="text-xs text-slate-500">Transcript</Label>
                  <div className="bg-slate-50 rounded-lg p-3 max-h-48 overflow-y-auto">
                    <p className="text-sm text-slate-700 whitespace-pre-wrap">{latestCall.transcript}</p>
                  </div>
                </div>
              )}

              <div className="border-t pt-4 space-y-3">
                <Label className="text-xs text-slate-500 font-semibold">Intent Verification</Label>
                <div className="flex items-center gap-3">
                  <Switch
                    checked={latestCall.intent_verified || false}
                    onCheckedChange={v => updateCallIntent(latestCall.id, { intent_verified: v })}
                  />
                  <span className="text-sm">Intent Verified</span>
                </div>
                <div className="flex items-center gap-3">
                  <Switch
                    checked={latestCall.transferred_to_human || false}
                    onCheckedChange={v => updateCallIntent(latestCall.id, { transferred_to_human: v })}
                  />
                  <span className="text-sm">Transferred to Human</span>
                </div>
              </div>
            </div>
          ) : (
            <p className="text-slate-400 text-sm py-4">No call data available</p>
          )}
        </DialogContent>
      </Dialog>

      {/* Chat History Dialog */}
      <Dialog open={chatHistoryOpen} onOpenChange={setChatHistoryOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Chat History — {selectedLead?.name}</DialogTitle>
            <DialogDescription>Full chatbot conversation</DialogDescription>
          </DialogHeader>
          {detailLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-teal-600" />
            </div>
          ) : leadDetail?.lead?.messages ? (
            <div className="space-y-3 max-h-96 overflow-y-auto pr-2">
              {leadDetail.lead.messages.map((msg: { role: string; content: string }, i: number) => (
                <div
                  key={i}
                  className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm ${
                      msg.role === 'user'
                        ? 'bg-teal-600 text-white rounded-br-sm'
                        : 'bg-slate-100 text-slate-800 rounded-bl-sm'
                    }`}
                  >
                    {msg.content}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-slate-400 text-sm py-4">No conversation history available</p>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
