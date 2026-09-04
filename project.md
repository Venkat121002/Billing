### 📌 Purpose:

To provide educational institutions with a centralized, efficient, and cost-effective solution for managing billing, attendance, expenses, payroll, and internal communication.

---

## 1. 🔧 Functional Requirements

### 1.1 🔖 Billing System with GST

* Generate invoices with proper GST breakup
* Add multiple courses and fee structures
* Apply conditional discounts
* Export & print invoices (PDF)
* Auto-send invoices via email

### 1.2 ✅ Attendance Management

* Track daily attendance for students & employees
* Report views: daily, monthly, and individual
* Track and auto-deduct salary for leaves beyond 2/month

### 1.3 💰 Expense Management

* Record operational/misc expenses
* Categorize by type (Electricity, Rent, Maintenance)
* Auto-generate monthly expense reports

### 1.4 📄 Course Receipt Generator

* Generate & export receipt with:

  * Student name & ID
  * Course name
  * Amount paid
  * Receipt number
  * Institutional seal and signature

### 1.5 🖋️ Signature & Institutional Seal

* Digital signature support for admin
* Upload institutional seal
* Embed on invoices, receipts, pay slips

### 1.6 🧾 Payroll Management

* Monthly salary processing
* Leave tracking & auto deduction logic
* Auto-generate downloadable/printable pay slips
* Email pay slips to employees

### 1.7 📅 Leave Tracking Logic

* Track monthly casual leaves
* Allow first 2 casual leaves without deduction
* Post-threshold auto deduction applied in payroll
* Notification to employee when exceeded

### 1.8 📬 Email Automation

* Auto-send:

  * Invoices
  * Receipts
  * Pay slips
  * Attendance summaries
* Email templates with responsive design

---

## 2. 🧱 Tech Stack & Architecture

### 2.1 🔨 Frontend

* **React** (Modular, component-based)
* **TailwindCSS** (Utility-first styling)
* **Lodash** (Efficient data manipulation)
* **react-firebase-hooks** (Simplified Firebase integration)

### 2.2 🔥 Backend & Storage

* **Firebase Firestore**:

  * Multi-tenant architecture: each institution/user gets a **dedicated collection** using UID
  * Subcollections for `billing`, `attendance`, `expenses`, `payroll`, etc.
* **Firebase Functions** (Optional): for business logic (e.g., salary calculations)

### 2.3 🚀 Optimization & Caching

* **One-time fetch & local cache strategy**

  * On first load, fetch all required data once
  * Store in in-memory state (React Context / Zustand / localStorage fallback)
  * Avoid redundant Firestore calls → **reduces billing**

---

## 3. 🎨 Visual Design Guidelines

### 3.1 🎨 Color Palette

| Usage                  | Color         | Hex       |
| ---------------------- | ------------- | --------- |
| Primary (actions/nav)  | Dark Teal     | `#195A5A` |
| Highlights / Secondary | Light Green   | `#8CD563` |
| Background             | White         | `#FFFFFF` |
| Subtle Background      | Light Gray    | `#F5F5F7` |
| Status Indicator       | Yellow-Orange | `#FFD97D` |
| Info Blocks            | Light Blue    | `#E8F4FF` |

### 3.2 📝 Typography

* **Font Family**: Inter or Nunito Sans (Fallback: sans-serif)
* **Sizes**:

  * Headings: 18–24px
  * Subheadings: 16px
  * Body: 14px
  * Small text: 12px
* **Weights**:

  * Regular (400): Body
  * Medium (500): Subtitles
  * Bold (600–700): Headings

---

## 4. 🧠 UX Principles

* Modular views (Billing, Attendance, etc.)
* Mobile-responsive and desktop-ready
* Print/export-friendly views for invoices and receipts
* Progressive data loading & feedback (loading spinners, skeletons)


## 5. 📂 Firestore Data Model

### 🔐 Structure Per Institution (UID = userID)

```
/users/{uid}/
  ├── billing/
  │    ├── {invoiceId}
  ├── attendance/
  │    ├── {recordId}
  ├── expenses/
  │    ├── {expenseId}
  ├── payroll/
  │    ├── {employeeId}
  ├── receipts/
  │    ├── {receiptId}
  ├── settings/
       └── profile, signature, seal
```

Software details
1.	Bill with GST
2.	Attandence – employee - students
3.	Expenses calculation
4.	Will make a receipt(course and amount will be show)
5.	Signature with seal
6.	Salary with pay slip’s
7.	Will be calculate the Casual leave 2 without salary
8.	Mail Responsiveness
