import React, { useState } from 'react';
import {
  Zap,
  Clock,
  CheckCircle2,
  ShieldAlert,
  Shield,
  FileCheck,
  Sparkles,
  Building
} from 'lucide-react';
import {
  analyzeComplaint,
  createComplaint,
  triggerFollowUp,
  escalateComplaint,
  updateComplaintStatus,
  verifyResolution
} from '../api';
import type { Complaint } from '../api';

interface JudgeDemoViewProps {
  onComplaintCreated: (c: Complaint) => void;
  onComplaintUpdated: (c: Complaint) => void;
}

const DEMO_SCENARIO = {
  title: 'Open Manhole near School on Main Road',
  description: 'Uncovered manhole with missing cast-iron cover located 40 meters from St. Xavier School on the main public roadway. Poses immediate fall and accident hazard for students and vehicular traffic.',
  address: 'MG Road, near St. Xavier High School, Camp, Pune',
  landmark: 'Opposite St. Xavier School Main Gate',
  isSensitive: true,
  image: 'https://images.unsplash.com/photo-1541888946425-d0fbb186f5f8?w=800&q=80',
  resolutionPhoto: 'https://images.unsplash.com/photo-1590402494587-44b71d7772f6?w=800&q=80',
  coordinates: { lat: 18.5204, lng: 73.8567 }
};

export const JudgeDemoView: React.FC<JudgeDemoViewProps> = ({
  onComplaintCreated,
  onComplaintUpdated
}) => {
  const [currentStep, setCurrentStep] = useState<number>(0);
  const [demoComplaint, setDemoComplaint] = useState<Complaint | null>(null);
  const [isBusy, setIsBusy] = useState<boolean>(false);
  const [statusMessage, setStatusMessage] = useState<string>('Ready to begin evaluation demo.');

  // 1. Start Demo: Run AI triage and submit structured complaint
  const handleStartDemo = async () => {
    setIsBusy(true);
    setStatusMessage('Running AI Multimodal Triage on Open Manhole scenario...');
    try {
      // 1. Run AI analysis
      const analysis = await analyzeComplaint({
        description: DEMO_SCENARIO.description,
        has_image: true,
        image_metadata: { detected_objects: ['uncovered drainage opening', 'road curb'] },
        location_name: DEMO_SCENARIO.address,
        is_sensitive_location: DEMO_SCENARIO.isSensitive,
        repeat_reports_count: 1
      });

      setStatusMessage('AI classified OPEN_MANHOLE (CRITICAL 84/100). Submitting to Demo Municipal Gateway...');

      // 2. Submit complaint
      const created = await createComplaint({
        title: DEMO_SCENARIO.title,
        description: DEMO_SCENARIO.description,
        category: analysis.category,
        issue_type: analysis.issueType,
        severity_score: analysis.severityScore,
        severity_level: analysis.severityLevel,
        department: analysis.department,
        department_code: analysis.departmentCode,
        latitude: DEMO_SCENARIO.coordinates.lat,
        longitude: DEMO_SCENARIO.coordinates.lng,
        address: DEMO_SCENARIO.address,
        landmark: DEMO_SCENARIO.landmark,
        is_sensitive_location: DEMO_SCENARIO.isSensitive,
        citizen_name: 'Aarav Deshmukh (Parent)',
        citizen_phone: '+91 98220 54321',
        evidence_urls: [DEMO_SCENARIO.image],
        evidence_observations: analysis.evidenceObservations,
        severity_factors: analysis.severityFactors
      });

      setDemoComplaint(created);
      onComplaintCreated(created);
      setCurrentStep(1);
      setStatusMessage(`Complaint ${created.tracking_number} submitted with 4-hour SLA. Waiting for departmental action.`);
    } catch (err) {
      console.error(err);
      setStatusMessage('Error executing demo start. Ensure backend is running.');
    } finally {
      setIsBusy(false);
    }
  };

  // 2. Simulate SLA Breach & Auto Follow-up
  const handleSimulateSlaBreach = async () => {
    if (!demoComplaint) return;
    setIsBusy(true);
    setStatusMessage('Simulating time advance past 4-hour SLA deadline. AI Agent triggering automated follow-up...');
    try {
      const updated = await triggerFollowUp(
        demoComplaint.id,
        'CRITICAL SLA threshold exceeded without authority acknowledgment. Urgent automated reminder dispatched to Drainage Department.'
      );
      setDemoComplaint(updated);
      onComplaintUpdated(updated);
      setCurrentStep(2);
      setStatusMessage(`Automated Follow-up #1 issued by AI_AGENT to Drainage & Sewerage Department.`);
    } catch (err) {
      console.error(err);
      setStatusMessage('Failed to trigger SLA follow-up.');
    } finally {
      setIsBusy(false);
    }
  };

  // 3. Simulate Authority Inactivity & Escalation
  const handleSimulateEscalation = async () => {
    if (!demoComplaint) return;
    setIsBusy(true);
    setStatusMessage('Department remains inactive. AI Agent triggering automatic escalation to Ward Executive Engineer...');
    try {
      const updated = await escalateComplaint(
        demoComplaint.id,
        'Multiple SLA breaches and urgent safety risk beside school. Escalated to Ward Executive Engineer.',
        1
      );
      setDemoComplaint(updated);
      onComplaintUpdated(updated);
      setCurrentStep(3);
      setStatusMessage(`Complaint escalated to Ward Executive Engineer (Level 1 Escalation).`);
    } catch (err) {
      console.error(err);
      setStatusMessage('Failed to escalate complaint.');
    } finally {
      setIsBusy(false);
    }
  };

  // 4. Simulate Authority Response & Work In Progress
  const handleSimulateAuthorityResponse = async () => {
    if (!demoComplaint) return;
    setIsBusy(true);
    setStatusMessage('Executive Engineer acknowledges escalation. Deploying municipal drainage emergency crew...');
    try {
      const updated = await updateComplaintStatus(demoComplaint.id, {
        new_status: 'IN_PROGRESS',
        actor: 'OFFICER',
        officer_name: 'Er. Rajesh Kulkarni (Executive Engineer)',
        reason: 'Emergency road crew deployed with replacement cast-iron cover and concrete mix.'
      });
      setDemoComplaint(updated);
      onComplaintUpdated(updated);
      setCurrentStep(4);
      setStatusMessage('Emergency crew on site. Status shifted to IN_PROGRESS.');
    } catch (err) {
      console.error(err);
      setStatusMessage('Failed to update authority response.');
    } finally {
      setIsBusy(false);
    }
  };

  // 5. Report Resolution with Evidence
  const handleReportResolution = async () => {
    if (!demoComplaint) return;
    setIsBusy(true);
    setStatusMessage('Field crew installs replacement cover and uploads photographic proof of completion...');
    try {
      const updated = await updateComplaintStatus(demoComplaint.id, {
        new_status: 'RESOLUTION_REPORTED',
        actor: 'OFFICER',
        officer_name: 'Er. Rajesh Kulkarni',
        reason: 'Heavy-duty 600mm cast-iron manhole cover installed, leveled with asphalt, and sealed.',
        resolution_notes: 'Replacement complete. Manhole covered and safe for vehicular traffic.',
        resolution_evidence_urls: [DEMO_SCENARIO.resolutionPhoto]
      });
      setDemoComplaint(updated);
      onComplaintUpdated(updated);
      setCurrentStep(5);
      setStatusMessage('Resolution reported by officer with evidence photo. Sent to citizen for verification.');
    } catch (err) {
      console.error(err);
      setStatusMessage('Failed to report resolution.');
    } finally {
      setIsBusy(false);
    }
  };

  // 6. Citizen Confirm Resolution
  const handleCitizenConfirm = async () => {
    if (!demoComplaint) return;
    setIsBusy(true);
    setStatusMessage('Citizen inspects site, confirms repair, and awards 5-star rating...');
    try {
      const updated = await verifyResolution(
        demoComplaint.id,
        true,
        5,
        'Citizen verified on site: The open manhole has been completely sealed with a new cover. Hazard eliminated.'
      );
      setDemoComplaint(updated);
      onComplaintUpdated(updated);
      setCurrentStep(6);
      setStatusMessage('DEMO COMPLETE: Citizen confirmed resolution. Complaint RESOLVED and closed in audit trail!');
    } catch (err) {
      console.error(err);
      setStatusMessage('Failed to confirm resolution.');
    } finally {
      setIsBusy(false);
    }
  };

  return (
    <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Judge Mode Hero Banner */}
      <div className="civic-card" style={{ background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.15), rgba(239, 68, 68, 0.15))', border: '1px solid rgba(245, 158, 11, 0.4)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span className="badge badge-critical" style={{ fontSize: '0.75rem' }}>
                ⚡ Hackathon Judge Demonstration
              </span>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                Scenario: <strong>OPEN MANHOLE NEAR SCHOOL / BUSY ROAD</strong>
              </span>
            </div>
            <h2 style={{ fontSize: '1.6rem', fontWeight: 800, marginTop: '6px' }}>
              Agentic Civic Resolution Workflow
            </h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem', maxWidth: '750px', marginTop: '4px' }}>
              Step through the full autonomous lifecycle: Multimodal Intake → AI Classification → Evidence Grounding → Severity Engine (84/100) → Centralized Routing → SLA Monitoring → Auto Follow-up → Escalation → Authority Action → Citizen Verification → Audit Trail.
            </p>
          </div>

          <div style={{ background: 'var(--bg-secondary)', padding: '10px 16px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)', minWidth: '220px' }}>
            <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>
              Current Stage:
            </span>
            <div style={{ fontSize: '1.05rem', fontWeight: 800, color: '#f59e0b', marginTop: '2px' }}>
              {currentStep === 0 && 'Stage 0: Uninitialized'}
              {currentStep === 1 && 'Stage 1: AI Triage & Submission'}
              {currentStep === 2 && 'Stage 2: SLA Breach & Follow-up'}
              {currentStep === 3 && 'Stage 3: Auto-Escalation'}
              {currentStep === 4 && 'Stage 4: Authority Action'}
              {currentStep === 5 && 'Stage 5: Resolution Proof'}
              {currentStep === 6 && 'Stage 6: Citizen Verified (Done)'}
            </div>
          </div>
        </div>

        {/* Live Status Message Bar */}
        <div style={{ marginTop: '1.2rem', padding: '10px 14px', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-sm)', borderLeft: '4px solid #f59e0b', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span className="pulse-dot" style={{ background: isBusy ? '#f59e0b' : '#10b981' }}></span>
          <span style={{ fontSize: '0.85rem', color: '#f8fafc', fontWeight: 500 }}>
            {statusMessage}
          </span>
        </div>
      </div>

      {/* Interactive Demonstration Controls */}
      <div className="civic-card">
        <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
          Interactive Judge Controls
        </h3>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '10px' }}>
          <button
            className="btn btn-primary"
            onClick={handleStartDemo}
            disabled={isBusy}
            style={{ padding: '10px 14px' }}
          >
            <Sparkles size={16} />
            <span>1. Start Demo (AI Intake)</span>
          </button>

          <button
            className="btn btn-secondary"
            onClick={handleSimulateSlaBreach}
            disabled={isBusy || !demoComplaint || currentStep < 1}
            style={{ padding: '10px 14px' }}
          >
            <Clock size={16} color="#f59e0b" />
            <span>2. Simulate SLA Breach</span>
          </button>

          <button
            className="btn btn-secondary"
            onClick={handleSimulateEscalation}
            disabled={isBusy || !demoComplaint || currentStep < 2}
            style={{ padding: '10px 14px' }}
          >
            <ShieldAlert size={16} color="#ef4444" />
            <span>3. Escalate Complaint</span>
          </button>

          <button
            className="btn btn-secondary"
            onClick={handleSimulateAuthorityResponse}
            disabled={isBusy || !demoComplaint || currentStep < 3}
            style={{ padding: '10px 14px' }}
          >
            <Building size={16} color="#06b6d4" />
            <span>4. Authority In Progress</span>
          </button>

          <button
            className="btn btn-secondary"
            onClick={handleReportResolution}
            disabled={isBusy || !demoComplaint || currentStep < 4}
            style={{ padding: '10px 14px' }}
          >
            <FileCheck size={16} color="#10b981" />
            <span>5. Report Resolution</span>
          </button>

          <button
            className="btn btn-success"
            onClick={handleCitizenConfirm}
            disabled={isBusy || !demoComplaint || currentStep < 5}
            style={{ padding: '10px 14px' }}
          >
            <CheckCircle2 size={16} />
            <span>6. Citizen Confirm & Close</span>
          </button>
        </div>
      </div>

      {/* Demo Complaint Dossier and Audit Trail Split */}
      {demoComplaint ? (
        <div style={{ display: 'grid', gridTemplateColumns: '1.1fr 1fr', gap: '1.5rem' }}>
          {/* Left: Complaint Dossier */}
          <div className="civic-card" style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <span style={{ fontSize: '0.8rem', color: 'var(--accent-secondary)', fontWeight: 700 }}>
                  {demoComplaint.tracking_number} • Gateway: {demoComplaint.municipal_receipt_id}
                </span>
                <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#f8fafc', marginTop: '2px' }}>
                  {demoComplaint.title}
                </h3>
                <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                  {demoComplaint.address}
                </p>
              </div>

              <span className="badge badge-critical" style={{ padding: '6px 10px', fontSize: '0.8rem' }}>
                CRITICAL ({demoComplaint.severity_score}/100)
              </span>
            </div>

            {/* Evidence Image */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <div>
                <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', display: 'block', marginBottom: '4px' }}>
                  Intake Evidence (Open Manhole):
                </span>
                <img
                  src={DEMO_SCENARIO.image}
                  alt="Open Manhole"
                  style={{ width: '100%', height: '140px', objectFit: 'cover', borderRadius: '8px', border: '1px solid var(--border-subtle)' }}
                />
              </div>

              {currentStep >= 5 && (
                <div className="fade-in">
                  <span style={{ fontSize: '0.72rem', color: '#10b981', fontWeight: 600, textTransform: 'uppercase', display: 'block', marginBottom: '4px' }}>
                    Resolution Evidence (Fixed Lid):
                  </span>
                  <img
                    src={DEMO_SCENARIO.resolutionPhoto}
                    alt="Repaired Cover"
                    style={{ width: '100%', height: '140px', objectFit: 'cover', borderRadius: '8px', border: '2px solid #10b981' }}
                  />
                </div>
              )}
            </div>

            {/* Grounded Evidence Chips */}
            <div>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', display: 'block', marginBottom: '6px' }}>
                Evidence Grounding:
              </span>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                {demoComplaint.evidence_observations.map((obs, i) => (
                  <div key={i} style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <CheckCircle2 size={14} color="#10b981" />
                    <span>{obs}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Severity Factors Breakdown (Deterministic 84/100) */}
            <div>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', display: 'block', marginBottom: '6px' }}>
                Deterministic Severity Breakdown:
              </span>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                {demoComplaint.severity_factors.map((f: any) => (
                  <div key={f.factor} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', background: 'var(--bg-secondary)', padding: '5px 8px', borderRadius: '4px' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>{f.factor}</span>
                    <strong style={{ color: '#f59e0b' }}>+{f.points} / {f.max_points}</strong>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right: Live Immutable Audit Trail */}
          <div className="civic-card" style={{ height: 'fit-content', maxHeight: '680px', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Shield size={18} color="#6366f1" />
                <h3 style={{ fontSize: '1.1rem', fontWeight: 700 }}>Live Immutable Audit Trail</h3>
              </div>
              <span className="badge badge-status" style={{ fontSize: '0.72rem' }}>
                {demoComplaint.actions.length} Events Logged
              </span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {demoComplaint.actions.map((act) => {
                let color = '#3b82f6';
                if (act.actor === 'AI_AGENT') color = '#6366f1';
                else if (act.actor === 'SYSTEM') color = '#ef4444';
                else if (act.actor === 'OFFICER') color = '#10b981';

                return (
                  <div
                    key={act.id}
                    className="fade-in"
                    style={{
                      background: 'var(--bg-secondary)',
                      padding: '10px 12px',
                      borderRadius: 'var(--radius-sm)',
                      borderLeft: `4px solid ${color}`,
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '3px',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <strong style={{ fontSize: '0.85rem', color: '#f8fafc' }}>
                        {act.action.replace('_', ' ')}
                      </strong>
                      <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                        {new Date(act.timestamp).toLocaleTimeString()}
                      </span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span style={{ fontSize: '0.72rem', fontWeight: 700, color }}>
                        {act.actor}
                      </span>
                      {act.old_status && act.new_status && (
                        <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                          • {act.old_status} → <strong>{act.new_status}</strong>
                        </span>
                      )}
                    </div>

                    {act.reason && (
                      <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '2px', lineHeight: 1.35 }}>
                        {act.reason}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      ) : (
        /* Empty State */
        <div className="civic-card" style={{ textAlign: 'center', padding: '3.5rem 1.5rem', color: 'var(--text-muted)' }}>
          <Zap size={44} style={{ margin: '0 auto 12px', opacity: 0.5, color: '#f59e0b' }} />
          <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: '#f8fafc' }}>
            Primary Hackathon Demo Ready
          </h3>
          <p style={{ maxWidth: '520px', margin: '6px auto 16px', fontSize: '0.88rem' }}>
            Click <strong>"1. Start Demo (AI Intake)"</strong> above to initiate the Open Manhole near School demonstration flow.
          </p>
        </div>
      )}
    </div>
  );
};
