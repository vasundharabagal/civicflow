export interface SeverityFactor {
  factor: string;
  points: number;
  max_points: number;
  detail: string;
}

export interface AIAnalysisResult {
  issueType: string;
  category: string;
  confidence: number;
  severityScore: number;
  severityLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  department: string;
  departmentCode: string;
  summary: string;
  evidenceObservations: string[];
  severityFactors: SeverityFactor[];
  departmentReason: string;
  missingInformation: string[];
  recommendedResponseTimeHours: number;
}

export interface ComplaintAction {
  id: number;
  complaint_id: number;
  action: string;
  actor: 'CITIZEN' | 'AI_AGENT' | 'SYSTEM' | 'OFFICER' | 'ADMIN';
  timestamp: string;
  reason?: string;
  evidence_references?: string[];
  old_status?: string;
  new_status?: string;
  metadata_json?: Record<string, any>;
}

export interface Complaint {
  id: number;
  tracking_number: string;
  title: string;
  description: string;
  category: string;
  issue_type: string;
  severity_score: number;
  severity_level: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  department: string;
  department_code?: string;
  status: string;
  latitude: number;
  longitude: number;
  address: string;
  landmark?: string;
  is_sensitive_location: boolean;
  citizen_name?: string;
  citizen_phone?: string;
  evidence_urls: string[];
  evidence_observations: string[];
  severity_factors: SeverityFactor[];
  resolution_evidence_urls: string[];
  resolution_notes?: string;
  citizen_feedback_rating?: number;
  citizen_feedback_comment?: string;
  support_count: number;
  sla_hours: number;
  sla_deadline?: string;
  sla_remaining_seconds?: number;
  sla_breached: boolean;
  followup_count: number;
  escalation_level: number;
  escalation_reason?: string;
  municipal_receipt_id?: string;
  assigned_officer?: string;
  acknowledged_at?: string;
  resolved_at?: string;
  closed_at?: string;
  created_at: string;
  updated_at: string;
  actions: ComplaintAction[];
}

export interface AnalyticsData {
  total_complaints: number;
  open_complaints: number;
  in_progress_complaints: number;
  resolved_complaints: number;
  escalated_complaints: number;
  sla_breached_count: number;
  sla_compliance_rate_pct: number;
  critical_count: number;
  high_count: number;
  medium_count: number;
  low_count: number;
  department_stats: Record<string, number>;
  recent_activities: Array<{
    id: number;
    complaint_id: number;
    action: string;
    actor: string;
    timestamp: string;
    reason?: string;
    old_status?: string;
    new_status?: string;
  }>;
}

const API_BASE = (import.meta as any).env?.VITE_API_BASE_URL || 'http://localhost:8000/api';

export async function analyzeComplaint(data: {
  description: string;
  has_image?: boolean;
  image_metadata?: Record<string, any>;
  location_name?: string;
  is_sensitive_location?: boolean;
  repeat_reports_count?: number;
}): Promise<AIAnalysisResult> {
  const res = await fetch(`${API_BASE}/analysis/analyze`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('AI analysis failed');
  return res.json();
}

export async function checkDuplicates(data: {
  description: string;
  category: string;
  latitude: number;
  longitude: number;
}): Promise<{ has_duplicates: boolean; duplicates: any[] }> {
  const res = await fetch(`${API_BASE}/analysis/check-duplicate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Duplicate check failed');
  return res.json();
}

export async function createComplaint(data: Partial<Complaint>): Promise<Complaint> {
  const res = await fetch(`${API_BASE}/complaints`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Failed to create complaint');
  return res.json();
}

export async function getComplaints(params?: {
  status?: string;
  severity?: string;
  department?: string;
  search?: string;
}): Promise<Complaint[]> {
  const query = new URLSearchParams();
  if (params?.status && params.status !== 'ALL') query.append('status', params.status);
  if (params?.severity && params.severity !== 'ALL') query.append('severity', params.severity);
  if (params?.department && params.department !== 'ALL') query.append('department', params.department);
  if (params?.search) query.append('search', params.search);

  const res = await fetch(`${API_BASE}/complaints?${query.toString()}`);
  if (!res.ok) throw new Error('Failed to fetch complaints');
  return res.json();
}

export async function getComplaint(id: number): Promise<Complaint> {
  const res = await fetch(`${API_BASE}/complaints/${id}`);
  if (!res.ok) throw new Error('Failed to fetch complaint');
  return res.json();
}

export async function updateComplaintStatus(id: number, data: {
  new_status: string;
  actor?: string;
  reason?: string;
  officer_name?: string;
  resolution_notes?: string;
  resolution_evidence_urls?: string[];
}): Promise<Complaint> {
  const res = await fetch(`${API_BASE}/complaints/${id}/status`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Status update failed' }));
    throw new Error(err.detail || 'Status update failed');
  }
  return res.json();
}

export async function triggerFollowUp(id: number, reason?: string): Promise<Complaint> {
  const res = await fetch(`${API_BASE}/complaints/${id}/follow-up`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ actor: 'AI_AGENT', reason: reason || 'SLA milestone reminder' }),
  });
  if (!res.ok) throw new Error('Follow-up failed');
  return res.json();
}

export async function escalateComplaint(id: number, reason: string, level = 1): Promise<Complaint> {
  const res = await fetch(`${API_BASE}/complaints/${id}/escalate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ actor: 'AI_AGENT', reason, escalation_level: level }),
  });
  if (!res.ok) throw new Error('Escalation failed');
  return res.json();
}

export async function verifyResolution(id: number, confirmed: boolean, rating = 5, feedback?: string): Promise<Complaint> {
  const res = await fetch(`${API_BASE}/complaints/${id}/verify-resolution`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ confirmed, rating, feedback }),
  });
  if (!res.ok) throw new Error('Resolution verification failed');
  return res.json();
}

export async function supportComplaint(id: number): Promise<Complaint> {
  const res = await fetch(`${API_BASE}/complaints/${id}/support`, {
    method: 'POST',
  });
  if (!res.ok) throw new Error('Support action failed');
  return res.json();
}

export async function getAnalytics(): Promise<AnalyticsData> {
  const res = await fetch(`${API_BASE}/analytics`);
  if (!res.ok) throw new Error('Failed to fetch analytics');
  return res.json();
}

export async function getDepartments(): Promise<any[]> {
  const res = await fetch(`${API_BASE}/departments`);
  if (!res.ok) throw new Error('Failed to fetch departments');
  return res.json();
}

export async function detectIncidents(): Promise<any> {
  const res = await fetch(`${API_BASE}/incidents/detect`);
  if (!res.ok) throw new Error('Failed to detect incidents');
  return res.json();
}
