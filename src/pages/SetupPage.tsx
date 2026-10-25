import React, { useState } from 'react';
import { Building2, Shield, Clock, MapPin, ArrowRight, AlertCircle, CheckCircle2 } from 'lucide-react';
import { AuthService } from '../services/authService';
import { useAuth } from '../context/AuthContext';

export const SetupPage: React.FC = () => {
  const { refreshState } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [companyName, setCompanyName] = useState('Saylani Tech Solutions');
  const [officeStartTime, setOfficeStartTime] = useState('09:00');
  const [graceMinutes, setGraceMinutes] = useState(15);
  const [halfDayHours, setHalfDayHours] = useState(5);
  const [officeLat, setOfficeLat] = useState('24.8607');
  const [officeLng, setOfficeLng] = useState('67.0011');
  const [radiusMeters, setRadiusMeters] = useState(150);

  // Admin account
  const [adminEmail, setAdminEmail] = useState('admin@saylanihcm.com');
  const [adminPassword, setAdminPassword] = useState('Admin@123456');

  const handleSetup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!companyName.trim() || !adminEmail.trim() || !adminPassword.trim()) {
      setError('Please fill in all required setup details.');
      return;
    }
    if (adminPassword.length < 6) {
      setError('Admin password must be at least 6 characters long.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await AuthService.createFirstAdmin(
        adminEmail.trim(),
        adminPassword,
        companyName.trim(),
        officeStartTime,
        Number(graceMinutes),
        Number(halfDayHours)
      );
      await refreshState();
    } catch (err: any) {
      setError(err.message || 'Failed to complete company setup.');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 sm:p-6">
      <div className="max-w-2xl w-full bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden">
        {/* Banner */}
        <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-6 sm:p-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center font-black text-xl shadow-md">
              H
            </div>
            <div>
              <span className="text-xl font-bold tracking-tight">HCM Lite</span>
              <span className="text-indigo-400 text-xs block font-semibold uppercase tracking-wider">
                Saylani Hackathon Edition
              </span>
            </div>
          </div>
          <h2 className="text-lg font-bold mt-4">First-Run Organization & Admin Setup</h2>
          <p className="text-xs text-slate-300 mt-1 leading-relaxed">
            Welcome! This fresh deployment requires initializing your company settings and creating the
            founding Administrator account. Setup can only be claimed once.
          </p>
        </div>

        {/* Setup Form */}
        <form onSubmit={handleSetup} className="p-6 sm:p-8 space-y-6">
          {error && (
            <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
              <span>{error}</span>
            </div>
          )}

          {/* Section 1: Company Profile */}
          <div>
            <div className="flex items-center gap-2 text-xs font-bold text-slate-900 uppercase tracking-wider mb-3">
              <Building2 className="w-4 h-4 text-indigo-600" />
              <span>1. Company Profile</span>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Company Legal Name *</label>
              <input
                type="text"
                required
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                placeholder="e.g. Acme Technologies"
                className="w-full text-xs px-3.5 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 bg-white"
              />
            </div>
          </div>

          {/* Section 2: Attendance Policies */}
          <div className="pt-2 border-t border-slate-100">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-900 uppercase tracking-wider mb-3">
              <Clock className="w-4 h-4 text-indigo-600" />
              <span>2. Operational Attendance Defaults</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Office Start Time</label>
                <input
                  type="time"
                  value={officeStartTime}
                  onChange={(e) => setOfficeStartTime(e.target.value)}
                  className="w-full text-xs px-3 py-2 border border-slate-300 rounded-xl bg-white"
                />
                <span className="text-[10px] text-slate-400 mt-0.5 block">Standard: 09:00</span>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Grace Period (Mins)</label>
                <input
                  type="number"
                  min="0"
                  max="60"
                  value={graceMinutes}
                  onChange={(e) => setGraceMinutes(Number(e.target.value))}
                  className="w-full text-xs px-3 py-2 border border-slate-300 rounded-xl bg-white"
                />
                <span className="text-[10px] text-slate-400 mt-0.5 block">Late after 09:15</span>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Half-Day (Hours)</label>
                <input
                  type="number"
                  min="1"
                  max="8"
                  value={halfDayHours}
                  onChange={(e) => setHalfDayHours(Number(e.target.value))}
                  className="w-full text-xs px-3 py-2 border border-slate-300 rounded-xl bg-white"
                />
                <span className="text-[10px] text-slate-400 mt-0.5 block">&lt; 5 hours = half-day</span>
              </div>
            </div>
          </div>

          {/* Section 3: Geofence Location */}
          <div className="pt-2 border-t border-slate-100">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-900 uppercase tracking-wider mb-3">
              <MapPin className="w-4 h-4 text-indigo-600" />
              <span>3. Office Coordinates & Geofence</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Latitude</label>
                <input
                  type="text"
                  value={officeLat}
                  onChange={(e) => setOfficeLat(e.target.value)}
                  className="w-full text-xs px-3 py-2 border border-slate-300 rounded-xl bg-white"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Longitude</label>
                <input
                  type="text"
                  value={officeLng}
                  onChange={(e) => setOfficeLng(e.target.value)}
                  className="w-full text-xs px-3 py-2 border border-slate-300 rounded-xl bg-white"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Radius (Meters)</label>
                <input
                  type="number"
                  value={radiusMeters}
                  onChange={(e) => setRadiusMeters(Number(e.target.value))}
                  className="w-full text-xs px-3 py-2 border border-slate-300 rounded-xl bg-white"
                />
              </div>
            </div>
          </div>

          {/* Section 4: Admin Credentials */}
          <div className="pt-2 border-t border-slate-100">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-900 uppercase tracking-wider mb-3">
              <Shield className="w-4 h-4 text-indigo-600" />
              <span>4. Master Administrator Account</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Admin Email *</label>
                <input
                  type="email"
                  required
                  value={adminEmail}
                  onChange={(e) => setAdminEmail(e.target.value)}
                  placeholder="admin@company.com"
                  className="w-full text-xs px-3.5 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 bg-white"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Admin Password *</label>
                <input
                  type="password"
                  required
                  value={adminPassword}
                  onChange={(e) => setAdminPassword(e.target.value)}
                  placeholder="Min 6 characters"
                  className="w-full text-xs px-3.5 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 bg-white"
                />
              </div>
            </div>
          </div>

          {/* Submit */}
          <div className="pt-4 border-t border-slate-100">
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 px-4 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              {loading ? (
                <span>Initializing Organization...</span>
              ) : (
                <>
                  <span>Complete Setup & Enter Admin Dashboard</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
            <p className="text-[11px] text-slate-400 text-center mt-2">
              Default leave quotas (14 Annual, 8 Sick, 10 Casual) will be automatically created.
            </p>
          </div>
        </form>
      </div>
    </div>
  );
};
