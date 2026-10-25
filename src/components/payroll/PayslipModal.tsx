import React from 'react';
import { Printer, Download, Building2, CheckCircle2 } from 'lucide-react';
import { Modal } from '../common/Modal';
import { PayrollItem, PayrollRun } from '../../types';
import { useAuth } from '../../context/AuthContext';

interface PayslipModalProps {
  isOpen: boolean;
  onClose: () => void;
  run: PayrollRun | null;
  item: PayrollItem | null;
}

export const PayslipModal: React.FC<PayslipModalProps> = ({
  isOpen,
  onClose,
  run,
  item,
}) => {
  const { settings } = useAuth();

  if (!isOpen || !run || !item) return null;

  const handlePrint = () => {
    window.print();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Employee Monthly Payslip" maxWidth="2xl">
      <div className="space-y-6">
        {/* Printable Payslip Card */}
        <div id="printable-payslip" className="bg-white p-6 rounded-xl border border-slate-200 text-slate-800">
          {/* Company & Period Header */}
          <div className="flex items-start justify-between border-b border-slate-200 pb-4">
            <div>
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-indigo-600 text-white flex items-center justify-center font-bold text-sm">
                  <Building2 className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 leading-tight">
                    {settings?.companyName || 'HCM Lite'}
                  </h3>
                  <p className="text-xs text-slate-500">Official Monthly Salary Statement</p>
                </div>
              </div>
            </div>

            <div className="text-right">
              <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-md bg-purple-100 text-purple-800 uppercase tracking-wider">
                <CheckCircle2 className="w-3 h-3 text-purple-600" />
                {run.status === 'finalized' ? 'Finalized & Locked' : 'Draft Preview'}
              </span>
              <p className="text-xs font-semibold text-slate-900 mt-1">{run.monthName}</p>
              <p className="text-[10px] text-slate-400">Period: {run.period}</p>
            </div>
          </div>

          {/* Employee Info Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 py-4 text-xs border-b border-slate-100 bg-slate-50/50 -mx-6 px-6">
            <div>
              <span className="text-slate-400 block text-[10px] uppercase font-semibold">Employee Name</span>
              <span className="font-bold text-slate-800">{item.employeeName}</span>
            </div>
            <div>
              <span className="text-slate-400 block text-[10px] uppercase font-semibold">Employee Code</span>
              <span className="font-semibold text-slate-800">{item.employeeCode}</span>
            </div>
            <div>
              <span className="text-slate-400 block text-[10px] uppercase font-semibold">Department</span>
              <span className="font-medium text-slate-800">{item.departmentName || 'General'}</span>
            </div>
            <div>
              <span className="text-slate-400 block text-[10px] uppercase font-semibold">Designation</span>
              <span className="font-medium text-slate-800">{item.designationTitle || 'Staff'}</span>
            </div>
          </div>

          {/* Attendance & Working Days Summary */}
          <div className="py-3 text-xs border-b border-slate-100">
            <h4 className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2">
              Working Period & Attendance Breakdown
            </h4>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-center bg-slate-50 p-2.5 rounded-lg border border-slate-200/60">
              <div>
                <p className="text-[10px] text-slate-500">Period Working Days</p>
                <p className="font-bold text-slate-800 text-sm">{item.periodWorkingDays}</p>
              </div>
              <div>
                <p className="text-[10px] text-slate-500">Worked Days</p>
                <p className="font-bold text-emerald-600 text-sm">{item.workedDays}</p>
              </div>
              <div>
                <p className="text-[10px] text-slate-500">Absent Days</p>
                <p className="font-bold text-rose-600 text-sm">{item.absentDays}</p>
              </div>
              <div>
                <p className="text-[10px] text-slate-500">Half-Days (0.5x)</p>
                <p className="font-bold text-amber-600 text-sm">{item.halfDays}</p>
              </div>
              <div>
                <p className="text-[10px] text-slate-500">Unpaid Leaves</p>
                <p className="font-bold text-slate-700 text-sm">{item.unpaidLeaveDays}</p>
              </div>
            </div>
            <p className="text-[10px] text-slate-400 mt-1.5 italic">
              * Per-day rate = Gross ÷ Working Days = PKR {item.perDayRate.toLocaleString()}
            </p>
          </div>

          {/* Earnings & Deductions Table */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 py-4">
            {/* Earnings */}
            <div>
              <h4 className="text-xs font-bold text-slate-900 border-b border-slate-200 pb-1.5 uppercase tracking-wider">
                Earnings
              </h4>
              <div className="divide-y divide-slate-100 text-xs mt-2">
                <div className="py-1.5 flex justify-between">
                  <span className="text-slate-600">Basic Monthly (100%)</span>
                  <span className="font-semibold text-slate-800">PKR {item.basic.toLocaleString()}</span>
                </div>
                <div className="py-1.5 flex justify-between">
                  <span className="text-slate-600">House Rent Allowance (40%)</span>
                  <span className="font-semibold text-slate-800">PKR {item.hra.toLocaleString()}</span>
                </div>
                <div className="py-1.5 flex justify-between">
                  <span className="text-slate-600">Medical Allowance (10%)</span>
                  <span className="font-semibold text-slate-800">PKR {item.medical.toLocaleString()}</span>
                </div>
                <div className="py-2 flex justify-between font-bold text-slate-900 bg-slate-50 px-2 rounded-md mt-1">
                  <span>Gross Monthly (1.5x basic)</span>
                  <span className="text-indigo-600">PKR {item.grossSalary.toLocaleString()}</span>
                </div>
              </div>
            </div>

            {/* Deductions */}
            <div>
              <h4 className="text-xs font-bold text-slate-900 border-b border-slate-200 pb-1.5 uppercase tracking-wider">
                Deductions & Tax
              </h4>
              <div className="divide-y divide-slate-100 text-xs mt-2">
                <div className="py-1.5 flex justify-between">
                  <span className="text-slate-600">Attendance & Unpaid Leaves</span>
                  <span className="font-semibold text-rose-600">
                    - PKR {item.attendanceDeduction.toLocaleString()}
                  </span>
                </div>
                <div className="py-1.5 flex justify-between">
                  <div>
                    <span className="text-slate-600 block">Income Tax (Annualized)</span>
                    <span className="text-[10px] text-slate-400">
                      Annual Gross: PKR {item.annualizedGross.toLocaleString()}
                    </span>
                  </div>
                  <span className="font-semibold text-rose-600">
                    - PKR {item.monthlyTax.toLocaleString()}
                  </span>
                </div>
                <div className="py-2 flex justify-between font-bold text-slate-900 bg-rose-50/60 px-2 rounded-md mt-1">
                  <span>Total Deductions</span>
                  <span className="text-rose-700">
                    - PKR {(item.attendanceDeduction + item.monthlyTax).toLocaleString()}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Net Salary Banner */}
          <div className="mt-4 p-4 rounded-xl bg-gradient-to-r from-indigo-900 to-slate-900 text-white flex items-center justify-between shadow-md">
            <div>
              <span className="text-xs text-indigo-200 block uppercase font-semibold tracking-wider">
                Net Pay Amount (Take-Home)
              </span>
              <p className="text-[11px] text-slate-300 mt-0.5">
                Bank transfer disbursement in Pakistani Rupees (PKR)
              </p>
            </div>
            <div className="text-right">
              <span className="text-2xl font-black text-white tracking-tight">
                PKR {item.netPay.toLocaleString()}
              </span>
            </div>
          </div>

          {/* Footer note */}
          <div className="mt-6 pt-3 border-t border-slate-200 flex items-center justify-between text-[10px] text-slate-400">
            <span>Generated electronically by HCM Lite • System record ID: {item.employeeId}</span>
            <span>Finalized by: {run.finalizedBy || 'HR Draft'}</span>
          </div>
        </div>

        {/* Action buttons (hidden when printing) */}
        <div className="flex justify-between items-center no-print pt-2">
          <p className="text-xs text-slate-500">
            Use the Print button below to generate a clean PDF or physical payslip.
          </p>
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
            >
              Close
            </button>
            <button
              onClick={handlePrint}
              className="px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors flex items-center gap-1.5 shadow-xs cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print / Download PDF</span>
            </button>
          </div>
        </div>
      </div>
    </Modal>
  );
};
