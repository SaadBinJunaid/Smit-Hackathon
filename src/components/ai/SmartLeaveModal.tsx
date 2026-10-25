import React, { useState } from 'react';
import { Sparkles, ArrowRight, Calendar, AlertCircle, CheckCircle2 } from 'lucide-react';
import { Modal } from '../common/Modal';
import { AIService } from '../../services/aiService';
import { LeaveService } from '../../services/leaveService';
import { useAuth } from '../../context/AuthContext';

interface SmartLeaveModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmitted: () => void;
}

export const SmartLeaveModal: React.FC<SmartLeaveModalProps> = ({
  isOpen,
  onClose,
  onSubmitted,
}) => {
  const { user } = useAuth();
  const [prompt, setPrompt] = useState('');
  const [parsing, setParsing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Form states prefilled by AI
  const [leaveType, setLeaveType] = useState<'annual' | 'sick' | 'casual' | 'unpaid'>('casual');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [reason, setReason] = useState('');
  const [hasParsed, setHasParsed] = useState(false);
  const [calculatedDays, setCalculatedDays] = useState<number | null>(null);

  const handleParsePrompt = async () => {
    if (!prompt.trim()) return;
    setParsing(true);
    setError(null);

    try {
      const parsed = await AIService.parseSmartLeavePrompt(prompt);
      setLeaveType(parsed.type);
      setStartDate(parsed.start);
      setEndDate(parsed.end);
      setReason(parsed.reason);
      setHasParsed(true);

      const days = await LeaveService.calculateWorkingDays(parsed.start, parsed.end);
      setCalculatedDays(days);
    } catch (e: any) {
      setError('Could not parse natural language leave request. Please fill the fields manually.');
      setHasParsed(true);
    } finally {
      setParsing(false);
    }
  };

  const handleDatesChange = async (s: string, e: string) => {
    setStartDate(s);
    setEndDate(e);
    if (s && e && s <= e) {
      const days = await LeaveService.calculateWorkingDays(s, e);
      setCalculatedDays(days);
    } else {
      setCalculatedDays(null);
    }
  };

  const handleSubmitFinal = async () => {
    if (!user || !user.employeeId) {
      setError('No employee profile linked to your user account.');
      return;
    }
    if (!startDate || !endDate || !reason.trim()) {
      setError('Please fill in all required leave fields.');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      await LeaveService.applyLeave(
        user.employeeId,
        user.displayName || user.email,
        user.email,
        leaveType,
        startDate,
        endDate,
        reason
      );
      setSuccess(true);
      setTimeout(() => {
        setSuccess(false);
        setHasParsed(false);
        setPrompt('');
        onSubmitted();
        onClose();
      }, 1500);
    } catch (err: any) {
      setError(err.message || 'Failed to submit leave application.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Smart Leave Application (AI-Assisted)" maxWidth="xl">
      <div className="space-y-5">
        {/* Step 1: Conversational Input */}
        <div className="bg-gradient-to-br from-indigo-50/70 to-blue-50/40 p-4 rounded-xl border border-indigo-100">
          <div className="flex items-center gap-2 mb-2 text-indigo-950 font-semibold text-xs">
            <Sparkles className="w-4 h-4 text-indigo-600" />
            <span>Describe your leave request in plain language:</span>
          </div>
          <div className="flex gap-2">
            <input
              type="text"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="e.g. I have a severe flu and need sick leave from next Tuesday to Thursday"
              className="flex-1 text-xs px-3.5 py-2.5 bg-white border border-indigo-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-indigo-500 shadow-2xs"
            />
            <button
              type="button"
              onClick={handleParsePrompt}
              disabled={!prompt.trim() || parsing}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer shrink-0 shadow-xs"
            >
              {parsing ? (
                <span>Parsing...</span>
              ) : (
                <>
                  <span>Prefill Form</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </>
              )}
            </button>
          </div>
          <p className="text-[11px] text-slate-500 mt-2">
            AI will extract leave category, dates, and reason into the form below for your final review.
            AI never submits automatically.
          </p>
        </div>

        {error && (
          <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-rose-700 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-700 text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>Leave request successfully submitted for HR review!</span>
          </div>
        )}

        {/* Step 2: Form to review and confirm */}
        <div className="space-y-4 pt-2">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
              Verify Leave Details Before Submission
            </h4>
            {calculatedDays !== null && (
              <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-indigo-100 text-indigo-700">
                {calculatedDays} working day(s)
              </span>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Leave Type</label>
              <select
                value={leaveType}
                onChange={(e) => setLeaveType(e.target.value as any)}
                className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg bg-white focus:ring-2 focus:ring-indigo-500"
              >
                <option value="annual">Annual Leave (14 days)</option>
                <option value="sick">Sick Leave (8 days)</option>
                <option value="casual">Casual Leave (10 days)</option>
                <option value="unpaid">Unpaid Leave</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Start Date</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => handleDatesChange(e.target.value, endDate)}
                className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg bg-white focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">End Date</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => handleDatesChange(startDate, e.target.value)}
                className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg bg-white focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Reason for Leave</label>
            <textarea
              rows={3}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="State reason for absence..."
              className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg bg-white focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSubmitFinal}
              disabled={submitting || !startDate || !endDate || !reason.trim()}
              className="px-5 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 rounded-lg transition-colors shadow-xs cursor-pointer"
            >
              {submitting ? 'Submitting...' : 'Confirm & Apply for Leave'}
            </button>
          </div>
        </div>
      </div>
    </Modal>
  );
};
