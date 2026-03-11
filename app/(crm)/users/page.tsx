'use client';

import { useEffect, useState, useCallback } from 'react';
import { PageHeader } from '@/components/layout/page-header';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  useReactTable,
  getCoreRowModel,
  getFilteredRowModel,
  flexRender,
  createColumnHelper,
  ColumnFiltersState,
} from '@tanstack/react-table';
import { Plus, MoreHorizontal, Pencil, Trash2, UserCog } from 'lucide-react';
import { formatDateTime } from '@/lib/utils';
import type { User } from '@/types';

const ROLES = ['admin', 'receptionist', 'doctor', 'on_call_doctor', 'nurse'];
const STATUSES = ['active', 'inactive', 'on_leave'];
const DAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
const HOUR_OPTIONS = ['Off', '7am-3pm', '8am-4pm', '9am-5pm', '10am-6pm', '11am-7pm', '2pm-10pm', '8pm-4am', 'On Call 24h'];

const roleColors: Record<string, string> = {
  admin: 'bg-purple-100 text-purple-800',
  receptionist: 'bg-blue-100 text-blue-800',
  doctor: 'bg-teal-100 text-teal-800',
  on_call_doctor: 'bg-orange-100 text-orange-800',
  nurse: 'bg-pink-100 text-pink-800',
};

const statusColors: Record<string, string> = {
  active: 'bg-green-100 text-green-800',
  inactive: 'bg-slate-100 text-slate-800',
  on_leave: 'bg-yellow-100 text-yellow-800',
};

const defaultForm = {
  email: '', password: '', full_name: '', role: 'receptionist', phone: '',
  status: 'active', is_available_for_shift: true,
  working_hours: {
    monday: '9am-5pm', tuesday: '9am-5pm', wednesday: '9am-5pm',
    thursday: '9am-5pm', friday: '9am-5pm', saturday: 'Off', sunday: 'Off',
  },
};

const columnHelper = createColumnHelper<User>();

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [globalFilter, setGlobalFilter] = useState('');

  const [addOpen, setAddOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [form, setForm] = useState(defaultForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const [filterRole, setFilterRole] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filterRole !== 'all') params.set('role', filterRole);
      if (filterStatus !== 'all') params.set('status', filterStatus);
      const res = await fetch(`/api/users?${params}`);
      const data = await res.json();
      setUsers(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [filterRole, filterStatus]);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  const openEdit = (user: User) => {
    setSelectedUser(user);
    setForm({
      email: user.email,
      password: '',
      full_name: user.full_name,
      role: user.role,
      phone: user.phone || '',
      status: user.status,
      is_available_for_shift: user.is_available_for_shift,
      working_hours: (user.working_hours as typeof defaultForm.working_hours) || defaultForm.working_hours,
    });
    setEditOpen(true);
    setError('');
  };

  const handleAdd = async () => {
    setError('');
    setSaving(true);
    try {
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || 'Failed'); return; }
      setAddOpen(false);
      setForm(defaultForm);
      fetchUsers();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Unknown error');
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = async () => {
    if (!selectedUser) return;
    setError('');
    setSaving(true);
    try {
      const body = {
        id: selectedUser.id,
        email: form.email,
        full_name: form.full_name,
        role: form.role,
        phone: form.phone,
        status: form.status,
        is_available_for_shift: form.is_available_for_shift,
        working_hours: form.working_hours,
      };
      const res = await fetch('/api/users', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || 'Failed'); return; }
      setEditOpen(false);
      fetchUsers();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Unknown error');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedUser) return;
    try {
      await fetch(`/api/users?id=${selectedUser.id}`, { method: 'DELETE' });
      setDeleteOpen(false);
      fetchUsers();
    } catch (e) {
      console.error(e);
    }
  };

  const handleStatusChange = async (user: User, newStatus: string) => {
    await fetch('/api/users', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: user.id, status: newStatus }),
    });
    fetchUsers();
  };

  const columns = [
    columnHelper.accessor('full_name', {
      header: 'Name',
      cell: (info) => (
        <div>
          <p className="font-medium text-slate-900">{info.getValue()}</p>
          <p className="text-xs text-slate-500">{info.row.original.email}</p>
        </div>
      ),
    }),
    columnHelper.accessor('role', {
      header: 'Role',
      cell: (info) => (
        <Badge className={`text-xs capitalize ${roleColors[info.getValue()] || 'bg-slate-100 text-slate-800'}`}>
          {info.getValue().replace('_', ' ')}
        </Badge>
      ),
    }),
    columnHelper.accessor('status', {
      header: 'Status',
      cell: (info) => (
        <DropdownMenu>
          <DropdownMenuTrigger>
            <Badge className={`text-xs capitalize cursor-pointer ${statusColors[info.getValue()] || ''}`}>
              {info.getValue().replace('_', ' ')}
            </Badge>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            {STATUSES.map(s => (
              <DropdownMenuItem key={s} onClick={() => handleStatusChange(info.row.original, s)}>
                {s.replace('_', ' ')}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    }),
    columnHelper.accessor('phone', {
      header: 'Phone',
      cell: (info) => <span className="text-sm text-slate-600">{info.getValue() || '—'}</span>,
    }),
    columnHelper.accessor('is_available_for_shift', {
      header: 'Available',
      cell: (info) => (
        <Switch
          checked={info.getValue()}
          onCheckedChange={async (checked) => {
            await fetch('/api/users', {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ id: info.row.original.id, is_available_for_shift: checked }),
            });
            fetchUsers();
          }}
        />
      ),
    }),
    columnHelper.accessor('last_login', {
      header: 'Last Login',
      cell: (info) => (
        <span className="text-xs text-slate-500">
          {info.getValue() ? formatDateTime(info.getValue()!) : 'Never'}
        </span>
      ),
    }),
    columnHelper.display({
      id: 'actions',
      header: 'Actions',
      cell: (info) => (
        <DropdownMenu>
          <DropdownMenuTrigger>
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => openEdit(info.row.original)}>
              <Pencil className="w-4 h-4 mr-2" />Edit
            </DropdownMenuItem>
            <DropdownMenuItem
              className="text-red-600"
              onClick={() => { setSelectedUser(info.row.original); setDeleteOpen(true); }}
            >
              <Trash2 className="w-4 h-4 mr-2" />Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    }),
  ];

  const table = useReactTable({
    data: users,
    columns,
    state: { columnFilters, globalFilter },
    onColumnFiltersChange: setColumnFilters,
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
  });

  const UserForm = ({ isEdit = false }: { isEdit?: boolean }) => (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Full Name</Label>
          <Input value={form.full_name} onChange={e => setForm(f => ({ ...f, full_name: e.target.value }))} placeholder="John Doe" />
        </div>
        <div className="space-y-2">
          <Label>Email</Label>
          <Input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="john@zerokulabs.com" />
        </div>
      </div>
      {!isEdit && (
        <div className="space-y-2">
          <Label>Password</Label>
          <Input type="password" value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} placeholder="••••••••" />
        </div>
      )}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Role</Label>
          <Select value={form.role} onValueChange={v => setForm(f => ({ ...f, role: v ?? f.role }))}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {ROLES.map(r => <SelectItem key={r} value={r}>{r.replace('_', ' ')}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Phone</Label>
          <Input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} placeholder="+1 234 567 8900" />
        </div>
      </div>
      {isEdit && (
        <div className="space-y-2">
          <Label>Status</Label>
          <Select value={form.status} onValueChange={v => setForm(f => ({ ...f, status: v ?? f.status }))}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {STATUSES.map(s => <SelectItem key={s} value={s}>{s.replace('_', ' ')}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      )}
      <div className="space-y-2">
        <Label>Working Hours</Label>
        <div className="grid grid-cols-1 gap-2 border rounded-lg p-3">
          {DAYS.map(day => (
            <div key={day} className="flex items-center justify-between">
              <span className="text-sm capitalize text-slate-700 w-24">{day}</span>
              <Select
                value={(form.working_hours as Record<string, string>)[day] || 'Off'}
                onValueChange={v => setForm(f => ({
                  ...f,
                  working_hours: { ...f.working_hours, [day]: v },
                }))}
              >
                <SelectTrigger className="w-36 h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {HOUR_OPTIONS.map(h => <SelectItem key={h} value={h} className="text-xs">{h}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          ))}
        </div>
      </div>
      <div className="flex items-center gap-3">
        <Switch
          checked={form.is_available_for_shift}
          onCheckedChange={v => setForm(f => ({ ...f, is_available_for_shift: v }))}
        />
        <Label>Available for shift</Label>
      </div>
      {error && <p className="text-sm text-red-500">{error}</p>}
    </div>
  );

  return (
    <div>
      <PageHeader title="Users" description="Manage staff accounts, roles, and schedules">
        <Button size="sm" className="bg-teal-600 hover:bg-teal-700" onClick={() => { setForm(defaultForm); setError(''); setAddOpen(true); }}>
          <Plus className="w-4 h-4 mr-2" />Add User
        </Button>
      </PageHeader>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-4">
        <Input
          placeholder="Search users..."
          value={globalFilter}
          onChange={e => setGlobalFilter(e.target.value)}
          className="w-48"
        />
        <Select value={filterRole} onValueChange={v => setFilterRole(v ?? 'all')}>
          <SelectTrigger className="w-40"><SelectValue placeholder="All roles" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All roles</SelectItem>
            {ROLES.map(r => <SelectItem key={r} value={r}>{r.replace('_', ' ')}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filterStatus} onValueChange={v => setFilterStatus(v ?? 'all')}>
          <SelectTrigger className="w-40"><SelectValue placeholder="All statuses" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            {STATUSES.map(s => <SelectItem key={s} value={s}>{s.replace('_', ' ')}</SelectItem>)}
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
                    {[...Array(7)].map((_, j) => (
                      <td key={j} className="px-4 py-3"><div className="h-4 bg-slate-100 rounded animate-pulse" /></td>
                    ))}
                  </tr>
                ))
              ) : table.getRowModel().rows.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-slate-400">
                    <UserCog className="w-8 h-8 mx-auto mb-2 opacity-30" />
                    No users found
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
          {users.length} user{users.length !== 1 ? 's' : ''}
        </div>
      </div>

      {/* Add Dialog */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add New User</DialogTitle>
            <DialogDescription>Create a new staff account</DialogDescription>
          </DialogHeader>
          <UserForm />
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddOpen(false)}>Cancel</Button>
            <Button className="bg-teal-600 hover:bg-teal-700" onClick={handleAdd} disabled={saving}>
              {saving ? 'Creating...' : 'Create User'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit User</DialogTitle>
            <DialogDescription>Update staff account details</DialogDescription>
          </DialogHeader>
          <UserForm isEdit />
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)}>Cancel</Button>
            <Button className="bg-teal-600 hover:bg-teal-700" onClick={handleEdit} disabled={saving}>
              {saving ? 'Saving...' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete User</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete <strong>{selectedUser?.full_name}</strong>? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteOpen(false)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDelete}>Delete</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
