import React, { useState } from 'react';
import {
  AlertTriangle,
  Clock,
  CheckCircle,
  UserCheck,
  Filter
} from 'lucide-react';
import { updateComplaintStatus } from '../api';
import type { Complaint } from '../api';

interface OfficerPortalProps {
  complaints: Complaint[];
  onComplaintUpdated: (updated: Complaint) => void;
}

export const OfficerPortal: React.FC<OfficerPortalProps> = ({
  complaints,
  onComplaintUpdated
}) => {
  const [selectedDept, setSelectedDept] = useState('ALL');
  const [selectedStatus, setSelectedStatus] = useState('ALL');
  const [activeComplaint, setActiveComplaint] = useState<Complaint | null>(null);

  // Resolution modal state
  const [showResolutionModal, setShowResolutionModal] = useState(false);
  const [resolutionNotes, setResolutionNotes] = useState('Work completed by municipal road crew. Heavy-duty cast-iron manhole cover installed and sealed with concrete.');
  const [resolutionPhoto, setResolutionPhoto] = useState('https://images.unsplash.com/photo-1590402494587-44b71d7772f6?w=800&q=80');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Filter complaints
  const filtered = complaints.filter((c) => {
    if (selectedDept !== 'ALL' && c.department !== selectedDept) return false;
    if (selectedStatus !== 'ALL' && c.status !== selectedStatus) return false;
    return true;
  });

  // Sort by urgency: Critical first, then lowest SLA remaining seconds
  const sorted = [...filtered].sort((a, b) => {
    const sevScore: Record<string, number> = { CRITICAL: 4, HIGH: 3, MEDIUM: 2, LOW: 1 };
    const diff = (sevScore[b.severity_level] || 0) - (sevScore[a.severity_level] || 0);
    if (diff !== 0) return diff;
    return (a.sla_remaining_seconds || 999999) - (b.sla_remaining_seconds || 999999);
  });

  // Critical complaints count
  const criticalList = complaints.filter((c) => c.severity_level === 'CRITICAL' && c.status !== 'RESOLVED' && c.status !== 'CLOSED');

  // Handle officer state machine updates
  const handleStatusUpdate = async (complaintId: number, targetStatus: string) => {
    try {
      const updated = await updateComplaintStatus(complaintId, {
        new_status: targetStatus,
        actor: 'OFFICER',
        officer_name: 'Er. Rajesh Kulkarni (Executive Engineer)',
        reason: `Officer shifted status to ${targetStatus} via Officer Priority Terminal`
      });
      onComplaintUpdated(updated);
      if (activeComplaint && activeComplaint.id === complaintId) {
        setActiveComplaint(updated);
      }
    } catch (err: any) {
      alert(err.message || 'Status transition failed');
    }
  };

  // Handle officer submitting resolution
  const handleSubmitResolution = async () => {
    if (!activeComplaint) return;
    setIsSubmitting(true);
    try {
      const updated = await updateComplaintStatus(activeComplaint.id, {
        new_status: 'RESOLUTION_REPORTED',
        actor: 'OFFICER',
        officer_name: 'Er. Rajesh Kulkarni',
        reason: 'Officer reported completion with photographic proof',
        resolution_notes: resolutionNotes,
        resolution_evidence_urls: resolutionPhoto ? [resolutionPhoto] : []
      });
      onComplaintUpdated(updated);
      setActiveComplaint(updated);
      setShowResolutionModal(false);
      alert('Resolution filed! Notified citizen for verification.');
    } catch (err: any) {
      alert(err.message || 'Resolution submission failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Critical Alert Banner */}
      {criticalList.length > 0 && (
        <div className="civic-card" style={{ border: '2px solid #ef4444', background: 'rgba(239, 68, 68, 0.1)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span className="pulse-dot" style={{ background: '#ef4444', boxShadow: '0 0 10px #ef4444' }}></span>
              <AlertTriangle size={20} color="#ef4444" />
              <div>
                <strong style={{ fontSize: '1rem', color: '#fca5a5' }}>
                  Critical Priority Alert: {criticalList.length} Immediate Hazard Cases
                </strong>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                  Active complaints categorized as CRITICAL requiring 4-hour SLA departmental intervention.
                </p>
              </div>
            </div>
            <button
              className="btn btn-danger"
              style={{ fontSize: '0.8rem', padding: '6px 14px' }}
              onClick={() => setSelectedStatus('ALL')}
            >
              View Critical Queue
            </button>
          </div>
        </div>
      )}

      {/* Filter Toolbar */}
      <div className="civic-card" style={{ padding: '1rem 1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Filter size={18} color="var(--accent-primary)" />
            <span style={{ fontSize: '0.9rem', fontWeight: 700 }}>Priority Dispatch Queue ({sorted.length})</span>
          </div>

          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              style={{
                padding: '6px 12px',
                borderRadius: 'var(--radius-sm)',
                background: 'var(--bg-secondary)',
                border: '1px solid var(--border-subtle)',
                color: 'var(--text-primary)',
                fontSize: '0.82rem',
              }}
            >
              <option value="ALL">All Statuses</option>
              <option value="SUBMITTED">SUBMITTED</option>
              <option value="ACKNOWLEDGED">ACKNOWLEDGED</option>
              <option value="IN_PROGRESS">IN_PROGRESS</option>
              <option value="RESOLUTION_REPORTED">RESOLUTION_REPORTED</option>
              <option value="ESCALATED">ESCALATED</option>
              <option value="RESOLVED">RESOLVED</option>
            </select>

            <select
              value={selectedDept}
              onChange={(e) => setSelectedDept(e.target.value)}
              style={{
                padding: '6px 12px',
                borderRadius: 'var(--radius-sm)',
                background: 'var(--bg-secondary)',
                border: '1px solid var(--border-subtle)',
                color: 'var(--text-primary)',
                fontSize: '0.82rem',
              }}
            >
              <option value="ALL">All Departments</option>
              <option value="Drainage & Sewerage Department">Drainage & Sewerage</option>
              <option value="Roads & Public Works Department">Roads & Public Works</option>
              <option value="Solid Waste Management Department">Solid Waste Management</option>
              <option value="Water Supply Department">Water Supply</option>
              <option value="Electrical & Street Lighting Department">Electrical</option>
            </select>
          </div>
        </div>
      </div>

      {/* Main Queue & Active Detail Split */}
      <div style={{ display: 'grid', gridTemplateColumns: activeComplaint ? '1fr 1fr' : '1fr', gap: '1.5rem' }}>
        {/* Complaints Table */}
        <div className="civic-card" style={{ padding: '0.75rem', overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-subtle)', color: 'var(--text-muted)' }}>
                <th style={{ padding: '10px 12px' }}>Tracking / Title</th>
                <th style={{ padding: '10px 12px' }}>Severity</th>
                <th style={{ padding: '10px 12px' }}>Department</th>
                <th style={{ padding: '10px 12px' }}>Status</th>
                <th style={{ padding: '10px 12px' }}>SLA Target</th>
                <th style={{ padding: '10px 12px', textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {sorted.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                    No matching complaints in officer queue.
                  </td>
                </tr>
              ) : (
                sorted.map((c) => {
                  const isCritical = c.severity_level === 'CRITICAL';
                  const isSelected = activeComplaint?.id === c.id;
                  return (
                    <tr
                      key={c.id}
                      onClick={() => setActiveComplaint(c)}
                      style={{
                        borderBottom: '1px solid var(--border-subtle)',
                        background: isSelected
                          ? 'var(--bg-tertiary)'
                          : isCritical && c.status !== 'RESOLVED'
                          ? 'rgba(239, 68, 68, 0.05)'
                          : 'transparent',
                        cursor: 'pointer',
                        transition: 'background 0.2s',
                      }}
                    >
                      <td style={{ padding: '12px' }}>
                        <div style={{ fontWeight: 700, color: '#f8fafc' }}>{c.tracking_number}</div>
                        <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', maxWidth: '200px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {c.title}
                        </div>
                      </td>
                      <td style={{ padding: '12px' }}>
                        <span className={`badge badge-${c.severity_level.toLowerCase()}`}>
                          {c.severity_level} ({c.severity_score})
                        </span>
                      </td>
                      <td style={{ padding: '12px', color: 'var(--text-secondary)', fontSize: '0.8rem' }}>
                        {c.department_code || c.department.split(' ')[0]}
                      </td>
                      <td style={{ padding: '12px' }}>
                        <span className="badge badge-status" style={{ fontSize: '0.72rem' }}>
                          {c.status}
                        </span>
                      </td>
                      <td style={{ padding: '12px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.75rem', color: c.sla_breached ? '#ef4444' : '#10b981' }}>
                          <Clock size={12} />
                          <span>{c.sla_breached ? 'Breached' : `${c.sla_hours}h SLA`}</span>
                        </div>
                      </td>
                      <td style={{ padding: '12px', textAlign: 'right' }}>
                        <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end' }}>
                          {c.status === 'SUBMITTED' && (
                            <button
                              className="btn btn-secondary"
                              style={{ padding: '4px 8px', fontSize: '0.75rem' }}
                              onClick={(e) => {
                                e.stopPropagation();
                                handleStatusUpdate(c.id, 'ACKNOWLEDGED');
                              }}
                            >
                              Acknowledge
                            </button>
                          )}
                          {(c.status === 'ACKNOWLEDGED' || c.status === 'FOLLOW_UP_PENDING' || c.status === 'ESCALATED') && (
                            <button
                              className="btn btn-primary"
                              style={{ padding: '4px 8px', fontSize: '0.75rem' }}
                              onClick={(e) => {
                                e.stopPropagation();
                                handleStatusUpdate(c.id, 'IN_PROGRESS');
                              }}
                            >
                              Start Work
                            </button>
                          )}
                          {c.status === 'IN_PROGRESS' && (
                            <button
                              className="btn btn-success"
                              style={{ padding: '4px 8px', fontSize: '0.75rem' }}
                              onClick={(e) => {
                                e.stopPropagation();
                                setActiveComplaint(c);
                                setShowResolutionModal(true);
                              }}
                            >
                              Report Fix
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Selected Complaint Officer Terminal */}
        {activeComplaint && (
          <div className="civic-card fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <span style={{ fontSize: '0.75rem', color: 'var(--accent-secondary)', fontWeight: 700 }}>
                  {activeComplaint.tracking_number} • {activeComplaint.department}
                </span>
                <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#f8fafc', marginTop: '2px' }}>
                  {activeComplaint.title}
                </h3>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                  {activeComplaint.address}
                </p>
              </div>
              <button
                className="btn btn-secondary"
                style={{ padding: '3px 8px', fontSize: '0.75rem' }}
                onClick={() => setActiveComplaint(null)}
              >
                ✕ Close
              </button>
            </div>

            {/* Description & Citizen Telemetry */}
            <div style={{ background: 'var(--bg-secondary)', padding: '12px', borderRadius: 'var(--radius-sm)' }}>
              <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>
                Citizen Description:
              </span>
              <p style={{ fontSize: '0.85rem', color: '#f8fafc', marginTop: '2px' }}>
                {activeComplaint.description}
              </p>
            </div>

            {/* Evidence & AI Grounding */}
            {activeComplaint.evidence_urls && activeComplaint.evidence_urls.length > 0 && (
              <div>
                <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', display: 'block', marginBottom: '6px' }}>
                  Citizen Attached Photo:
                </span>
                <img
                  src={activeComplaint.evidence_urls[0]}
                  alt="Citizen Evidence"
                  style={{ width: '100%', height: '160px', objectFit: 'cover', borderRadius: '8px', border: '1px solid var(--border-subtle)' }}
                />
              </div>
            )}

            {/* Officer Action Bar */}
            <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '1rem', display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
              {activeComplaint.status === 'SUBMITTED' && (
                <button
                  className="btn btn-secondary"
                  onClick={() => handleStatusUpdate(activeComplaint.id, 'ACKNOWLEDGED')}
                >
                  <UserCheck size={16} />
                  <span>Acknowledge Receipt</span>
                </button>
              )}

              {activeComplaint.status !== 'IN_PROGRESS' && activeComplaint.status !== 'RESOLVED' && activeComplaint.status !== 'CLOSED' && activeComplaint.status !== 'RESOLUTION_REPORTED' && (
                <button
                  className="btn btn-primary"
                  onClick={() => handleStatusUpdate(activeComplaint.id, 'IN_PROGRESS')}
                >
                  <Clock size={16} />
                  <span>Deploy Crew (In Progress)</span>
                </button>
              )}

              {activeComplaint.status === 'IN_PROGRESS' && (
                <button
                  className="btn btn-success"
                  onClick={() => setShowResolutionModal(true)}
                >
                  <CheckCircle size={16} />
                  <span>Report Work Resolution</span>
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Resolution Submission Modal */}
      {showResolutionModal && activeComplaint && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.75)',
          backdropFilter: 'blur(8px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 2000,
          padding: '1rem',
        }}>
          <div className="civic-card fade-in" style={{ width: '100%', maxWidth: '520px', background: 'var(--bg-secondary)' }}>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 800, marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <CheckCircle size={20} color="#10b981" />
              <span>Report Resolution Completion</span>
            </h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '1.2rem' }}>
              Submit on-site repair proof for complaint <strong>{activeComplaint.tracking_number}</strong>.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 600, display: 'block', marginBottom: '4px' }}>
                  Resolution Notes:
                </label>
                <textarea
                  rows={3}
                  value={resolutionNotes}
                  onChange={(e) => setResolutionNotes(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: 'var(--radius-sm)',
                    background: 'var(--bg-tertiary)',
                    border: '1px solid var(--border-subtle)',
                    color: 'var(--text-primary)',
                    fontSize: '0.85rem',
                  }}
                />
              </div>

              <div>
                <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 600, display: 'block', marginBottom: '4px' }}>
                  Completion Photo Evidence:
                </label>
                <input
                  type="text"
                  value={resolutionPhoto}
                  onChange={(e) => setResolutionPhoto(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: 'var(--radius-sm)',
                    background: 'var(--bg-tertiary)',
                    border: '1px solid var(--border-subtle)',
                    color: 'var(--text-primary)',
                    fontSize: '0.85rem',
                    marginBottom: '8px',
                  }}
                />
                {resolutionPhoto && (
                  <img
                    src={resolutionPhoto}
                    alt="Completion Proof"
                    style={{ width: '100%', height: '140px', objectFit: 'cover', borderRadius: '8px' }}
                  />
                )}
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '0.5rem' }}>
                <button
                  className="btn btn-secondary"
                  onClick={() => setShowResolutionModal(false)}
                >
                  Cancel
                </button>
                <button
                  className="btn btn-success"
                  onClick={handleSubmitResolution}
                  disabled={isSubmitting}
                >
                  {isSubmitting ? 'Filing...' : 'Submit Resolution Proof'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
