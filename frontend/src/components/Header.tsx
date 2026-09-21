import React from 'react';
import { ShieldCheck, User, Users, BarChart3, Zap } from 'lucide-react';

interface HeaderProps {
  currentRole: 'citizen' | 'officer' | 'admin' | 'demo';
  onRoleChange: (role: 'citizen' | 'officer' | 'admin' | 'demo') => void;
}

export const Header: React.FC<HeaderProps> = ({ currentRole, onRoleChange }) => {
  return (
    <header className="navbar">
      <div className="nav-brand" onClick={() => onRoleChange('citizen')}>
        <div className="brand-icon">
          <span>⚡</span>
        </div>
        <div className="brand-text">
          <h1>CivicFlow</h1>
          <p className="brand-tagline">Report • Route • Resolve</p>
        </div>
      </div>

      <div className="role-tabs">
        <button
          className={`role-tab ${currentRole === 'citizen' ? 'active' : ''}`}
          onClick={() => onRoleChange('citizen')}
        >
          <User size={15} />
          <span>Citizen</span>
        </button>

        <button
          className={`role-tab ${currentRole === 'officer' ? 'active' : ''}`}
          onClick={() => onRoleChange('officer')}
        >
          <Users size={15} />
          <span>Officer Portal</span>
        </button>

        <button
          className={`role-tab ${currentRole === 'admin' ? 'active' : ''}`}
          onClick={() => onRoleChange('admin')}
        >
          <BarChart3 size={15} />
          <span>Admin & Map</span>
        </button>

        <button
          className={`role-tab ${currentRole === 'demo' ? 'demo-active active' : ''}`}
          onClick={() => onRoleChange('demo')}
        >
          <Zap size={15} />
          <span>Judge Demo</span>
        </button>
      </div>

      <div className="nav-gateway-status">
        <span className="pulse-dot"></span>
        <ShieldCheck size={14} color="#10b981" />
        <span>Demo Municipal Gateway Active</span>
      </div>
    </header>
  );
};
