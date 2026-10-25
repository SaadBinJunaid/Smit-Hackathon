import React, { useState, useEffect } from 'react';
import {
  CalendarCheck,
  Calendar,
  Sparkles,
  Plus,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Clock,
  Filter,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { LeaveRequest, LeaveBalance, LeaveTypePolicy } from '../types';
import { LeaveService } from '../services/leaveService';
import { CompanyService } from '../services/companyService';
import { Badge } from '../components/common/Badge';
import { Modal } from '../components/common/Modal';
import { EmptyState } from '../components/common/EmptyState';

export const LeavePage: React.FC<{ onOpenSmartLeave: () => void }> = ({ onOpenSmartLeave }) => {
  const { user, role } = useAuth();
  const isHR = role === 'admin' || role === 'hr';

  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>([]);
  const [balance, setBalance] = useState<LeaveBalance | null>(null);
  const [policies, setPolicies] = useState<LeaveTypePolicy[]>([]);
  const [loading, setLoading] = useState(true);

  // Apply leave modal
  const [isApplyOpen, setIsApplyOpen] = useState(false);
  const [applyType, setApplyType] = useState<'annual' | 'sick' | 'casual' | 'unpaid'>('annual');
  const [applyStart, setApplyStart] = useState('');
  const [applyEnd, setApplyEnd] = useState('');
  const [applyReason, setApplyReason] = useState('');
  const [workingDays, setWorkingDays] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // HR Review modal
  const [selectedReview, setSelectedReview] = useState<LeaveRequest | null>(null);
  const [reviewDecision, setReviewDecision] = useState<'approved' | 'rejected'>('approved');
  const [reviewComment, setReviewComment] = useState('');
  const [reviewing, setReviewing] = useState(false);

  useEffect(() => {
    loadData();
  }, [user, role]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [allLeaves, pols] = await Promise.all([
        LeaveService.getLeaveRequests(),
        CompanyService.getLeavePolicies(),
      ]);
      setPolicies(pols);

      if (role === 'employee' && user?.employeeId) {
        setLeaveRequests(allLeaves.filter((l) => l.employeeId === user.employeeId));
        const bal = await LeaveService.getLeaveBalance(user.employeeId);
        setBalance(bal);
      } else {
        setLeaveRequests(allLeaves);
      }
    } catch (e) {
      console.warn('Load leaves error:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleDateChange = async (start: string, end: string) => {
    setApplyStart(start);
    setApplyEnd(end);
    if (start && end && start <= end) {
      const days = await LeaveService.calculateWorkingDays(start, end);
      setWorkingDays(days);
    } else {
      setWorkingDays(null);
    }
  };

  const handleApplySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !user.employeeId) {
      setFormError('No employee profile associated with your login account.');
      return;
    }

    setSubmitting(true);
    setFormError(null);

    try {
      await LeaveService.applyLeave(
        user.employeeId,
        user.displayName || user.email,
        user.email,
        applyType,
        applyStart,
        applyEnd,
        applyReason
      );
      setSuccessMsg('Leave request submitted successfully for HR approval.');
      setIsApplyOpen(false);
      setApplyReason('');
      setApplyStart('');
      setApplyEnd('');
      await loadData();
    } catch (err: any) {
      setFormError(err.message || 'Failed to submit leave application.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancelLeave = async (id: string) => {
    if (!user || !user.employeeId) return;
    if (!window.confirm('Cancel this pending leave request?')) return;
    try {
      await LeaveService.cancelLeave(id, user.employeeId, user.email);
      setSuccessMsg('Leave request cancelled.');
      await loadData();
    } catch (err: any) {
      alert(err.message || 'Failed to cancel');
    }
  };

  const handleReviewSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedReview || !user) return;

    setReviewing(true);
    try {
      await LeaveService.reviewLeave(
        selectedReview.id,
        reviewDecision,
        reviewComment,
        user.email,
        user.uid
      );
      setSuccessMsg(`Leave request ${reviewDecision}. Balance updated.`);
      setSelectedReview(null);
      setReviewComment('');
      await loadData();
    } catch (err: any) {
      alert(err.message || 'Review failed');
    } finally {
      setReviewing(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200/90 shadow-xs">
        <div>
          <h2 className="text-xl font-bold text-slate-900">
            {role === 'employee' ? 'My Leave Entitlements & Requests' : 'Leave Management & Approvals'}
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Automatic working days calculation • Excludes weekends & company holidays • Overlap protection
          </p>
        </div>

        <div className="flex items-center gap-2">
          {role === 'employee' && (
            <>
              <button
                onClick={onOpenSmartLeave}
                className="px-3.5 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer border border-indigo-200"
              >
                <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                <span>Smart Leave (AI)</span>
              </button>

              <button
                onClick={() => {
                  setFormError(null);
                  setIsApplyOpen(true);
                }}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Apply for Leave</span>
              </button>
            </>
          )}
        </div>
      </div>

      {successMsg && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Quota Balance Cards (for Employee or Overview for HR) */}
      {role === 'employee' && balance && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs text-center">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
              Annual Leave
            </span>
            <span className="text-3xl font-black text-indigo-600 block mt-1">
              {balance.annualRemaining}
            </span>
            <span className="text-xs text-slate-500 mt-0.5 block">out of 14 days quota</span>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs text-center">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
              Sick Leave
            </span>
            <span className="text-3xl font-black text-emerald-600 block mt-1">
              {balance.sickRemaining}
            </span>
            <span className="text-xs text-slate-500 mt-0.5 block">out of 8 days quota</span>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs text-center">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
              Casual Leave
            </span>
            <span className="text-3xl font-black text-amber-600 block mt-1">
              {balance.casualRemaining}
            </span>
            <span className="text-xs text-slate-500 mt-0.5 block">out of 10 days quota</span>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs text-center">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
              Unpaid Leave
            </span>
            <span className="text-3xl font-black text-slate-700 block mt-1">
              {balance.unpaidUsed}
            </span>
            <span className="text-xs text-slate-500 mt-0.5 block">days salary deduction</span>
          </div>
        </div>
      )}

      {/* Leave Requests Table or Empty State */}
      {leaveRequests.length === 0 ? (
        <EmptyState
          icon={CalendarCheck}
          title="No Leave Requests Found"
          description={
            role === 'employee'
              ? 'You have not submitted any leave applications yet. Use "Apply for Leave" or "Smart Leave" to request time off.'
              : 'Zero leave requests have been submitted by employees across the company so far.'
          }
          actionText={role === 'employee' ? 'Apply for Leave' : undefined}
          onAction={role === 'employee' ? () => setIsApplyOpen(true) : undefined}
        />
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200/90 overflow-hidden shadow-xs">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between">
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
              {role === 'employee' ? 'My Leave Applications' : 'All Staff Leave Applications'}
            </h3>
            <span className="text-xs text-slate-500 font-medium">
              {leaveRequests.length} total request(s)
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50/80 text-slate-500 font-bold uppercase tracking-wider border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4">Employee</th>
                  <th className="py-3 px-4">Leave Type</th>
                  <th className="py-3 px-4">Period</th>
                  <th className="py-3 px-4">Working Days</th>
                  <th className="py-3 px-4">Reason</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {leaveRequests.map((req) => (
                  <tr key={req.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3.5 px-4">
                      <span className="font-bold text-slate-900 block">{req.employeeName}</span>
                      <span className="text-[11px] text-slate-400">{req.employeeEmail}</span>
                    </td>
                    <td className="py-3.5 px-4 font-semibold text-slate-800 capitalize">
                      {req.leaveType} Leave
                    </td>
                    <td className="py-3.5 px-4 text-slate-700">
                      {req.startDate} to {req.endDate}
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-md">
                        {req.workingDays} day(s)
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-slate-600 max-w-xs">{req.reason}</td>
                    <td className="py-3.5 px-4">
                      <Badge
                        variant={
                          req.status === 'approved'
                            ? 'emerald'
                            : req.status === 'rejected'
                            ? 'rose'
                            : req.status === 'cancelled'
                            ? 'slate'
                            : 'amber'
                        }
                        size="sm"
                      >
                        {req.status}
                      </Badge>
                      {req.reviewComment && (
                        <span className="text-[10px] text-slate-400 block mt-0.5">
                          Note: {req.reviewComment}
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      {/* HR Actions */}
                      {isHR && req.status === 'pending' && (
                        <div className="inline-flex gap-1.5">
                          <button
                            onClick={() => {
                              setSelectedReview(req);
                              setReviewDecision('approved');
                            }}
                            className="px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-semibold rounded-md transition-colors cursor-pointer"
                          >
                            Approve
                          </button>
                          <button
                            onClick={() => {
                              setSelectedReview(req);
                              setReviewDecision('rejected');
                            }}
                            className="px-2.5 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 font-semibold rounded-md transition-colors cursor-pointer"
                          >
                            Reject
                          </button>
                        </div>
                      )}

                      {/* Employee Cancel Action */}
                      {role === 'employee' && req.status === 'pending' && (
                        <button
                          onClick={() => handleCancelLeave(req.id)}
                          className="px-2.5 py-1 text-slate-500 hover:text-rose-600 hover:bg-rose-50 text-[11px] font-semibold rounded-md transition-colors cursor-pointer"
                        >
                          Cancel
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Apply Leave Modal */}
      <Modal
        isOpen={isApplyOpen}
        onClose={() => setIsApplyOpen(false)}
        title="Apply for Leave"
        maxWidth="lg"
      >
        <form onSubmit={handleApplySubmit} className="space-y-4 text-xs">
          {formError && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-rose-700 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{formError}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Leave Category</label>
            <select
              value={applyType}
              onChange={(e) => setApplyType(e.target.value as any)}
              className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg bg-white"
            >
              <option value="annual">Annual Leave (14 days default quota)</option>
              <option value="sick">Sick Leave (8 days default quota)</option>
              <option value="casual">Casual Leave (10 days default quota)</option>
              <option value="unpaid">Unpaid Leave (Salary deduction applies)</option>
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Start Date</label>
              <input
                type="date"
                required
                value={applyStart}
                onChange={(e) => handleDateChange(e.target.value, applyEnd)}
                className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg bg-white"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">End Date</label>
              <input
                type="date"
                required
                value={applyEnd}
                onChange={(e) => handleDateChange(applyStart, e.target.value)}
                className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg bg-white"
              />
            </div>
          </div>

          {workingDays !== null && (
            <div className="p-3 bg-indigo-50 border border-indigo-100 rounded-lg flex items-center justify-between">
              <span className="text-slate-600 font-medium">Calculated working days:</span>
              <span className="text-indigo-700 font-bold text-sm">
                {workingDays} day(s) (excludes Sat/Sun & holidays)
              </span>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Reason for Absence *</label>
            <textarea
              rows={3}
              required
              value={applyReason}
              onChange={(e) => setApplyReason(e.target.value)}
              placeholder="State reason for your leave request..."
              className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg bg-white"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsApplyOpen(false)}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-lg cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || !applyStart || !applyEnd || !applyReason.trim()}
              className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-bold rounded-lg shadow-xs cursor-pointer"
            >
              {submitting ? 'Applying...' : 'Submit Application'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Review Leave Modal */}
      {selectedReview && (
        <Modal
          isOpen={Boolean(selectedReview)}
          onClose={() => setSelectedReview(null)}
          title={`Review ${selectedReview.leaveType.toUpperCase()} Leave Request`}
          maxWidth="md"
        >
          <form onSubmit={handleReviewSubmit} className="space-y-4 text-xs">
            <div className="p-3 bg-slate-50 rounded-xl space-y-1.5 border border-slate-200">
              <p>
                <strong className="text-slate-700">Applicant:</strong> {selectedReview.employeeName}
              </p>
              <p>
                <strong className="text-slate-700">Dates:</strong> {selectedReview.startDate} to{' '}
                {selectedReview.endDate} ({selectedReview.workingDays} working days)
              </p>
              <p>
                <strong className="text-slate-700">Reason:</strong> {selectedReview.reason}
              </p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Decision</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setReviewDecision('approved')}
                  className={`py-2 px-3 rounded-lg font-bold border text-xs cursor-pointer ${
                    reviewDecision === 'approved'
                      ? 'bg-emerald-600 text-white border-emerald-600'
                      : 'bg-white text-slate-700 border-slate-300'
                  }`}
                >
                  Approve Leave
                </button>
                <button
                  type="button"
                  onClick={() => setReviewDecision('rejected')}
                  className={`py-2 px-3 rounded-lg font-bold border text-xs cursor-pointer ${
                    reviewDecision === 'rejected'
                      ? 'bg-rose-600 text-white border-rose-600'
                      : 'bg-white text-slate-700 border-slate-300'
                  }`}
                >
                  Reject Leave
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Review Feedback / Reason
              </label>
              <textarea
                rows={3}
                value={reviewComment}
                onChange={(e) => setReviewComment(e.target.value)}
                placeholder="Optional comments or justification..."
                className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg bg-white"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setSelectedReview(null)}
                className="px-4 py-2 bg-slate-100 text-slate-700 font-semibold rounded-lg cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={reviewing}
                className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg cursor-pointer"
              >
                {reviewing ? 'Saving...' : 'Confirm Decision'}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
};
