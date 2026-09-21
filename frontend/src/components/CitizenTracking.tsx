import React, { useState } from 'react';
import {
  Clock,
  CheckCircle2,
  AlertOctagon,
  Shield,
  FileCheck,
  Star,
  RotateCcw,
  Bot,
  User,
  Building
} from 'lucide-react';
import { verifyResolution } from '../api';
import type { Complaint } from '../api';

interface CitizenTrackingProps {
  complaints: Complaint[];
  selectedComplaintId?: number;
  onSelectComplaint: (id: number) => void;
  onComplaintUpdated: (updated: Complaint) => void;
}

const LIFECYCLE_STEPS = [
  { key: 'SUBMITTED', label: 'Submitted' },
  { key: 'ACKNOWLEDGED', label: 'Acknowledged' },
  { key: 'ASSIGNED', label: 'Assigned' },
  { key: 'IN_PROGRESS', label: 'In Progress' },
  { key: 'RESOLUTION_REPORTED', label: 'Resolution Reported' },
  { key: 'RESOLVED', label: 'Resolved' },
  { key: 'CLOSED', label: 'Closed' }
];

export const CitizenTracking: React.FC<CitizenTrackingProps> = ({
  complaints,
  selectedComplaintId,
  onSelectComplaint,
  onComplaintUpdated
}) => {
  const [rating, setRating] = useState(5);
  const [feedback, setFeedback] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);

  const selected = complaints.find((c) => c.id === selectedComplaintId) || complaints[0];

  const handleVerify = async (confirmed: boolean) => {
    if (!selected) return;
    setIsVerifying(true);
    try {
      const updated = await verifyResolution(selected.id, confirmed, rating, feedback);
      onComplaintUpdated(updated);
      alert(confirmed ? 'Resolution confirmed! Thank you for improving our city.' : 'Complaint has been reopened for departmental review.');
    } catch (err) {
      console.error(err);
      alert('Verification action failed.');
    } finally {
      setIsVerifying(false);
    }
  };

  const getStepIndex = (status: string) => {
    const idx = LIFECYCLE_STEPS.findIndex((s) => s.key === status);
    if (idx !== -1) return idx;
    if (status === 'FOLLOW_UP_PENDING') return 1;
    if (status === 'ESCALATED') return 2;
    if (status === 'REOPENED') return 3;
    return 0;
  };

  const currentStepIdx = selected ? getStepIndex(selected.status) : 0;

  return (
    <div className="fade-in" style={{ display: 'grid', gridTemplateColumns: 'minmax(280px, 340px) 1fr', gap: '1.5rem' }}>
      {/* Complaints List Sidebar */}
      <div className="civic-card" style={{ height: 'fit-content', maxHeight: '820px', overflowY: 'auto' }}>
        <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Clock size={18} color="#6366f1" />
          <span>My Civic Reports ({complaints.length})</span>
        </h3>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {complaints.length === 0 ? (
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', textAlign: 'center', padding: '2rem 0' }}>
              No complaints filed yet. Report an issue to start tracking.
            </p>
          ) : (
            complaints.map((c) => {
              const isSel = selected && selected.id === c.id;
              return (
                <div
                  key={c.id}
                  onClick={() => onSelectComplaint(c.id)}
                  style={{
                    padding: '12px',
                    borderRadius: 'var(--radius-sm)',
                    background: isSel ? 'var(--bg-tertiary)' : 'var(--bg-secondary)',
                    border: isSel ? '1px solid var(--accent-primary)' : '1px solid var(--border-subtle)',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                    <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 700 }}>
                      {c.tracking_number}
                    </span>
                    <span className={`badge badge-${c.severity_level.toLowerCase()}`}>
                      {c.severity_level}
                    </span>
                  </div>
                  <h4 style={{ fontSize: '0.88rem', fontWeight: 600, color: '#f8fafc', marginBottom: '4px' }}>
                    {c.title}
                  </h4>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                    <span>{c.department_code || c.category}</span>
                    <span className="badge badge-status">{c.status}</span>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Selected Complaint Detail & Timeline */}
      {selected ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {/* Header Card */}
          <div className="civic-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                  <span style={{ fontSize: '0.8rem', color: 'var(--accent-secondary)', fontWeight: 700 }}>
                    {selected.tracking_number}
                  </span>
                  {selected.municipal_receipt_id && (
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      • Gateway Ref: {selected.municipal_receipt_id}
                    </span>
                  )}
                  {selected.is_sensitive_location && (
                    <span className="badge badge-critical" style={{ fontSize: '0.68rem' }}>
                      Sensitive Zone (School/Hospital)
                    </span>
                  )}
                </div>
                <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#f8fafc' }}>
                  {selected.title}
                </h2>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
                  {selected.address} {selected.landmark ? `(${selected.landmark})` : ''}
                </p>
              </div>

              {/* SLA & Status Box */}
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '6px' }}>
                <div style={{ display: 'flex', gap: '6px' }}>
                  <span className={`badge badge-${selected.severity_level.toLowerCase()}`}>
                    {selected.severity_level} ({selected.severity_score}/100)
                  </span>
                  <span className="badge badge-status" style={{ background: '#3b82f6', color: '#fff' }}>
                    {selected.status}
                  </span>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.78rem' }}>
                  <Clock size={14} color={selected.sla_breached ? '#ef4444' : '#10b981'} />
                  <span style={{ color: selected.sla_breached ? '#ef4444' : '#10b981', fontWeight: 600 }}>
                    {selected.sla_breached
                      ? 'SLA Milestone Breached'
                      : selected.sla_remaining_seconds && selected.sla_remaining_seconds > 0
                      ? `${Math.floor(selected.sla_remaining_seconds / 3600)}h ${Math.floor((selected.sla_remaining_seconds % 3600) / 60)}m SLA Remaining`
                      : `SLA Window: ${selected.sla_hours} hours`}
                  </span>
                </div>
              </div>
            </div>

            {/* Lifecycle Stepper */}
            <div className="stepper" style={{ marginTop: '2rem' }}>
              {LIFECYCLE_STEPS.map((step, idx) => {
                const isActive = idx === currentStepIdx;
                const isCompleted = idx < currentStepIdx || selected.status === 'RESOLVED' || selected.status === 'CLOSED';
                return (
                  <div
                    key={step.key}
                    className={`step-item ${isActive ? 'active' : ''} ${isCompleted ? 'completed' : ''}`}
                  >
                    <div className="step-circle">
                      {isCompleted ? <CheckCircle2 size={16} /> : idx + 1}
                    </div>
                    <span className="step-title">{step.label}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Citizen Verification Prompt (If RESOLUTION_REPORTED) */}
          {selected.status === 'RESOLUTION_REPORTED' && (
            <div className="civic-card" style={{ border: '2px solid #06b6d4', background: 'rgba(6, 182, 212, 0.08)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                <FileCheck size={22} color="#06b6d4" />
                <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#e0f2fe' }}>
                  Action Required: Verify Resolution
                </h3>
              </div>
              <p style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>
                The municipal authority has reported this issue as resolved. Please review the officer's work notes and verify if the issue has been satisfactorily fixed.
              </p>

              {selected.resolution_notes && (
                <div style={{ background: 'var(--bg-secondary)', padding: '12px', borderRadius: 'var(--radius-sm)', marginBottom: '1rem' }}>
                  <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>
                    Officer Resolution Notes:
                  </span>
                  <p style={{ fontSize: '0.85rem', color: '#f8fafc', marginTop: '2px' }}>
                    {selected.resolution_notes}
                  </p>
                </div>
              )}

              {selected.resolution_evidence_urls && selected.resolution_evidence_urls.length > 0 && (
                <div style={{ marginBottom: '1rem' }}>
                  <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', display: 'block', marginBottom: '4px' }}>
                    Completion Evidence Photo:
                  </span>
                  <img
                    src={selected.resolution_evidence_urls[0]}
                    alt="Resolution Evidence"
                    style={{ width: '200px', height: '120px', objectFit: 'cover', borderRadius: '8px', border: '1px solid var(--border-subtle)' }}
                  />
                </div>
              )}

              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Rate Work Quality:</span>
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Star
                      key={star}
                      size={20}
                      color={star <= rating ? '#f59e0b' : 'var(--text-muted)'}
                      fill={star <= rating ? '#f59e0b' : 'transparent'}
                      style={{ cursor: 'pointer' }}
                      onClick={() => setRating(star)}
                    />
                  ))}
                </div>

                <input
                  type="text"
                  value={feedback}
                  onChange={(e) => setFeedback(e.target.value)}
                  placeholder="Optional verification feedback or reopen reason..."
                  style={{
                    padding: '8px 12px',
                    borderRadius: 'var(--radius-sm)',
                    background: 'var(--bg-secondary)',
                    border: '1px solid var(--border-subtle)',
                    color: 'var(--text-primary)',
                    fontSize: '0.85rem',
                  }}
                />

                <div style={{ display: 'flex', gap: '10px', marginTop: '4px' }}>
                  <button
                    className="btn btn-success"
                    onClick={() => handleVerify(true)}
                    disabled={isVerifying}
                  >
                    <CheckCircle2 size={16} />
                    <span>Confirm Resolution</span>
                  </button>
                  <button
                    className="btn btn-danger"
                    onClick={() => handleVerify(false)}
                    disabled={isVerifying}
                  >
                    <RotateCcw size={16} />
                    <span>Reject & Reopen</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Immutable Activity Log / Audit Trail */}
          <div className="civic-card">
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Shield size={18} color="#6366f1" />
              <span>Immutable Activity Log & Audit Trail</span>
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {selected.actions.length === 0 ? (
                <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>No activity logs recorded yet.</p>
              ) : (
                selected.actions.map((act) => {
                  let actorColor = '#3b82f6';
                  let ActorIcon = User;
                  if (act.actor === 'AI_AGENT') {
                    actorColor = '#6366f1';
                    ActorIcon = Bot;
                  } else if (act.actor === 'SYSTEM') {
                    actorColor = '#f59e0b';
                    ActorIcon = AlertOctagon;
                  } else if (act.actor === 'OFFICER') {
                    actorColor = '#10b981';
                    ActorIcon = Building;
                  }

                  return (
                    <div
                      key={act.id}
                      style={{
                        display: 'flex',
                        gap: '12px',
                        padding: '10px 14px',
                        background: 'var(--bg-secondary)',
                        borderRadius: 'var(--radius-sm)',
                        borderLeft: `3px solid ${actorColor}`,
                      }}
                    >
                      <div
                        style={{
                          width: '32px',
                          height: '32px',
                          borderRadius: '50%',
                          background: `${actorColor}20`,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: actorColor,
                          flexShrink: 0,
                        }}
                      >
                        <ActorIcon size={16} />
                      </div>

                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#f8fafc' }}>
                            {act.action.replace('_', ' ')}
                          </span>
                          <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                            {new Date(act.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} •{' '}
                            {new Date(act.timestamp).toLocaleDateString()}
                          </span>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', margin: '3px 0' }}>
                          <span style={{ fontSize: '0.72rem', fontWeight: 600, color: actorColor }}>
                            {act.actor}
                          </span>
                          {act.old_status && act.new_status && (
                            <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                              {act.old_status} → <strong>{act.new_status}</strong>
                            </span>
                          )}
                        </div>

                        {act.reason && (
                          <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '2px', lineHeight: 1.4 }}>
                            {act.reason}
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
};
