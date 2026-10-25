import React, { useState, useEffect } from 'react';
import {
  Users,
  UserPlus,
  Search,
  Filter,
  Download,
  Upload,
  Edit,
  Trash2,
  Eye,
  AlertCircle,
  CheckCircle2,
  Mail,
  Phone,
  Briefcase,
  FileSpreadsheet,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { Employee, Department, Designation } from '../types';
import { EmployeeService } from '../services/employeeService';
import { CompanyService } from '../services/companyService';
import { Modal } from '../components/common/Modal';
import { Badge } from '../components/common/Badge';
import { EmptyState } from '../components/common/EmptyState';

export const EmployeesPage: React.FC = () => {
  const { user, role } = useAuth();
  const isHR = role === 'admin' || role === 'hr';

  const [employees, setEmployees] = useState<Employee[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [designations, setDesignations] = useState<Designation[]>([]);
  const [loading, setLoading] = useState(true);

  // Search & filters
  const [search, setSearch] = useState('');
  const [deptFilter, setDeptFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

  // Modals
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [is360Open, setIs360Open] = useState(false);
  const [isCSVModalOpen, setIsCSVModalOpen] = useState(false);

  // Form states
  const [formCode, setFormCode] = useState('');
  const [formName, setFormName] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [formAddress, setFormAddress] = useState('');
  const [formDept, setFormDept] = useState('');
  const [formDesig, setFormDesig] = useState('');
  const [formJoinDate, setFormJoinDate] = useState(new Date().toISOString().split('T')[0]);
  const [formType, setFormType] = useState<Employee['employmentType']>('Full-time');
  const [formStatus, setFormStatus] = useState<Employee['employmentStatus']>('Active');
  const [createAccount, setCreateAccount] = useState(true);
  const [tempPassword, setTempPassword] = useState('Employee@123');

  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // CSV Dry run states
  const [csvRaw, setCsvRaw] = useState('');
  const [dryRunResult, setDryRunResult] = useState<{
    valid: Array<Partial<Employee>>;
    errors: Array<{ row: number; reason: string }>;
  } | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [empList, depList, desList] = await Promise.all([
        EmployeeService.getEmployees(),
        CompanyService.getDepartments(),
        CompanyService.getDesignations(),
      ]);
      setEmployees(empList);
      setDepartments(depList);
      setDesignations(desList);
      if (depList.length > 0) setFormDept(depList[0].id);
      if (desList.length > 0) setFormDesig(desList[0].id);
    } catch (e) {
      console.warn('Error loading employees:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenAdd = () => {
    setSelectedEmployee(null);
    setFormCode(`EMP-${String(employees.length + 1).padStart(3, '0')}`);
    setFormName('');
    setFormEmail('');
    setFormPhone('');
    setFormAddress('');
    setFormJoinDate(new Date().toISOString().split('T')[0]);
    setFormType('Full-time');
    setFormStatus('Active');
    setError(null);
    setIsAddModalOpen(true);
  };

  const handleOpenEdit = (emp: Employee) => {
    setSelectedEmployee(emp);
    setFormCode(emp.employeeCode);
    setFormName(emp.fullName);
    setFormEmail(emp.workEmail);
    setFormPhone(emp.phone);
    setFormAddress(emp.address || '');
    setFormDept(emp.departmentId);
    setFormDesig(emp.designationId);
    setFormJoinDate(emp.joiningDate);
    setFormType(emp.employmentType);
    setFormStatus(emp.employmentStatus);
    setError(null);
    setIsAddModalOpen(true);
  };

  const handleSaveEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const depObj = departments.find((d) => d.id === formDept);
    const desObj = designations.find((d) => d.id === formDesig);

    try {
      if (selectedEmployee) {
        // HR editing or Employee editing self
        if (role === 'employee' && user?.employeeId === selectedEmployee.id) {
          await EmployeeService.selfUpdateProfile(
            selectedEmployee.id,
            formPhone,
            formAddress,
            user?.email || '',
            user?.uid || ''
          );
        } else {
          await EmployeeService.updateEmployee(
            selectedEmployee.id,
            {
              employeeCode: formCode,
              fullName: formName,
              workEmail: formEmail,
              phone: formPhone,
              address: formAddress,
              departmentId: formDept,
              departmentName: depObj ? depObj.name : formDept,
              designationId: formDesig,
              designationTitle: desObj ? desObj.title : formDesig,
              joiningDate: formJoinDate,
              employmentType: formType,
              employmentStatus: formStatus,
            },
            user?.email || '',
            user?.uid || ''
          );
        }
        setSuccess('Employee updated successfully.');
      } else {
        // Create new
        await EmployeeService.createEmployee(
          {
            employeeCode: formCode,
            fullName: formName,
            workEmail: formEmail,
            phone: formPhone,
            address: formAddress,
            departmentId: formDept,
            departmentName: depObj ? depObj.name : formDept,
            designationId: formDesig,
            designationTitle: desObj ? desObj.title : formDesig,
            joiningDate: formJoinDate,
            employmentType: formType,
            employmentStatus: formStatus,
          },
          createAccount,
          tempPassword,
          user?.email || '',
          user?.uid || ''
        );
        setSuccess('Employee registered successfully.');
      }
      setIsAddModalOpen(false);
      await loadData();
    } catch (err: any) {
      setError(err.message || 'Operation failed.');
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this employee record?')) return;
    try {
      await EmployeeService.deleteEmployee(id, user?.email || '', user?.uid || '');
      await loadData();
    } catch (e: any) {
      alert(e.message || 'Failed to delete');
    }
  };

  // CSV Export
  const handleExportCSV = () => {
    const csv = EmployeeService.exportToCSV(filteredEmployees);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `employees_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // CSV Dry run
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      const content = evt.target?.result as string;
      setCsvRaw(content);
      const res = EmployeeService.parseCSVForDryRun(content);
      setDryRunResult(res);
    };
    reader.readAsText(file);
  };

  const handleExecuteImport = async () => {
    if (!dryRunResult || dryRunResult.valid.length === 0) return;
    setLoading(true);
    let imported = 0;

    for (const item of dryRunResult.valid) {
      try {
        await EmployeeService.createEmployee(
          {
            employeeCode: item.employeeCode || `EMP-${Date.now()}`,
            fullName: item.fullName || 'Staff Member',
            workEmail: item.workEmail || `staff${Date.now()}@example.com`,
            phone: item.phone || '',
            departmentId: item.departmentId || 'General',
            designationId: item.designationId || 'Staff',
            joiningDate: item.joiningDate || new Date().toISOString().split('T')[0],
            employmentType: item.employmentType || 'Full-time',
            employmentStatus: 'Active',
          },
          true,
          'Employee@123',
          user?.email || '',
          user?.uid || ''
        );
        imported++;
      } catch (e) {
        console.warn('Import item skipped:', e);
      }
    }

    setIsCSVModalOpen(false);
    setDryRunResult(null);
    setSuccess(`Successfully imported ${imported} employees.`);
    await loadData();
  };

  // Filter logic
  const filteredEmployees = employees.filter((emp) => {
    const q = search.toLowerCase();
    const matchSearch =
      emp.fullName.toLowerCase().includes(q) ||
      emp.workEmail.toLowerCase().includes(q) ||
      emp.employeeCode.toLowerCase().includes(q) ||
      (emp.departmentName && emp.departmentName.toLowerCase().includes(q));

    const matchDept = deptFilter === 'all' || emp.departmentId === deptFilter || emp.departmentName === deptFilter;
    const matchStatus = statusFilter === 'all' || emp.employmentStatus.toLowerCase() === statusFilter.toLowerCase();

    return matchSearch && matchDept && matchStatus;
  });

  return (
    <div className="space-y-6">
      {/* Page Title & Top Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200/90 shadow-xs">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Employee Directory & 360</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Manage company personnel, departmental assignments, and authentication accounts
          </p>
        </div>

        <div className="flex items-center gap-2">
          {isHR && (
            <>
              <button
                onClick={() => setIsCSVModalOpen(true)}
                className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer border border-slate-200"
              >
                <Upload className="w-3.5 h-3.5" />
                <span>Import CSV</span>
              </button>

              <button
                onClick={handleExportCSV}
                className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer border border-slate-200"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Export CSV</span>
              </button>

              <button
                onClick={handleOpenAdd}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
              >
                <UserPlus className="w-4 h-4" />
                <span>Add Employee</span>
              </button>
            </>
          )}
        </div>
      </div>

      {success && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
          <span>{success}</span>
        </div>
      )}

      {/* Filter & Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-xs flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by employee name, email, code, or department..."
            className="w-full pl-9 pr-4 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 bg-white"
          />
        </div>

        <div className="flex gap-2">
          <select
            value={deptFilter}
            onChange={(e) => setDeptFilter(e.target.value)}
            className="text-xs px-3 py-2 border border-slate-300 rounded-xl bg-white"
          >
            <option value="all">All Departments</option>
            {departments.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="text-xs px-3 py-2 border border-slate-300 rounded-xl bg-white"
          >
            <option value="all">All Statuses</option>
            <option value="active">Active</option>
            <option value="on leave">On Leave</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>
      </div>

      {/* Employees Table or Empty State */}
      {filteredEmployees.length === 0 ? (
        <EmptyState
          icon={Users}
          title={employees.length === 0 ? 'No Employees Registered Yet' : 'No Matching Employees'}
          description={
            employees.length === 0
              ? 'Your organization directory starts completely clean. Click "Add Employee" or "Import CSV" to register your first team member.'
              : 'No employees matched your current search filters. Try clearing your search query.'
          }
          actionText={isHR && employees.length === 0 ? 'Add First Employee' : undefined}
          onAction={isHR && employees.length === 0 ? handleOpenAdd : undefined}
        />
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200/90 overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50/80 text-slate-500 font-bold uppercase tracking-wider border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4">Code</th>
                  <th className="py-3 px-4">Full Name</th>
                  <th className="py-3 px-4">Contact Info</th>
                  <th className="py-3 px-4">Department & Role</th>
                  <th className="py-3 px-4">Type</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredEmployees.map((emp) => (
                  <tr key={emp.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3.5 px-4 font-mono font-semibold text-slate-700">
                      {emp.employeeCode}
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="font-bold text-slate-900">{emp.fullName}</div>
                      <div className="text-[11px] text-slate-400">Joined: {emp.joiningDate}</div>
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="text-slate-700">{emp.workEmail}</div>
                      <div className="text-[11px] text-slate-400">{emp.phone || 'No phone'}</div>
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-slate-800">
                        {emp.departmentName || emp.departmentId}
                      </div>
                      <div className="text-[11px] text-slate-500">
                        {emp.designationTitle || emp.designationId}
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-slate-600">{emp.employmentType}</td>
                    <td className="py-3.5 px-4">
                      <Badge
                        variant={
                          emp.employmentStatus === 'Active'
                            ? 'emerald'
                            : emp.employmentStatus === 'On leave'
                            ? 'amber'
                            : 'slate'
                        }
                        size="sm"
                      >
                        {emp.employmentStatus}
                      </Badge>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="inline-flex items-center gap-1.5">
                        <button
                          onClick={() => {
                            setSelectedEmployee(emp);
                            setIs360Open(true);
                          }}
                          className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors cursor-pointer"
                          title="View Employee 360"
                        >
                          <Eye className="w-4 h-4" />
                        </button>

                        {(isHR || (role === 'employee' && user?.employeeId === emp.id)) && (
                          <button
                            onClick={() => handleOpenEdit(emp)}
                            className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                            title="Edit Record"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                        )}

                        {isHR && (
                          <button
                            onClick={() => handleDelete(emp.id)}
                            className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                            title="Delete Record"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Add / Edit Employee Modal */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title={selectedEmployee ? `Edit Employee (${selectedEmployee.fullName})` : 'Register New Employee'}
        maxWidth="xl"
      >
        <form onSubmit={handleSaveEmployee} className="space-y-4">
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-rose-700 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Employee Code *</label>
              <input
                type="text"
                required
                disabled={role === 'employee'}
                value={formCode}
                onChange={(e) => setFormCode(e.target.value)}
                className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg bg-white"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Full Name *</label>
              <input
                type="text"
                required
                disabled={role === 'employee'}
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg bg-white"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Work Email *</label>
              <input
                type="email"
                required
                disabled={role === 'employee'}
                value={formEmail}
                onChange={(e) => setFormEmail(e.target.value)}
                className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg bg-white"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Phone Number</label>
              <input
                type="tel"
                value={formPhone}
                onChange={(e) => setFormPhone(e.target.value)}
                placeholder="+92 300 1234567"
                className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg bg-white"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Residential Address</label>
            <input
              type="text"
              value={formAddress}
              onChange={(e) => setFormAddress(e.target.value)}
              placeholder="Karachi, Pakistan"
              className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg bg-white"
            />
          </div>

          {isHR && (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Department</label>
                  <select
                    value={formDept}
                    onChange={(e) => setFormDept(e.target.value)}
                    className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg bg-white"
                  >
                    {departments.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Designation</label>
                  <select
                    value={formDesig}
                    onChange={(e) => setFormDesig(e.target.value)}
                    className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg bg-white"
                  >
                    {designations.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.title}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Joining Date</label>
                  <input
                    type="date"
                    value={formJoinDate}
                    onChange={(e) => setFormJoinDate(e.target.value)}
                    className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg bg-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Employment Type</label>
                  <select
                    value={formType}
                    onChange={(e) => setFormType(e.target.value as any)}
                    className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg bg-white"
                  >
                    <option value="Full-time">Full-time</option>
                    <option value="Part-time">Part-time</option>
                    <option value="Contract">Contract</option>
                    <option value="Intern">Intern</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Status</label>
                  <select
                    value={formStatus}
                    onChange={(e) => setFormStatus(e.target.value as any)}
                    className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg bg-white"
                  >
                    <option value="Active">Active</option>
                    <option value="On leave">On leave</option>
                    <option value="Inactive">Inactive</option>
                  </select>
                </div>
              </div>

              {!selectedEmployee && (
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="createAccount"
                      checked={createAccount}
                      onChange={(e) => setCreateAccount(e.target.checked)}
                      className="rounded-sm border-slate-300 text-indigo-600 focus:ring-indigo-500"
                    />
                    <label htmlFor="createAccount" className="text-xs font-semibold text-slate-800">
                      Create login authentication account for employee
                    </label>
                  </div>
                  {createAccount && (
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                        Temporary Password (forced change on first login)
                      </label>
                      <input
                        type="text"
                        value={tempPassword}
                        onChange={(e) => setTempPassword(e.target.value)}
                        className="w-full text-xs px-3 py-1.5 border border-slate-300 rounded-lg bg-white font-mono"
                      />
                    </div>
                  )}
                </div>
              )}
            </>
          )}

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsAddModalOpen(false)}
              className="px-4 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-xs cursor-pointer"
            >
              Save Employee
            </button>
          </div>
        </form>
      </Modal>

      {/* Employee 360 Modal */}
      {selectedEmployee && (
        <Modal
          isOpen={is360Open}
          onClose={() => setIs360Open(false)}
          title={`Employee 360 View: ${selectedEmployee.fullName}`}
          maxWidth="2xl"
        >
          <div className="space-y-4 text-xs">
            {/* Header info */}
            <div className="flex items-center gap-3 p-4 bg-slate-50 rounded-xl border border-slate-200">
              <div className="w-12 h-12 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-bold text-lg">
                {selectedEmployee.fullName[0]}
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-slate-900">{selectedEmployee.fullName}</h3>
                  <Badge variant="emerald" size="sm">
                    {selectedEmployee.employmentStatus}
                  </Badge>
                </div>
                <p className="text-slate-500 text-[11px]">
                  {selectedEmployee.employeeCode} • {selectedEmployee.designationTitle || 'Staff'} •{' '}
                  {selectedEmployee.departmentName || 'General'}
                </p>
              </div>
            </div>

            {/* Profile Grid */}
            <div className="grid grid-cols-2 gap-3 p-4 border border-slate-200 rounded-xl">
              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-semibold">Work Email</span>
                <span className="font-semibold text-slate-800">{selectedEmployee.workEmail}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-semibold">Phone</span>
                <span className="font-semibold text-slate-800">{selectedEmployee.phone || 'N/A'}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-semibold">Joining Date</span>
                <span className="font-semibold text-slate-800">{selectedEmployee.joiningDate}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-semibold">Employment Type</span>
                <span className="font-semibold text-slate-800">{selectedEmployee.employmentType}</span>
              </div>
              <div className="col-span-2">
                <span className="text-slate-400 block text-[10px] uppercase font-semibold">Address</span>
                <span className="font-semibold text-slate-800">{selectedEmployee.address || 'N/A'}</span>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setIs360Open(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-lg text-xs cursor-pointer"
              >
                Close 360 View
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* CSV Import Dry Run Modal */}
      <Modal
        isOpen={isCSVModalOpen}
        onClose={() => {
          setIsCSVModalOpen(false);
          setDryRunResult(null);
        }}
        title="CSV Import Dry-Run & Validation"
        maxWidth="2xl"
      >
        <div className="space-y-4 text-xs">
          <p className="text-slate-500 leading-relaxed">
            Upload your CSV file containing employee records. Our dry-run parser validates rows for required
            fields and duplicates before saving anything to Firestore.
          </p>

          <div className="p-4 border-2 border-dashed border-slate-300 rounded-xl text-center bg-slate-50/50">
            <input
              type="file"
              accept=".csv"
              onChange={handleFileChange}
              className="text-xs text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100 cursor-pointer"
            />
          </div>

          {dryRunResult && (
            <div className="space-y-3">
              <div className="flex items-center gap-3 p-3 bg-slate-100 rounded-lg">
                <span className="font-bold text-emerald-700">
                  {dryRunResult.valid.length} Valid Records Ready
                </span>
                {dryRunResult.errors.length > 0 && (
                  <span className="font-bold text-rose-700">
                    {dryRunResult.errors.length} Formatting Warning(s)
                  </span>
                )}
              </div>

              {dryRunResult.errors.length > 0 && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg max-h-32 overflow-y-auto space-y-1">
                  {dryRunResult.errors.map((err, idx) => (
                    <p key={idx} className="text-rose-700 text-[11px]">
                      Row {err.row}: {err.reason}
                    </p>
                  ))}
                </div>
              )}

              {dryRunResult.valid.length > 0 && (
                <div className="max-h-48 overflow-y-auto border border-slate-200 rounded-lg">
                  <table className="w-full text-left">
                    <thead className="bg-slate-50 text-slate-500 uppercase text-[10px] font-bold">
                      <tr>
                        <th className="p-2">Code</th>
                        <th className="p-2">Name</th>
                        <th className="p-2">Email</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-[11px]">
                      {dryRunResult.valid.slice(0, 10).map((v, i) => (
                        <tr key={i}>
                          <td className="p-2 font-mono">{v.employeeCode}</td>
                          <td className="p-2 font-medium">{v.fullName}</td>
                          <td className="p-2 text-slate-500">{v.workEmail}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {dryRunResult.valid.length > 10 && (
                    <p className="p-2 text-center text-slate-400 text-[10px]">
                      ...and {dryRunResult.valid.length - 10} more rows
                    </p>
                  )}
                </div>
              )}

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  onClick={() => setIsCSVModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={handleExecuteImport}
                  disabled={dryRunResult.valid.length === 0}
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-lg font-bold shadow-xs cursor-pointer"
                >
                  Import {dryRunResult.valid.length} Valid Employee(s)
                </button>
              </div>
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
};
