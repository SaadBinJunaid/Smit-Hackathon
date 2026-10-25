# HCM Lite Implementation Plan

## Current State

- [x] Phase 1: Inspect the existing React + Vite + JavaScript project and preserve the Firebase environment configuration.
- [x] Phase 2: Expand the existing authenticated shell with desktop/mobile navigation, role-gated employee navigation, an honest overview state, and a read-only profile sourced from Firebase Auth. Registration, sign-in, auth persistence, and sign-out remain intact.
- [ ] Phase 3: Configure and verify secure roles and Firestore rules in the Firebase project. The local rules and client recognize trusted `admin` and `hr_manager` custom claims, but rules are not deployed, no role has been provisioned, and employee operations remain blocked.
- [x] Phase 4: Implement admin-gated employee records with Firestore CRUD, search, filters, duplicate email protection, and loading/empty/success/error states. Live Firebase access remains blocked until Phase 3 is completed.
- [x] Phase 5: HR-only department list/create/edit/delete, department head, employee counts, duplicate-name handling, and protection against renaming/deleting departments that still have employees. Counts are capped at 150 employee records and report that limitation.
- [x] Phase 6: UTC-day HR attendance records, server timestamps, check-in/out, status filters, linked employee self-history and restricted self-checkout. Work schedule and local timezone are intentionally not inferred; employee self-check-in requires a trusted server operation and is not exposed.
- [x] Phase 7: Employee-owned leave submissions/history and HR pending-request review with comments; Firestore rules require owner submission and prevent self-review.
- [x] Phase 8: Role-aware dashboard summaries sourced from Firestore. HR data is limited to fetched query caps; employees see only their own attendance and leave.
- [x] Phase 9: HR-maintained, date-keyed holiday records and HR-only reports/CSV exports for employee, attendance, leave, and department data. CSV cells are escaped and formula-prefixed values are neutralized.
- [ ] Phase 10: Consider limited payroll only after authorization and privacy review.
- [ ] Phase 11: Optional insights and integration polish.

## Security Gate Before Employee Data Use

1.  In Firebase Console, open **Authentication -> Users**, identify the intended administrator or HR manager, and copy that user's UID. Do not grant a role to users merely because they registered or have an email address in the client.
2.  From a trusted, private server/Admin SDK environment (never the browser), merge the approved claim (`admin` or `hr_manager`) onto that UID. For example, with Firebase Admin SDK initialized from credentials held outside the repository:

        ```js
        const user = await getAuth().getUser(adminUid)
        await getAuth().setCustomUserClaims(adminUid, {
        	...user.customClaims,
        	role: 'admin', // Use 'hr_manager' only for an explicitly authorized HR manager.
        })
        ```

    Limit access to the credential and do not commit it. `setCustomUserClaims` replaces the claims object, so preserve any existing custom claims as shown.

3.  Before deployment, test `firestore.rules` with the Firebase Emulator Suite or Rules Unit Testing. Verify unclaimed users are denied all employee and email-key operations; verify an admin can perform the validated employee operations; and verify malformed employee records are rejected. No emulator rules tests have been run yet.
4.  Review the rules and test results. Only after explicit project-owner authorization, open **Firebase Console -> Firestore Database -> Rules**, select the correct project/database, paste the reviewed `firestore.rules`, and publish. This repository has no `.firebaserc` or Firebase CLI project binding; no rules have been deployed by this project change.
5.  Sign out and back in after assigning the claim so the browser receives a token containing the updated role. Confirm an ordinary account still sees no employee records.

Until these steps are complete, the application hides HR controls from accounts without an approved custom claim and checks the claim before operations. The active Firestore rules in the Firebase project have not been inspected and are unknown; do not enter real HR data until reviewed rules are deployed and tested. The local rules template denies unclaimed access but has no effect on the remote project until deployed. Registration does not grant a role. The application uses real Firestore operations and does not use local storage as a database.

## Verification Notes

- The existing email/password flow was already present and is preserved.
- Employee CRUD and Firestore rules have not been exercised against the live Firebase project because rules and admin provisioning are not configured here.
- Attendance, leave, dashboard, holidays, and reports are implemented against the Firestore SDK but have not been tested against the live project or Firebase Rules Emulator.
- Payroll is intentionally not implemented: no trusted payroll authorization/backend or policy is configured.
- Employee self-check-in is intentionally unavailable until a trusted server operation can establish the date/time; HR check-in/out uses Firestore server timestamps. UTC is used for date grouping because no organization timezone/work schedule was provided.
- Run `npm.cmd run lint` and `npm.cmd run build` after each implementation phase.
