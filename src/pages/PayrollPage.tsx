import React, { useState, useEffect } from 'react';
import {
  CreditCard,
  Plus,
  Lock,
  Printer,
  CheckCircle2,
  AlertCircle,
  FileText,
  DollarSign,
  TrendingDown,
  Building,
  Edit,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import {
  PayrollRun,
  PayrollItem,
  SalaryStructure,
  Employee,
} from '../types';
import { PayrollService } from '../services/payrollService';
import { EmployeeService } from '../services/employeeService';
import { Badge } from '../components/common/Badge';
import { Modal } from '../components/common/Modal';
import { EmptyState } from '../components/common/EmptyState';

interface PayrollPageProps {
  onViewPayslip: (run: PayrollRun, employeeId: string) => void;
}

export const PayrollPage: React.FC<PayrollPageProps> = ({ onViewPayslip }) => {
  const { user, role } = useAuth();
  const isAdmin = role === 'admin';
  const isHR = role === 'admin' || role === 'hr';

  const [activeTab, setActiveTab] = useState<'runs' | 'structures'>(
    role === 'employee' ? 'runs' : 'runs'
  );
  const [payrollRuns, setPayrollRuns] = useState<PayrollRun[]>([]);
  const [structures, setStructures] = useState<SalaryStructure[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);

  // Draft generator modal
  const [isDraftModalOpen, setIsDraftModalOpen] = useState(false);
  const [draftPeriod, setDraftPeriod] = useState(
    new Date().toISOString().substring(0, 7) // YYYY-MM
  );
  const [drafting, setDrafting] = useState(false);

  // Selected run for detail view
  const [selectedRun, setSelectedRun] = useState<PayrollRun | null>(null);

  // Salary Structure editor modal
  const [isStructureModalOpen, setIsStructureModalOpen] = useState(false);
  const [structEmployeeId, setStructEmployeeId] = useState('');
  const [structBasic, setStructBasic] = useState(50000);
  const [structEffectiveFrom, setStructEffectiveFrom] = useState(
    new Date().toISOString().split('T')[0]
  );
  const [structSaving, setStructSaving] = useState(false);

  // Messages
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadPayrollData();
  }, [user, role]);

  const loadPayrollData = async () => {
    setLoading(true);
    try {
      const [runs, structs, emps] = await Promise.all([
        PayrollService.getPayrollRuns(),
        PayrollService.getSalaryStructures(),
        EmployeeService.getEmployees(),
      ]);
      setPayrollRuns(runs);
      setStructures(structs);
      setEmployees(emps);
      if (runs.length > 0 && !selectedRun) {
        setSelectedRun(runs[0]);
      }
      if (emps.length > 0) {
        setStructEmployeeId(emps[0].id);
      }
    } catch (e) {
      console.warn('Error loading payroll data:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateDraft = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setDrafting(true);
    setError(null);

    try {
      const run = await PayrollService.generateDraftPayroll(
        draftPeriod,
        user.email,
        user.uid
      );
      setSuccess(`Payroll draft for ${run.monthName} calculated successfully.`);
      setSelectedRun(run);
      setIsDraftModalOpen(false);
      await loadPayrollData();
    } catch (err: any) {
      setError(err.message || 'Draft calculation failed.');
    } finally {
      setDrafting(false);
    }
  };

  const handleFinalizeRun = async (run: PayrollRun) => {
    if (!isAdmin) {
      alert('Unauthorized: Only Master Administrators can finalize and lock payroll.');
      return;
    }
    if (
      !window.confirm(
        `Are you sure you want to finalize and lock payroll for ${run.monthName}? Once finalized, no further edits or recalculations can be made.`
      )
    ) {
      return;
    }

    try {
      await PayrollService.finalizePayroll(run.period, user?.email || '', user?.uid || '');
      setSuccess(`Payroll for ${run.monthName} has been permanently finalized & locked.`);
      await loadPayrollData();
    } catch (err: any) {
      alert(err.message || 'Finalization failed');
    }
  };

  const handleSaveStructure = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!structEmployeeId) return;
    setStructSaving(true);
    setError(null);

    try {
      await PayrollService.setSalaryStructure(
        structEmployeeId,
        Number(structBasic),
        structEffectiveFrom,
        user?.email || '',
        user?.uid || ''
      );
      setSuccess('Salary structure saved.');
      setIsStructureModalOpen(false);
      await loadPayrollData();
    } catch (err: any) {
      setError(err.message || 'Failed to update salary structure.');
    } finally {
      setStructSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200/90 shadow-xs">
        <div>
          <h2 className="text-xl font-bold text-slate-900">
            {role === 'employee' ? 'My Payslips & Compensation' : 'Payroll Management & Finalization'}
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Formula: Gross = 1.5×Basic (HRA 40%, Medical 10%) • Per-day absent deductions • Pakistan annualized tax slabs
          </p>
        </div>

        <div className="flex items-center gap-2">
          {isHR && (
            <>
              <button
                onClick={() => {
                  setError(null);
                  setIsStructureModalOpen(true);
                }}
                className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer border border-slate-200"
              >
                <DollarSign className="w-3.5 h-3.5" />
                <span>Configure Salary Structures</span>
              </button>

              <button
                onClick={() => {
                  setError(null);
                  setIsDraftModalOpen(true);
                }}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Create Monthly Draft</span>
              </button>
            </>
          )}
        </div>
      </div>

      {success && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{success}</span>
        </div>
      )}

      {/* Tabs */}
      {isHR && (
        <div className="flex border-b border-slate-200 text-xs font-semibold">
          <button
            onClick={() => setActiveTab('runs')}
            className={`pb-2.5 px-4 cursor-pointer transition-colors ${
              activeTab === 'runs'
                ? 'border-b-2 border-indigo-600 text-indigo-600 font-bold'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            Monthly Payroll Runs & Finalization
          </button>
          <button
            onClick={() => setActiveTab('structures')}
            className={`pb-2.5 px-4 cursor-pointer transition-colors ${
              activeTab === 'structures'
                ? 'border-b-2 border-indigo-600 text-indigo-600 font-bold'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            Salary Structures Directory ({structures.length})
          </button>
        </div>
      )}

      {/* ======================================================== */}
      {/* TAB 1: PAYROLL RUNS */}
      {/* ======================================================== */}
      {activeTab === 'runs' && (
        <div className="space-y-6">
          {payrollRuns.length === 0 ? (
            <EmptyState
              icon={CreditCard}
              title="No Monthly Payroll Runs Created"
              description={
                role === 'employee'
                  ? 'No monthly payslips have been finalized by the administrator yet.'
                  : 'Start by creating your first monthly draft. The system will auto-calculate worked days, absent penalties, and taxes from actual Firestore records.'
              }
              actionText={isHR ? 'Create First Monthly Draft' : undefined}
              onAction={isHR ? () => setIsDraftModalOpen(true) : undefined}
            />
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Runs Selector Sidebar */}
              <div className="lg:col-span-1 space-y-3">
                <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                  Payroll Periods
                </h3>
                <div className="space-y-2">
                  {payrollRuns.map((run) => (
                    <div
                      key={run.id}
                      onClick={() => setSelectedRun(run)}
                      className={`p-4 rounded-xl border text-xs cursor-pointer transition-all ${
                        selectedRun?.id === run.id
                          ? 'bg-indigo-50/70 border-indigo-300 ring-1 ring-indigo-400'
                          : 'bg-white border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-bold text-slate-900">{run.monthName}</span>
                        <Badge
                          variant={run.status === 'finalized' ? 'purple' : 'blue'}
                          size="sm"
                        >
                          {run.status}
                        </Badge>
                      </div>
                      <p className="text-slate-500 text-[11px]">
                        Net Payroll: PKR {run.totalNet.toLocaleString()} ({run.totalEmployees} staff)
                      </p>
                      <p className="text-[10px] text-slate-400 mt-1">
                        {run.status === 'finalized'
                          ? `Finalized by ${run.finalizedBy}`
                          : `Drafted by ${run.createdBy}`}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Selected Run Line Items */}
              {selectedRun && (
                <div className="lg:col-span-2 space-y-4">
                  {/* Summary Bar */}
                  <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-base font-bold text-slate-900">
                          {selectedRun.monthName} Statement
                        </h3>
                        <Badge
                          variant={selectedRun.status === 'finalized' ? 'purple' : 'blue'}
                          size="sm"
                        >
                          {selectedRun.status}
                        </Badge>
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Working days: {selectedRun.workingDaysInPeriod} • Gross: PKR{' '}
                        {selectedRun.totalGross.toLocaleString()} • Deductions: PKR{' '}
                        {selectedRun.totalDeductions.toLocaleString()}
                      </p>
                    </div>

                    {/* Finalize Button for Admin */}
                    {isAdmin && selectedRun.status === 'draft' && (
                      <button
                        onClick={() => handleFinalizeRun(selectedRun)}
                        className="px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white rounded-xl text-xs font-bold shadow-xs transition-all flex items-center gap-1.5 cursor-pointer shrink-0"
                      >
                        <Lock className="w-4 h-4" />
                        <span>Finalize & Lock Payroll</span>
                      </button>
                    )}
                  </div>

                  {/* Line Items Table */}
                  <div className="bg-white rounded-2xl border border-slate-200/90 overflow-hidden shadow-xs">
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-slate-50 text-slate-500 uppercase font-bold text-[10px] border-b border-slate-200">
                          <tr>
                            <th className="py-3 px-3">Employee</th>
                            <th className="py-3 px-3">Gross Salary</th>
                            <th className="py-3 px-3">Worked / Absent</th>
                            <th className="py-3 px-3">Deductions</th>
                            <th className="py-3 px-3">Monthly Tax</th>
                            <th className="py-3 px-3">Net Pay</th>
                            <th className="py-3 px-3 text-right">Action</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {Object.values(selectedRun.items)
                            .filter((item) => {
                              // If employee role, show ONLY their own record!
                              if (role === 'employee') {
                                return item.employeeId === user?.employeeId;
                              }
                              return true;
                            })
                            .map((item) => (
                              <tr key={item.employeeId} className="hover:bg-slate-50/70">
                                <td className="py-3 px-3">
                                  <div className="font-bold text-slate-900">{item.employeeName}</div>
                                  <div className="text-[10px] text-slate-400">
                                    {item.employeeCode}
                                  </div>
                                </td>
                                <td className="py-3 px-3 font-semibold text-slate-800">
                                  PKR {item.grossSalary.toLocaleString()}
                                </td>
                                <td className="py-3 px-3 text-slate-600">
                                  <span className="text-emerald-700 font-semibold">{item.workedDays}</span>{' '}
                                  / <span className="text-rose-700 font-semibold">{item.absentDays} abs</span>
                                  {item.halfDays > 0 && (
                                    <span className="text-amber-600 block text-[10px]">
                                      {item.halfDays} half-day
                                    </span>
                                  )}
                                </td>
                                <td className="py-3 px-3 text-rose-600 font-medium">
                                  - PKR {item.attendanceDeduction.toLocaleString()}
                                </td>
                                <td className="py-3 px-3 text-slate-700">
                                  PKR {item.monthlyTax.toLocaleString()}
                                </td>
                                <td className="py-3 px-3 font-black text-indigo-700">
                                  PKR {item.netPay.toLocaleString()}
                                </td>
                                <td className="py-3 px-3 text-right">
                                  <button
                                    onClick={() => onViewPayslip(selectedRun, item.employeeId)}
                                    className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-md font-semibold text-[11px] cursor-pointer"
                                  >
                                    View Payslip
                                  </button>
                                </td>
                              </tr>
                            ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ======================================================== */}
      {/* TAB 2: SALARY STRUCTURES (HR Only) */}
      {/* ======================================================== */}
      {activeTab === 'structures' && isHR && (
        <div className="bg-white rounded-2xl border border-slate-200/90 overflow-hidden shadow-xs">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between">
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
              Configured Employee Compensation Structures
            </h3>
            <button
              onClick={() => setIsStructureModalOpen(true)}
              className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold cursor-pointer"
            >
              + Set Salary Structure
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 font-bold uppercase tracking-wider border-b border-slate-200 text-[10px]">
                <tr>
                  <th className="py-3 px-4">Employee</th>
                  <th className="py-3 px-4">Basic Monthly (100%)</th>
                  <th className="py-3 px-4">HRA (40%)</th>
                  <th className="py-3 px-4">Medical (10%)</th>
                  <th className="py-3 px-4">Gross Salary (1.5x)</th>
                  <th className="py-3 px-4">Effective Date</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {employees.map((emp) => {
                  const struct = structures.find((s) => s.employeeId === emp.id) || {
                    basicMonthly: 50000,
                    hra: 20000,
                    medical: 5000,
                    grossMonthly: 75000,
                    effectiveFrom: emp.joiningDate,
                  };

                  return (
                    <tr key={emp.id} className="hover:bg-slate-50/70">
                      <td className="py-3.5 px-4">
                        <span className="font-bold text-slate-900 block">{emp.fullName}</span>
                        <span className="text-[11px] text-slate-400">{emp.employeeCode}</span>
                      </td>
                      <td className="py-3.5 px-4 font-semibold text-slate-800">
                        PKR {struct.basicMonthly.toLocaleString()}
                      </td>
                      <td className="py-3.5 px-4 text-slate-600">
                        PKR {struct.hra.toLocaleString()}
                      </td>
                      <td className="py-3.5 px-4 text-slate-600">
                        PKR {struct.medical.toLocaleString()}
                      </td>
                      <td className="py-3.5 px-4 font-bold text-indigo-700">
                        PKR {struct.grossMonthly.toLocaleString()}
                      </td>
                      <td className="py-3.5 px-4 text-slate-500">{struct.effectiveFrom}</td>
                      <td className="py-3.5 px-4 text-right">
                        <button
                          onClick={() => {
                            setStructEmployeeId(emp.id);
                            setStructBasic(struct.basicMonthly);
                            setStructEffectiveFrom(struct.effectiveFrom);
                            setIsStructureModalOpen(true);
                          }}
                          className="px-2.5 py-1 text-indigo-600 hover:bg-indigo-50 font-semibold rounded-md text-[11px] cursor-pointer"
                        >
                          Edit Structure
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Create Draft Modal */}
      <Modal
        isOpen={isDraftModalOpen}
        onClose={() => setIsDraftModalOpen(false)}
        title="Create Monthly Payroll Draft"
        maxWidth="md"
      >
        <form onSubmit={handleGenerateDraft} className="space-y-4 text-xs">
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-rose-700 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Payroll Period (Month & Year)
            </label>
            <input
              type="month"
              required
              value={draftPeriod}
              onChange={(e) => setDraftPeriod(e.target.value)}
              className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg bg-white"
            />
          </div>

          <div className="p-3 bg-slate-50 rounded-xl space-y-1.5 text-slate-600">
            <p className="font-semibold text-slate-800">Automatic Server Computations:</p>
            <p>• Calculates active employee salary items</p>
            <p>• Deducts absent working days & unpaid leave days at per-day rate</p>
            <p>• Half-day penalty: Deducts 0.5× per-day gross</p>
            <p>• Prorates salaries for employees who joined during the month</p>
            <p>• Applies official Pakistan income tax slab formula</p>
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsDraftModalOpen(false)}
              className="px-4 py-2 bg-slate-100 text-slate-700 font-semibold rounded-lg cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={drafting}
              className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-bold rounded-lg cursor-pointer shadow-xs"
            >
              {drafting ? 'Calculating Draft...' : 'Generate Payroll Draft'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Salary Structure Editor Modal */}
      <Modal
        isOpen={isStructureModalOpen}
        onClose={() => setIsStructureModalOpen(false)}
        title="Edit Salary Structure"
        maxWidth="md"
      >
        <form onSubmit={handleSaveStructure} className="space-y-4 text-xs">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Select Employee</label>
            <select
              value={structEmployeeId}
              onChange={(e) => setStructEmployeeId(e.target.value)}
              className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg bg-white"
            >
              {employees.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.fullName} ({e.employeeCode})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Basic Monthly Salary (PKR) *
            </label>
            <input
              type="number"
              required
              min="1000"
              step="500"
              value={structBasic}
              onChange={(e) => setStructBasic(Number(e.target.value))}
              className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg bg-white"
            />
          </div>

          {/* Breakdown Preview */}
          <div className="p-3 bg-indigo-50/60 rounded-xl border border-indigo-100 space-y-1 text-slate-700">
            <div className="flex justify-between">
              <span>Basic Salary (100%):</span>
              <span className="font-semibold">PKR {Number(structBasic).toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span>House Rent Allowance (40%):</span>
              <span className="font-semibold">
                PKR {Math.round(Number(structBasic) * 0.4).toLocaleString()}
              </span>
            </div>
            <div className="flex justify-between">
              <span>Medical Allowance (10%):</span>
              <span className="font-semibold">
                PKR {Math.round(Number(structBasic) * 0.1).toLocaleString()}
              </span>
            </div>
            <div className="flex justify-between font-bold text-indigo-900 pt-1 border-t border-indigo-200">
              <span>Total Gross (1.5× Basic):</span>
              <span>PKR {Math.round(Number(structBasic) * 1.5).toLocaleString()}</span>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Effective From</label>
            <input
              type="date"
              value={structEffectiveFrom}
              onChange={(e) => setStructEffectiveFrom(e.target.value)}
              className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg bg-white"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsStructureModalOpen(false)}
              className="px-4 py-2 bg-slate-100 text-slate-700 font-semibold rounded-lg cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={structSaving}
              className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg cursor-pointer shadow-xs"
            >
              {structSaving ? 'Saving...' : 'Save Structure'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
