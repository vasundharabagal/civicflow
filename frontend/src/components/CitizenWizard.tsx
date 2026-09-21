import React, { useState } from 'react';
import {
  Sparkles,
  Camera,
  Mic,
  MapPin,
  AlertTriangle,
  CheckCircle2,
  ThumbsUp,
  FileText,
  ArrowRight,
  Shield,
  Layers
} from 'lucide-react';
import { CivicMap } from './CivicMap';
import {
  analyzeComplaint,
  checkDuplicates,
  createComplaint,
  supportComplaint
} from '../api';
import type { AIAnalysisResult, Complaint } from '../api';

interface CitizenWizardProps {
  onComplaintCreated: (complaint: Complaint) => void;
}

const SAMPLE_PRESETS = [
  {
    name: 'Open Manhole near School',
    issueType: 'OPEN_MANHOLE',
    description: 'Dangerous open manhole with missing cover on main road right beside St. Xavier School. Immediate fall hazard for pedestrians and two-wheelers.',
    location: 'MG Road, near St. Xavier High School, Camp, Pune',
    lat: 18.5204,
    lng: 73.8567,
    isSensitive: true,
    image: 'https://images.unsplash.com/photo-1541888946425-d0fbb186f5f8?w=800&q=80'
  },
  {
    name: 'Severe Pothole Cluster',
    issueType: 'POTHOLE',
    description: 'Deep pothole crater spanning middle lane, causing severe vehicle slowdowns and accident hazard.',
    location: 'Shivaji Road, Shivajinagar, Pune',
    lat: 18.5314,
    lng: 73.8446,
    isSensitive: false,
    image: 'https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?w=800&q=80'
  },
  {
    name: 'Overflowing Waste Dump',
    issueType: 'GARBAGE',
    description: 'Uncollected garbage piling across pedestrian sidewalk attracting stray animals and blocking drainage.',
    location: 'Mahadwar Road, Kolhapur',
    lat: 16.7050,
    lng: 74.2433,
    isSensitive: false,
    image: 'https://images.unsplash.com/photo-1530587191325-3db32d826c18?w=800&q=80'
  },
  {
    name: 'Ruptured Water Main',
    issueType: 'WATER_LEAKAGE',
    description: 'Pressurized water supply main burst, flooding roadway and wasting municipal drinking water.',
    location: 'Marine Drive, Churchgate, Mumbai',
    lat: 18.9220,
    lng: 72.8347,
    isSensitive: false,
    image: 'https://images.unsplash.com/photo-1584467735815-f778f274e296?w=800&q=80'
  }
];

export const CitizenWizard: React.FC<CitizenWizardProps> = ({ onComplaintCreated }) => {
  const [description, setDescription] = useState('');
  const [address, setAddress] = useState('MG Road, Camp, Pune');
  const [landmark, setLandmark] = useState('Opposite St. Xavier High School');
  const [coordinates, setCoordinates] = useState({ lat: 18.5204, lng: 73.8567 });
  const [isSensitive, setIsSensitive] = useState(true);
  const [imageUrl, setImageUrl] = useState<string>('https://images.unsplash.com/photo-1541888946425-d0fbb186f5f8?w=800&q=80');
  const citizenName = 'Aarav Deshmukh';
  const citizenPhone = '+91 98220 12345';

  const [isRecording, setIsRecording] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<AIAnalysisResult | null>(null);
  const [duplicates, setDuplicates] = useState<any[]>([]);

  // Apply quick sample preset
  const applyPreset = (preset: typeof SAMPLE_PRESETS[0]) => {
    setDescription(preset.description);
    setAddress(preset.location);
    setCoordinates({ lat: preset.lat, lng: preset.lng });
    setIsSensitive(preset.isSensitive);
    setImageUrl(preset.image);
    setAnalysisResult(null);
    setDuplicates([]);
  };

  // Simulate Voice input / Speech recognition
  const handleVoiceInput = () => {
    if (isRecording) {
      setIsRecording(false);
      return;
    }
    setIsRecording(true);
    setTimeout(() => {
      setDescription((prev) =>
        prev
          ? prev + ' Uncovered drain lid beside school road posing fall hazard.'
          : 'Dangerous open manhole without cover near school on main road. Immediate accident hazard for children and two-wheelers.'
      );
      setIsRecording(false);
    }, 2000);
  };

  // Run AI Analysis
  const handleRunAIAnalysis = async () => {
    if (!description.trim()) {
      alert('Please provide a complaint description first.');
      return;
    }

    setIsAnalyzing(true);
    try {
      const result = await analyzeComplaint({
        description,
        has_image: Boolean(imageUrl),
        image_metadata: imageUrl ? { detected_objects: ['uncovered drainage opening', 'roadside curb'] } : undefined,
        location_name: address,
        is_sensitive_location: isSensitive,
      });

      setAnalysisResult(result);

      // Check for duplicates
      const dupRes = await checkDuplicates({
        description,
        category: result.category,
        latitude: coordinates.lat,
        longitude: coordinates.lng,
      });

      if (dupRes.has_duplicates) {
        setDuplicates(dupRes.duplicates);
      } else {
        setDuplicates([]);
      }
    } catch (err) {
      console.error(err);
      alert('AI Analysis failed. Please check backend connection.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Handle citizen supporting existing duplicate
  const handleSupportExisting = async (dupId: number) => {
    try {
      const updated = await supportComplaint(dupId);
      alert(`Thank you! You corroborated complaint ${updated.tracking_number}. Supporter count increased to ${updated.support_count}.`);
      onComplaintCreated(updated);
    } catch (err) {
      console.error(err);
      alert('Failed to support duplicate complaint.');
    }
  };

  // Submit structured complaint
  const handleSubmit = async () => {
    if (!analysisResult) {
      alert('Please run AI analysis before submitting.');
      return;
    }

    setIsSubmitting(true);
    try {
      const newComplaint = await createComplaint({
        title: `${analysisResult.issueType.replace('_', ' ')} at ${address}`,
        description,
        category: analysisResult.category,
        issue_type: analysisResult.issueType,
        severity_score: analysisResult.severityScore,
        severity_level: analysisResult.severityLevel,
        department: analysisResult.department,
        department_code: analysisResult.departmentCode,
        latitude: coordinates.lat,
        longitude: coordinates.lng,
        address,
        landmark,
        is_sensitive_location: isSensitive,
        citizen_name: citizenName,
        citizen_phone: citizenPhone,
        evidence_urls: imageUrl ? [imageUrl] : [],
        evidence_observations: analysisResult.evidenceObservations,
        severity_factors: analysisResult.severityFactors,
      });

      onComplaintCreated(newComplaint);
    } catch (err) {
      console.error(err);
      alert('Submission failed. Please check backend connection.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Header Banner */}
      <div className="civic-card" style={{ background: 'linear-gradient(135deg, rgba(30, 41, 59, 0.7), rgba(15, 23, 42, 0.9))' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <span className="badge badge-high" style={{ marginBottom: '8px' }}>
              Citizen Reporting Interface
            </span>
            <h2 style={{ fontSize: '1.6rem', fontWeight: 800, marginTop: '4px' }}>
              Report a Civic Issue
            </h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', maxWidth: '650px', marginTop: '4px' }}>
              Submit multimodal complaints with text, voice, or image evidence. CivicFlow’s AI engine deterministically calculates severity, grounds evidence, and routes directly to the responsible municipal department.
            </p>
          </div>

          {/* Preset Buttons for Quick Demo */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>
              Quick Presets:
            </span>
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
              {SAMPLE_PRESETS.map((p) => (
                <button
                  key={p.name}
                  className="btn btn-secondary"
                  style={{ fontSize: '0.78rem', padding: '5px 10px' }}
                  onClick={() => applyPreset(p)}
                >
                  {p.name}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Main Grid: Inputs vs AI Intelligence */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '1.5rem' }}>
        {/* Left Column: Complaint Details & Location */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {/* Step 1: Evidence & Description */}
          <div className="civic-card">
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <FileText size={18} color="#6366f1" />
              1. Issue Description & Evidence
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
              <div>
                <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 600, display: 'block', marginBottom: '6px' }}>
                  What is happening? (Text or Voice)
                </label>
                <div style={{ position: 'relative' }}>
                  <textarea
                    rows={4}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Describe the issue, e.g. Open manhole on the main road with missing cover near the school..."
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      borderRadius: 'var(--radius-md)',
                      background: 'var(--bg-secondary)',
                      border: '1px solid var(--border-subtle)',
                      color: 'var(--text-primary)',
                      fontFamily: 'inherit',
                      fontSize: '0.9rem',
                      resize: 'vertical',
                    }}
                  />
                  <button
                    onClick={handleVoiceInput}
                    title="Simulate Voice Input"
                    style={{
                      position: 'absolute',
                      right: '10px',
                      bottom: '12px',
                      background: isRecording ? '#ef4444' : 'var(--bg-tertiary)',
                      border: '1px solid var(--border-subtle)',
                      borderRadius: '50%',
                      width: '34px',
                      height: '34px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'pointer',
                      color: '#fff',
                      transition: 'all 0.2s',
                    }}
                  >
                    <Mic size={16} />
                  </button>
                </div>
                {isRecording && (
                  <span style={{ fontSize: '0.75rem', color: '#ef4444', display: 'flex', alignItems: 'center', gap: '4px', marginTop: '4px' }}>
                    <span className="pulse-dot"></span> Listening & transcribing civic voice complaint...
                  </span>
                )}
              </div>

              {/* Image Evidence */}
              <div>
                <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 600, display: 'block', marginBottom: '6px' }}>
                  Photographic Evidence
                </label>
                <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                  <input
                    type="text"
                    value={imageUrl}
                    onChange={(e) => setImageUrl(e.target.value)}
                    placeholder="Image URL or upload"
                    style={{
                      flex: 1,
                      padding: '8px 12px',
                      borderRadius: 'var(--radius-sm)',
                      background: 'var(--bg-secondary)',
                      border: '1px solid var(--border-subtle)',
                      color: 'var(--text-primary)',
                      fontSize: '0.85rem',
                    }}
                  />
                  <label
                    className="btn btn-secondary"
                    style={{ padding: '8px 14px', fontSize: '0.82rem', cursor: 'pointer', whiteSpace: 'nowrap' }}
                  >
                    <Camera size={15} />
                    <span>Upload</span>
                    <input
                      type="file"
                      accept="image/*"
                      style={{ display: 'none' }}
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          const reader = new FileReader();
                          reader.onload = (ev) => setImageUrl(ev.target?.result as string);
                          reader.readAsDataURL(file);
                        }
                      }}
                    />
                  </label>
                </div>
                {imageUrl && (
                  <div style={{ marginTop: '8px', position: 'relative', width: '100%', height: '140px', borderRadius: '8px', overflow: 'hidden', border: '1px solid var(--border-subtle)' }}>
                    <img src={imageUrl} alt="Complaint Evidence" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Step 2: Location Picker */}
          <div className="civic-card">
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <MapPin size={18} color="#06b6d4" />
              2. Location & Vicinity
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
              <div>
                <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 600, display: 'block', marginBottom: '4px' }}>
                  Road / Area Address
                </label>
                <input
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: 'var(--radius-sm)',
                    background: 'var(--bg-secondary)',
                    border: '1px solid var(--border-subtle)',
                    color: 'var(--text-primary)',
                    fontSize: '0.85rem',
                  }}
                />
              </div>

              <div>
                <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 600, display: 'block', marginBottom: '4px' }}>
                  Nearby Landmark
                </label>
                <input
                  type="text"
                  value={landmark}
                  onChange={(e) => setLandmark(e.target.value)}
                  placeholder="e.g. St. Xavier High School, Metro Pillar 42"
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: 'var(--radius-sm)',
                    background: 'var(--bg-secondary)',
                    border: '1px solid var(--border-subtle)',
                    color: 'var(--text-primary)',
                    fontSize: '0.85rem',
                  }}
                />
              </div>

              {/* Sensitive location checkbox */}
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '0.85rem', color: 'var(--text-primary)' }}>
                <input
                  type="checkbox"
                  checked={isSensitive}
                  onChange={(e) => setIsSensitive(e.target.checked)}
                  style={{ width: '16px', height: '16px', accentColor: '#6366f1' }}
                />
                <span>Sensitive Public Zone (Near School, Hospital, Transit Hub)</span>
              </label>

              {/* Interactive Pin Map */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    Pin coordinates: {coordinates.lat.toFixed(4)}, {coordinates.lng.toFixed(4)}
                  </span>
                  <button
                    className="btn btn-secondary"
                    style={{ padding: '3px 8px', fontSize: '0.72rem' }}
                    onClick={() => {
                      if (navigator.geolocation) {
                        navigator.geolocation.getCurrentPosition((pos) => {
                          setCoordinates({ lat: pos.coords.latitude, lng: pos.coords.longitude });
                        });
                      }
                    }}
                  >
                    📍 Use GPS
                  </button>
                </div>
                <CivicMap
                  interactivePicker
                  selectedLocation={coordinates}
                  onLocationSelect={(lat, lng) => setCoordinates({ lat, lng })}
                  height="200px"
                  zoom={14}
                  center={[coordinates.lat, coordinates.lng]}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: AI Live Analysis & Review */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {/* AI Trigger Card */}
          <div className="civic-card" style={{ border: '1px solid rgba(99, 102, 241, 0.3)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Sparkles size={20} color="#6366f1" />
                <h3 style={{ fontSize: '1.1rem', fontWeight: 700 }}>AI Multimodal Triage Engine</h3>
              </div>
              <button
                className="btn btn-primary"
                onClick={handleRunAIAnalysis}
                disabled={isAnalyzing || !description.trim()}
              >
                {isAnalyzing ? (
                  <>
                    <span className="pulse-dot"></span>
                    <span>Analyzing...</span>
                  </>
                ) : (
                  <>
                    <Sparkles size={16} />
                    <span>Run AI Triage</span>
                  </>
                )}
              </button>
            </div>

            {!analysisResult && !isAnalyzing && (
              <div style={{ textAlign: 'center', padding: '2rem 1rem', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                <Layers size={36} style={{ margin: '0 auto 10px', opacity: 0.4 }} />
                <p>Click <strong>"Run AI Triage"</strong> to classify the complaint, evaluate deterministic severity, ground evidence, and route to the correct municipal department.</p>
              </div>
            )}

            {analysisResult && (
              <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {/* Result Highlights */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px' }}>
                  <div style={{ background: 'var(--bg-secondary)', padding: '12px', borderRadius: 'var(--radius-sm)' }}>
                    <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>
                      Classified Issue
                    </span>
                    <div style={{ fontSize: '1rem', fontWeight: 700, color: '#f8fafc', marginTop: '2px' }}>
                      {analysisResult.issueType.replace('_', ' ')}
                    </div>
                    <span style={{ fontSize: '0.75rem', color: 'var(--accent-secondary)' }}>
                      {(analysisResult.confidence * 100).toFixed(0)}% AI Confidence
                    </span>
                  </div>

                  <div style={{ background: 'var(--bg-secondary)', padding: '12px', borderRadius: 'var(--radius-sm)' }}>
                    <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>
                      Severity Assessment
                    </span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '2px' }}>
                      <span className={`badge badge-${analysisResult.severityLevel.toLowerCase()}`}>
                        {analysisResult.severityLevel}
                      </span>
                      <strong style={{ fontSize: '1rem' }}>{analysisResult.severityScore}/100</strong>
                    </div>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      SLA: {analysisResult.recommendedResponseTimeHours} hours
                    </span>
                  </div>
                </div>

                {/* Responsible Department */}
                <div style={{ background: 'rgba(99, 102, 241, 0.08)', border: '1px solid rgba(99, 102, 241, 0.2)', padding: '12px', borderRadius: 'var(--radius-sm)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Shield size={16} color="#6366f1" />
                    <strong style={{ fontSize: '0.9rem', color: '#c7d2fe' }}>
                      {analysisResult.department} ({analysisResult.departmentCode})
                    </strong>
                  </div>
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '4px', lineHeight: 1.4 }}>
                    {analysisResult.departmentReason}
                  </p>
                </div>

                {/* Severity Breakdown Factors */}
                <div>
                  <h4 style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '8px' }}>
                    Deterministic Severity Factors (0–100)
                  </h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    {analysisResult.severityFactors.map((f) => (
                      <div key={f.factor} style={{ background: 'var(--bg-secondary)', padding: '8px 10px', borderRadius: '6px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem' }}>
                          <span style={{ fontWeight: 600 }}>{f.factor}</span>
                          <span style={{ fontWeight: 700, color: f.points > 0 ? '#f59e0b' : 'var(--text-muted)' }}>
                            +{f.points} / {f.max_points}
                          </span>
                        </div>
                        <div className="severity-bar-container">
                          <div className="severity-progress-bg">
                            <div
                              className="severity-progress-fill"
                              style={{
                                width: `${(f.points / f.max_points) * 100}%`,
                                background: f.points >= 20 ? '#ef4444' : f.points >= 10 ? '#f59e0b' : '#10b981',
                              }}
                            />
                          </div>
                        </div>
                        <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{f.detail}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Evidence Grounding */}
                <div>
                  <h4 style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '6px' }}>
                    Evidence Grounding Observations
                  </h4>
                  <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    {analysisResult.evidenceObservations.map((obs, idx) => (
                      <li key={idx} style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'flex-start', gap: '6px' }}>
                        <CheckCircle2 size={14} color="#10b981" style={{ marginTop: '2px', flexShrink: 0 }} />
                        <span>{obs}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            )}
          </div>

          {/* Duplicate Detection Alert */}
          {duplicates.length > 0 && (
            <div className="civic-card" style={{ border: '1px solid rgba(245, 158, 11, 0.4)', background: 'rgba(245, 158, 11, 0.08)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                <AlertTriangle size={18} color="#f59e0b" />
                <strong style={{ fontSize: '0.92rem', color: '#fcd34d' }}>
                  Corroborating Issue Detected Nearby
                </strong>
              </div>
              <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginBottom: '10px' }}>
                A matching civic issue has already been lodged {duplicates[0].distance_meters}m from your location with {duplicates[0].confidence}% similarity.
              </p>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  className="btn btn-secondary"
                  style={{ background: '#f59e0b', color: '#000', padding: '6px 12px', fontSize: '0.8rem' }}
                  onClick={() => handleSupportExisting(duplicates[0].complaint_id)}
                >
                  <ThumbsUp size={14} />
                  <span>Support Existing Complaint (+1 Vote)</span>
                </button>
              </div>
            </div>
          )}

          {/* Submit Action Card */}
          {analysisResult && (
            <div className="civic-card" style={{ background: 'var(--bg-secondary)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
              <div>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Ready for Gateway Submission</span>
                <div style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                  Submit to Demo Municipal Gateway
                </div>
              </div>
              <button
                className="btn btn-primary"
                onClick={handleSubmit}
                disabled={isSubmitting}
                style={{ padding: '0.75rem 1.75rem' }}
              >
                {isSubmitting ? (
                  <>
                    <span className="pulse-dot"></span>
                    <span>Submitting...</span>
                  </>
                ) : (
                  <>
                    <span>Submit Complaint</span>
                    <ArrowRight size={16} />
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
