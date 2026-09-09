

import { Toaster } from "react-hot-toast";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
  createBrowserRouter,
  RouterProvider,
} from "react-router-dom";

import Layout from "./Layout/Layout";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import PrivateRoute from "./contexts/PrivateRoute";
import SubscriptionRoute from "./components/Auth/SubscriptionRoute";
import ModuleRoute from "./contexts/ModuleRoute";
import Pricing from "./components/Auth/Pricing";

import EmployerDashboard from "./components/Auth/EmployerDashboard";
import Login from "./components/Auth/Login";
import Signup from "./components/Auth/SignUp";
import Onboarding from "./components/Auth/Onboarding";
import Settings from "./pages/Settings";
import IndustryBillingRouter from "./components/Billing/IndustryBillingRouter";
import IndustryInventoryRouter from "./components/Billing/IndustryInventoryRouter";
import IndustryAddProductRouter from "./components/Billing/IndustryAddProductRouter";
import IndustryRecordRouter from "./components/Billing/IndustryRecordRouter";
import BarcodeBilling from "./components/Billing/BarcodeBilling";
import CashBook from "./components/Expenses/CashBook.jsx"
import IndustryGstBillRouter from "./components/Billing/IndustryGstBillRouter";
import Credit from "./components/Billing/credit";
import ChangePassword from "./components/Auth/ChangePassword";
import SuperAdmin from "./components/Auth/SuperAdmin";
import SuperAdminLogin from "./components/Auth/SuperAdminLogin";
import SuperAdminRegister from "./components/Auth/SuperAdminRegister";
import { Sessionrecord } from "./components/Auth/Sessionrecord";
import Support from "./components/Billing/Support";
import AdminLogin from "./components/Auth/AdminLogin";
import ForgotPassword from "./components/Auth/forgot";
import Reports from "./components/Billing/Reports";

import BarcodePage from "./industry/mobile/BarcodePage";
import SubUserRecordsPage from "./industry/mobile/SubUserRecordsPage";
import AcademyInventry from "./industry/academy/academyinventry";
import Trainer from "./components/Billing/Trainer";
import SoftwareDevelopmentInventory from "./industry/SoftwareDevelopment/SoftwareDevelopmentInventory";
import AddClient from "./industry/SoftwareDevelopment/AddClient";
import AddSoftwareService from "./industry/SoftwareDevelopment/AddSoftwareService";
import SoftwareBilling from "./industry/SoftwareDevelopment/SoftwareBilling";
import GroceryInventory from "./industry/grocery/groceryInventory";
import IndustryBarcodeRouter from "./components/Billing/IndustryBarcodeRouter";
import IndustryAddCustomerRouter from "./components/Billing/IndustryAddCustomerRouter";




// Public Routes Component
function PublicRoute({ children }) {
  const { user } = useAuth();
  return user ? <Navigate to="/login" /> : children;
}

// Employer routes
const employerRoutes = [
  {
    path: "billing",
    element: (
      <SubscriptionRoute>
        <ModuleRoute moduleKey="billing">
          <IndustryBillingResolver />
        </ModuleRoute>
      </SubscriptionRoute>
    )
  },
  {
    path: "/*",
    element: (
      <Routes>
        <Route element={<SubscriptionRoute><EmployerDashboard /></SubscriptionRoute>} path="dashboard" />
        <Route element={<SubscriptionRoute><Settings /></SubscriptionRoute>} path="settings" />
        <Route element={<SubscriptionRoute><Pricing /></SubscriptionRoute>} path="pricing" />
        <Route element={<SubscriptionRoute><ModuleRoute moduleKey="barcode_billing"><BarcodeBilling /></ModuleRoute></SubscriptionRoute>} path="barcode-billing" />
        <Route element={<SubscriptionRoute><ModuleRoute moduleKey="cashbook"><CashBook /></ModuleRoute></SubscriptionRoute>} path="cashbook" />
        <Route element={<SubscriptionRoute><ModuleRoute moduleKey="inventory"><IndustryInventoryRouter /></ModuleRoute></SubscriptionRoute>} path="inventory" />
                <Route element={<SubscriptionRoute><ModuleRoute moduleKey="gst"><IndustryGstBillRouter /></ModuleRoute></SubscriptionRoute>} path="gst" />
        <Route element={<SubscriptionRoute><ModuleRoute moduleKey="barcodes"><IndustryBarcodeRouter /></ModuleRoute></SubscriptionRoute>} path="barcodes" />
        <Route element={<SubscriptionRoute><ModuleRoute moduleKey="record"><IndustryRecordRouter /></ModuleRoute></SubscriptionRoute>} path="record" />
                <Route element={<SubscriptionRoute><ModuleRoute moduleKey="billing"><IndustryBillingRouter /></ModuleRoute></SubscriptionRoute>} path="billing" />
        <Route element={<SubscriptionRoute><IndustryAddProductRouter /></SubscriptionRoute>} path="add-product" />
        <Route element={<SubscriptionRoute><IndustryAddCustomerRouter /></SubscriptionRoute>} path="add-customer" />

        <Route element={<SubscriptionRoute><ModuleRoute moduleKey="credit"><Credit /></ModuleRoute></SubscriptionRoute>} path="/credit" />

        <Route element={<SubscriptionRoute><ModuleRoute moduleKey="reports"><Reports /></ModuleRoute></SubscriptionRoute>} path="/reports" />
        <Route element={<SubscriptionRoute><ChangePassword /></SubscriptionRoute>} path="/change" />
        <Route element={<SubscriptionRoute><Sessionrecord /></SubscriptionRoute>} path="/session-records" />
        <Route element={<SubscriptionRoute><BarcodePage /></SubscriptionRoute>} path="/barcode/:productId" />
        
        <Route element={<SubscriptionRoute><SubUserRecordsPage /></SubscriptionRoute>} path="/staff-records" />
        <Route element={<SubscriptionRoute><AcademyInventry /></SubscriptionRoute>} path="/academyinventory" />
        <Route element={<SubscriptionRoute><Trainer /></SubscriptionRoute>} path="/trainers" />
        <Route element={<SubscriptionRoute><SoftwareDevelopmentInventory /></SubscriptionRoute>} path="/softwaredevelopmentinventory" />
        <Route element={<SubscriptionRoute><AddSoftwareService /></SubscriptionRoute>} path="add-service" />
        <Route element={<SubscriptionRoute><AddClient /></SubscriptionRoute>} path="add-client" />
      </Routes>
    ),
  },
  // {
  //   path: "/academyinventory",
  //   element: <AcademyInventry />,
  // }
];

const protectedRoutes = employerRoutes; // All employer routes are now protected

// Helper component to switch billing based on industry
function IndustryBillingResolver() {
  const { currentUser } = useAuth();
  const industry = currentUser?.industry?.toLowerCase() || "";

  if (industry.includes("software_development") || industry.includes("software")) {
    return <SoftwareBilling />;
  }
  return <IndustryBillingRouter />;
}

function App() {
  return (
    <>

      <Router>
        <AuthProvider>
          <Layout>
            <Routes>
              {/* Employer Routes */}
              {employerRoutes.map(({ path, element }, index) => (
                <Route key={index} element={element} path={path} />
              ))}
              <Route path="/" element={<Navigate to="/login" />} />
              <Route path="/login" element={<Login />} />
            
              <Route path="/signup" element={<Signup />} />
              <Route path="/pricing" element={<Pricing />} />
              <Route path="/onboarding" element={<PrivateRoute><Onboarding /></PrivateRoute>} />
              <Route path="/trainers" element={<Trainer />} />

              {/* <Route path="/credit" element={<Credit />}/> */}
              <Route path="/superadmin" element={<SuperAdmin />} />
              <Route path="/superadmin/login" element={<SuperAdminLogin />} />
              <Route path="/superadmin/register" element={<SuperAdminRegister />} />
              <Route path="/support" element={<Support />} />
              <Route path="/adminlogin" element={<AdminLogin />} />
              <Route path="/forgot" element={<ForgotPassword />} />
              <Route path="/forgot-password" element={<ForgotPassword />} />
              <Route path="/academyinventory" element={<AcademyInventry />} />
              <Route path="/softwaredevelopmentinventory" element={<SoftwareDevelopmentInventory />} />


              {/* Protected Routes */}
              {protectedRoutes.map(({ path, element }, index) => (
                <Route
                  key={index}
                  element={<PrivateRoute>{element}</PrivateRoute>}
                  path={path}
                />
              ))}


              {/* 404 Route */}
            </Routes>
          </Layout>
        </AuthProvider>

      </Router>

      {/* Toaster Configuration */}
      <Toaster
        position="top-right"
        toastOptions={{
          success: {
            duration: 3000,
            style: { background: "#10B981", color: "white" },
          },
          error: {
            duration: 4000,
            style: { background: "#EF4444", color: "white" },
          },
          loading: { style: { background: "#374151", color: "white" } },
        }}
      />
    </>
  );
}

export default App;

