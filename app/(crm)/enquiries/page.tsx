'use client';

import { useEffect, useState, useCallback } from 'react';
import { PageHeader } from '@/components/layout/page-header';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  useReactTable, getCoreRowModel, getFilteredRowModel,
  flexRender, createColumnHelper,
} from '@tanstack/react-table';
import {
  MessageSquare, Eye, Download,
} from 'lucide-react';
import { formatDateTime } from '@/lib/utils';
import type { Enquiry, User } from '@/types';

const SOURCES = ['chatbot', 'contact_form', 'phone', 'email'];
const STATUSES = ['new', 'contacted', 'qualified', 'disqualified', 'closed'];

const statusColors: Record<string, string> = {
  new: 'bg-blue-100 text-blue-800',
  contacted: 'bg-yellow-100 text-yellow-800',
  qualified: 'bg-green-100 text-green-800',
  disqualified: 'bg-red-100 text-red-800',
  closed: 'bg-slate-100 text-slate-700',
};

const sourceColors: Record<string, string> = {
  chatbot: 'bg-teal-100 text-teal-800',
  contact_form: 'bg-purple-100 text-purple-800',
  phone: 'bg-orange-100 text-orange-800',
  email: 'bg-blue-100 text-blue-800',
};

const columnHelper = createColumnHelper<Enquiry>();

export default function EnquiriesPage() {
  const [enquiries, setEnquiries] = useState<Enquiry[]>([]);
  const [loading, setLoading] = useState(true);
  const [globalFilter, setGlobalFilter] = useState('');
  const [filterSource, setFilterSource] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [staff, setStaff] = useState<User[]>([]);

  const [detailOpen, setDetailOpen] = useState(false);
  const [selectedEnquiry, setSelectedEnquiry] = useState<Enquiry | null>(null);
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  const fetchEnquiries = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filterSource !== 'all') params.set('source', filterSource);
      if (filterStatus !== 'all') params.set('status', filterStatus);
      const res = await fetch(`/api/enquiries?${params}`);
      const data = await res.json();
      setEnquiries(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [filterSource, filterStatus]);

  const fetchStaff = async () => {
    try {
      const res = await fetch('/api/users?status=active');
      const data = await res.json();
      setStaff(Array.isArray(data) ? data.filter((u: User) => ['doctor', 'receptionist', 'admin'].includes(u.role)) : []);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchEnquiries();
    fetchStaff();
  }, [fetchEnquiries]);

  const openDetail = (enquiry: Enquiry) => {
    setSelectedEnquiry(enquiry);
    setNotes(enquiry.notes || '');
    setDetailOpen(true);
  };

  const updateEnquiry = async (id: string, updates: Partial<Enquiry>) => {
    try {
      await fetch('/api/enquiries', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, ...updates }),
      });
      fetchEnquiries();
      if (selectedEnquiry?.id === id) {
        setSelectedEnquiry(prev => prev ? { ...prev, ...updates } : prev);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const saveNotes = async () => {
    if (!selectedEnquiry) return;
    setSaving(true);
    await updateEnquiry(selectedEnquiry.id, { notes });
    setSaving(false);
    setDetailOpen(false);
  };

  const columns = [
    columnHelper.accessor('name', {
      header: 'Contact',
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
    columnHelper.accessor('source', {
      header: 'Source',
      cell: (info) => {
        const src = info.getValue();
        if (!src) return <span className="text-slate-400 text-xs">—</span>;
        return (
          <Badge className={`text-xs capitalize ${sourceColors[src] || 'bg-slate-100 text-slate-700'}`}>
            {src.replace('_', ' ')}
          </Badge>
        );
      },
    }),
    columnHelper.accessor('status', {
      header: 'Status',
      cell: (info) => (
        <DropdownMenu>
          <DropdownMenuTrigger>
            <Badge className={`text-xs capitalize cursor-pointer ${statusColors[info.getValue()] || 'bg-slate-100'}`}>
              {info.getValue()}
            </Badge>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            {STATUSES.map(s => (
              <DropdownMenuItem
                key={s}
                onClick={() => updateEnquiry(info.row.original.id, { status: s as Enquiry['status'] })}
              >
                {s}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    }),
    columnHelper.accessor('assigned_user_name', {
      header: 'Assigned To',
      cell: (info) => (
        <Select
          value={info.row.original.assigned_to || 'unassigned'}
          onValueChange={v => {
            const val: string | undefined = !v || v === 'unassigned' ? undefined : v;
            updateEnquiry(info.row.original.id, { assigned_to: val });
          }}
        >
          <SelectTrigger className="w-36 h-7 text-xs border-0 shadow-none focus:ring-0 p-0 bg-transparent">
            <SelectValue placeholder="Unassigned" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="unassigned">Unassigned</SelectItem>
            {staff.map(u => (
              <SelectItem key={u.id} value={u.id}>{u.full_name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      ),
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
      cell: (info) => (
        <Button
          size="sm"
          variant="outline"
          className="h-8 px-2"
          onClick={() => openDetail(info.row.original)}
        >
          <Eye className="w-3 h-3" />
        </Button>
      ),
    }),
  ];

  const table = useReactTable({
    data: enquiries,
    columns,
    state: { globalFilter },
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
  });

  return (
    <div>
      <PageHeader title="Enquiries" description="Manage contact enquiries and assign to staff">
        <Button variant="outline" size="sm" onClick={() => window.open('/api/export?type=enquiries', '_blank')}>
          <Download className="w-4 h-4 mr-2" />Export Excel
        </Button>
      </PageHeader>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-4">
        <Input
          placeholder="Search enquiries..."
          value={globalFilter}
          onChange={e => setGlobalFilter(e.target.value)}
          className="w-48"
        />
        <Select value={filterSource} onValueChange={v => setFilterSource(v ?? 'all')}>
          <SelectTrigger className="w-40"><SelectValue placeholder="All sources" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All sources</SelectItem>
            {SOURCES.map(s => <SelectItem key={s} value={s}>{s.replace('_', ' ')}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filterStatus} onValueChange={v => setFilterStatus(v ?? 'all')}>
          <SelectTrigger className="w-40"><SelectValue placeholder="All statuses" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            {STATUSES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
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
                    {[...Array(6)].map((_, j) => (
                      <td key={j} className="px-4 py-3"><div className="h-4 bg-slate-100 rounded animate-pulse" /></td>
                    ))}
                  </tr>
                ))
              ) : table.getRowModel().rows.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-slate-400">
                    <MessageSquare className="w-8 h-8 mx-auto mb-2 opacity-30" />
                    No enquiries found
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
          {enquiries.length} enquir{enquiries.length !== 1 ? 'ies' : 'y'}
        </div>
      </div>

      {/* Detail Dialog */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Enquiry Details</DialogTitle>
            <DialogDescription>
              {selectedEnquiry?.name || 'Unknown'} · {selectedEnquiry?.source?.replace('_', ' ')}
            </DialogDescription>
          </DialogHeader>
          {selectedEnquiry && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <Label className="text-xs text-slate-500">Email</Label>
                  <p className="mt-0.5">{selectedEnquiry.email || '—'}</p>
                </div>
                <div>
                  <Label className="text-xs text-slate-500">Phone</Label>
                  <p className="mt-0.5">{selectedEnquiry.phone || '—'}</p>
                </div>
                <div>
                  <Label className="text-xs text-slate-500">Status</Label>
                  <div className="mt-0.5">
                    <Select
                      value={selectedEnquiry.status}
                      onValueChange={v => {
                        if (v) updateEnquiry(selectedEnquiry.id, { status: v as Enquiry['status'] });
                        setSelectedEnquiry(prev => prev ? { ...prev, status: v as Enquiry['status'] } : prev);
                      }}
                    >
                      <SelectTrigger className="h-8 text-xs w-36">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {STATUSES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div>
                  <Label className="text-xs text-slate-500">Assign To</Label>
                  <div className="mt-0.5">
                    <Select
                      value={selectedEnquiry.assigned_to || 'unassigned'}
                      onValueChange={v => {
                        const val: string | undefined = !v || v === 'unassigned' ? undefined : v;
                        updateEnquiry(selectedEnquiry.id, { assigned_to: val });
                        setSelectedEnquiry(prev => prev ? { ...prev, assigned_to: val } as Enquiry : prev);
                      }}
                    >
                      <SelectTrigger className="h-8 text-xs w-36">
                        <SelectValue placeholder="Unassigned" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="unassigned">Unassigned</SelectItem>
                        {staff.map(u => (
                          <SelectItem key={u.id} value={u.id}>{u.full_name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              {selectedEnquiry.message && (
                <div>
                  <Label className="text-xs text-slate-500">Message</Label>
                  <div className="mt-1 bg-slate-50 rounded-lg p-3">
                    <p className="text-sm text-slate-700 whitespace-pre-wrap">{selectedEnquiry.message}</p>
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <Label className="text-xs text-slate-500">Internal Notes</Label>
                <Textarea
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  placeholder="Add internal notes about this enquiry..."
                  rows={3}
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDetailOpen(false)}>Close</Button>
            <Button className="bg-teal-600 hover:bg-teal-700" onClick={saveNotes} disabled={saving}>
              {saving ? 'Saving...' : 'Save Notes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
