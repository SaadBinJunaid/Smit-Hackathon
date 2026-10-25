import React, { useState, useEffect } from 'react';
import { FileText, Shield, Search, Filter } from 'lucide-react';
import { AuditLog } from '../types';
import { AuditService } from '../services/auditService';
import { Badge } from '../components/common/Badge';
import { EmptyState } from '../components/common/EmptyState';

export const AuditLogPage: React.FC = () => {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterAction, setFilterAction] = useState('all');
  const [search, setSearch] = useState('');

  useEffect(() => {
    loadLogs();
  }, []);

  const loadLogs = async () => {
    setLoading(true);
    try {
      const list = await AuditService.getLogs();
      setLogs(list);
    } catch (e) {
      console.warn('Error loading audit logs:', e);
    } finally {
      setLoading(false);
    }
  };

  const filteredLogs = logs.filter((l) => {
    const q = search.toLowerCase();
    const matchSearch =
      l.action.toLowerCase().includes(q) ||
      l.actorEmail.toLowerCase().includes(q) ||
      l.details.toLowerCase().includes(q) ||
      l.targetType.toLowerCase().includes(q);

    const matchAction = filterAction === 'all' || l.action.toLowerCase().includes(filterAction.toLowerCase());

    return matchSearch && matchAction;
  });

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200/90 shadow-xs">
        <div className="flex items-center gap-2 mb-1">
          <Shield className="w-5 h-5 text-purple-600" />
          <h2 className="text-xl font-bold text-slate-900">Governance & Security Audit Trail</h2>
        </div>
        <p className="text-xs text-slate-500">
          Append-only compliance log recording sensitive actions: payroll finalization, attendance corrections, policy modifications, and user lifecycle events
        </p>
      </div>

      {/* Filter / Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-xs flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by actor, action name, or details..."
            className="w-full pl-9 pr-4 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 bg-white"
          />
        </div>

        <select
          value={filterAction}
          onChange={(e) => setFilterAction(e.target.value)}
          className="text-xs px-3 py-2 border border-slate-300 rounded-xl bg-white"
        >
          <option value="all">All Actions</option>
          <option value="PAYROLL">Payroll Operations</option>
          <option value="LEAVE">Leave Approvals</option>
          <option value="ATTENDANCE">Attendance Events</option>
          <option value="EMPLOYEE">Employee Changes</option>
          <option value="SETTINGS">Settings Changes</option>
        </select>
      </div>

      {/* Table */}
      {filteredLogs.length === 0 ? (
        <EmptyState
          icon={FileText}
          title="No Audit Entries Found"
          description="Actions performed by Admin and HR (e.g. creating records, approving leaves, finalizing payroll) will automatically populate this immutable audit trail."
        />
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200/90 overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 font-bold uppercase tracking-wider border-b border-slate-200 text-[10px]">
                <tr>
                  <th className="py-3 px-4">Timestamp</th>
                  <th className="py-3 px-4">Actor</th>
                  <th className="py-3 px-4">Role</th>
                  <th className="py-3 px-4">Action</th>
                  <th className="py-3 px-4">Target Type</th>
                  <th className="py-3 px-4">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-mono">
                {filteredLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50/70 font-sans">
                    <td className="py-3 px-4 text-slate-500 text-[11px] whitespace-nowrap">
                      {new Date(log.timestamp).toLocaleString()}
                    </td>
                    <td className="py-3 px-4 font-semibold text-slate-800">{log.actorEmail}</td>
                    <td className="py-3 px-4">
                      <Badge
                        variant={
                          log.actorRole === 'admin'
                            ? 'purple'
                            : log.actorRole === 'hr'
                            ? 'indigo'
                            : 'slate'
                        }
                        size="sm"
                      >
                        {log.actorRole}
                      </Badge>
                    </td>
                    <td className="py-3 px-4 font-bold text-slate-900 font-mono text-[11px]">
                      {log.action}
                    </td>
                    <td className="py-3 px-4 text-slate-600 capitalize">{log.targetType}</td>
                    <td className="py-3 px-4 text-slate-700 max-w-md">{log.details}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
