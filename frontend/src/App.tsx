import { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { CitizenWizard } from './components/CitizenWizard';
import { CitizenTracking } from './components/CitizenTracking';
import { OfficerPortal } from './components/OfficerPortal';
import { AdminDashboard } from './components/AdminDashboard';
import { JudgeDemoView } from './components/JudgeDemoView';
import { getComplaints } from './api';
import type { Complaint } from './api';
import { PlusCircle, Search } from 'lucide-react';
import './App.css';

export function App() {
  const [role, setRole] = useState<'citizen' | 'officer' | 'admin' | 'demo'>('demo');
  const [citizenTab, setCitizenTab] = useState<'report' | 'track'>('report');
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [selectedComplaintId, setSelectedComplaintId] = useState<number | undefined>(undefined);

  useEffect(() => {
    let isMounted = true;
    getComplaints()
      .then((data) => {
        if (isMounted) {
          setComplaints(data);
          if (data.length > 0) {
            setSelectedComplaintId((prev) => prev ?? data[0].id);
          }
        }
      })
      .catch((err) => {
        console.warn('Backend not currently reachable:', err);
      });
    return () => {
      isMounted = false;
    };
  }, []);

  // When a new complaint is created
  const handleComplaintCreated = (newComplaint: Complaint) => {
    setComplaints((prev) => [newComplaint, ...prev.filter((c) => c.id !== newComplaint.id)]);
    setSelectedComplaintId(newComplaint.id);
    if (role === 'citizen') {
      setCitizenTab('track');
    }
  };

  // When a complaint is updated (status, resolution, follow-up, etc.)
  const handleComplaintUpdated = (updated: Complaint) => {
    setComplaints((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
  };

  return (
    <div className="app-container">
      {/* Navigation Header with Role Switcher */}
      <Header currentRole={role} onRoleChange={setRole} />

      {/* Main Role Content */}
      <main className="main-content">
        {/* CITIZEN PORTAL */}
        {role === 'citizen' && (
          <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            {/* Sub-tab navigation */}
            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                className={`btn ${citizenTab === 'report' ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => setCitizenTab('report')}
              >
                <PlusCircle size={16} />
                <span>Report Issue</span>
              </button>
              <button
                className={`btn ${citizenTab === 'track' ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => setCitizenTab('track')}
              >
                <Search size={16} />
                <span>Track Issues ({complaints.length})</span>
              </button>
            </div>

            {citizenTab === 'report' ? (
              <CitizenWizard onComplaintCreated={handleComplaintCreated} />
            ) : (
              <CitizenTracking
                complaints={complaints}
                selectedComplaintId={selectedComplaintId}
                onSelectComplaint={setSelectedComplaintId}
                onComplaintUpdated={handleComplaintUpdated}
              />
            )}
          </div>
        )}

        {/* OFFICER PORTAL */}
        {role === 'officer' && (
          <OfficerPortal
            complaints={complaints}
            onComplaintUpdated={handleComplaintUpdated}
          />
        )}

        {/* ADMIN DASHBOARD & MAP */}
        {role === 'admin' && (
          <AdminDashboard complaints={complaints} />
        )}

        {/* JUDGE DEMO MODE */}
        {role === 'demo' && (
          <JudgeDemoView
            onComplaintCreated={handleComplaintCreated}
            onComplaintUpdated={handleComplaintUpdated}
          />
        )}
      </main>
    </div>
  );
}

export default App;