# HCM Lite — Enterprise Human Capital Management System

**Saylani Hackathon Submission**  
**Role-Based Access (Admin • HR • Employee) | Firebase & Firestore | Gemini AI Tool Calling**

---

## 1. Project Overview & Architecture

HCM Lite is a modern, light-theme HR Management System built with React, Vite, Tailwind CSS, Firebase Authentication, Cloud Firestore, and Google Gemini AI.

The application starts with a clean slate (zero fake business records) to ensure data authenticity. All dashboards, KPI charts, tax deductions, and AI assistant answers are calculated directly from verified system records.

### Key Capabilities:
- **Role-Based Access Control (RBAC)**:
  - **Admin**: First-run organization setup, master company attendance policies, HR accounts lifecycle, employee directory, alone finalizes and locks monthly payroll, immutable audit log.
  - **HR**: Employee directory CRUD, CSV dry-run validation and import/export, salary structure configuration, attendance monitoring, attendance correction reviews, leave request approvals, monthly payroll draft calculation.
  - **Employee**: Self-service dashboard, web check-in/checkout with grace period & half-day detection, attendance correction requests, leave application with working-day exclusion of weekends and holidays, Smart Leave conversational form prefilling, personal finalized payslip viewing & PDF printing, and policy Q&A.
- **Strict Privacy Guard**:
  - Employees are prohibited from accessing colleagues' private details or salaries. If an employee queries AI for a colleague's compensation, the request is strictly denied.
- **Pakistan Annualized Tax Slabs**:
  - Implements the 5 illustrative tax brackets (0%, 5%, 15%, 25%, 35%) with exact monthly deduction and itemized payslip breakdown.

---

## 2. Technology Stack

- **Frontend**: React 19, TypeScript, Vite, Tailwind CSS v4, Lucide Icons
- **Backend & Persistence**: Firebase Authentication, Cloud Firestore, Resilient Store Layer
- **AI & LLM**: Google Gemini (`@google/genai` TypeScript SDK) with 7 verified backend tools:
  1. `get_headcount`
  2. `get_attendance_summary`
  3. `get_late_comers`
  4. `get_leave_summary`
  5. `get_my_leave_balance`
  6. `get_payroll_summary`
  7. `search_employees`

---

## 3. Environment Variables Configuration

Copy `.env.example` to `.env`:
```bash
# Firebase Client Configuration
VITE_FIREBASE_API_KEY=your_firebase_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_project.firebasestorage.app
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id
VITE_APP_URL=http://localhost:3000

# Server-Side Gemini API Key (injected automatically in AI Studio)
GEMINI_API_KEY=your_gemini_api_key
```

---

## 4. Implemented Modules & Features

| Module | Features Implemented | Access Scope |
| :--- | :--- | :--- |
| **First-Run Setup** | Organization name, office start (09:00), grace period (15m), half-day threshold (5h), office lat/lng & radius (150m), founding Admin account. | Claimable once |
| **Authentication** | Email/Password login, logout, password change lifecycle, and fast role-context switcher for testing. | All Roles |
| **Employee Directory** | Full CRUD, search, department/status filters, Employee 360 view, profile self-edit for phone & address. | Admin, HR, Employee |
| **CSV Management** | Export with CSV formula injection protection, dry-run validation with row warnings and explicit confirmation. | HR |
| **Attendance & Geofence** | Web check-in & check-out, single record per employee per day, late arrivals flag (&gt; 09:15), half-day flag (&lt; 5h), geofence Haversine calculation. | All Roles |
| **Attendance Corrections**| Employee submits correction with reason; HR reviews, approves/rejects with audit trail. | HR, Employee |
| **Leave Management** | 14 Annual, 8 Sick, 10 Casual quotas; working days calculated excluding weekends & official holidays; overlap check. | All Roles |
| **Salary Structures** | Gross = 1.5 × Basic (Basic 100%, HRA 40%, Medical 10%). | HR |
| **Monthly Payroll** | HR creates draft; working days, absence penalties, half-day deductions, joiner proration, annualized tax slabs; Admin alone finalizes & locks run. | HR, Admin, Employee |
| **Payslips & PDF** | Detailed monthly payslip statement with itemized earnings, deductions, tax, net pay, and printable view. | All Roles |
| **AI Assistant** | Chat with 7 tools, Smart Leave prompt prefilling, Executive KPI summary, Policy Q&A, colleague salary refusal. | All Roles |
| **Announcements** | Create and publish announcements filtered by audience (`all`, `hr`, `employees`). | Admin, HR, Employee |
| **Notifications** | In-app notification center for leave reviews, attendance decisions, and payroll releases. | All Roles |
| **Audit Log** | Immutable, append-only record tracking sensitive administrative and HR operations. | Admin |

---

## 5. Five-Minute Evaluation & Demo Sequence

1. **First-Run Setup**: On initial launch, the system automatically presents the Setup Screen. Enter the company name and create the initial Admin login.
2. **HR Account Creation**: From Admin Suite &rarr; "HR User Accounts", click "Provision HR Account" to create a designated HR manager.
3. **Register Employees**: Switch to HR or use the quick role switcher in the top navigation bar. In "Employees", click "Add Employee" to register 2-3 employees.
4. **Attendance Tracking**: Switch to an Employee role and click "Web Check-In". Notice the server timestamp, late status flag, and working hours calculation.
5. **Smart Leave Application**: In the Employee dashboard, click "Smart Leave" and type:  
   `"I have severe throat infection and need sick leave from 2026-10-26 to 2026-10-27"`.  
   Review the prefilled form and click "Confirm & Apply for Leave".
6. **HR Approval**: Switch to HR, open "Leave Approvals", and approve the request with feedback. Observe the remaining quota update immediately.
7. **Monthly Payroll & Finalization**: In HR &rarr; "Payroll", click "Create Monthly Draft". Switch to Admin and click "Finalize & Lock Payroll".
8. **View Payslip & Test AI Privacy**:  
   - View the itemized payslip and test the Print / Download PDF feature.  
   - Open AI Assistant and ask: *"What is my remaining leave balance?"* (returns correct quota).  
   - As an employee, ask: *"What is Ali's salary?"* (AI strictly refuses: Access Denied).
9. **Audit Trail**: Open Admin &rarr; "Audit Trail" to verify the complete append-only compliance history.
