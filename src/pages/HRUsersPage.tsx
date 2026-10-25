import React, { useState, useEffect } from 'react';
import { UserPlus, UserCheck, Shield, KeyRound, AlertCircle, CheckCircle2, Power } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { UserAccount } from '../types';
import { AuthService } from '../services/authService';
import { Badge } from '../components/common/Badge';
import { Modal } from '../components/common/Modal';

export const HRUsersPage: React.FC = () => {
  const { user } = useAuth();
  const [users, setUsers] = useState<UserAccount[]>([]);
  const [loading, setLoading] = useState(true);

  // Add HR Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [hrEmail, setHrEmail] = useState('');
  const [hrName, setHrName] = useState('');
  const [tempPass, setTempPass] = useState('HrManager@123');
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    setLoading(true);
    try {
      const all = await AuthService.getUsers();
      setUsers(all.filter((u) => u.role === 'hr'));
    } catch (e) {
      console.warn('Load HR accounts error:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateHR = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!hrEmail.trim() || !user) return;
    setCreating(true);
    setError(null);

    try {
      await AuthService.createHRAccount(
        hrEmail.trim(),
        tempPass,
        hrName.trim() || 'HR Manager',
        user.email,
        user.uid
      );
      setSuccess(`HR account created for ${hrEmail}. Temporary credentials ready.`);
      setIsModalOpen(false);
      setHrEmail('');
      setHrName('');
      await loadUsers();
    } catch (err: any) {
      setError(err.message || 'Failed to create HR account.');
    } finally {
      setCreating(false);
    }
  };

  const handleToggleStatus = async (targetUser: UserAccount) => {
    if (!user) return;
    const newStatus = !targetUser.active;
    if (!window.confirm(`Are you sure you want to ${newStatus ? 'activate' : 'deactivate'} this HR account?`)) return;
    try {
      await AuthService.toggleUserStatus(targetUser.uid, newStatus, user.email, user.uid);
      setSuccess(`Account status updated to ${newStatus ? 'Active' : 'Inactive'}.`);
      await loadUsers();
    } catch (e: any) {
      alert(e.message);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200/90 shadow-xs">
        <div>
          <h2 className="text-xl font-bold text-slate-900">HR User Accounts Management</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Admin privilege: Provision HR accounts, issue safe temporary passwords, and control access lifecycles
          </p>
        </div>

        <button
          onClick={() => {
            setError(null);
            setIsModalOpen(true);
          }}
          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
        >
          <UserPlus className="w-4 h-4" />
          <span>Provision HR Account</span>
        </button>
      </div>

      {success && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          <span>{success}</span>
        </div>
      )}

      {/* Table */}
      <div className="bg-white rounded-2xl border border-slate-200/90 overflow-hidden shadow-xs">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
            Active HR Managers ({users.length})
          </h3>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 font-bold uppercase tracking-wider border-b border-slate-200 text-[10px]">
              <tr>
                <th className="py-3 px-4">Manager Name</th>
                <th className="py-3 px-4">Work Email</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Password Lifecycle</th>
                <th className="py-3 px-4">Created</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {users.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-400">
                    No dedicated HR accounts provisioned yet. Click &quot;Provision HR Account&quot; to invite your first HR manager.
                  </td>
                </tr>
              ) : (
                users.map((u) => (
                  <tr key={u.uid} className="hover:bg-slate-50/70">
                    <td className="py-3.5 px-4 font-bold text-slate-900">{u.displayName}</td>
                    <td className="py-3.5 px-4 text-slate-700">{u.email}</td>
                    <td className="py-3.5 px-4">
                      <Badge variant={u.active ? 'emerald' : 'slate'} size="sm">
                        {u.active ? 'Active' : 'Deactivated'}
                      </Badge>
                    </td>
                    <td className="py-3.5 px-4">
                      {u.mustChangePassword ? (
                        <span className="text-[11px] font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md">
                          Temporary Password Active
                        </span>
                      ) : (
                        <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md">
                          Password Established
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-slate-500">
                      {new Date(u.createdAt).toLocaleDateString()}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <button
                        onClick={() => handleToggleStatus(u)}
                        className={`px-2.5 py-1 rounded-md font-semibold text-[11px] cursor-pointer ${
                          u.active
                            ? 'bg-rose-50 text-rose-700 hover:bg-rose-100'
                            : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                        }`}
                      >
                        {u.active ? 'Deactivate' : 'Reactivate'}
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Provision HR Account" maxWidth="md">
        <form onSubmit={handleCreateHR} className="space-y-4 text-xs">
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-rose-700 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Manager Display Name *</label>
            <input
              type="text"
              required
              value={hrName}
              onChange={(e) => setHrName(e.target.value)}
              placeholder="e.g. Sarah Khan (HR Lead)"
              className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg bg-white"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Corporate Email Address *</label>
            <input
              type="email"
              required
              value={hrEmail}
              onChange={(e) => setHrEmail(e.target.value)}
              placeholder="hr@saylanihcm.com"
              className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg bg-white"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Temporary Provisioning Password
            </label>
            <input
              type="text"
              required
              value={tempPass}
              onChange={(e) => setTempPass(e.target.value)}
              className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg bg-white font-mono"
            />
            <p className="text-[10px] text-slate-400 mt-1">
              The user will be prompted to change this password immediately upon their first sign-in.
            </p>
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="px-4 py-2 bg-slate-100 text-slate-700 font-semibold rounded-lg cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={creating}
              className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg shadow-xs cursor-pointer"
            >
              {creating ? 'Creating Account...' : 'Provision HR Account'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
