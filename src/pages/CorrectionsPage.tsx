import React, { useState, useEffect } from 'react';
import { CheckSquare, CheckCircle2, XCircle, Clock, AlertCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { AttendanceCorrectionRequest } from '../types';
import { AttendanceService } from '../services/attendanceService';
import { Badge } from '../components/common/Badge';
import { EmptyState } from '../components/common/EmptyState';
import { Modal } from '../components/common/Modal';

export const CorrectionsPage: React.FC = () => {
  const { user } = useAuth();
  const [requests, setRequests] = useState<AttendanceCorrectionRequest[]>([]);
  const [loading, setLoading] = useState(true);

  // Review modal
  const [selectedReq, setSelectedReq] = useState<AttendanceCorrectionRequest | null>(null);
  const [decision, setDecision] = useState<'approved' | 'rejected'>('approved');
  const [reviewComment, setReviewComment] = useState('');
  const [reviewing, setReviewing] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    loadRequests();
  }, []);

  const loadRequests = async () => {
    setLoading(true);
    try {
      const list = await AttendanceService.getCorrectionRequests();
      setRequests(list);
    } catch (e) {
      console.warn('Load corrections error:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleReviewSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedReq || !user) return;

    setReviewing(true);
    try {
      await AttendanceService.reviewCorrection(
        selectedReq.id,
        decision,
        reviewComment,
        user.email,
        user.uid
      );
      setSuccess(`Correction request ${decision}.`);
      setSelectedReq(null);
      setReviewComment('');
      await loadRequests();
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
          <h2 className="text-xl font-bold text-slate-900">Attendance Correction Requests</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Review and adjudicate attendance discrepancy claims submitted by personnel
          </p>
        </div>
      </div>

      {success && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          <span>{success}</span>
        </div>
      )}

      {/* Requests Table */}
      {requests.length === 0 ? (
        <EmptyState
          icon={CheckSquare}
          title="No Correction Requests"
          description="There are currently zero pending or historical attendance correction requests from employees."
        />
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200/90 overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50/80 text-slate-500 font-bold uppercase tracking-wider border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4">Employee</th>
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4">Proposed Status</th>
                  <th className="py-3 px-4">Reason</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {requests.map((req) => (
                  <tr key={req.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3.5 px-4">
                      <span className="font-bold text-slate-900 block">{req.employeeName}</span>
                      <span className="text-[11px] text-slate-400">ID: {req.employeeId}</span>
                    </td>
                    <td className="py-3.5 px-4 font-semibold text-slate-700">{req.date}</td>
                    <td className="py-3.5 px-4">
                      <Badge variant="indigo" size="sm">
                        {req.proposedStatus}
                      </Badge>
                    </td>
                    <td className="py-3.5 px-4 text-slate-600 max-w-xs">{req.reason}</td>
                    <td className="py-3.5 px-4">
                      <Badge
                        variant={
                          req.status === 'approved'
                            ? 'emerald'
                            : req.status === 'rejected'
                            ? 'rose'
                            : 'amber'
                        }
                        size="sm"
                      >
                        {req.status}
                      </Badge>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      {req.status === 'pending' ? (
                        <div className="inline-flex gap-1.5">
                          <button
                            onClick={() => {
                              setSelectedReq(req);
                              setDecision('approved');
                            }}
                            className="px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-semibold rounded-md transition-colors cursor-pointer"
                          >
                            Approve
                          </button>
                          <button
                            onClick={() => {
                              setSelectedReq(req);
                              setDecision('rejected');
                            }}
                            className="px-2.5 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 font-semibold rounded-md transition-colors cursor-pointer"
                          >
                            Reject
                          </button>
                        </div>
                      ) : (
                        <span className="text-slate-400 text-[11px]">
                          Reviewed by {req.reviewedBy}
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Review Modal */}
      {selectedReq && (
        <Modal
          isOpen={Boolean(selectedReq)}
          onClose={() => setSelectedReq(null)}
          title={`Review Correction for ${selectedReq.employeeName}`}
          maxWidth="md"
        >
          <form onSubmit={handleReviewSubmit} className="space-y-4 text-xs">
            <div className="p-3 bg-slate-50 rounded-xl space-y-1 border border-slate-200">
              <p>
                <strong className="text-slate-700">Date:</strong> {selectedReq.date}
              </p>
              <p>
                <strong className="text-slate-700">Proposed Status:</strong>{' '}
                <span className="capitalize">{selectedReq.proposedStatus}</span>
              </p>
              <p>
                <strong className="text-slate-700">Employee Reason:</strong> {selectedReq.reason}
              </p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Decision</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setDecision('approved')}
                  className={`py-2 px-3 rounded-lg font-bold border text-xs cursor-pointer ${
                    decision === 'approved'
                      ? 'bg-emerald-600 text-white border-emerald-600'
                      : 'bg-white text-slate-700 border-slate-300'
                  }`}
                >
                  Approve Request
                </button>
                <button
                  type="button"
                  onClick={() => setDecision('rejected')}
                  className={`py-2 px-3 rounded-lg font-bold border text-xs cursor-pointer ${
                    decision === 'rejected'
                      ? 'bg-rose-600 text-white border-rose-600'
                      : 'bg-white text-slate-700 border-slate-300'
                  }`}
                >
                  Reject Request
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                HR Review Comment
              </label>
              <textarea
                rows={3}
                value={reviewComment}
                onChange={(e) => setReviewComment(e.target.value)}
                placeholder="Enter justification or feedback for the employee..."
                className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg bg-white"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setSelectedReq(null)}
                className="px-4 py-2 bg-slate-100 text-slate-700 font-semibold rounded-lg cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={reviewing}
                className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg cursor-pointer"
              >
                {reviewing ? 'Submitting...' : 'Save Decision'}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
};
