import React, { useState, useEffect } from 'react';
import {
  Building,
  Plus,
  Trash2,
  Edit,
  Clock,
  Calendar,
  MapPin,
  ShieldAlert,
  CheckCircle2,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { Department, Designation, Holiday, LeaveTypePolicy, CompanySettings } from '../types';
import { CompanyService } from '../services/companyService';
import { EmployeeService } from '../services/employeeService';
import { Modal } from '../components/common/Modal';

export const OrganizationPage: React.FC = () => {
  const { user, role, settings, refreshState } = useAuth();
  const [activeTab, setActiveTab] = useState<'departments' | 'designations' | 'holidays' | 'settings'>('departments');

  const [departments, setDepartments] = useState<Department[]>([]);
  const [designations, setDesignations] = useState<Designation[]>([]);
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [policies, setPolicies] = useState<LeaveTypePolicy[]>([]);
  const [loading, setLoading] = useState(true);

  // Department modal
  const [isDeptModalOpen, setIsDeptModalOpen] = useState(false);
  const [deptName, setDeptName] = useState('');
  const [deptDesc, setDeptDesc] = useState('');

  // Designation modal
  const [isDesigModalOpen, setIsDesigModalOpen] = useState(false);
  const [desigTitle, setDesigTitle] = useState('');
  const [desigDept, setDesigDept] = useState('');

  // Holiday modal
  const [isHolidayModalOpen, setIsHolidayModalOpen] = useState(false);
  const [holidayDate, setHolidayDate] = useState('');
  const [holidayName, setHolidayName] = useState('');
  const [holidayDesc, setHolidayDesc] = useState('');

  // Settings form
  const [officeStartTime, setOfficeStartTime] = useState(settings?.officeStartTime || '09:00');
  const [graceMinutes, setGraceMinutes] = useState(settings?.graceMinutes || 15);
  const [halfDayHours, setHalfDayHours] = useState(settings?.halfDayHours || 5);
  const [officeLat, setOfficeLat] = useState(settings?.officeLatitude || 24.8607);
  const [officeLng, setOfficeLng] = useState(settings?.officeLongitude || 67.0011);
  const [radiusMeters, setRadiusMeters] = useState(settings?.geofenceRadiusMeters || 150);

  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    loadAll();
  }, []);

  const loadAll = async () => {
    setLoading(true);
    try {
      const [deps, desigs, hols, pols] = await Promise.all([
        CompanyService.getDepartments(),
        CompanyService.getDesignations(),
        CompanyService.getHolidays(),
        CompanyService.getLeavePolicies(),
      ]);
      setDepartments(deps);
      setDesignations(desigs);
      setHolidays(hols);
      setPolicies(pols);
      if (deps.length > 0) setDesigDept(deps[0].id);
    } catch (e) {
      console.warn('Load org error:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateDept = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!deptName.trim() || !user) return;
    try {
      await CompanyService.createDepartment(deptName, deptDesc, user.email, user.uid);
      setMessage(`Department "${deptName}" created.`);
      setIsDeptModalOpen(false);
      setDeptName('');
      setDeptDesc('');
      await loadAll();
    } catch (e: any) {
      alert(e.message);
    }
  };

  const handleDeleteDept = async (id: string) => {
    const employees = await EmployeeService.getEmployees();
    const hasStaff = employees.some((e) => e.departmentId === id);
    if (hasStaff) {
      alert('Cannot delete department: There are active employees assigned to this department. Please reassign them first.');
      return;
    }
    if (!window.confirm('Delete this department?')) return;
    if (!user) return;
    await CompanyService.deleteDepartment(id, user.email, user.uid);
    await loadAll();
  };

  const handleCreateDesig = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!desigTitle.trim() || !user) return;
    try {
      await CompanyService.createDesignation(desigTitle, desigDept, '', user.email, user.uid);
      setMessage(`Designation "${desigTitle}" created.`);
      setIsDesigModalOpen(false);
      setDesigTitle('');
      await loadAll();
    } catch (e: any) {
      alert(e.message);
    }
  };

  const handleDeleteDesig = async (id: string) => {
    if (!window.confirm('Delete this designation?')) return;
    if (!user) return;
    await CompanyService.deleteDesignation(id, user.email, user.uid);
    await loadAll();
  };

  const handleAddHoliday = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!holidayDate || !holidayName.trim() || !user) return;
    try {
      await CompanyService.addHoliday(holidayDate, holidayName, holidayDesc, user.email, user.uid);
      setMessage(`Holiday on ${holidayDate} added.`);
      setIsHolidayModalOpen(false);
      setHolidayDate('');
      setHolidayName('');
      setHolidayDesc('');
      await loadAll();
    } catch (e: any) {
      alert(e.message);
    }
  };

  const handleDeleteHoliday = async (id: string) => {
    if (!window.confirm('Remove this holiday?')) return;
    if (!user) return;
    await CompanyService.deleteHoliday(id, user.email, user.uid);
    await loadAll();
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    try {
      await CompanyService.updateSettings(
        {
          officeStartTime,
          graceMinutes: Number(graceMinutes),
          halfDayHours: Number(halfDayHours),
          officeLatitude: Number(officeLat),
          officeLongitude: Number(officeLng),
          geofenceRadiusMeters: Number(radiusMeters),
        },
        user.email,
        user.uid
      );
      setMessage('Company operational settings and geofence updated.');
      await refreshState();
    } catch (e: any) {
      alert(e.message);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200/90 shadow-xs">
        <h2 className="text-xl font-bold text-slate-900">Organization & Governance Policies</h2>
        <p className="text-xs text-slate-500 mt-0.5">
          Configure departments, designation titles, official holidays, leave entitlements, and office geofence
        </p>
      </div>

      {message && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          <span>{message}</span>
        </div>
      )}

      {/* Navigation Tabs */}
      <div className="flex border-b border-slate-200 text-xs font-semibold">
        <button
          onClick={() => setActiveTab('departments')}
          className={`pb-2.5 px-4 cursor-pointer transition-colors ${
            activeTab === 'departments'
              ? 'border-b-2 border-indigo-600 text-indigo-600 font-bold'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          Departments ({departments.length})
        </button>
        <button
          onClick={() => setActiveTab('designations')}
          className={`pb-2.5 px-4 cursor-pointer transition-colors ${
            activeTab === 'designations'
              ? 'border-b-2 border-indigo-600 text-indigo-600 font-bold'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          Designations ({designations.length})
        </button>
        <button
          onClick={() => setActiveTab('holidays')}
          className={`pb-2.5 px-4 cursor-pointer transition-colors ${
            activeTab === 'holidays'
              ? 'border-b-2 border-indigo-600 text-indigo-600 font-bold'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          Official Holidays ({holidays.length})
        </button>
        <button
          onClick={() => setActiveTab('settings')}
          className={`pb-2.5 px-4 cursor-pointer transition-colors ${
            activeTab === 'settings'
              ? 'border-b-2 border-indigo-600 text-indigo-600 font-bold'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          General Settings & Geofence
        </button>
      </div>

      {/* ======================================================== */}
      {/* DEPARTMENTS TAB */}
      {/* ======================================================== */}
      {activeTab === 'departments' && (
        <div className="bg-white rounded-2xl border border-slate-200/90 overflow-hidden shadow-xs">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between">
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
              Organization Departments
            </h3>
            <button
              onClick={() => setIsDeptModalOpen(true)}
              className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold cursor-pointer"
            >
              + Add Department
            </button>
          </div>

          <div className="divide-y divide-slate-100 text-xs">
            {departments.length === 0 ? (
              <div className="p-8 text-center text-slate-400">
                No departments configured yet. Click &quot;Add Department&quot; above.
              </div>
            ) : (
              departments.map((dep) => (
                <div key={dep.id} className="p-4 flex items-center justify-between hover:bg-slate-50">
                  <div>
                    <h4 className="font-bold text-slate-900">{dep.name}</h4>
                    <p className="text-slate-500 text-[11px] mt-0.5">
                      {dep.description || 'No description provided.'}
                    </p>
                  </div>
                  <button
                    onClick={() => handleDeleteDept(dep.id)}
                    className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg cursor-pointer"
                    title="Delete Department"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* DESIGNATIONS TAB */}
      {/* ======================================================== */}
      {activeTab === 'designations' && (
        <div className="bg-white rounded-2xl border border-slate-200/90 overflow-hidden shadow-xs">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between">
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
              Job Designations & Roles
            </h3>
            <button
              onClick={() => setIsDesigModalOpen(true)}
              className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold cursor-pointer"
            >
              + Add Designation
            </button>
          </div>

          <div className="divide-y divide-slate-100 text-xs">
            {designations.length === 0 ? (
              <div className="p-8 text-center text-slate-400">
                No job designations added yet. Click &quot;Add Designation&quot; above.
              </div>
            ) : (
              designations.map((des) => (
                <div key={des.id} className="p-4 flex items-center justify-between hover:bg-slate-50">
                  <div>
                    <h4 className="font-bold text-slate-900">{des.title}</h4>
                    <p className="text-slate-400 text-[11px]">ID: {des.id}</p>
                  </div>
                  <button
                    onClick={() => handleDeleteDesig(des.id)}
                    className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* HOLIDAYS TAB */}
      {/* ======================================================== */}
      {activeTab === 'holidays' && (
        <div className="bg-white rounded-2xl border border-slate-200/90 overflow-hidden shadow-xs">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                Official Company Holidays
              </h3>
              <p className="text-[11px] text-slate-500">
                These dates are automatically excluded from leave working-day calculations
              </p>
            </div>
            <button
              onClick={() => setIsHolidayModalOpen(true)}
              className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold cursor-pointer"
            >
              + Add Holiday
            </button>
          </div>

          <div className="divide-y divide-slate-100 text-xs">
            {holidays.length === 0 ? (
              <div className="p-8 text-center text-slate-400">
                No official holidays scheduled. Add holidays to automatically exclude them from leave deductions.
              </div>
            ) : (
              holidays.map((h) => (
                <div key={h.id} className="p-4 flex items-center justify-between hover:bg-slate-50">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-700 font-bold flex items-center justify-center">
                      <Calendar className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="font-bold text-slate-900">{h.name}</h4>
                      <p className="text-slate-500 text-[11px]">
                        Date: {h.date} {h.description ? `• ${h.description}` : ''}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => handleDeleteHoliday(h.id)}
                    className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* GENERAL SETTINGS & GEOFENCE TAB */}
      {/* ======================================================== */}
      {activeTab === 'settings' && (
        <div className="bg-white rounded-2xl border border-slate-200/90 p-6 shadow-xs max-w-2xl">
          <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-4">
            Attendance Rules & Office Geofence
          </h3>
          <form onSubmit={handleSaveSettings} className="space-y-4 text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Office Start Time
                </label>
                <input
                  type="time"
                  value={officeStartTime}
                  onChange={(e) => setOfficeStartTime(e.target.value)}
                  className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Grace Period (Minutes)
                </label>
                <input
                  type="number"
                  value={graceMinutes}
                  onChange={(e) => setGraceMinutes(Number(e.target.value))}
                  className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg bg-white"
                />
                <span className="text-[10px] text-slate-400 block mt-0.5">
                  Arrival after {graceMinutes}m marked Late
                </span>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Half-Day Threshold (Hours)
                </label>
                <input
                  type="number"
                  value={halfDayHours}
                  onChange={(e) => setHalfDayHours(Number(e.target.value))}
                  className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg bg-white"
                />
                <span className="text-[10px] text-slate-400 block mt-0.5">
                  &lt; {halfDayHours}h marked Half-Day
                </span>
              </div>
            </div>

            <div className="pt-2 border-t border-slate-100">
              <h4 className="text-xs font-bold text-slate-800 mb-2">Office Geofence Location</h4>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Latitude</label>
                  <input
                    type="number"
                    step="any"
                    value={officeLat}
                    onChange={(e) => setOfficeLat(Number(e.target.value))}
                    className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg bg-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Longitude</label>
                  <input
                    type="number"
                    step="any"
                    value={officeLng}
                    onChange={(e) => setOfficeLng(Number(e.target.value))}
                    className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg bg-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Radius (Meters)</label>
                  <input
                    type="number"
                    value={radiusMeters}
                    onChange={(e) => setRadiusMeters(Number(e.target.value))}
                    className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg bg-white"
                  />
                </div>
              </div>
            </div>

            <div className="pt-3">
              <button
                type="submit"
                className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-xs cursor-pointer"
              >
                Save Operational Settings
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Add Department Modal */}
      <Modal isOpen={isDeptModalOpen} onClose={() => setIsDeptModalOpen(false)} title="Create Department" maxWidth="md">
        <form onSubmit={handleCreateDept} className="space-y-4 text-xs">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Department Name *</label>
            <input
              type="text"
              required
              value={deptName}
              onChange={(e) => setDeptName(e.target.value)}
              placeholder="e.g. Engineering, Operations, Marketing"
              className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg bg-white"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Description</label>
            <textarea
              rows={3}
              value={deptDesc}
              onChange={(e) => setDeptDesc(e.target.value)}
              placeholder="Brief summary of department responsibilities..."
              className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg bg-white"
            />
          </div>
          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsDeptModalOpen(false)}
              className="px-4 py-2 bg-slate-100 text-slate-700 font-semibold rounded-lg cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg cursor-pointer shadow-xs"
            >
              Save Department
            </button>
          </div>
        </form>
      </Modal>

      {/* Add Designation Modal */}
      <Modal isOpen={isDesigModalOpen} onClose={() => setIsDesigModalOpen(false)} title="Create Designation" maxWidth="md">
        <form onSubmit={handleCreateDesig} className="space-y-4 text-xs">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Designation Title *</label>
            <input
              type="text"
              required
              value={desigTitle}
              onChange={(e) => setDesigTitle(e.target.value)}
              placeholder="e.g. Senior Software Engineer"
              className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg bg-white"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Department</label>
            <select
              value={desigDept}
              onChange={(e) => setDesigDept(e.target.value)}
              className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg bg-white"
            >
              {departments.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
          </div>
          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsDesigModalOpen(false)}
              className="px-4 py-2 bg-slate-100 text-slate-700 font-semibold rounded-lg cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg cursor-pointer shadow-xs"
            >
              Save Designation
            </button>
          </div>
        </form>
      </Modal>

      {/* Add Holiday Modal */}
      <Modal isOpen={isHolidayModalOpen} onClose={() => setIsHolidayModalOpen(false)} title="Add Official Holiday" maxWidth="md">
        <form onSubmit={handleAddHoliday} className="space-y-4 text-xs">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Holiday Date *</label>
            <input
              type="date"
              required
              value={holidayDate}
              onChange={(e) => setHolidayDate(e.target.value)}
              className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg bg-white"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Holiday Name *</label>
            <input
              type="text"
              required
              value={holidayName}
              onChange={(e) => setHolidayName(e.target.value)}
              placeholder="e.g. Independence Day, Eid-ul-Fitr"
              className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg bg-white"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Description</label>
            <input
              type="text"
              value={holidayDesc}
              onChange={(e) => setHolidayDesc(e.target.value)}
              placeholder="Public holiday observance..."
              className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg bg-white"
            />
          </div>
          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsHolidayModalOpen(false)}
              className="px-4 py-2 bg-slate-100 text-slate-700 font-semibold rounded-lg cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg cursor-pointer shadow-xs"
            >
              Save Holiday
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
