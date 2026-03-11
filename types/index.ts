export interface User {
  id: string;
  created_at: string;
  email: string;
  full_name: string;
  role: 'admin' | 'receptionist' | 'doctor' | 'on_call_doctor' | 'nurse';
  phone?: string;
  status: 'active' | 'inactive' | 'on_leave';
  working_hours?: Record<string, string>;
  is_available_for_shift: boolean;
  last_login?: string;
}

export interface Lead {
  id: string;
  conversation_id?: string;
  created_at: string;
  name?: string;
  email?: string;
  phone?: string;
  company?: string;
  project_description?: string;
  inquiry_type?: string;
  timeline?: string;
  score?: number;
  sent_to_crm: boolean;
  // Joined from vapi_calls
  vapi_call_id?: string;
  call_status?: string;
  call_duration?: number;
  recording_url?: string;
  transcript?: string;
  intent_verified?: boolean;
  intent_notes?: string;
  cost_usd?: number;
  transferred_to_human?: boolean;
  call_metadata?: any;
  vapi_call_db_id?: string;
}

export interface VapiCall {
  id: string;
  lead_id: string;
  vapi_call_id: string;
  created_at: string;
  phone_number?: string;
  call_status?: string;
  call_duration?: number;
  recording_url?: string;
  transcript?: string;
  intent_verified: boolean;
  intent_notes?: string;
  cost_usd?: number;
  transferred_to_human: boolean;
  call_metadata?: any;
}

export interface Enquiry {
  id: string;
  created_at: string;
  name?: string;
  email?: string;
  phone?: string;
  message?: string;
  source?: 'chatbot' | 'contact_form' | 'phone' | 'email';
  status: 'new' | 'contacted' | 'qualified' | 'disqualified' | 'closed';
  assigned_to?: string;
  assigned_user_name?: string;
  notes?: string;
}

export interface Conversation {
  id: string;
  created_at: string;
  messages: Message[];
  lead_data?: any;
  score?: number;
  status?: string;
}

export interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp?: string;
}

export interface AnalyticsData {
  totalLeads: number;
  qualifiedLeads: number;
  totalCalls: number;
  avgScore: number;
  conversionRate: number;
  leadsOverTime: { date: string; count: number }[];
  leadsByType: { type: string; count: number }[];
  callStatusDist: { status: string; count: number }[];
  scoreDistribution: { range: string; count: number }[];
  recentLeads: Lead[];
  recentCalls: VapiCall[];
}
