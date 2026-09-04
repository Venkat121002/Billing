# Database & Storage Architecture

This document explains where your application data is stored. Your application uses a **Hybrid Architecture** combining Firebase and PostgreSQL.

## 1. Authentication (Firebase)
*   **What is stored here:** Login credentials (Email & Password), Google Login links, and User UIDs.
*   **Location:** Firebase Console -> **Authentication**.
*   **Purpose:** Securely handles user identity and passwords.

## 2. Business Data (NeonDB / PostgreSQL)
*   **What is stored here:** 
    *   User Profiles (Name, Contact Info)
    *   Company Details (Business Name, Address, GSTIN)
    *   Subscription Plans & Billing Status
    *   Invoices, Clients, and Products
*   **Location:** **NeonDB (PostgreSQL)** Cloud Database.
*   **Purpose:** Relational database for structured business data. This is efficiently queried by your backend API.

## Why don't I see data in Firestore?
You might be looking for your data in **Firebase Clound Firestore**, but your application is configured to save data to **PostgreSQL**.

### Code Reference
The backend connects to PostgreSQL in `frontend/functions/config/db.js`:
```javascript
const DB_HOST = "ep-empty-art-a1j1uytp-pooler.ap-southeast-1.aws.neon.tech";
// ...
sequelize = new Sequelize(DB_NAME, DB_USER, DB_PASS, { ... });
```

When you register, the data flow is:
1.  **Frontend**: Creates user in Firebase Auth (gets `firebase_uid`).
2.  **Frontend**: Sends `firebase_uid` + `form details` to Backend API.
3.  **Backend**: Saves `form details` into the **Users** and **Tenants** tables in PostgreSQL.

## How to View Your Data
To view your registered users and business data, you need to connect to your NeonDB PostgreSQL database using a tool like **pgAdmin** or **DBeaver** with the credentials found in `frontend/functions/config/db.js`.
