# System Technical Documentation
## Document & Subscription Management System (RBP)

---

## Table of Contents
1. [Project Overview](#1-project-overview)
2. [Complete Page Documentation](#2-complete-page-documentation)
3. [Complete Feature Documentation](#3-complete-feature-documentation)
4. [Business Logic & Calculations](#4-business-logic--calculations)
5. [Supabase Database Documentation](#5-supabase-database-documentation)
6. [Database Relationships & ER Diagram](#6-database-relationships--er-diagram)
7. [Required Supabase Tables & Analysis](#7-required-supabase-tables--analysis)
8. [Supabase Authentication Architecture](#8-supabase-authentication-architecture)
9. [Row Level Security (RLS) Status](#9-row-level-security-rls-status)
10. [Supabase Storage Buckets & Policies](#10-supabase-storage-buckets--policies)
11. [Project Structure & Architecture](#11-project-structure--architecture)
12. [Component Documentation](#12-component-documentation)
13. [Supabase Query Documentation](#13-supabase-query-documentation)
14. [End-to-End Data Flow](#14-end-to-end-data-flow)
15. [CRUD Matrix](#15-crud-matrix)
16. [Roles & Permissions](#16-roles--permissions)
17. [Forms & Validation Rules](#17-forms--validation-rules)
18. [Search, Filter & Sort Logic](#18-search-filter--sort-logic)
19. [Error Handling & Resilience](#19-error-handling--resilience)
20. [Security Analysis & Recommendations](#20-security-analysis--recommendations)
21. [Environment Variables & Configuration](#21-environment-variables--configuration)
22. [Dependencies Breakdown](#22-dependencies-breakdown)
23. [Complete System Flow](#23-complete-system-flow)
24. [Page-to-Database Mapping](#24-page-to-database-mapping)
25. [Feature-to-Table Mapping](#25-feature-to-table-mapping)
26. [Database Design Recommendations](#26-database-design-recommendations)
27. [Technical Debt & Issue Registry](#27-technical-debt--issue-registry)
28. [Performance Analysis & Optimizations](#28-performance-analysis--optimizations)
29. [Future Scalability Analysis](#29-future-scalability-analysis)
30. [Final System Summary](#30-final-system-summary)

---

## 1. Project Overview

### 1.1 What the System Does
The **Document & Subscription Management System** is an enterprise resource tracking and workflow automation platform developed for RBP. The system acts as a centralized repository and lifecycle manager for all organizational documents, recurring subscriptions, financial loans, bank guarantees (BG), insurance policies (vehicle, health, life, and general), property taxes, email/domain renewals, project documentation (work orders, tenders, and engineering test reports), and pump experience certificates.

Beyond basic record tracking, the application enforces automated multi-stage operational workflows:
- **Subscription Lifecycle:** Request $\rightarrow$ Multi-level Approval $\rightarrow$ Payment Processing $\rightarrow$ Periodic Renewal Tracking $\rightarrow$ Re-approval Loop.
- **Document Expiration & Renewals:** Automated date tracking, 15-day automated WhatsApp alerts to responsible officers, renewal history archiving, and file replacement.
- **Loan Foreclosure & NOC Tracking:** Tracking loan disbursements, EMI payments, pre-closure request approvals, and bank NOC (No Objection Certificate) collections.
- **Document Sharing Engine:** Multi-channel distribution of documents via WhatsApp Business API templates and EmailJS directly to clients and internal personnel, with immutable audit logging.
- **Executive Analytics & Risk Forecasting:** Real-time KPI aggregation, compliance risk scoring (Critical, High, Medium, Low), 7/30/60/90-day renewal forecasting, and Excel reporting.

### 1.2 Technology Stack Reality (Actual vs. Stated)
> [!NOTE]
> While the initial requirements prompt noted Next.js, inspection of the codebase confirms that the application is built using **Vite + React 18 with React Router DOM v6** (Single Page Application architecture), using TypeScript and Tailwind CSS.

- **Frontend Runtime:** React 18.3.1
- **Language:** TypeScript 5.5.3
- **Build Tool / Bundler:** Vite 5.4.2
- **Client Routing:** React Router DOM 6.22.0
- **Styling:** Tailwind CSS 3.4.1 + PostCSS + Autoprefixer
- **Client State Management:** Zustand 4.5.0 with `persist` middleware (`localStorage`)
- **Backend & Database Services:** Supabase Cloud (PostgreSQL 15+, PostgREST, Storage API, Deno Edge Functions)
- **Data Visualization:** Recharts 2.10.3
- **Icons & UI Primitives:** Lucide React 0.344.0, Radix UI Dropdown Menu 2.1.16
- **Notifications:** React Hot Toast 2.4.1
- **Date Utilities:** date-fns 2.30.0 + custom formatter (`dateFormatter.ts`)
- **Spreadsheet Operations:** SheetJS (`xlsx` 0.18.5)
- **Messaging Integrations:** Meta WhatsApp Cloud API (via Supabase Edge Functions), EmailJS (`emailjs-com` 3.2.0)

### 1.3 Architecture: Client-to-Supabase (Serverless / Direct BaaS)
There is **no standalone custom backend server** (e.g. Express, Django, or NestJS). The React client directly connects to Supabase services using `@supabase/supabase-js` configured in [supabase.ts](file:///d:/Botivate/RBP/-Documents-Subscription/src/utils/supabase.ts):

```
+-----------------------------------------------------------------------------------+
|                              REACT SPA (VITE CLIENT)                              |
|  +---------------------+  +----------------------+  +---------------------------+  |
|  | Pages & Components  |  | Zustand Store        |  | UI Services & Utils       |  |
|  | (Dashboard, Summary,|  | (authStore,          |  | (dateFormatter,           |  |
|  |  ResourceManager,  |  |  dataStore,          |  |  whatsappService,         |  |
|  |  Modules, Modals)   |  |  headerStore)        |  |  subscriptionSync)        |  |
|  +----------+----------+  +----------+-----------+  +-------------+-------------+  |
|             |                        |                            |                |
+-------------|------------------------|----------------------------|----------------+
              |                        |                            |
              +------------------------+----------------------------+
                                       |
                       HTTPS Requests (Supabase Client)
                                       |
+--------------------------------------v---------------------------------------------+
|                               SUPABASE PLATFORM                                    |
|                                                                                    |
|  +--------------------+  +--------------------+  +-------------------------------+  |
|  | PostgREST API      |  | Storage API        |  | Deno Edge Functions           |  |
|  | (Direct Table CRUD |  | (DRIVE_FOLDER,     |  | (send-whatsapp,               |  |
|  |  over 33 tables)   |  |  insurance,        |  |  renewal-reminder,            |  |
|  |                    |  |  property-tax,     |  |  subscription-reminder,       |  |
|  |                    |  |  Email Renewal)    |  |  document-reminder)           |  |
|  +---------+----------+  +---------+----------+  +---------------+---------------+  |
|            |                       |                             |                 |
|            +-----------------------+-----------------------------+                 |
|                                    |                                               |
|                    +---------------v---------------+                               |
|                    | PostgreSQL Database           |                               |
|                    | (Public Schema - 33 Tables,   |                               |
|                    |  pg_cron, pg_net extensions)  |                               |
|                    +-------------------------------+                               |
+------------------------------------------------------------------------------------+
```

### 1.4 Backend Responsibilities Handled Directly by Supabase
1. **Relational Database Engine:** PostgreSQL 15 storing core entities, relational foreign keys, timestamps, indexes, and constraints.
2. **RESTful Data API:** Supabase PostgREST exposes instant CRUD endpoints for every table under `public.*`.
3. **Asset & Binary File Storage:** Object storage buckets for PDF scans, policy documents, vehicle RC copies, test report certificates, and payment transaction receipts.
4. **Serverless Compute (Edge Functions):** Deno runtime functions handle third-party HTTP requests to Meta's WhatsApp Graph API, daily scheduled cron scans, and reminder triggers.
5. **Scheduled Jobs:** PostgreSQL `pg_cron` and `pg_net` trigger edge functions daily at 09:00 UTC for 15-day advance expiry notifications.

---

## 2. Complete Page Documentation

Every page implemented in the system is mapped below.

### 2.1 Login Page
- **File Path:** [Login.tsx](file:///d:/Botivate/RBP/-Documents-Subscription/src/pages/Login.tsx)
- **Route / URL:** `/login`
- **Access Control:** Public (unauthenticated users). Authenticated users are redirected to `/`.
- **Purpose:** Authenticate users against credentials stored in the Supabase database.
- **UI Sections & Components:** Centered card with RBP logo, username input with icon, password input with eye icon toggle, sign-in button, Botivate footer badge.
- **Forms & Inputs:**
  - `username` (text, required)
  - `password` (password/text toggle, required)
- **Buttons & Actions:**
  - `Sign in` (triggers `handleSubmit` calling `useAuthStore.login`)
- **Data Operations:**
  - `SELECT * FROM login WHERE username = :u AND password = :p LIMIT 1`
- **Business Logic & Validations:**
  - Checks if username/password are non-empty.
  - Verifies that `deleted !== true`.
  - Sets role to `admin` or `user`.
  - Parses comma-separated permission list from `login.pages`.
- **States:** Loading indicator (`Signing in...`), toast notifications on success/error.

---

### 2.2 Overview Dashboard
- **File Path:** [Dashboard.tsx](file:///d:/Botivate/RBP/-Documents-Subscription/src/pages/Dashboard.tsx)
- **Route / URL:** `/`
- **Access Control:** Authenticated users with `'Dashboard'` permission (or `admin`).
- **Purpose:** Executive overview displaying high-level counts, financial run-rates, pending operational tasks, and status distribution donut charts.
- **UI Sections:**
  - **Resource Overview Cards:** Total Documents, Total Subscriptions (with monthly estimated cost in INR), Total Loans.
  - **Action Items & Status Cards:** Renewals Pending, Pending Approvals, NOC Completed.
  - **Interactive Breakdown Charts:** Subscriptions Donut (Active vs. Renewal), Documents Donut (Active vs. Expiring), Loans Donut (Active vs. Closed).
  - **Drill-Down Modal:** Clicking any stat card opens a categorized breakdown modal with direct navigation buttons.
- **Data Operations:**
  - `SELECT * FROM "Add New Document" WHERE is_deleted = false`
  - `SELECT * FROM loan`
  - Calls `syncSubscriptions()` which runs:
    - `SELECT * FROM create_subscription`
    - `SELECT subscription_no, created_at, note FROM APPROVAL ORDER BY created_at DESC`
- **Business Logic:**
  - **Renewals Pending:** Documents where `planned_date` is not empty and `actual_1` is empty.
  - **Pending Approvals:** Subscriptions where `planned_2` is not empty and `actual_2` is empty.
  - **NOC Completed:** Loans where `planned_2` and `actual_2` are both populated.
  - **Monthly Subscription Run-Rate:** Normalizes annual, quarterly, and half-yearly prices to monthly equivalents:
    $$\text{Monthly Cost} = \sum \begin{cases} \text{Price} / 12 & \text{if Yearly} \\ \text{Price} / 3 & \text{if Quarterly} \\ \text{Price} / 6 & \text{if Half-Yearly} \\ \text{Price} & \text{otherwise} \end{cases}$$

---

### 2.3 Executive Summary & Comprehensive Report
- **File Path:** [Summary.tsx](file:///d:/Botivate/RBP/-Documents-Subscription/src/pages/Summary.tsx)
- **Route / URL:** `/summary`
- **Access Control:** Authenticated users.
- **Purpose:** Enterprise multi-entity reporting hub aggregating all 10 core business verticals into cross-departmental KPI summaries, risk audits, expiration forecasts, and Excel export files.
- **UI Sections:**
  - Company filter dropdown (populates dynamically from master records and all entities).
  - Date range filters (All, 7 Days, 30 Days, 60 Days, 90 Days).
  - KPI Stat Grid (Total records, Active, Expired, Expiring Soon, Pending Renewals, Shares, Renewals).
  - Executive Insights (Highest Risk Category, Most Shared Document, Most Renewed Item, Compliance Score percentage).
  - Renewal Forecast cards (7, 30, 60, 90 days).
  - Multi-tab Data Grid (Documents, Subscriptions, Insurance, BG, Work Orders, Tenders, Test Reports, Experience, Loans).
  - Top Risk Items Table & Critical Alerts Feed.
- **Buttons & Actions:**
  - `Export to Excel` (generates multi-column workbook via `xlsx`).
  - `Print Summary` (triggers `window.print()` with print CSS styles).
  - Refresh data button.
- **Data Operations:**
  - Concurrently queries 20+ tables using `safeQuery(supabase.from(...).select(...))` to gracefully handle missing tables without unhandled promise rejections.
- **Business Logic:**
  - Risk scoring:
    - Critical: Expiry date $< \text{Today}$ (Expired).
    - High: Expiry date within $0-15\text{ days}$.
    - Medium: Expiry date within $16-30\text{ days}$.
    - Low: Expiry date $> 30\text{ days}$.
  - Compliance Score: Percentage of non-expired records over total active portfolio.

---

### 2.4 Resource Manager (Unified Resource Hub)
- **File Path:** [ResourceManager.tsx](file:///d:/Botivate/RBP/-Documents-Subscription/src/pages/ResourceManager.tsx)
- **Route / URL:** `/resource-manager`
- **Access Control:** Authenticated users with `'Resource Manager'` permission.
- **Purpose:** Centralized tabbed workspace hosting all record modules without forcing users to navigate through nested sidebar links.
- **Tabs & Sub-Tabs:**
  - **Documents:** Renders `<AllDocuments />`.
  - **Subscriptions:** Renders `<AllSubscriptions />`.
  - **BG:** Renders `<AllBG />`.
  - **Insurance:**
    - Sub-tabs: Vehicle (`<VehicleInsurance />`), Health (`<HealthInsurance />`), Life (`<LifeInsurance />`), General Insurance (Dropdown: Building, Employee Compensation, Company Staff, Construction, Akashdeep Complex, Fire Policy).
  - **Property Tax:** Renders `<PropertyTax />`.
  - **Email Renewal:** Renders `<EmailRenewal />`.
  - **Project Documents:**
    - Sub-tabs: Work Orders (`<WorkOrders />`), Tenders (`<Tenders />`), Test Reports (Dropdown: HLS, PV Module, PV Water Pumping, Solar Photovoltaic, Pump, Pannel), Experience Certificates (Dropdown: Pump).

---

### 2.5 Document Management Pages

#### A. All Documents
- **File Path:** [AllDocuments.tsx](file:///d:/Botivate/RBP/-Documents-Subscription/src/pages/document/AllDocuments.tsx)
- **Route:** `/document/all`
- **Components Used:** `AddDocument`, `EditDocument`, `ShareModal`, `SearchableFilterSelect`, Radix UI Dropdown Menu.
- **UI Sections:** Search bar, Category filter, Company filter, Document Name filter, Concern Person filter, Batch Share button, Records Table with file preview and size badges, Action menus (Edit, Delete, Share via WhatsApp, Share via Email).
- **Data Operations:**
  - `SELECT * FROM "Add New Document" WHERE is_deleted = false`
  - Soft Delete: `UPDATE "Add New Document" SET is_deleted = true WHERE id = :id`
  - Storage: `supabase.storage.from("DRIVE_FOLDER").list("", { limit: 1000 })` to resolve file sizes.

#### B. Add Document Modal
- **File Path:** [AddDocument.tsx](file:///d:/Botivate/RBP/-Documents-Subscription/src/pages/document/AddDocument.tsx)
- **Inputs:** Dynamic multi-entry form (up to 10 entries per batch): Company Name, Document Name, Document Type, Category, Issue Date, Renewal Needed (Yes/No toggle), Renewal Date, Concern Person Name, Mobile Number, Department, File Upload.
- **Data Operations:**
  - Uploads file to bucket `DRIVE_FOLDER` with path `documents/${Date.now()}_${cleanName}`.
  - `INSERT INTO "Add New Document" (...) RETURNING id`.
  - Generates serial number `SN-${inserted.id}` and executes `UPDATE "Add New Document" SET serial_no = :sn WHERE id = :id`.
  - Auto-synchronizes company name and category to `master` table if non-existent.

#### C. Edit Document Modal
- **File Path:** [EditDocument.tsx](file:///d:/Botivate/RBP/-Documents-Subscription/src/pages/document/EditDocument.tsx)
- **Data Operations:** Updates existing record in `"Add New Document"` by `id` or `serial_no`. Uploads new file to `DRIVE_FOLDER` if replaced.

#### D. Document Renewal Workspace
- **File Path:** [Renewal.tsx](file:///d:/Botivate/RBP/-Documents-Subscription/src/pages/document/Renewal.tsx)
- **Route:** `/document/renewal`
- **UI Sections:**
  - **Pending Renewals Tab:** Lists active documents where renewal is pending.
  - **Renewal History Tab:** Chronological audit log of all completed renewals.
  - **Renewal Action Modal:** Displays old renewal date, allows uploading newly renewed document, setting next renewal date, and toggling whether future renewal is needed.
- **Data Operations:**
  - Updates `"Add New Document"` with new renewal date and image URL.
  - Inserts audit row into `"Document Renewal"`:
    - `serial_no`, `last_renewal_date`, `old_image`, `need_renewal`, `new_renewal_date`, `new_image`.

#### E. Shared Documents History & Modal
- **File Paths:** [Shared.tsx](file:///d:/Botivate/RBP/-Documents-Subscription/src/pages/document/Shared.tsx), [ShareModal.tsx](file:///d:/Botivate/RBP/-Documents-Subscription/src/pages/document/ShareModal.tsx), [SharingLogs.tsx](file:///d:/Botivate/RBP/-Documents-Subscription/src/pages/document/SharingLogs.tsx)
- **Route:** `/document/shared`
- **Data Operations:**
  - Selects from `Shared_Documents` ordered by `id DESC`.
  - When sharing via WhatsApp: Calls Supabase Edge Function `send-whatsapp`.
  - When sharing via Email: Dispatches email via EmailJS.
  - Inserts log row into `Shared_Documents`.

---

### 2.6 Subscription Management Pages

#### A. All Subscriptions
- **File Path:** [AllSubscriptions.tsx](file:///d:/Botivate/RBP/-Documents-Subscription/src/pages/subscription/AllSubscriptions.tsx)
- **Route:** `/subscription/all`
- **UI Sections:** Add subscription button, summary cards (Total Subscriptions, Total Monthly Cost, Active, Expiring Soon), Search bar, Company filter, Data Table with Status pill (`Pending`, `Approved`, `Paid`, `Rejected`).
- **Data Operations:** Reads via `syncSubscriptions()` from `create_subscription` and `APPROVAL`.

#### B. Add Subscription Modal
- **File Path:** [AddSubscription.tsx](file:///d:/Botivate/RBP/-Documents-Subscription/src/pages/subscription/AddSubscription.tsx)
- **Inputs:** Company Name, Subscriber Name, Subscription Name, Price, Frequency (Monthly, Quarterly, Half-Yearly, Yearly, Weekly), Purpose.
- **Data Operations:**
  - `INSERT INTO create_subscription (company_name, subscriber_name, subscription_name, price, frequency, purpose) RETURNING id`
  - Generates serial number `SN-${id}` and updates `create_subscription.serial_no`.

#### C. Subscription Approval Workspace
- **File Path:** [Approval.tsx](file:///d:/Botivate/RBP/-Documents-Subscription/src/pages/subscription/Approval.tsx)
- **Route:** `/subscription/approval`
- **UI Sections:**
  - **Pending Approvals Tab:** Subscriptions where `planned_2` is populated and `actual_2` is empty.
  - **Approval History Tab:** Subscriptions where `actual_2` is populated.
  - **Approval Action Modal:** Radio options (`Approve` or `Reject`), approval notes, auto-generated Approval Number (`AN-001`).
- **Data Operations:**
  - Inserts into `APPROVAL`: `approval_no`, `subscription_no`, `approved_by`, `approval_status`, `note`.
  - Updates `create_subscription`: `actual_2 = now()`, `approval_status = 'Approved' | 'Rejected'`.

#### D. Subscription Payment Workspace
- **File Path:** [Payment.tsx](file:///d:/Botivate/RBP/-Documents-Subscription/src/pages/subscription/Payment.tsx)
- **Route:** `/subscription/payment`
- **UI Sections:**
  - **Pending Payments Tab:** Subscriptions where `planned_3` is set and `actual_3` is empty.
  - **Payment History Tab:** Subscriptions where `actual_3` is populated.
  - **Payment Action Modal:** Start Date, Frequency, Auto-calculated End Date, Payment Mode (Credit Card, Net Banking, UPI, Cash, Cheque), Transaction ID (`TID-001`), Updated Price, Receipt Upload.
- **Data Operations:**
  - Uploads receipt file to `DRIVE_FOLDER`.
  - Inserts into `PAYMENT`: `subscription_no`, `payment_mode`, `transaction_id`, `start_date`, `end_date`, `insurance_document` (receipt URL), `updated_price`, `old_price`.
  - Updates `create_subscription`: `actual_3 = now()`, `start_date`, `end_date`, `document_copy = receiptUrl`, `price = updated_price`.

#### E. Subscription Renewal Workspace
- **File Path:** [Renewal.tsx](file:///d:/Botivate/RBP/-Documents-Subscription/src/pages/subscription/Renewal.tsx)
- **Route:** `/subscription/renewal`
- **UI Sections:**
  - **Pending Renewals Tab:** Subscriptions nearing end date or flagged for renewal.
  - **Renewal History Tab:** Chronological logs of renewals.
  - **Renewal Action Modal:** Action selector (`Renewed` or `Terminated`), Renewal Number (`RN-001`), approved by, next renewal date.
- **Data Operations:**
  - Inserts into `RENEWAL`: `renewal_no`, `subscription_no`, `approved_by`, `status`.
  - Updates `create_subscription`: Sets `actual_1 = now()`, `renewal_status = 'Renewed' | 'Terminated'`, increments `renewal_count`, and **clears `actual_2`, `approval_status`, `actual_3`** to route the subscription through the approval and payment cycles again.

---

### 2.7 Loan Management Pages

#### A. All Loans
- **File Path:** [AllLoans.tsx](file:///d:/Botivate/RBP/-Documents-Subscription/src/pages/loan/AllLoans.tsx)
- **Route:** `/loan/all`
- **UI Sections:** Search bar, Bank filter, Add Loan button, Loans Table (Serial No, Company, Loan Name, Bank, Amount, EMI, Start/End dates, Provided Document, Remarks, Attachment link, Edit, Delete).
- **Data Operations:**
  - `SELECT * FROM loan ORDER BY id DESC`
  - `DELETE FROM loan WHERE id = :id`

#### B. Add / Edit Loan Modals
- **File Paths:** [AddLoan.tsx](file:///d:/Botivate/RBP/-Documents-Subscription/src/pages/loan/AddLoan.tsx), [EditLoan.tsx](file:///d:/Botivate/RBP/-Documents-Subscription/src/pages/loan/EditLoan.tsx)
- **Data Operations:** Uploads loan sanction letter to `DRIVE_FOLDER` under `loans/`, inserts/updates `loan` table with auto-generated `SN-${nextId}`.

#### C. Loan Foreclosure Request Workspace
- **File Path:** [Foreclosure.tsx](file:///d:/Botivate/RBP/-Documents-Subscription/src/pages/loan/Foreclosure.tsx)
- **Route:** `/loan/foreclosure`
- **UI Sections:** Pending Foreclosures tab (`planned_1` set and `actual_1` empty), History tab (`actual_1` set), Action Modal (Request Date, Requester Name).
- **Data Operations:**
  - Updates `loan`: `actual_1 = requestDate`, `request_date = requestDate`, `request_name = requesterName`.

#### D. Loan NOC Collection Workspace
- **File Path:** [NOC.tsx](file:///d:/Botivate/RBP/-Documents-Subscription/src/pages/loan/NOC.tsx)
- **Route:** `/loan/noc`
- **UI Sections:** Pending NOC tab (`planned_2` set and `actual_2` empty), NOC Collected History tab (`actual_2` set), Action Modal (NOC Status Yes/No, Date of Collection).
- **Data Operations:**
  - Updates `loan`: `actual_2 = nocDate`, `collect_noc = 'Yes' | 'No'`.

---

### 2.8 Bank Guarantees (BG)
- **File Paths:** [AllBG.tsx](file:///d:/Botivate/RBP/-Documents-Subscription/src/pages/bg/AllBG.tsx), [AddBG.tsx](file:///d:/Botivate/RBP/-Documents-Subscription/src/pages/bg/AddBG.tsx), [EditBG.tsx](file:///d:/Botivate/RBP/-Documents-Subscription/src/pages/bg/EditBG.tsx)
- **Route:** `/bg/all`
- **Purpose:** Track bank guarantees issued for tenders and commercial commitments.
- **Inputs & Fields:** BG Name, BG Number, Bank Name, Guarantee Amount, Start Date, Expiry Date, Claim Expiry Date, Remarks, BG Copy Upload.
- **Data Operations:**
  - Uploads document to `DRIVE_FOLDER`.
  - `INSERT INTO "BG" (...) RETURNING id`.
  - Generates serial number `BG-${inserted.id}` and updates `BG.serial_no`.

---

### 2.9 Insurance Management Pages

#### A. Vehicle Insurance & Vehicle Renewal
- **File Paths:** [vehicle.tsx](file:///d:/Botivate/RBP/-Documents-Subscription/src/pages/Insurance/vehicle/vehicle.tsx), [AddVehicleInsurance.tsx](file:///d:/Botivate/RBP/-Documents-Subscription/src/pages/Insurance/vehicle/AddVehicleInsurance.tsx), [EditVehicleInsurance.tsx](file:///d:/Botivate/RBP/-Documents-Subscription/src/pages/Insurance/vehicle/EditVehicleInsurance.tsx), [VehicleRenewal.tsx](file:///d:/Botivate/RBP/-Documents-Subscription/src/pages/Insurance/vehicle/VehicleRenewal.tsx)
- **Routes:** `/Insurance/vehicle`, `/Insurance/vehicle-renewal`
- **Fields:** Company Name, Registration No, Make, Model, Insurance Agent, Period From/To, Premium Paid, Add-ons, Policy Document, RC Document, Renewal Needed, Renewal Date, Contact Person details.
- **Storage:** Uploads to bucket `insurance` under `vehicle/`.
- **Tables:** `vehicle_insurance`, `vehicle_insurance_renewal`.

#### B. Health Insurance & Health Renewal
- **File Paths:** [Health.tsx](file:///d:/Botivate/RBP/-Documents-Subscription/src/pages/Insurance/Health/Health.tsx), [AddHealth.tsx](file:///d:/Botivate/RBP/-Documents-Subscription/src/pages/Insurance/Health/AddHealth.tsx), [EditHealth.tsx](file:///d:/Botivate/RBP/-Documents-Subscription/src/pages/Insurance/Health/EditHealth.tsx), [HealthRenewal.tsx](file:///d:/Botivate/RBP/-Documents-Subscription/src/pages/Insurance/Health/HealthRenewal.tsx)
- **Routes:** `/Insurance/health`, `/Insurance/health-renewal`
- **Fields:** Company Name, Plan Name, Policy Holder, Policy No, Persons Covered, Policy Cover Sum, Start/End Date, Premium, Agent & Contact, Policy File, Renewal Date, Contact Person.
- **Storage:** Bucket `insurance` under `health/`.
- **Tables:** `health_insurance`, `health_insurance_renewal`.

#### C. Life Insurance & Life Renewal
- **File Paths:** [LifeInsurance.tsx](file:///d:/Botivate/RBP/-Documents-Subscription/src/pages/Insurance/Life Insurance/LifeInsurance.tsx), [AddLifeInsurance.tsx](file:///d:/Botivate/RBP/-Documents-Subscription/src/pages/Insurance/Life Insurance/AddLifeInsurance.tsx), [EditLifeInsurance.tsx](file:///d:/Botivate/RBP/-Documents-Subscription/src/pages/Insurance/Life Insurance/EditLifeInsurance.tsx), [LifeRenewal.tsx](file:///d:/Botivate/RBP/-Documents-Subscription/src/pages/Insurance/Life Insurance/LifeRenewal.tsx)
- **Routes:** `/Insurance/life`, `/Insurance/life-renewal`
- **Fields:** Company Name, Plan Name, Policy Holder, Policy No, Start/End Date, Premium Paid, Agent, Document File, Renewal Date, Contact Person.
- **Storage:** Bucket `insurance` under `life/`.
- **Tables:** `life_insurance`, `life_insurance_renewal`.

#### D. General Insurance: Employee Compensation & Fire Policy
- **File Paths:** [WorkManCompensation.tsx](file:///d:/Botivate/RBP/-Documents-Subscription/src/pages/Insurance/General/WorkManCompensation.tsx), [FirePolicy.tsx](file:///d:/Botivate/RBP/-Documents-Subscription/src/pages/Insurance/General/FirePolicy.tsx)
- **Routes:** `/Insurance/workmancompensation`, `/Insurance/firepolicy`
- **Tables:** `employee_compensation`, `fire_policy`.
- **Fields:** Policy Holder Company, Policy No, Policy Name, Start/End Date, Final Premium Amount, Sum Insured / Total Amount, Agent Name, Contact No, Document URL.

#### E. General Insurance Stubs
- **File Paths:** [Building.tsx](file:///d:/Botivate/RBP/-Documents-Subscription/src/pages/Insurance/General/Building.tsx), [CompanyStaff.tsx](file:///d:/Botivate/RBP/-Documents-Subscription/src/pages/Insurance/General/CompanyStaff.tsx), [Construction.tsx](file:///d:/Botivate/RBP/-Documents-Subscription/src/pages/Insurance/General/Construction.tsx), [AkashdeepComplex.tsx](file:///d:/Botivate/RBP/-Documents-Subscription/src/pages/Insurance/General/AkashdeepComplex.tsx)
- **Status:** Static placeholder cards rendered under General Insurance.

---

### 2.10 Property Tax
- **File Paths:** [PropertyTax.tsx](file:///d:/Botivate/RBP/-Documents-Subscription/src/pages/PropertyTax/PropertyTax.tsx), [AddPropertyTax.tsx](file:///d:/Botivate/RBP/-Documents-Subscription/src/pages/PropertyTax/AddPropertyTax.tsx), [EditPropertyTax.tsx](file:///d:/Botivate/RBP/-Documents-Subscription/src/pages/PropertyTax/EditPropertyTax.tsx)
- **Route:** `/propertytax`
- **Fields:** Property Name, Address, Property UID, Authority Name (Municipal Corporation), Financial Year, Tracking ID, Amount Paid, Payment Date, Annual Rental Value (ARV), Property Type, Document Receipt Upload.
- **Storage:** Bucket `property-tax` under `documents/`.
- **Table:** `property_tax`.

---

### 2.11 Email & Domain Renewal (Master-Detail Architecture)
- **File Paths:** [EmailRenewal.tsx](file:///d:/Botivate/RBP/-Documents-Subscription/src/pages/Email Renewal/EmailRenewal.tsx), [AddEmailRenewal.tsx](file:///d:/Botivate/RBP/-Documents-Subscription/src/pages/Email Renewal/AddEmailRenewal.tsx), [EditEmailRenewal.tsx](file:///d:/Botivate/RBP/-Documents-Subscription/src/pages/Email Renewal/EditEmailRenewal.tsx), [EmailRenewalRenewal.tsx](file:///d:/Botivate/RBP/-Documents-Subscription/src/pages/Email Renewal/EmailRenewalRenewal.tsx)
- **Routes:** `/emailrenewal`, `/email-renewal/renewal`
- **Architecture:** True parent-child relational implementation:
  - **Master Table (`email_renewal_master`):** Invoice No, Invoice Date, Service Provider (e.g. Google Workspace, GoDaddy), Remarks, Invoice File URL, Serial No (`ER-001`).
  - **Details Table (`email_renewal_details`):** Linked by `master_id`. Contains individual line items: Sub Serial No, Description, Domain Name, Start/End Date, Quantity, Total Amount, Renewal Date, Concern Person details.
  - **History Table (`email_renewal_history`):** Logs renewal modifications with before/after renewal dates and file URLs.
- **Storage:** Bucket `Email Renewal`.

---

### 2.12 Project Documents & Engineering Test Reports

#### A. Work Orders & Tenders
- **Work Orders:** [WorkOrders.tsx](file:///d:/Botivate/RBP/-Documents-Subscription/src/pages/ProjectDocuments/WorkOrders/WorkOrders.tsx), [AddWorkOrders.tsx](file:///d:/Botivate/RBP/-Documents-Subscription/src/pages/ProjectDocuments/WorkOrders/AddWorkOrders.tsx). Table: `work_orders`.
- **Tenders:** [Tenders.tsx](file:///d:/Botivate/RBP/-Documents-Subscription/src/pages/ProjectDocuments/Tenders/Tenders.tsx), [AddTenders.tsx](file:///d:/Botivate/RBP/-Documents-Subscription/src/pages/ProjectDocuments/Tenders/AddTenders.tsx). Table: `tenders`.

#### B. Test Reports (6 Disciplines)
1. **HLS Test Reports:** [HlsTestReports.tsx](file:///d:/Botivate/RBP/-Documents-Subscription/src/pages/ProjectDocuments/TestReports/HlsTestReports.tsx) $\rightarrow$ `hls_test_reports`.
2. **Pump Test Reports:** [PumpTestReports.tsx](file:///d:/Botivate/RBP/-Documents-Subscription/src/pages/ProjectDocuments/TestReports/PumpTestReports.tsx) $\rightarrow$ `pump_test_reports`.
3. **Panel Test Reports:** [PannelTestReports.tsx](file:///d:/Botivate/RBP/-Documents-Subscription/src/pages/ProjectDocuments/TestReports/PannelTestReports.tsx) $\rightarrow$ `pannel_test_reports`.
4. **PV Module Test Reports:** [PV_Module.tsx](file:///d:/Botivate/RBP/-Documents-Subscription/src/pages/ProjectDocuments/TestReports/PV_Module.tsx) $\rightarrow$ `pv_module_test_reports`.
5. **PV Water Pumping Test Reports:** [PV_water_pumping.tsx](file:///d:/Botivate/RBP/-Documents-Subscription/src/pages/ProjectDocuments/TestReports/PV_water_pumping.tsx) $\rightarrow$ `pv_water_pumping_test_reports`.
6. **Solar Photovoltaic Test Reports:** [Solor_photovoltaic.tsx](file:///d:/Botivate/RBP/-Documents-Subscription/src/pages/ProjectDocuments/TestReports/Solor_photovoltaic.tsx) $\rightarrow$ `solar_photovoltaic_test_reports`.

#### C. Experience Certificates
- **Pump Experience:** [PumpExperience.tsx](file:///d:/Botivate/RBP/-Documents-Subscription/src/pages/ExperienceCertificates/PumpExperience.tsx) $\rightarrow$ `pump_experience_certificates`.

---

### 2.13 Master Data & Settings Pages

#### A. Master Data Page
- **File Path:** [MasterPage.tsx](file:///d:/Botivate/RBP/-Documents-Subscription/src/pages/master/MasterPage.tsx)
- **Route:** `/master`
- **Purpose:** Manage global lookup options for document types, categories, director names, renewal filter tags, and company names. Features inline cell editing.
- **Table:** `master`.

#### B. Settings Page
- **File Path:** [Settings.tsx](file:///d:/Botivate/RBP/-Documents-Subscription/src/pages/Settings.tsx)
- **Route:** `/settings`
- **Tabs:**
  - **User Management Tab:** Lists users from `login`. Form to add/edit/soft-delete users, assign roles (`admin` or `user`), and toggle module permissions (`Dashboard`, `Resource Manager`, `Loan`, `Settings`, `BG`).
  - **Master Data Tab:** Quick CRUD for `master` table options.

---

## 3. Complete Feature Documentation

### 3.1 Document Ingestion & Storage Feature
- **Purpose:** Securely upload and index documents with unique serial tracking.
- **Workflow:**
  1. User enters document metadata and selects file in `AddDocument`.
  2. Frontend cleans filename and uploads to bucket `DRIVE_FOLDER`.
  3. Returns public URL.
  4. Inserts row into `Add New Document` with `need_renewal` flag.
  5. Uses generated database `id` to set `serial_no = 'SN-' + id`.
  6. Auto-syncs any new company or category names into `master`.

### 3.2 Automated Document & Insurance Renewal Workflow
- **Purpose:** Track expiring certificates/policies and archive renewal history.
- **Workflow:**
  1. Records flagged with `need_renewal = true` and approaching `renewal_date` display in `Pending Renewals`.
  2. Officer clicks `Renew`.
  3. Action modal captures new policy/document file and next renewal date.
  4. Updates original entity table (`renewal_date = newDate`, `image = newUrl`).
  5. Inserts audit snapshot into corresponding renewal log table (`Document Renewal`, `vehicle_insurance_renewal`, `health_insurance_renewal`, `life_insurance_renewal`, or `email_renewal_history`).

### 3.3 Multi-Stage Subscription Lifecycle Engine
- **Purpose:** Eliminate unauthorized subscriptions and track recurring enterprise expenses.
- **Workflow:**
  1. **Creation:** Entered in `AddSubscription` with frequency and price $\rightarrow$ saved to `create_subscription` with status `Pending`.
  2. **Approval Gate:** Appears in `SubscriptionApproval` under Pending. Admin reviews and approves/rejects $\rightarrow$ logs to `APPROVAL` with `AN-xxx` number, updates `actual_2 = now()`.
  3. **Payment Gate:** Once approved, appears in `SubscriptionPayment`. Finance officer uploads bank receipt, enters transaction ID (`TID-xxx`), verifies dates $\rightarrow$ logs to `PAYMENT`, sets `actual_3 = now()`, marks status as `Paid`.
  4. **Renewal Gate:** Near expiry, appears in `SubscriptionRenewal`. Officer approves renewal $\rightarrow$ logs to `RENEWAL` with `RN-xxx`, increments `renewal_count`, sets `actual_1 = now()`, and **clears `actual_2` and `actual_3`**, looping it back to Approval and Payment.

### 3.4 Automated 15-Day WhatsApp Notification Engine
- **Purpose:** Proactively notify responsible officers 15 days before any renewal expires.
- **Components Involved:**
  - Edge Function: [renewal-reminder/index.ts](file:///d:/Botivate/RBP/-Documents-Subscription/supabase/functions/renewal-reminder/index.ts)
  - Edge Function: [subscription-renewal-reminder/index.ts](file:///d:/Botivate/RBP/-Documents-Subscription/supabase/functions/subscription-renewal-reminder/index.ts)
  - Log Table: `renewal_notification_history`
  - Cron Schedule: `daily-renewal-reminder-15-days` (09:00 UTC)
- **Logic:**
  1. Computes target date: $T_{\text{target}} = \text{Today} + 15\text{ days}$.
  2. Scans 7 tables: `Add New Document`, `vehicle_insurance`, `health_insurance`, `life_insurance`, `fire_policy`, `employee_compensation`, `email_renewal_details`.
  3. Sanitizes recipient mobile number to 12 digits (with `91` country code).
  4. **Duplicate Prevention Check:** Queries `renewal_notification_history` for `(renewal_id, renewal_date, reminder_days, 'Success')`. Skips if already sent.
  5. Dispatches Meta Cloud API template `renewal_reminder_15days`.
  6. Records status (`Success` or `Failed`), WhatsApp Message ID, and error message into `renewal_notification_history`.

### 3.5 Multi-Channel Document Sharing & Verification
- **Purpose:** Share sensitive project documents externally with client tracking.
- **Workflow:**
  1. User selects single document or batch checkboxes in table.
  2. Selects WhatsApp, Email, or Both.
  3. WhatsApp: Invokes `send-whatsapp` Edge Function with template parameters.
  4. Email: Uses EmailJS SDK with pre-formatted HTML template.
  5. Inserts an immutable audit entry in `Shared_Documents` containing recipient contact info, timestamp, document serial, and file URL.

### 3.6 Loan Foreclosure & NOC Tracking
- **Purpose:** Manage commercial borrowings through complete payoff and bank release.
- **Workflow:**
  1. Loan entered with amount, EMI, and tenure in `AllLoans`.
  2. At payoff time, user requests foreclosure in `Foreclosure.tsx` $\rightarrow$ records `actual_1` and requester name.
  3. Once bank releases legal charge, user logs NOC receipt in `NOC.tsx` $\rightarrow$ records `actual_2` and sets `collect_noc = 'Yes'`.

---

## 4. Business Logic & Calculations

### 4.1 End Date Auto-Calculation Formula
Implemented in [Payment.tsx](file:///d:/Botivate/RBP/-Documents-Subscription/src/pages/subscription/Payment.tsx#L60-L79):
When a user selects a subscription start date and payment frequency, the system automatically computes the subscription expiration date:

$$\text{EndDate} = \begin{cases}
\text{Date}(\text{Year}, \text{Month} + 1, \text{Day} - 1) & \text{Frequency} = \text{Monthly} \\
\text{Date}(\text{Year}, \text{Month} + 3, \text{Day} - 1) & \text{Frequency} = \text{Quarterly} \\
\text{Date}(\text{Year}, \text{Month} + 6, \text{Day} - 1) & \text{Frequency} = \text{Half-Yearly} \\
\text{Date}(\text{Year} + 1, \text{Month}, \text{Day} - 1) & \text{Frequency} \in \{\text{Yearly}, \text{Annual}\} \\
\text{Date}(\text{Year}, \text{Month}, \text{Day} + 6) & \text{Frequency} = \text{Weekly}
\end{cases}$$

### 4.2 Serial Number Generation Schemes
| Entity | Prefix Format | Generation Location | Example |
| :--- | :--- | :--- | :--- |
| Documents | `SN-${id}` | [AddDocument.tsx](file:///d:/Botivate/RBP/-Documents-Subscription/src/pages/document/AddDocument.tsx#L349) | `SN-104` |
| Subscriptions | `SN-${id}` | [AddSubscription.tsx](file:///d:/Botivate/RBP/-Documents-Subscription/src/pages/subscription/AddSubscription.tsx#L125) | `SN-042` |
| Approvals | `AN-${padStart(id, 3, '0')}` | [Approval.tsx](file:///d:/Botivate/RBP/-Documents-Subscription/src/pages/subscription/Approval.tsx#L87) | `AN-007` |
| Payments (Tx) | `TID-${padStart(id, 3, '0')}` | [Payment.tsx](file:///d:/Botivate/RBP/-Documents-Subscription/src/pages/subscription/Payment.tsx#L119) | `TID-018` |
| Renewals | `RN-${padStart(id, 3, '0')}` | [Renewal.tsx](file:///d:/Botivate/RBP/-Documents-Subscription/src/pages/subscription/Renewal.tsx#L173) | `RN-005` |
| Shared Docs | `SH-${padStart(N, 3, '0')}` | [Shared.tsx](file:///d:/Botivate/RBP/-Documents-Subscription/src/pages/document/Shared.tsx#L67) | `SH-089` |
| Loans | `SN-${padStart(id, 3, '0')}` | [AddLoan.tsx](file:///d:/Botivate/RBP/-Documents-Subscription/src/pages/loan/AddLoan.tsx#L125) | `SN-012` |
| Bank Guarantees | `BG-${id}` | [AddBG.tsx](file:///d:/Botivate/RBP/-Documents-Subscription/src/pages/bg/AddBG.tsx#L132) | `BG-15` |
| Vehicle Insurance | `VEH-${id}` | [AddVehicleInsurance.tsx](file:///d:/Botivate/RBP/-Documents-Subscription/src/pages/Insurance/vehicle/AddVehicleInsurance.tsx#L68) | `VEH-24` |
| Health Insurance | `HT-${padStart(id, 3, '0')}` | [AddHealth.tsx](file:///d:/Botivate/RBP/-Documents-Subscription/src/pages/Insurance/Health/AddHealth.tsx#L181) | `HT-009` |
| Life Insurance | `LI-${padStart(id, 3, '0')}` | [AddLifeInsurance.tsx](file:///d:/Botivate/RBP/-Documents-Subscription/src/pages/Insurance/Life Insurance/AddLifeInsurance.tsx#L255) | `LI-014` |
| Work Orders | `WO-${id}` | [AddWorkOrders.tsx](file:///d:/Botivate/RBP/-Documents-Subscription/src/pages/ProjectDocuments/WorkOrders/AddWorkOrders.tsx#L323) | `WO-88` |
| Email Renewal | `ER-${padStart(id, 3, '0')}` | [AddEmailRenewal.tsx](file:///d:/Botivate/RBP/-Documents-Subscription/src/pages/Email Renewal/AddEmailRenewal.tsx#L436) | `ER-003` |

### 4.3 Subscription Status State Machine
Implemented in [subscriptionSync.ts](file:///d:/Botivate/RBP/-Documents-Subscription/src/utils/subscriptionSync.ts#L34-L44):
```
[New Subscription] 
       |
       v
   "Pending"  <----------------------------------------------------+
       |                                                           |
       | Admin Approves (planned_2 set, actual_2 set)              |
       v                                                           |
  "Approved"                                                       |
       |                                                           |
       | Payment Completed (planned_3 set, actual_3 set)           |
       v                                                           |
    "Paid"                                                         |
       |                                                           |
       | Subscription Nears Expiration                             |
       v                                                           |
  "Renewal"                                                        |
       |                                                           |
       +--- Action: "Renewed" (Clears actual_2, actual_3, status) -+
```

### 4.4 Risk & Urgency Classification Logic
Implemented in [Summary.tsx](file:///d:/Botivate/RBP/-Documents-Subscription/src/pages/Summary.tsx#L480-L510):
$$\Delta = \text{ExpiryDate} - \text{CurrentDate}$$
$$\text{Priority} = \begin{cases}
\text{Critical} & \text{if } \Delta < 0 \text{ (Expired)} \\
\text{High} & \text{if } 0 \le \Delta \le 15\text{ days} \\
\text{Medium} & \text{if } 16 \le \Delta \le 30\text{ days} \\
\text{Low} & \text{if } \Delta > 30\text{ days}
\end{cases}$$

---

## 5. Supabase Database Documentation

The system connects to **33 database tables** in the Supabase PostgreSQL database. Below is the full schema documentation for every table:

### Table 1: `login`
- **Purpose:** User accounts, authentication credentials, roles, and page permissions.
- **Primary Key:** `id` (bigserial)
- **Frontend Usage:** [authStore.ts](file:///d:/Botivate/RBP/-Documents-Subscription/src/store/authStore.ts), [Login.tsx](file:///d:/Botivate/RBP/-Documents-Subscription/src/pages/Login.tsx), [Settings.tsx](file:///d:/Botivate/RBP/-Documents-Subscription/src/pages/Settings.tsx)

| Column | Type | Nullable | Default | Constraints | Purpose |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `id` | bigserial | No | `nextval()` | PRIMARY KEY | Unique user record ID |
| `name` | text | Yes | NULL | | Full name of user |
| `username` | text | Yes | NULL | | Unique login handle |
| `password` | text | Yes | NULL | | Plaintext password |
| `role` | text | Yes | NULL | | Role: `'admin'` or `'user'` |
| `pages` | text | Yes | NULL | | Comma-separated permissions |
| `deleted` | boolean | Yes | `false` | | Soft delete flag |
| `created_at`| timestamp | Yes | `now()` | | Registration timestamp |

---

### Table 2: `Add New Document`
- **Purpose:** Primary repository for company documents, compliance filings, and certificates.
- **Primary Key:** `id` (bigserial)
- **Frontend Usage:** [AllDocuments.tsx](file:///d:/Botivate/RBP/-Documents-Subscription/src/pages/document/AllDocuments.tsx), [AddDocument.tsx](file:///d:/Botivate/RBP/-Documents-Subscription/src/pages/document/AddDocument.tsx), [EditDocument.tsx](file:///d:/Botivate/RBP/-Documents-Subscription/src/pages/document/EditDocument.tsx), [Renewal.tsx](file:///d:/Botivate/RBP/-Documents-Subscription/src/pages/document/Renewal.tsx), [Dashboard.tsx](file:///d:/Botivate/RBP/-Documents-Subscription/src/pages/Dashboard.tsx), [Summary.tsx](file:///d:/Botivate/RBP/-Documents-Subscription/src/pages/Summary.tsx)

| Column | Type | Nullable | Default | Constraints | Purpose |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `id` | bigserial | No | `nextval()` | PRIMARY KEY | Unique ID |
| `serial_no` | text | Yes | NULL | | Document Serial No (`SN-xxx`) |
| `document_name` | text | Yes | NULL | | Name / Title of document |
| `document_type` | text | Yes | NULL | | Document classification type |
| `category` | text | Yes | NULL | | Functional category |
| `name` | text | Yes | NULL | | Secondary name / branch tag |
| `company_name` | text | Yes | NULL | | Owning legal company |
| `need_renewal` | boolean | Yes | `false` | | Expiration renewal flag |
| `renewal_date` | date | Yes | NULL | | Scheduled renewal date |
| `planned_date` | date | Yes | NULL | | Milestone planned date |
| `actual_1` | date | Yes | NULL | | Renewal completed date |
| `issue_date` | date | Yes | NULL | | Official certificate date |
| `image` | text | Yes | NULL | | Supabase Storage public URL |
| `concern_person_name` | text | Yes | NULL | | Contact person responsible |
| `concern_person_mobile`| text | Yes | NULL | | WhatsApp notification phone |
| `concern_person_department`| text | Yes | NULL | | Department of contact |
| `is_deleted` | boolean | Yes | `false` | | Soft delete flag |
| `timestamp` | timestamp | Yes | `now()` | | Legacy timestamp |
| `created_at` | timestamp | Yes | `now()` | | Creation timestamp |

---

### Table 3: `Document Renewal`
- **Purpose:** Immutable audit trail of completed document renewals.
- **Primary Key:** `id` (bigserial)
- **Frontend Usage:** [Renewal.tsx](file:///d:/Botivate/RBP/-Documents-Subscription/src/pages/document/Renewal.tsx), [Summary.tsx](file:///d:/Botivate/RBP/-Documents-Subscription/src/pages/Summary.tsx)

| Column | Type | Nullable | Default | Purpose |
| :--- | :--- | :--- | :--- | :--- |
| `id` | bigserial | No | `nextval()` | PRIMARY KEY |
| `serial_no` | text | Yes | NULL | Document `serial_no` |
| `last_renewal_date` | date | Yes | NULL | Expiration date prior to renewal |
| `old_image` | text | Yes | NULL | Prior document file URL |
| `need_renewal` | boolean | Yes | `false` | Flag if future renewal required |
| `new_renewal_date` | date | Yes | NULL | Next scheduled expiration date |
| `new_image` | text | Yes | NULL | Renewed document file URL |
| `timestamp` | timestamp | Yes | `now()` | Audit timestamp |
| `created_at` | timestamp | Yes | `now()` | Creation timestamp |

---

### Table 4: `create_subscription`
- **Purpose:** Core subscription record tracking SaaS/vendor agreements and workflow stages.
- **Primary Key:** `id` (bigserial)
- **Frontend Usage:** [AllSubscriptions.tsx](file:///d:/Botivate/RBP/-Documents-Subscription/src/pages/subscription/AllSubscriptions.tsx), [AddSubscription.tsx](file:///d:/Botivate/RBP/-Documents-Subscription/src/pages/subscription/AddSubscription.tsx), [Approval.tsx](file:///d:/Botivate/RBP/-Documents-Subscription/src/pages/subscription/Approval.tsx), [Payment.tsx](file:///d:/Botivate/RBP/-Documents-Subscription/src/pages/subscription/Payment.tsx), [Renewal.tsx](file:///d:/Botivate/RBP/-Documents-Subscription/src/pages/subscription/Renewal.tsx), [Dashboard.tsx](file:///d:/Botivate/RBP/-Documents-Subscription/src/pages/Dashboard.tsx), [Summary.tsx](file:///d:/Botivate/RBP/-Documents-Subscription/src/pages/Summary.tsx)

| Column | Type | Nullable | Default | Purpose |
| :--- | :--- | :--- | :--- | :--- |
| `id` | bigserial | No | `nextval()` | PRIMARY KEY |
| `serial_no` | text | Yes | NULL | Subscription ID (`SN-xxx`) |
| `company_name` | text | Yes | NULL | Company billing entity |
| `subscriber_name` | text | Yes | NULL | Person / Team using tool |
| `subscription_name`| text | Yes | NULL | Software / Service name |
| `price` | numeric | Yes | NULL | Regular cost |
| `updated_price` | numeric | Yes | NULL | Modified cost on renewal/payment |
| `frequency` | text | Yes | NULL | Monthly/Quarterly/Yearly |
| `purpose` | text | Yes | NULL | Business justification |
| `planned_1` | date | Yes | NULL | Renewal scheduled date |
| `actual_1` | date | Yes | NULL | Renewal action completion date |
| `time_delay_1` | integer | Yes | NULL | Renewal delay in days |
| `renewal_status` | text | Yes | NULL | 'Renewed' or 'Terminated' |
| `renewal_count` | integer | Yes | 0 | Number of renewal cycles |
| `planned_2` | date | Yes | NULL | Approval scheduled date |
| `actual_2` | date | Yes | NULL | Approval completion date |
| `time_delay_2` | integer | Yes | NULL | Approval delay in days |
| `approval_status` | text | Yes | NULL | 'Approved' or 'Rejected' |
| `planned_3` | date | Yes | NULL | Payment scheduled date |
| `actual_3` | date | Yes | NULL | Payment completion date |
| `time_delay_3` | integer | Yes | NULL | Payment delay in days |
| `start_date` | date | Yes | NULL | Active period start |
| `end_date` | date | Yes | NULL | Active period expiration |
| `document_copy` | text | Yes | NULL | Uploaded invoice / receipt URL |
| `created_at` | timestamp | Yes | `now()` | Creation timestamp |

---

### Table 5: `APPROVAL`
- **Purpose:** Audit history of subscription approvals and rejections.
- **Primary Key:** `id` (bigserial)
- **Frontend Usage:** [Approval.tsx](file:///d:/Botivate/RBP/-Documents-Subscription/src/pages/subscription/Approval.tsx), [subscriptionSync.ts](file:///d:/Botivate/RBP/-Documents-Subscription/src/utils/subscriptionSync.ts)

| Column | Type | Nullable | Default | Purpose |
| :--- | :--- | :--- | :--- | :--- |
| `id` | bigserial | No | `nextval()` | PRIMARY KEY |
| `approval_no` | text | Yes | NULL | Approval serial (`AN-xxx`) |
| `subscription_no`| text | Yes | NULL | Target `create_subscription.serial_no` |
| `approved_by` | text | Yes | NULL | Username of approving manager |
| `approval_status`| text | Yes | NULL | 'Approved' or 'Rejected' |
| `note` | text | Yes | NULL | Justification or rejection notes |
| `created_at` | timestamp | Yes | `now()` | Decision timestamp |

---

### Table 6: `PAYMENT`
- **Purpose:** Ledger of subscription payment transactions and invoices.
- **Primary Key:** `id` (bigserial)
- **Frontend Usage:** [Payment.tsx](file:///d:/Botivate/RBP/-Documents-Subscription/src/pages/subscription/Payment.tsx)

| Column | Type | Nullable | Default | Purpose |
| :--- | :--- | :--- | :--- | :--- |
| `id` | bigserial | No | `nextval()` | PRIMARY KEY |
| `subscription_no`| text | Yes | NULL | Target `create_subscription.serial_no` |
| `payment_mode` | text | Yes | NULL | Credit Card, UPI, Net Banking, etc. |
| `transaction_id`| text | Yes | NULL | Payment Reference (`TID-xxx`) |
| `start_date` | date | Yes | NULL | Covered subscription start date |
| `end_date` | date | Yes | NULL | Covered subscription end date |
| `insurance_document`| text | Yes | NULL | Receipt / Voucher URL in storage |
| `old_price` | numeric | Yes | NULL | Previous subscription price |
| `updated_price` | numeric | Yes | NULL | Final amount paid |
| `created_at` | timestamp | Yes | `now()` | Payment recording timestamp |

---

### Table 7: `RENEWAL`
- **Purpose:** Audit history of subscription renewals.
- **Primary Key:** `id` (bigserial)
- **Frontend Usage:** [Renewal.tsx](file:///d:/Botivate/RBP/-Documents-Subscription/src/pages/subscription/Renewal.tsx), [Summary.tsx](file:///d:/Botivate/RBP/-Documents-Subscription/src/pages/Summary.tsx)

| Column | Type | Nullable | Default | Purpose |
| :--- | :--- | :--- | :--- | :--- |
| `id` | bigserial | No | `nextval()` | PRIMARY KEY |
| `renewal_no` | text | Yes | NULL | Renewal reference (`RN-xxx`) |
| `subscription_no`| text | Yes | NULL | Target `create_subscription.serial_no` |
| `approved_by` | text | Yes | NULL | Officer executing renewal |
| `status` | text | Yes | NULL | 'Renewed' or 'Terminated' |
| `created_at` | timestamp | Yes | `now()` | Renewal timestamp |

---

### Table 8: `loan`
- **Purpose:** Commercial loans, terms, foreclosures, and NOC tracking.
- **Primary Key:** `id` (bigserial)
- **Frontend Usage:** [AllLoans.tsx](file:///d:/Botivate/RBP/-Documents-Subscription/src/pages/loan/AllLoans.tsx), [AddLoan.tsx](file:///d:/Botivate/RBP/-Documents-Subscription/src/pages/loan/AddLoan.tsx), [EditLoan.tsx](file:///d:/Botivate/RBP/-Documents-Subscription/src/pages/loan/EditLoan.tsx), [Foreclosure.tsx](file:///d:/Botivate/RBP/-Documents-Subscription/src/pages/loan/Foreclosure.tsx), [NOC.tsx](file:///d:/Botivate/RBP/-Documents-Subscription/src/pages/loan/NOC.tsx)

| Column | Type | Nullable | Default | Purpose |
| :--- | :--- | :--- | :--- | :--- |
| `id` | bigserial | No | `nextval()` | PRIMARY KEY |
| `serial_no` | text | Yes | NULL | Loan ID (`SN-xxx`) |
| `company_name` | text | Yes | NULL | Borrowing company entity |
| `loan_name` | text | Yes | NULL | Loan description / facility name |
| `bank_name` | text | Yes | NULL | Lending institution |
| `amount` | numeric | Yes | NULL | Sanctioned principal amount |
| `emi` | numeric | Yes | NULL | Monthly instalment amount |
| `loan_start_date`| date | Yes | NULL | Loan drawdown date |
| `loan_end_date` | date | Yes | NULL | Scheduled tenure end date |
| `provided_document_name`| text | Yes | NULL | Security document surrendered |
| `file` | text | Yes | NULL | Loan sanction file URL |
| `remarks` | text | Yes | NULL | Operational remarks |
| `planned_1` | date | Yes | NULL | Foreclosure request target date |
| `actual_1` | date | Yes | NULL | Foreclosure request actual date |
| `delay_1` | integer | Yes | NULL | Delay days in foreclosure |
| `request_date` | date | Yes | NULL | Date closure was formally requested |
| `request_name` | text | Yes | NULL | Name of executive requesting closure |
| `planned_2` | date | Yes | NULL | Bank NOC release target date |
| `actual_2` | date | Yes | NULL | Bank NOC actual collection date |
| `delay_2` | integer | Yes | NULL | Delay days in NOC receipt |
| `collect_noc` | text | Yes | NULL | NOC collection status ('Yes'/'No') |
| `created_at` | timestamp | Yes | `now()` | Record creation timestamp |

---

### Table 9: `BG` (Bank Guarantee)
- **Purpose:** Bank guarantees, performance bonds, and security deposits.
- **Primary Key:** `id` (bigserial)
- **Frontend Usage:** [AllBG.tsx](file:///d:/Botivate/RBP/-Documents-Subscription/src/pages/bg/AllBG.tsx), [AddBG.tsx](file:///d:/Botivate/RBP/-Documents-Subscription/src/pages/bg/AddBG.tsx), [EditBG.tsx](file:///d:/Botivate/RBP/-Documents-Subscription/src/pages/bg/EditBG.tsx)

| Column | Type | Nullable | Default | Purpose |
| :--- | :--- | :--- | :--- | :--- |
| `id` | bigserial | No | `nextval()` | PRIMARY KEY |
| `serial_no` | text | Yes | NULL | Internal serial (`BG-xxx`) |
| `bg_name` | text | Yes | NULL | Purpose / Project for BG |
| `bg_no` | text | Yes | NULL | Bank's official reference number |
| `bank_name` | text | Yes | NULL | Issuing bank |
| `amount` | numeric | Yes | NULL | Guarantee value in INR |
| `bg_start_date` | date | Yes | NULL | Effective start date |
| `expiry_date` | date | Yes | NULL | Expiration date |
| `claim_expiry_date`| date | Yes | NULL | Extended claim deadline |
| `remarks` | text | Yes | NULL | Conditions / Notes |
| `file` | text | Yes | NULL | Scanned BG document URL |
| `created_at` | timestamp | Yes | `now()` | Record timestamp |

---

### Table 10: `Shared_Documents`
- **Purpose:** Distribution ledger for all WhatsApp and Email document sharing actions.
- **Primary Key:** `id` (bigserial)
- **Frontend Usage:** [Shared.tsx](file:///d:/Botivate/RBP/-Documents-Subscription/src/pages/document/Shared.tsx), [ShareModal.tsx](file:///d:/Botivate/RBP/-Documents-Subscription/src/pages/document/ShareModal.tsx), [WorkManCompensation.tsx](file:///d:/Botivate/RBP/-Documents-Subscription/src/pages/Insurance/General/WorkManCompensation.tsx), [FirePolicy.tsx](file:///d:/Botivate/RBP/-Documents-Subscription/src/pages/Insurance/General/FirePolicy.tsx), [EmailRenewal.tsx](file:///d:/Botivate/RBP/-Documents-Subscription/src/pages/Email Renewal/EmailRenewal.tsx), [PropertyTax.tsx](file:///d:/Botivate/RBP/-Documents-Subscription/src/pages/PropertyTax/PropertyTax.tsx), and all Test Report pages.

| Column | Type | Nullable | Default | Purpose |
| :--- | :--- | :--- | :--- | :--- |
| `id` | bigserial | No | `nextval()` | PRIMARY KEY |
| `email` | text | Yes | NULL | Recipient email address |
| `number` | text | Yes | NULL | Recipient mobile number |
| `name` | text | Yes | NULL | Recipient name |
| `document_name` | text | Yes | NULL | Title of shared document |
| `document_type` | text | Yes | NULL | Document type |
| `category` | text | Yes | NULL | Category |
| `serial_no` | text | Yes | NULL | Entity serial number |
| `image` | text | Yes | NULL | Direct download URL |
| `source_sheet` | text | Yes | NULL | Originating module tag |
| `share_method` | text | Yes | NULL | 'Email', 'WhatsApp', or 'Both' |
| `created_at` | timestamp | Yes | `now()` | Dispatch timestamp |

---

### Table 11: `master`
- **Purpose:** Master taxonomy and lookup lists for dropdowns across the application.
- **Primary Key:** `id` (bigserial)
- **Frontend Usage:** [MasterPage.tsx](file:///d:/Botivate/RBP/-Documents-Subscription/src/pages/master/MasterPage.tsx), [Settings.tsx](file:///d:/Botivate/RBP/-Documents-Subscription/src/pages/Settings.tsx), and auto-populated from all Add modals.

| Column | Type | Nullable | Default | Purpose |
| :--- | :--- | :--- | :--- | :--- |
| `id` | bigserial | No | `nextval()` | PRIMARY KEY |
| `company_name` | text | Yes | NULL | Entity / Subsidiary name |
| `document_type` | text | Yes | NULL | Document type taxonomy |
| `category` | text | Yes | NULL | Resource category |
| `renewal_filter`| text | Yes | NULL | Renewal cycle tag |
| `director_name` | text | Yes | NULL | Director responsible |
| `created_at` | timestamp | Yes | `now()` | Timestamp |

---

### Table 12: `renewal_notification_history`
- **Purpose:** Audit log and duplicate-prevention state for automated 15-day WhatsApp alerts.
- **Primary Key:** `id` (bigserial)
- **Frontend Usage:** Inserts from Supabase Edge Functions (`renewal-reminder`, `subscription-renewal-reminder`, etc.).

| Column | Type | Nullable | Default | Constraints | Purpose |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `id` | bigserial | No | `nextval()` | PRIMARY KEY | Unique log ID |
| `renewal_id` | text | No | | | Composite ID (`${table}_${id}`) |
| `document_name` | text | Yes | NULL | | Policy / Document title |
| `concern_person`| text | Yes | NULL | | Contact person name |
| `mobile_number` | text | No | | | Cleaned 12-digit number (`91...`) |
| `renewal_date` | date | No | | | Renewal due date |
| `reminder_days` | integer | Yes | 15 | | Days in advance (default 15) |
| `message_status`| text | No | | CHECK IN ('Success', 'Failed', 'Pending') | Delivery status |
| `whatsapp_message_id`| text | Yes | NULL | | Meta WABA message ID |
| `error_message` | text | Yes | NULL | | Error description on failure |
| `sent_at` | timestamptz | Yes | NULL | | Dispatch timestamp |
| `created_at` | timestamptz | No | `now()` | | Record timestamp |

---

### Tables 13–15: Insurance Module Tables
- **`vehicle_insurance`**: `id`, `serial_no`, `company_name`, `registration_no`, `make`, `model`, `insurance_agent`, `period_from`, `period_to`, `premium_paid`, `add_on`, `policy_link`, `file_url`, `rc_url`, `need_renewal`, `renewal_date`, `concern_person_name`, `concern_person_mobile`, `concern_person_department`, `created_at`.
- **`health_insurance`**: `id`, `serial_no`, `company_name`, `plan_name`, `policy_holder`, `policy_no`, `persons_covered`, `policy_cover`, `start_date`, `end_date`, `premium_paid`, `insurance_agent`, `contact_details`, `document_url`, `need_renewal`, `renewal_date`, `concern_person_name`, `concern_person_mobile`, `concern_person_department`, `created_at`.
- **`life_insurance`**: `id`, `serial_no`, `company_name`, `plan_name`, `policy_holder`, `policy_no`, `start_date`, `end_date`, `premium_paid`, `insurance_agent`, `contact_details`, `document_url`, `need_renewal`, `renewal_date`, `concern_person_name`, `concern_person_mobile`, `concern_person_department`, `created_at`.

### Tables 16–18: Insurance Renewal History Tables
- **`vehicle_insurance_renewal`**: `id`, `serial_no`, `last_renewal_date`, `old_image`, `need_renewal`, `new_renewal_date`, `new_image`, `created_at`.
- **`health_insurance_renewal`**: `id`, `serial_no`, `last_renewal_date`, `old_image`, `need_renewal`, `new_renewal_date`, `new_image`, `created_at`.
- **`life_insurance_renewal`**: `id`, `serial_no`, `last_renewal_date`, `old_image`, `need_renewal`, `new_renewal_date`, `new_image`, `created_at`.

### Tables 19–20: General Insurance Tables
- **`employee_compensation`**: `id`, `serial_no`, `company_name`, `policy_holder_company_name`, `policy_no`, `policy_name`, `start_date`, `end_date`, `final_premium_amt`, `total_amt`, `agent_name`, `contact_no`, `document_url`, `created_at`.
- **`fire_policy`**: `id`, `serial_no`, `company_name`, `policy_holder_company_name`, `policy_no`, `policy_name`, `start_date`, `end_date`, `final_premium_amt`, `sum_to_be_insured`, `agent_name`, `contact_no`, `document_url`, `created_at`.

### Table 21: `property_tax`
- **`property_tax`**: `id`, `serial_no`, `property_name`, `property_address`, `property_uid`, `authority_name`, `financial_year`, `tracking_id`, `amount_paid`, `payment_date`, `annual_rental_value`, `document_url`, `property_type`, `created_at`.

### Tables 22–24: Email / Expense Renewal Tables
- **`email_renewal_master`**: `id`, `serial_no` (`ER-xxx`), `invoice_no`, `invoice_date`, `service_provider`, `remarks`, `document_url`, `created_at`.
- **`email_renewal_details`**: `id`, `master_id` (FK to `email_renewal_master.id`), `sub_serial_no`, `description`, `domain_name`, `start_date`, `end_date`, `quantity`, `total_amount`, `need_renewal`, `renewal_date`, `concern_person_name`, `concern_person_mobile`, `concern_person_department`, `created_at`.
- **`email_renewal_history`**: `id`, `serial_no`, `sub_serial_no`, `last_renewal_date`, `old_image`, `need_renewal`, `new_renewal_date`, `new_image`, `created_at`.

### Tables 25–26: Work Orders & Tenders
- **`work_orders`**: `id`, `serial_no` (`WO-xxx`), `state`, `date`, `department`, `scheme`, `company_name`, `total_value`, `file_url`, `created_at`.
- **`tenders`**: `id`, `serial_no`, `name_of_person`, `tender_name`, `state_name`, `name_of_department`, `firm_name`, `tender_details`, `tender_start_date`, `tender_end_date`, `nit_file_upload`, `created_at`.

### Tables 27–32: Engineering Test Reports
- **`hls_test_reports`**: `id`, `serial_no`, `company_name`, `module_manufacturer`, `date`, `report_no`, `test_description`, `pv_panel`, `battery`, `file_url`, `file_size`, `created_at`.
- **`pv_module_test_reports`**: `id`, `serial_no`, `company_name`, `module_manufacturer`, `year`, `test_report_no`, `type`, `number_of_sample`, `model`, `file_url`, `file_size`, `created_at`.
- **`pv_water_pumping_test_reports`**: `id`, `serial_no`, `company_name`, `module_manufacture`, `year`, `test_report_no`, `type`, `hp_pv_panel`, `model`, `spv_module_capacity`, `compatibility_report`, `date`, `file_url`, `file_size`, `created_at`.
- **`solar_photovoltaic_test_reports`**: `id`, `serial_no`, `company_name`, `pump_manufacturer`, `year`, `test_report_no`, `type`, `total_modules`, `module`, `hp`, `file_url`, `file_size`, `created_at`.
- **`pump_test_reports`**: `id`, `serial_no`, `state`, `date`, `department`, `scheme`, `company_name`, `pump_capacity`, `head_range`, `status`, `file_url`, `created_at`.
- **`pannel_test_reports`**: `id`, `serial_no`, `state`, `date`, `department`, `scheme`, `company_name`, `panel_type`, `rating`, `status`, `file_url`, `created_at`.

### Table 33: `pump_experience_certificates`
- **`pump_experience_certificates`**: `id`, `serial_no`, `client_name`, `work_order_no`, `issue_date`, `work_name`, `pump_capacity`, `value`, `company_name`, `scheme`, `department`, `year`, `file_url`, `created_at`.

---

## 6. Database Relationships & ER Diagram

### 6.1 Text-Based Entity Relationship Diagram

```
+------------------+
|      login       | (User Identity & Permissions)
+------------------+

+------------------+        1-to-many         +--------------------+
|      master      | -----------------------> | All Entity Tables  | (Lookup: company_name,
+------------------+                          +--------------------+  category, document_type)

+---------------------+     1-to-many         +--------------------+
|  Add New Document   | --------------------> |  Document Renewal  | (Serial No link)
+---------------------+                       +--------------------+
         |
         | 1-to-many
         v
+---------------------+
|  Shared_Documents   | <--------------------+ (Logs all WhatsApp/Email dispatches)
+---------------------+                      |
                                             |
+---------------------+     1-to-many        |
| create_subscription | ---------------------+
+---------------------+
   |            |            |
   | 1-to-many  | 1-to-many  | 1-to-many
   v            v            v
+----------+ +---------+ +---------+
| APPROVAL | | PAYMENT | | RENEWAL |
+----------+ +---------+ +---------+

+--------------------+     1-to-many         +--------------------------+
| vehicle_insurance  | --------------------> | vehicle_insurance_renewal|
+--------------------+                       +--------------------------+

+--------------------+     1-to-many         +--------------------------+
|  health_insurance  | --------------------> | health_insurance_renewal |
+--------------------+                       +--------------------------+

+--------------------+     1-to-many         +--------------------------+
|   life_insurance   | --------------------> |  life_insurance_renewal  |
+--------------------+                       +--------------------------+

+----------------------+   1-to-many         +--------------------------+
| email_renewal_master | ------------------> |  email_renewal_details   | (FK: master_id)
+----------------------+                     +--------------------------+
                                                          |
                                                          | 1-to-many
                                                          v
                                             +--------------------------+
                                             |  email_renewal_history   |
                                             +--------------------------+

+----------------------+
|         loan         | (Self-contained 3-stage lifecycle: Drawdown -> Foreclose -> NOC)
+----------------------+

+----------------------+
|          BG          | (Self-contained: Issuance -> Expiry -> Claim Period)
+----------------------+

+-----------------------------------+
|   renewal_notification_history    | (Logs all automated Edge Function reminder runs)
+-----------------------------------+
```

### 6.2 Relational Analysis
1. **Explicit Foreign Keys:**
   - `email_renewal_details.master_id` $\rightarrow$ `email_renewal_master.id` (Parent-child line items).
2. **Logical / Soft Foreign Keys (Linked by `serial_no` / `subscription_no`):**
   - `create_subscription.serial_no` $\leftrightarrow$ `APPROVAL.subscription_no`
   - `create_subscription.serial_no` $\leftrightarrow$ `PAYMENT.subscription_no`
   - `create_subscription.serial_no` $\leftrightarrow$ `RENEWAL.subscription_no`
   - `Add New Document.serial_no` $\leftrightarrow$ `Document Renewal.serial_no`
   - `vehicle_insurance.serial_no` $\leftrightarrow$ `vehicle_insurance_renewal.serial_no`
   - `health_insurance.serial_no` $\leftrightarrow$ `health_insurance_renewal.serial_no`
   - `life_insurance.serial_no` $\leftrightarrow$ `life_insurance_renewal.serial_no`
   - Any entity `serial_no` $\leftrightarrow$ `Shared_Documents.serial_no`

---

## 7. Required Supabase Tables & Analysis

### 7.1 Current Status of Required Tables
- **Total Tables Currently Required & Used:** **33 tables**.
- **Actually Populated & Queried:** All 33 tables have active reading or writing hooks across pages and edge functions.
- **Unused Tables:** None. Even legacy tables (`Document Renewal`, `RENEWAL`) are actively written to as audit histories.
- **Under-Utilized Modules:** `Building.tsx`, `CompanyStaff.tsx`, `Construction.tsx`, and `AkashdeepComplex.tsx` currently render placeholder text; their tables (`building_insurance`, etc.) are not yet implemented in PostgreSQL.

---

## 8. Supabase Authentication Architecture

### 8.1 Current Implementation (Custom Direct Auth)
> [!WARNING]
> The current system **does not use Supabase GoTrue Auth** (`supabase.auth.signUp()` or `signInWithPassword()`). Instead, it implements a custom table named `login`.

#### Step-by-Step Login Flow:
1. User enters username and password in [Login.tsx](file:///d:/Botivate/RBP/-Documents-Subscription/src/pages/Login.tsx).
2. [authStore.ts](file:///d:/Botivate/RBP/-Documents-Subscription/src/store/authStore.ts) executes:
   ```typescript
   const { data, error } = await supabase
     .from('login')
     .select('*')
     .eq('username', username)
     .eq('password', password)
     .single();
   ```
3. Checks if user exists and `data.deleted !== true`.
4. Role resolution:
   - If `role === 'admin'`: Assigns full module permissions: `['Dashboard', 'Document', 'Subscription', 'Loan', 'Calendar', 'Master', 'Settings']`.
   - If `role === 'user'`: Splits comma-separated string in `data.pages` (e.g. `"Dashboard, Resource Manager, Loan"`).
5. Stores user identity in Zustand state with `persist` middleware, serializing session into `localStorage` key `'auth-storage'`.
6. React Router redirects user to `/`.

#### Logout Flow:
- Calls `logout()` in `useAuthStore`, clearing `isAuthenticated: false` and `currentUser: null`, and removes state from `localStorage`.

---

## 9. Row Level Security (RLS) Status

### 9.1 Verified RLS Configuration
1. **`renewal_notification_history`:** RLS is explicitly enabled in [schema_update_renewal_reminders.sql](file:///d:/Botivate/RBP/-Documents-Subscription/schema_update_renewal_reminders.sql#L26), but policies allow public access:
   - `SELECT USING (true)`
   - `INSERT WITH CHECK (true)`
   - `UPDATE USING (true)`
2. **All Other 32 Tables:** **RLS is NOT enabled**.
   - Because the frontend uses the public anonymous key (`VITE_SUPABASE_ANON_KEY`) directly, any user possessing the anon key and project URL can theoretically perform arbitrary SELECT, INSERT, UPDATE, or DELETE queries against any table in the `public` schema via the PostgREST endpoint.

---

## 10. Supabase Storage Buckets & Policies

### 10.1 Storage Buckets
The application uploads files to **4 distinct storage buckets**:

| Bucket Name | Purpose | Upload Path Pattern | Access Mode |
| :--- | :--- | :--- | :--- |
| `DRIVE_FOLDER` | Scanned company documents, loan agreements, bank guarantee files, payment slips | `documents/${Date.now()}_${cleanName}`, `loans/${fileName}`, `payment_${Date.now()}_${cleanName}` | Public URL read |
| `insurance` | Vehicle policy & RC copies, health, life, workman comp, fire policies, test reports, tenders, work orders | `vehicle/${Date.now()}_${cleanName}`, `health/...`, `life/...`, `work_orders/...`, `tenders/...`, `test_reports/...` | Public URL read |
| `property-tax` | Property tax receipts and challans | `documents/${Date.now()}_${cleanName}` | Public URL read |
| `Email Renewal`| Invoices for email/domain service providers | Direct filename upload | Public URL read |

### 10.2 File URL Resolution
- All uploads call `supabase.storage.from(bucket).getPublicUrl(data.path)`.
- Public URLs are stored as strings in table columns (`image`, `file_url`, `document_url`, `nit_file_upload`).

---

## 11. Project Structure & Architecture

### 11.1 Folder Tree
```
d:\Botivate\RBP\-Documents-Subscription\
├── .env                                # Environment config (Supabase URL, Anon Key, Meta WABA)
├── index.html                          # Single page HTML template
├── package.json                        # NPM dependencies & scripts
├── vite.config.ts                      # Vite build configuration
├── tailwind.config.js                  # Tailwind utility configuration
├── tsconfig.json                       # TypeScript compiler options
├── supabase/
│   ├── config.toml                     # Supabase CLI config
│   └── functions/                      # Deno Edge Functions
│       ├── document-renewal-reminder/  # 15-day document WhatsApp reminder
│       ├── health-renewal-reminder/    # Health insurance reminder
│       ├── life-renewal-reminder/      # Life insurance reminder
│       ├── renewal-reminder/           # Consolidated multi-table 15-day reminder
│       ├── send-document-renewal/      # Manual document renewal reminder
│       ├── send-email/                 # Resend API integration (inactive)
│       ├── send-whatsapp/              # Meta Cloud API template dispatcher
│       ├── subscription-renewal-reminder/ # Subscription renewal reminder
│       └── vehicle-renewal-reminder/   # Vehicle renewal reminder
├── src/
│   ├── main.tsx                        # React application bootstrap
│   ├── App.tsx                         # Router configuration & route declarations
│   ├── index.css                       # Global styles & Tailwind directives
│   ├── components/                     # Shared UI components
│   │   ├── Header.tsx                  # Top navigation bar with user badge & dynamic title
│   │   ├── Layout.tsx                  # Responsive layout shell (Sidebar + Main + Footer)
│   │   ├── ProtectedRoute.tsx          # Auth gatekeeper
│   │   ├── SearchableFilterSelect.tsx  # Portal-based filter dropdown
│   │   ├── SearchableInput.tsx         # Auto-complete input component
│   │   ├── Sidebar.tsx                 # Dynamic sidebar navigation with role filtering
│   │   └── UnderConstruction.tsx       # Placeholder widget
│   ├── store/                          # Zustand state stores
│   │   ├── authStore.ts                # Auth state, login/logout, users list (persisted)
│   │   ├── dataStore.ts                # App entities state (persisted)
│   │   └── headerStore.ts              # Global header title synchronization
│   ├── utils/                          # Helper utilities
│   │   ├── dateFormatter.ts            # Robust date parser/formatter
│   │   ├── googleSheetsService.ts      # Legacy Google Apps Script integration
│   │   ├── subscriptionSync.ts         # Subscription state-machine synchronizer
│   │   ├── supabase.ts                 # Supabase client singleton
│   │   ├── whatsappLog.ts              # WhatsApp audit logger
│   │   └── whatsappService.ts          # WhatsApp Edge Function invoker
│   └── pages/                          # Application pages
│       ├── Dashboard.tsx               # Analytics overview
│       ├── Login.tsx                   # Authentication screen
│       ├── ResourceManager.tsx         # Unified multi-tab resource hub
│       ├── Settings.tsx                # User & master administration
│       ├── Summary.tsx                 # Cross-system reporting & Excel export
│       ├── bg/                         # Bank guarantee pages
│       ├── document/                   # Document & sharing pages
│       ├── Email Renewal/              # Domain & email renewal pages
│       ├── ExperienceCertificates/     # Pump experience certificates
│       ├── Insurance/                  # Vehicle, Health, Life, General insurance
│       ├── loan/                       # Loans, Foreclosure, NOC pages
│       ├── master/                     # Master taxonomy management
│       ├── ProjectDocuments/           # Tenders, Work orders, Test reports
│       ├── PropertyTax/                # Property tax tracking
│       └── subscription/               # Subscription lifecycle pages
```

---

## 12. Component Documentation

### 12.1 Core Reusable Components
1. **`Layout` ([Layout.tsx](file:///d:/Botivate/RBP/-Documents-Subscription/src/components/Layout.tsx)):** Responsive outer container managing mobile sidebar slide-over, static desktop sidebar, header, dynamic title, and footer.
2. **`Sidebar` ([Sidebar.tsx](file:///d:/Botivate/RBP/-Documents-Subscription/src/components/Sidebar.tsx)):** Dynamic collapsible menu. Filters menu entries based on `currentUser.role === 'admin'` or `currentUser.permissions.includes(item.label)`.
3. **`Header` ([Header.tsx](file:///d:/Botivate/RBP/-Documents-Subscription/src/components/Header.tsx)):** Displays current module title from `useHeaderStore`, active user name, and role badge.
4. **`ProtectedRoute` ([ProtectedRoute.tsx](file:///d:/Botivate/RBP/-Documents-Subscription/src/components/ProtectedRoute.tsx)):** Guards routes against unauthenticated sessions. Redirects to `/login`.
5. **`SearchableFilterSelect` ([SearchableFilterSelect.tsx](file:///d:/Botivate/RBP/-Documents-Subscription/src/components/SearchableFilterSelect.tsx)):** React Portal dropdown with auto flip (dropUp if viewport bottom $< 240\text{px}$) and instant search filtering.
6. **`SearchableInput` ([SearchableInput.tsx](file:///d:/Botivate/RBP/-Documents-Subscription/src/components/SearchableInput.tsx)):** Form input component supporting both typing custom values and selecting from existing master records.

---

## 13. Supabase Query Documentation

### 13.1 Query Catalog by Pattern
1. **Direct Filtered Fetching:**
   ```typescript
   supabase.from('Add New Document').select('*').eq('is_deleted', false);
   ```
2. **Ordered Index Ingestion:**
   ```typescript
   supabase.from('master').select('*').order('id', { ascending: false });
   ```
3. **Multi-Key Safe Querying:**
   ```typescript
   supabase.from('login').select('*').eq('username', username).eq('password', password).single();
   ```
4. **Relational Join & Sub-Query (Master-Detail):**
   ```typescript
   supabase.from('email_renewal_details').select('*, email_renewal_master(*)').order('id', { ascending: false });
   ```
5. **Auto-Increment Serial Generation (Insert followed by immediate Update):**
   ```typescript
   const { data: inserted } = await supabase.from('vehicle_insurance').insert([...]).select('id').single();
   await supabase.from('vehicle_insurance').update({ serial_no: `VEH-${inserted.id}` }).eq('id', inserted.id);
   ```

---

## 14. End-to-End Data Flow

```
[User Action: Uploads New Policy]
       |
       v
[React Component: AddVehicleInsurance.tsx]
       |
       +---> [Supabase Storage API: bucket 'insurance']
       |            |
       |            v
       |     [Returns publicUrl]
       |
       v
[PostgREST INSERT -> public.vehicle_insurance]
       |
       v
[PostgreSQL Database: Generates id (e.g. 45)]
       |
       v
[PostgREST UPDATE -> set serial_no = 'VEH-45']
       |
       v
[PostgREST INSERT -> public.master (sync new company name if needed)]
       |
       v
[Zustand Store / Local React State Update]
       |
       v
[UI Rerender: New Record in Table + Toast Notification]
```

---

## 15. CRUD Matrix

| Feature Module | Supabase Table | Create | Read | Update | Delete |
| :--- | :--- | :---: | :---: | :---: | :---: |
| Authentication | `login` | Yes | Yes | Yes | Yes (Soft) |
| Documents | `Add New Document` | Yes | Yes | Yes | Yes (Soft) |
| Document Renewals | `Document Renewal` | Yes | Yes | No | No |
| Subscriptions | `create_subscription` | Yes | Yes | Yes | No |
| Subscription Approvals | `APPROVAL` | Yes | Yes | No | No |
| Subscription Payments | `PAYMENT` | Yes | Yes | No | No |
| Subscription Renewals | `RENEWAL` | Yes | Yes | No | No |
| Loans | `loan` | Yes | Yes | Yes | Yes |
| Bank Guarantees | `BG` | Yes | Yes | Yes | Yes |
| Document Sharing | `Shared_Documents` | Yes | Yes | No | No |
| Master Data | `master` | Yes | Yes | Yes | Yes |
| Vehicle Insurance | `vehicle_insurance` | Yes | Yes | Yes | Yes |
| Vehicle Renewal Logs | `vehicle_insurance_renewal` | Yes | Yes | No | No |
| Health Insurance | `health_insurance` | Yes | Yes | Yes | Yes |
| Health Renewal Logs | `health_insurance_renewal` | Yes | Yes | No | No |
| Life Insurance | `life_insurance` | Yes | Yes | Yes | Yes |
| Life Renewal Logs | `life_insurance_renewal` | Yes | Yes | No | No |
| Workman Compensation | `employee_compensation` | Yes | Yes | Yes | Yes |
| Fire Policy | `fire_policy` | Yes | Yes | Yes | Yes |
| Property Tax | `property_tax` | Yes | Yes | Yes | Yes |
| Email Renewal Master | `email_renewal_master` | Yes | Yes | Yes | Yes |
| Email Renewal Details | `email_renewal_details` | Yes | Yes | Yes | Yes |
| Email Renewal History | `email_renewal_history` | Yes | Yes | No | No |
| Work Orders | `work_orders` | Yes | Yes | Yes | Yes |
| Tenders | `tenders` | Yes | Yes | Yes | Yes |
| Test Reports (All 6) | `*_test_reports` | Yes | Yes | Yes | Yes |
| Experience Certs | `pump_experience_certificates` | Yes | Yes | Yes | Yes |
| Notification History | `renewal_notification_history`| Yes | Yes | Yes | No |

---

## 16. Roles & Permissions

### 16.1 Permission Matrix
| Role | Visible Modules | Record Creation | Modifications | Deletions | Settings & Users |
| :--- | :--- | :---: | :---: | :---: | :---: |
| **Admin** | All Pages & Modules | All | All | All | Full Access |
| **User** | Restricted to assigned pages in `login.pages` | Permitted on assigned modules | Permitted on assigned modules | Permitted on assigned modules | Blocked unless `'Settings'` explicitly assigned |

---

## 17. Forms & Validation Rules

### 17.1 Standard Validation Rules Across Forms
- **Dates:** Must follow valid `YYYY-MM-DD` ISO format.
- **Amounts & Premiums:** Must be numeric ($> 0$). Strips non-numeric characters (e.g. `₹`, `,`).
- **File Uploads:** Max size limit checked in client: $50\text{ MB}$. Allowed formats: `.pdf, .jpg, .jpeg, .png, .doc, .docx`.
- **Phone Numbers:** Cleaned with `replace(/\D/g, '')`. Automatically formatted to 12 digits prefixed with `91` for WhatsApp delivery.
- **Required Fields:** Company name, policy/document name, issue dates, and amounts are validated before submission.

---

## 18. Search, Filter & Sort Logic

### 18.1 Search Capabilities
- **Case-Insensitive Substring Match:** All searches use `.toLowerCase().includes(searchTerm.toLowerCase())`.
- **Multi-Field Filtering:** Search terms match against Serial No, Document Name, Company Name, Registration No, or Bank Name simultaneously.
- **Deferred Search:** [Payment.tsx](file:///d:/Botivate/RBP/-Documents-Subscription/src/pages/subscription/Payment.tsx) uses React 18's `useDeferredValue(searchTerm)` to keep table inputs responsive during large dataset searches.

---

## 19. Error Handling & Resilience

1. **Missing Table Shield (`safeQuery`):** In [Summary.tsx](file:///d:/Botivate/RBP/-Documents-Subscription/src/pages/Summary.tsx#L39), queries are wrapped in a fallback promise that catches 404 table errors and returns `{ data: [] }` instead of crashing the dashboard.
2. **Local Storage Fallbacks:** If Supabase is unreachable, modules like `PV_Module.tsx` catch errors and load the last cached snapshot from `localStorage`.
3. **Non-Blocking File Uploads:** In `AddLoan` and `AddBG`, if storage upload fails, the record is still saved to PostgreSQL and a warning toast is displayed.

---

## 20. Security Analysis & Recommendations

### 20.1 Current Security Vulnerabilities
> [!CAUTION]
> 1. **Plaintext Passwords:** User passwords in `login` are stored without hashing (e.g. bcrypt/argon2).
> 2. **Missing RLS:** Tables in `public` lack RLS policies, meaning anyone with the public anon key can read or mutate data directly.
> 3. **Client-Side Permission Enforcement:** Navigation filters are applied in React components (`Sidebar.tsx`, `ProtectedRoute.tsx`); a knowledgeable client can access data via PostgREST directly.

### 20.2 Recommended Security Improvements
1. **Migrate to Supabase GoTrue Auth:** Use `supabase.auth.signInWithPassword()`.
2. **Enable Row Level Security (RLS) on all 33 tables.**
3. **Restrict Storage Buckets:** Enforce RLS policies so only authenticated users can upload or delete files.

---

## 21. Environment Variables & Configuration

| Variable Name | Purpose | Client Accessible | Secret Status |
| :--- | :--- | :---: | :--- |
| `VITE_SUPABASE_URL` | Supabase Project URL | Yes (`import.meta.env`) | Public |
| `VITE_SUPABASE_ANON_KEY` | Supabase Anonymous Client Key | Yes (`import.meta.env`) | Public / Client Key |
| `Meta_WABA_ID` | WhatsApp Business Account ID | Yes | Sensitive Configuration |
| `VITE_WHATSAPP_TEMPLATE_NAME` | Template name (`document_share`) | Yes | Public |
| `VITE_WHATSAPP_TEMPLATE_LANGUAGE` | Template language (`en_US`) | Yes | Public |
| `VITE_GOOGLE_*_FOLDER_ID` | Legacy Google Drive folder IDs | Yes | Non-secret |

---

## 22. Dependencies Breakdown

- `@supabase/supabase-js` (^2.103.0): Core Supabase client for database, storage, and functions.
- `react` / `react-dom` (^18.3.1): Frontend view library.
- `react-router-dom` (^6.22.0): Client-side routing.
- `zustand` (^4.5.0): Lightweight state management with `persist` middleware.
- `tailwindcss` (^3.4.1): Utility-first CSS framework.
- `lucide-react` (^0.344.0): Iconography suite.
- `recharts` (^2.10.3): Charts and data visualization.
- `react-hot-toast` (^2.4.1): Toast notifications.
- `emailjs-com` (^3.2.0): Client-side email delivery.
- `xlsx` (^0.18.5): Excel export generation.
- `date-fns` (^2.30.0): Date manipulation.
- `@radix-ui/react-dropdown-menu` (^2.1.16): Accessible dropdown components.

---

## 23. Complete System Flow

```
+-------------------------------------------------------------------------------+
|                                    USER                                       |
+---------------------------------------+---------------------------------------+
                                        |
                                        v
                               +----------------+
                               |  /login Screen |
                               +--------+-------+
                                        |
                   +--------------------+--------------------+
                   | Valid Credentials                       | Invalid
                   v                                         v
         +-------------------+                       +---------------+
         | Store Session in  |                       | Error Toast   |
         | Zustand & Storage |                       +---------------+
         +---------+---------+
                   |
                   v
         +-------------------+
         | Protected Layout  |
         +---------+---------+
                   |
     +-------------+-------------+-------------+-------------+
     |                           |                           |
     v                           v                           v
+---------+              +---------------+           +---------------+
| /       |              | /summary      |           | /resource-mgr |
| Overview|              | Multi-Vertical|           | Tabbed Hub    |
| Metrics |              | Reporting     |           | (All Records) |
+----+----+              +-------+-------+           +-------+-------+
     |                           |                           |
     +-------------+-------------+-------------+-------------+
                   |
                   v
   +-------------------------------+
   | Supabase Client Integration   |
   +---------------+---------------+
                   |
     +-------------+-------------+-------------+
     |                           |             |
     v                           v             v
+------------------+     +---------------+ +------------------+
| PostgREST DB API |     | Storage API   | | Edge Functions   |
| (33 Tables)      |     | (4 Buckets)   | | (WhatsApp Alerts)|
+------------------+     +---------------+ +------------------+
```

---

## 24. Page-to-Database Mapping

| Page Component | Route | Primary Tables Read | Tables Inserted | Tables Updated | Tables Deleted |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `Login.tsx` | `/login` | `login` | None | None | None |
| `Dashboard.tsx` | `/` | `Add New Document`, `create_subscription`, `APPROVAL`, `loan` | None | None | None |
| `Summary.tsx` | `/summary` | 20+ Tables (all modules) | None | None | None |
| `ResourceManager.tsx` | `/resource-manager` | (Routes to sub-components) | — | — | — |
| `AllDocuments.tsx` | `/document/all` | `Add New Document`, `master` | None | `Add New Document` | Soft Delete (`is_deleted`) |
| `AddDocument.tsx` | (Modal) | `master` | `Add New Document`, `master` | `Add New Document` | None |
| `Renewal.tsx` (Doc) | `/document/renewal` | `Add New Document`, `Document Renewal` | `Document Renewal` | `Add New Document` | None |
| `Shared.tsx` | `/document/shared` | `Shared_Documents` | None | None | None |
| `ShareModal.tsx` | (Modal) | `Add New Document` | `Shared_Documents` | None | None |
| `AllSubscriptions.tsx` | `/subscription/all` | `create_subscription`, `APPROVAL` | None | None | None |
| `AddSubscription.tsx` | (Modal) | None | `create_subscription` | `create_subscription` | None |
| `Approval.tsx` | `/subscription/approval` | `create_subscription`, `APPROVAL` | `APPROVAL` | `create_subscription` | None |
| `Payment.tsx` | `/subscription/payment` | `create_subscription`, `PAYMENT` | `PAYMENT` | `create_subscription` | None |
| `Renewal.tsx` (Sub) | `/subscription/renewal` | `create_subscription`, `RENEWAL` | `RENEWAL` | `create_subscription` | None |
| `AllLoans.tsx` | `/loan/all` | `loan` | None | None | Hard Delete |
| `AddLoan.tsx` | (Modal) | `loan` | `loan` | None | None |
| `Foreclosure.tsx` | `/loan/foreclosure` | `loan` | None | `loan` | None |
| `NOC.tsx` | `/loan/noc` | `loan` | None | `loan` | None |
| `AllBG.tsx` | `/bg/all` | `BG` | None | None | Hard Delete |
| `AddBG.tsx` | (Modal) | None | `BG` | `BG` | None |
| `vehicle.tsx` | `/Insurance/vehicle` | `vehicle_insurance`, `master` | None | None | Hard Delete |
| `AddVehicleInsurance.tsx`| (Modal) | `master` | `vehicle_insurance`, `master` | `vehicle_insurance` | None |
| `VehicleRenewal.tsx` | `/Insurance/vehicle-renewal` | `vehicle_insurance`, `vehicle_insurance_renewal` | `vehicle_insurance_renewal` | `vehicle_insurance` | None |
| `Health.tsx` | `/Insurance/health` | `health_insurance`, `master` | None | None | Hard Delete |
| `AddHealth.tsx` | (Modal) | `master` | `health_insurance`, `master` | `health_insurance` | None |
| `HealthRenewal.tsx` | `/Insurance/health-renewal` | `health_insurance`, `health_insurance_renewal` | `health_insurance_renewal` | `health_insurance` | None |
| `LifeInsurance.tsx` | `/Insurance/life` | `life_insurance`, `master` | None | None | Hard Delete |
| `AddLifeInsurance.tsx`| (Modal) | `master` | `life_insurance`, `master` | `life_insurance` | None |
| `LifeRenewal.tsx` | `/Insurance/life-renewal` | `life_insurance`, `life_insurance_renewal` | `life_insurance_renewal` | `life_insurance` | None |
| `WorkManCompensation.tsx`| `/Insurance/workmancompensation`| `employee_compensation` | `employee_compensation`, `Shared_Documents` | `employee_compensation` | Hard Delete |
| `FirePolicy.tsx` | `/Insurance/firepolicy` | `fire_policy` | `fire_policy`, `Shared_Documents` | `fire_policy` | Hard Delete |
| `PropertyTax.tsx` | `/propertytax` | `property_tax` | `Shared_Documents` | None | Hard Delete |
| `AddPropertyTax.tsx` | (Modal) | None | `property_tax` | None | None |
| `EmailRenewal.tsx` | `/emailrenewal` | `email_renewal_details`, `email_renewal_master` | `Shared_Documents` | None | Hard Delete |
| `AddEmailRenewal.tsx` | (Modal) | None | `email_renewal_master`, `email_renewal_details` | `email_renewal_master` | None |
| `EmailRenewalRenewal.tsx`| `/email-renewal/renewal` | `email_renewal_details`, `email_renewal_history` | `email_renewal_history` | `email_renewal_details` | None |
| `WorkOrders.tsx` | `/resource-manager` | `work_orders` | `Shared_Documents` | None | Hard Delete |
| `AddWorkOrders.tsx` | (Modal) | None | `work_orders` | `work_orders` | None |
| `Tenders.tsx` | `/resource-manager` | `tenders` | `Shared_Documents` | None | Hard Delete |
| `AddTenders.tsx` | (Modal) | None | `tenders` | None | None |
| `*_TestReports.tsx` | `/resource-manager` | `*_test_reports` | `Shared_Documents` | None | Hard Delete |
| `PumpExperience.tsx` | `/resource-manager` | `pump_experience_certificates` | `Shared_Documents` | None | Hard Delete |
| `MasterPage.tsx` | `/master` | `master` | `master` | `master` | Hard Delete |
| `Settings.tsx` | `/settings` | `login`, `master` | `login`, `master` | `login`, `master` | `login` (soft) / `master` (hard) |

---

## 25. Feature-to-Table Mapping

| Business Feature | Primary Frontend Components | Involved Supabase Tables | Main Operational Logic |
| :--- | :--- | :--- | :--- |
| **Authentication & Permissions** | `Login.tsx`, `authStore.ts`, `ProtectedRoute.tsx`, `Sidebar.tsx` | `login` | Validates credentials, sets permission state, filters visible routes |
| **Document Archival & Renewal** | `AllDocuments.tsx`, `AddDocument.tsx`, `Renewal.tsx` | `Add New Document`, `Document Renewal`, `master` | Uploads file, tracks planned/actual dates, archives history on renewal |
| **Subscription Workflow Engine** | `AllSubscriptions.tsx`, `Approval.tsx`, `Payment.tsx`, `Renewal.tsx` | `create_subscription`, `APPROVAL`, `PAYMENT`, `RENEWAL` | 3-stage pipeline (Approve $\rightarrow$ Pay $\rightarrow$ Renew loop) with automatic serial numbers |
| **Loan Foreclosure & NOC** | `AllLoans.tsx`, `AddLoan.tsx`, `Foreclosure.tsx`, `NOC.tsx` | `loan` | Tracks tenure, manages pre-closure requests, logs NOC retrieval |
| **Bank Guarantees** | `AllBG.tsx`, `AddBG.tsx`, `EditBG.tsx` | `BG` | Tracks guarantee sums, expiry, and claim deadlines |
| **Multi-Channel Sharing** | `ShareModal.tsx`, `Shared.tsx` | `Shared_Documents`, Edge Functions | Dispatches WhatsApp/Email notices and maintains tamper-proof log |
| **15-Day Renewal Notifications** | Edge Functions: `renewal-reminder`, `subscription-renewal-reminder` | 7 Entity Tables + `renewal_notification_history` | Daily cron triggers WhatsApp reminders with duplicate detection |
| **Vehicle / Health / Life Insurance** | `vehicle.tsx`, `Health.tsx`, `LifeInsurance.tsx` + Renewal files | `vehicle_insurance(*)`, `health_insurance(*)`, `life_insurance(*)` | Tracks policies, agents, sum insured, renewal cycles, and contact persons |
| **Email & Domain Expansions** | `EmailRenewal.tsx`, `AddEmailRenewal.tsx`, `EmailRenewalRenewal.tsx` | `email_renewal_master`, `email_renewal_details`, `email_renewal_history` | True parent-child relation for domains/accounts under master invoices |
| **Engineering Test Reports** | `HlsTestReports.tsx`, `PV_Module.tsx`, etc. | 6 `*_test_reports` tables | Uploads test certificates, tracks sample sizes, ratings, and lab reports |
| **Work Orders & Tenders** | `WorkOrders.tsx`, `Tenders.tsx` | `work_orders`, `tenders` | Tracks government/client contracts, values, departments, and NIT docs |

---

## 26. Database Design Recommendations

### 26.1 Current Database (As Implemented)
- **Table Naming Inconsistencies:** Some tables use snake_case (`create_subscription`, `vehicle_insurance`), some use PascalCase (`APPROVAL`, `PAYMENT`, `RENEWAL`), some use spaces (`Add New Document`, `Document Renewal`), and some use uppercase acronyms (`BG`).
- **Serial Number Redundancy:** Serial numbers (`SN-001`, `VEH-001`) are calculated client-side and saved via a second UPDATE query after an INSERT query.
- **Denormalized Company Names:** Companies and categories are entered as loose strings in individual entity tables rather than linking to `master.id` via foreign keys.
- **Plaintext Auth:** The `login` table stores passwords as clear text without salt or hashing.

### 26.2 Recommended Database Improvements
1. **Standardize Table Naming:** Rename all tables to lowercase `snake_case` (e.g. `add_new_document` $\rightarrow$ `documents`, `Document Renewal` $\rightarrow$ `document_renewals`, `create_subscription` $\rightarrow$ `subscriptions`).
2. **Database Triggers for Serial Numbers:** Implement PostgreSQL `BEFORE INSERT` triggers to auto-generate serial numbers in a single atomic transaction:
   ```sql
   CREATE OR REPLACE FUNCTION generate_document_serial()
   RETURNS TRIGGER AS $$
   BEGIN
     NEW.serial_no := 'SN-' || LPAD(NEW.id::text, 4, '0');
     RETURN NEW;
   END;
   $$ LANGUAGE plpgsql;
   ```
3. **Foreign Key Relations to Master:** Replace loose `company_name TEXT` columns with `company_id BIGINT REFERENCES companies(id)`.
4. **Unified Insurance Schema:** Merge `vehicle_insurance`, `health_insurance`, and `life_insurance` into a normalized `insurance_policies` table with a polymorphic `policy_type` discriminator column.
5. **Enable RLS & Supabase Auth:** Migrate `login` users to Supabase GoTrue Auth (`auth.users`) and enforce role-based RLS policies.

---

## 27. Technical Debt & Issue Registry

| Severity | Issue Description | Impact | Code Location |
| :--- | :--- | :--- | :--- |
| **CRITICAL** | Cleartext password storage in `login` table | Security breach risk if credentials or database are accessed | [authStore.ts:41](file:///d:/Botivate/RBP/-Documents-Subscription/src/store/authStore.ts#L41) |
| **CRITICAL** | Row Level Security (RLS) disabled across 32 tables | Unrestricted CRUD operations possible via anonymous key | All tables in `public` |
| **HIGH** | Two-step atomic write race condition for `serial_no` | If client disconnects after insert, `serial_no` remains null | [AddDocument.tsx:342-355](file:///d:/Botivate/RBP/-Documents-Subscription/src/pages/document/AddDocument.tsx#L342-L355) |
| **HIGH** | Frontend-only role gating; API endpoints unguarded | Any user can craft PostgREST requests directly | [ProtectedRoute.tsx](file:///d:/Botivate/RBP/-Documents-Subscription/src/components/ProtectedRoute.tsx) |
| **MEDIUM** | Inconsistent date format parsing across browsers | Date parser handles 4 formats; dates may misalign on edge cases | [dateFormatter.ts](file:///d:/Botivate/RBP/-Documents-Subscription/src/utils/dateFormatter.ts) |
| **MEDIUM** | Inactive / stub files in repository | Dead code and confusion regarding live features | [Building.tsx](file:///d:/Botivate/RBP/-Documents-Subscription/src/pages/Insurance/General/Building.tsx) |
| **LOW** | Redundant Google Apps Script files retained in repo | File bloat | [googleSheetsService.ts](file:///d:/Botivate/RBP/-Documents-Subscription/src/utils/googleSheetsService.ts) |

---

## 28. Performance Analysis

1. **Missing Pagination on Document Queries:** Tables query `.select('*')` without `.range(from, to)`. As documents grow past 1,000 items, client memory and initial payload size will degrade.
2. **Sequential Head Requests for File Sizes:** In [AllDocuments.tsx](file:///d:/Botivate/RBP/-Documents-Subscription/src/pages/document/AllDocuments.tsx#L113), external file sizes are fetched via individual HTTP HEAD requests in a loop. File sizes should instead be stored directly in the database row upon initial upload.
3. **Redundant Summary Queries:** [Summary.tsx](file:///d:/Botivate/RBP/-Documents-Subscription/src/pages/Summary.tsx) dispatches 20+ simultaneous queries on load. Creating a single PostgreSQL Database View or RPC function (`get_system_executive_summary()`) would reduce round-trips from 20 to 1.

---

## 29. Future Scalability Analysis

- **Growing User Base:** The current architecture can scale to thousands of daily users with static CDN hosting (Vercel/Netlify), provided Supabase connection pooling (Supavisor) is active.
- **Large Document Catalogs:** Moving to server-side pagination with Supabase range queries (`.range(start, end)`) is required once datasets exceed 5,000 records per module.
- **Enterprise Multi-Tenancy:** The current database relies on filtering by `company_name` string. If RBP intends to spin off multi-tenant instances, adding a `tenant_id` column with RLS tenant isolation is recommended.

---

## 30. Final System Summary

- **Total Distinct Pages & Views:** 28 Pages/Sub-Views + 18 Dedicated Modal Workflows.
- **Total Key Components:** 54 Components (Layout, Modals, Forms, Visualizations, Portals).
- **Total Supabase Database Tables:** **33 Tables** actively used in the system.
- **Total Storage Buckets:** **4 Buckets** (`DRIVE_FOLDER`, `insurance`, `property-tax`, `Email Renewal`).
- **Total Supabase Edge Functions:** **9 Functions** (WhatsApp dispatchers, email sender, scheduled renewal reminders).
- **Core Automation Features:** Multi-level Subscription Lifecycle, Automated Expiry WhatsApp Alerts, Document Multi-channel Sharing, Loan Foreclosure & NOC Tracking, Risk Scoring & Analytics.
- **Architectural Reality:** Single Page Application (React 18 + Vite + Tailwind CSS + Zustand) connecting directly to Supabase BaaS (PostgreSQL + PostgREST + Storage + Edge Functions) with no custom intermediary server.
