import React, { useState, useEffect } from 'react';
import {
  Clock,
  Calendar,
  Filter,
  CheckCircle2,
  AlertTriangle,
  UserCheck,
  Send,
  MapPin,
  Camera,
  CheckSquare,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { AttendanceRecord, AttendanceCorrectionRequest, AttendanceStatus } from '../types';
import { AttendanceService } from '../services/attendanceService';
import { EmployeeService } from '../services/employeeService';
import { Badge } from '../components/common/Badge';
import { Modal } from '../components/common/Modal';
import { EmptyState } from '../components/common/EmptyState';

export const AttendancePage: React.FC = () => {
  const { user, role, settings } = useAuth();
  const isHR = role === 'admin' || role === 'hr';

  const [dateFilter, setDateFilter] = useState<string>(AttendanceService.getTodayDateString());
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [attendanceList, setAttendanceList] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(true);

  // Correction request modal
  const [isCorrectionModalOpen, setIsCorrectionModalOpen] = useState(false);
  const [corrDate, setCorrDate] = useState(AttendanceService.getTodayDateString());
  const [corrStatus, setCorrStatus] = useState<AttendanceStatus>('present');
  const [corrReason, setCorrReason] = useState('');
  const [corrCheckIn, setCorrCheckIn] = useState('09:00');
  const [corrCheckOut, setCorrCheckOut] = useState('17:00');
  const [corrSuccess, setCorrSuccess] = useState<string | null>(null);

  // Check-in action message
  const [actionMsg, setActionMsg] = useState<string | null>(null);

  useEffect(() => {
    loadAttendance();
  }, [dateFilter, user, role]);

  const loadAttendance = async () => {
    setLoading(true);
    try {
      if (role === 'employee' && user?.employeeId) {
        const records = await AttendanceService.getAttendanceForEmployee(user.employeeId);
        setAttendanceList(records);
      } else {
        const records = await AttendanceService.getAttendanceForDate(dateFilter);
        setAttendanceList(records);
      }
    } catch (e) {
      console.warn('Load attendance error:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleWebCheckIn = async () => {
    if (!user || !user.employeeId) {
      setActionMsg('Error: No employee record linked to this account.');
      return;
    }
    setActionMsg(null);

    try {
      let coords: { latitude: number; longitude: number } | undefined;
      if ('geolocation' in navigator) {
        try {
          const pos = await new Promise<GeolocationPosition>((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 3500 });
          });
          coords = { latitude: pos.coords.latitude, longitude: pos.coords.longitude };
        } catch {}
      }

      const rec = await AttendanceService.checkIn(
        user.employeeId,
        user.displayName || user.email,
        'Staff',
        'web',
        coords
      );
      setActionMsg(`Checked in at ${new Date(rec.checkInAt!).toLocaleTimeString()} (${rec.status.toUpperCase()})`);
      await loadAttendance();
    } catch (err: any) {
      setActionMsg(`Failed: ${err.message}`);
    }
  };

  const handleWebCheckOut = async () => {
    if (!user || !user.employeeId) return;
    setActionMsg(null);

    try {
      const rec = await AttendanceService.checkOut(user.employeeId, user.displayName || user.email);
      setActionMsg(`Checked out at ${new Date(rec.checkOutAt!).toLocaleTimeString()} (Status: ${rec.status})`);
      await loadAttendance();
    } catch (err: any) {
      setActionMsg(`Failed: ${err.message}`);
    }
  };

  const handleSubmitCorrection = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !user.employeeId) return;

    try {
      await AttendanceService.requestCorrection(
        user.employeeId,
        user.displayName || user.email,
        corrDate,
        corrStatus,
        corrReason,
        `${corrDate}T${corrCheckIn}:00.000Z`,
        `${corrDate}T${corrCheckOut}:00.000Z`
      );
      setCorrSuccess('Correction request submitted to HR for review.');
      setIsCorrectionModalOpen(false);
      setCorrReason('');
      await loadAttendance();
    } catch (e: any) {
      alert(e.message || 'Failed to submit correction');
    }
  };

  const filteredAttendance = attendanceList.filter((a) => {
    if (statusFilter === 'all') return true;
    return a.status === statusFilter;
  });

  const getStatusBadge = (status: AttendanceStatus) => {
    switch (status) {
      case 'present':
        return <Badge variant="emerald">Present</Badge>;
      case 'late':
        return <Badge variant="amber">Late</Badge>;
      case 'half_day':
        return <Badge variant="purple">Half-Day</Badge>;
      case 'absent':
        return <Badge variant="rose">Absent</Badge>;
      case 'on_leave':
        return <Badge variant="indigo">On Leave</Badge>;
      default:
        return <Badge variant="slate">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200/90 shadow-xs">
        <div>
          <h2 className="text-xl font-bold text-slate-900">
            {role === 'employee' ? 'My Attendance History & Check-In' : 'Daily Attendance Board'}
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Office Start: {settings?.officeStartTime || '09:00'} • Grace Period: {settings?.graceMinutes || 15}m (Late after 09:15) • Half-day: &lt; {settings?.halfDayHours || 5} hours
          </p>
        </div>

        <div className="flex items-center gap-2">
          {role === 'employee' ? (
            <>
              <button
                onClick={() => setIsCorrectionModalOpen(true)}
                className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer border border-slate-200"
              >
                <CheckSquare className="w-3.5 h-3.5" />
                <span>Request Correction</span>
              </button>
              <button
                onClick={handleWebCheckIn}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
              >
                <Clock className="w-4 h-4" />
                <span>Check-In</span>
              </button>
              <button
                onClick={handleWebCheckOut}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
              >
                <span>Check-Out</span>
              </button>
            </>
          ) : (
            <div className="flex items-center gap-2">
              <label className="text-xs font-semibold text-slate-600">Select Date:</label>
              <input
                type="date"
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
                className="text-xs px-3 py-1.5 border border-slate-300 rounded-lg bg-white"
              />
            </div>
          )}
        </div>
      </div>

      {actionMsg && (
        <div className="p-3 bg-indigo-50 border border-indigo-200 rounded-xl text-indigo-900 text-xs font-medium">
          {actionMsg}
        </div>
      )}

      {corrSuccess && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs font-medium">
          {corrSuccess}
        </div>
      )}

      {/* Filter bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-xs flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-slate-400" />
          <span className="text-xs font-semibold text-slate-700">Filter Status:</span>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="text-xs px-3 py-1.5 border border-slate-300 rounded-lg bg-white"
          >
            <option value="all">All Statuses</option>
            <option value="present">Present</option>
            <option value="late">Late (&gt; 09:15)</option>
            <option value="half_day">Half-Day (&lt; 5h)</option>
            <option value="absent">Absent</option>
          </select>
        </div>

        <div className="text-xs text-slate-500 font-medium">
          Showing {filteredAttendance.length} attendance record(s)
        </div>
      </div>

      {/* Records Table or Empty State */}
      {filteredAttendance.length === 0 ? (
        <EmptyState
          icon={Clock}
          title="No Attendance Records Found"
          description={
            role === 'employee'
              ? 'You have not recorded check-in for this period yet. Use the "Check-In" button above to log your shift.'
              : `No staff attendance has been recorded for ${dateFilter} yet. Employees can check in via web or HR can make manual attendance corrections.`
          }
        />
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200/90 overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50/80 text-slate-500 font-bold uppercase tracking-wider border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4">Employee</th>
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4">Check-In</th>
                  <th className="py-3 px-4">Check-Out</th>
                  <th className="py-3 px-4">Worked Time</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Source / Geofence</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredAttendance.map((rec) => (
                  <tr key={rec.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3.5 px-4">
                      <div className="font-bold text-slate-900">{rec.employeeName}</div>
                      <div className="text-[11px] text-slate-400">ID: {rec.employeeId}</div>
                    </td>
                    <td className="py-3.5 px-4 font-medium text-slate-700">{rec.date}</td>
                    <td className="py-3.5 px-4">
                      {rec.checkInAt ? (
                        <div>
                          <span className="font-semibold text-slate-800">
                            {new Date(rec.checkInAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                          {rec.lateMinutes > 0 && (
                            <span className="text-[10px] text-amber-600 block">
                              +{rec.lateMinutes}m late
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="text-slate-400">--</span>
                      )}
                    </td>
                    <td className="py-3.5 px-4">
                      {rec.checkOutAt ? (
                        <span className="font-semibold text-slate-800">
                          {new Date(rec.checkOutAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      ) : (
                        <span className="text-amber-600 font-medium text-[11px]">Pending checkout</span>
                      )}
                    </td>
                    <td className="py-3.5 px-4">
                      {rec.workedMinutes > 0 ? (
                        <span className="font-semibold text-slate-700">
                          {(rec.workedMinutes / 60).toFixed(1)} hrs
                        </span>
                      ) : (
                        <span className="text-slate-400">In progress</span>
                      )}
                    </td>
                    <td className="py-3.5 px-4">{getStatusBadge(rec.status)}</td>
                    <td className="py-3.5 px-4 text-slate-500">
                      <div className="capitalize font-medium">{rec.source}</div>
                      {rec.location && (
                        <div className="text-[10px] text-slate-400 flex items-center gap-1">
                          <MapPin className="w-3 h-3 text-indigo-500" />
                          <span>{rec.location.distanceMeters}m from office</span>
                        </div>
                      )}
                      {rec.correctionNote && (
                        <div className="text-[10px] text-indigo-600 italic">
                          {rec.correctionNote}
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Attendance Correction Modal */}
      <Modal
        isOpen={isCorrectionModalOpen}
        onClose={() => setIsCorrectionModalOpen(false)}
        title="Request Attendance Correction"
        maxWidth="lg"
      >
        <form onSubmit={handleSubmitCorrection} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Date to Correct</label>
            <input
              type="date"
              required
              value={corrDate}
              onChange={(e) => setCorrDate(e.target.value)}
              className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg bg-white"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Proposed Check-In</label>
              <input
                type="time"
                value={corrCheckIn}
                onChange={(e) => setCorrCheckIn(e.target.value)}
                className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg bg-white"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Proposed Check-Out</label>
              <input
                type="time"
                value={corrCheckOut}
                onChange={(e) => setCorrCheckOut(e.target.value)}
                className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg bg-white"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Requested Status</label>
            <select
              value={corrStatus}
              onChange={(e) => setCorrStatus(e.target.value as any)}
              className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg bg-white"
            >
              <option value="present">Present</option>
              <option value="half_day">Half-Day</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Reason for Correction *</label>
            <textarea
              rows={3}
              required
              value={corrReason}
              onChange={(e) => setCorrReason(e.target.value)}
              placeholder="e.g. Card reader was offline, biometric failure, or field assignment..."
              className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg bg-white"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsCorrectionModalOpen(false)}
              className="px-4 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-xs cursor-pointer"
            >
              Submit to HR
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
