import { lazy, Suspense } from "react";


import { Toaster } from "react-hot-toast";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";

import Layout from "./Layout/Layout";
const PayPage = lazy(() => import("./components/Auth/PayPage"));
import { AuthProvider } from "./contexts/AuthContext";
import PrivateRoute from "./contexts/PrivateRoute";
import SubscriptionRoute from "./components/Auth/SubscriptionRoute";
import ModuleRoute from "./contexts/ModuleRoute";
const Pricing = lazy(() => import("./components/Auth/Pricing"));
import { SuperAdminAuthProvider } from "./contexts/SuperAdminAuthContext";
import SuperAdminPrivateRoute from "./contexts/SuperAdminPrivateRoute";
const SuperAdminLogin = lazy(() => import("./pages/SuperAdmin/SuperAdminLogin"));
const SuperAdminConsole = lazy(() => import("./components/SuperAdmin/SuperAdminConsole"));
import { ThemeScope } from "./components/SuperAdmin/theme";

const EmployerDashboard = lazy(() => import("./components/Auth/EmployerDashboard"));
import Login from "./components/Auth/Login";
import TeamLogin from "./components/Auth/TeamLogin";
const Signup = lazy(() => import("./components/Auth/SignUp"));
const Onboarding = lazy(() => import("./components/Auth/Onboarding"));
const Settings = lazy(() => import("./pages/Settings"));
const IndustryScreen = lazy(() => import("./components/Billing/IndustryScreen"));
const CashBook = lazy(() => import("./components/Expenses/CashBook.jsx"));
const Credit = lazy(() => import("./components/Billing/credit"));
const Sessionrecord = lazy(() => import("./components/Auth/Sessionrecord").then((m) => ({ default: m.Sessionrecord })));
const Support = lazy(() => import("./components/Billing/Support"));
const ForgotPassword = lazy(() => import("./components/Auth/forgot"));
const Reports = lazy(() => import("./components/Billing/Reports"));
const BarcodePage = lazy(() => import("./industry/mobile/BarcodePage"));
const AcademyInventry = lazy(() => import("./industry/academy/academyinventry"));
const Trainer = lazy(() => import("./components/Billing/Trainer"));
const Students = lazy(() => import("./industry/academy/Students"));
const Clients = lazy(() => import("./industry/SoftwareDevelopment/Clients"));
const RepairTickets = lazy(() => import("./industry/mobile/RepairTickets"));
const ImeiLookup = lazy(() => import("./industry/mobile/ImeiLookup"));
const Pets = lazy(() => import("./industry/petshop/Pets"));
const PetServices = lazy(() => import("./industry/petshop/PetServices"));
const PetPassport = lazy(() => import("./industry/petshop/PetPassport"));
const ExpiryAlerts = lazy(() => import("./industry/Pharmacy/ExpiryAlerts"));
const Milestones = lazy(() => import("./industry/SoftwareDevelopment/Milestones"));
const SoftwareDevelopmentInventory = lazy(() => import("./industry/SoftwareDevelopment/SoftwareDevelopmentInventory"));
const AddClient = lazy(() => import("./industry/SoftwareDevelopment/AddClient"));
const AddSoftwareService = lazy(() => import("./industry/SoftwareDevelopment/AddSoftwareService"));
const Alterations = lazy(() => import("./industry/clothing/Alterations"));
const ClothingHub = lazy(() => import("./industry/clothing/ClothingHub"));
const SDProposalGenerator = lazy(() => import("./industry/SoftwareDevelopment/SDProposalGenerator"));
// Shown for the moment a screen's code is still downloading.
const ScreenLoader = () => (
  <div className="flex min-h-[60vh] items-center justify-center" role="status" aria-label="Loading">
    <div className="h-8 w-8 animate-spin rounded-full border-2 border-green-600 border-t-transparent" />
  </div>
);

// Employer routes
const employerRoutes = [
  {
    path: "billing",
    element: (
      <SubscriptionRoute>
        <ModuleRoute moduleKey="billing">
          <IndustryScreen kind="billing" />
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
        <Route element={<SubscriptionRoute><ModuleRoute moduleKey="cashbook"><CashBook /></ModuleRoute></SubscriptionRoute>} path="cashbook" />
        <Route element={<SubscriptionRoute><ModuleRoute moduleKey="inventory"><IndustryScreen kind="inventory" /></ModuleRoute></SubscriptionRoute>} path="inventory" />
        <Route element={<SubscriptionRoute><ModuleRoute moduleKey="gst"><IndustryScreen kind="gst" /></ModuleRoute></SubscriptionRoute>} path="gst" />
        <Route element={<SubscriptionRoute><ModuleRoute moduleKey="barcodes"><IndustryScreen kind="barcodes" /></ModuleRoute></SubscriptionRoute>} path="barcodes" />
        <Route element={<SubscriptionRoute><ModuleRoute moduleKey="record"><IndustryScreen kind="record" /></ModuleRoute></SubscriptionRoute>} path="record" />
        <Route element={<SubscriptionRoute><IndustryScreen kind="addProduct" /></SubscriptionRoute>} path="add-product" />
        <Route element={<SubscriptionRoute><IndustryScreen kind="addCustomer" /></SubscriptionRoute>} path="add-customer" />

        <Route element={<SubscriptionRoute><ModuleRoute moduleKey="credit"><Credit /></ModuleRoute></SubscriptionRoute>} path="/credit" />

        <Route element={<SubscriptionRoute><ModuleRoute moduleKey="reports"><Reports /></ModuleRoute></SubscriptionRoute>} path="/reports" />
        <Route element={<SubscriptionRoute><ForgotPassword /></SubscriptionRoute>} path="/change" />
        <Route element={<SubscriptionRoute><Sessionrecord /></SubscriptionRoute>} path="/session-records" />
        <Route element={<SubscriptionRoute><BarcodePage /></SubscriptionRoute>} path="/barcode/:productId" />
        
        <Route element={<SubscriptionRoute><IndustryScreen kind="subUsers" /></SubscriptionRoute>} path="/staff-records" />
        <Route element={<SubscriptionRoute><AcademyInventry /></SubscriptionRoute>} path="/academyinventory" />
        <Route element={<SubscriptionRoute><Trainer /></SubscriptionRoute>} path="/trainers" />
        <Route element={<SubscriptionRoute><Students /></SubscriptionRoute>} path="/students" />
        <Route element={<SubscriptionRoute><SoftwareDevelopmentInventory /></SubscriptionRoute>} path="/softwaredevelopmentinventory" />
        <Route element={<SubscriptionRoute><Clients /></SubscriptionRoute>} path="/clients" />
        <Route element={<SubscriptionRoute><RepairTickets /></SubscriptionRoute>} path="/repair-tickets" />
        <Route element={<SubscriptionRoute><ImeiLookup /></SubscriptionRoute>} path="/imei-lookup" />
        <Route element={<SubscriptionRoute><Pets /></SubscriptionRoute>} path="/pets" />
        <Route element={<SubscriptionRoute><PetServices /></SubscriptionRoute>} path="/pet-services" />
        <Route element={<SubscriptionRoute><ExpiryAlerts /></SubscriptionRoute>} path="/expiry-alerts" />
        <Route element={<SubscriptionRoute><Milestones /></SubscriptionRoute>} path="/milestones" />
        <Route element={<SubscriptionRoute><SDProposalGenerator /></SubscriptionRoute>} path="/ai-proposal" />
        <Route element={<SubscriptionRoute><SDProposalGenerator /></SubscriptionRoute>} path="ai-proposal" />
        <Route element={<SubscriptionRoute><Alterations /></SubscriptionRoute>} path="/alterations" />
        <Route element={<SubscriptionRoute><ClothingHub /></SubscriptionRoute>} path="/clothing-hub" />
        <Route element={<SubscriptionRoute><AddSoftwareService /></SubscriptionRoute>} path="add-service" />
        <Route element={<SubscriptionRoute><AddClient /></SubscriptionRoute>} path="add-client" />
      </Routes>

    ),
  },
];

function App() {
  return (
    <>

      <Router>
        <AuthProvider>
          <Layout>
            {/* Screens are loaded on demand (React.lazy) so the first visit only downloads what it shows. */}
            <Suspense fallback={<ScreenLoader />}>
            <Routes>
              <Route path="/" element={<Navigate to="/login" />} />
              <Route path="/login" element={<Login />} />
              <Route path="/team-login" element={<TeamLogin />} />

              <Route path="/signup" element={<Signup />} />
              <Route path="/pricing" element={<Pricing />} />
              <Route path="/pay/:token" element={<PayPage />} />
              <Route path="/pet-passport/:id" element={<PetPassport />} />
              <Route path="/onboarding" element={<PrivateRoute><Onboarding /></PrivateRoute>} />

              {/* <Route path="/credit" element={<Credit />}/> */}
              <Route path="/support" element={<Support />} />
              <Route path="/forgot" element={<ForgotPassword />} />
              <Route path="/forgot-password" element={<ForgotPassword />} />

              {/* Super Admin — separate, isolated auth domain (single hardcoded account) */}
              <Route
                path="/superadmin/*"
                element={
                  <SuperAdminAuthProvider>
                    <ThemeScope>
                      <Routes>
                        <Route path="login" element={<SuperAdminLogin />} />
                        <Route
                          index
                          element={
                            <SuperAdminPrivateRoute>
                              <SuperAdminConsole />
                            </SuperAdminPrivateRoute>
                          }
                        />
                        {/* Old page URLs (dashboard, tenants, plans, ...) land on the console. */}
                        <Route path="*" element={<Navigate to="/superadmin" replace />} />
                      </Routes>
                    </ThemeScope>
                  </SuperAdminAuthProvider>
                }
              />

              {/* Protected Routes */}
              {employerRoutes.map(({ path, element }, index) => (
                <Route
                  key={index}
                  element={<PrivateRoute>{element}</PrivateRoute>}
                  path={path}
                />
              ))}


              {/* 404 Route */}
            </Routes>
            </Suspense>
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

