import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import { Toaster } from "react-hot-toast";
import Layout from "./components/Layout";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Summary from "./pages/Summary";
import ProtectedRoute from "./components/ProtectedRoute";

import Settings from "./pages/Settings";
import ResourceManager from "./pages/ResourceManager";
import DocumentRenewal from "./pages/document/Renewal";
import SubscriptionRenewal from "./pages/subscription/Renewal";

// Document Pages
import AllDocuments from "./pages/document/AllDocuments";
import SharedDocuments from "./pages/document/Shared";

// Subscription Pages
import AllSubscriptions from "./pages/subscription/AllSubscriptions";
import SubscriptionApproval from "./pages/subscription/Approval";
import SubscriptionPayment from "./pages/subscription/Payment";

// Loan Pages
import AllLoans from "./pages/loan/AllLoans";
import LoanForeclosure from "./pages/loan/Foreclosure";
import LoanNOC from "./pages/loan/NOC";

// BG Pages
import AllBG from "./pages/bg/AllBG";

// Insurance Pages
import VehicleInsurance from "./pages/Insurance/vehicle/vehicle";
import HealthInsurance from "./pages/Insurance/Health/Health";
import LifeInsurance from "./pages/Insurance/Life Insurance/LifeInsurance";
import VehicleRenewal from "./pages/Insurance/vehicle/VehicleRenewal";
import HealthRenewal from "./pages/Insurance/Health/HealthRenewal";
import LifeRenewal from "./pages/Insurance/Life Insurance/LifeRenewal";
// General Insurance
import Building from "./pages/Insurance/General/Building";
import WorkManCompensation from "./pages/Insurance/General/WorkManCompensation";
import CompanyStaff from "./pages/Insurance/General/CompanyStaff";
import Construction from "./pages/Insurance/General/Construction";
import AkashdeepComplex from "./pages/Insurance/General/AkashdeepComplex";
import FirePolicy from "./pages/Insurance/General/FirePolicy";

// Property TAx
import PropertyTax from "./pages/PropertyTax/PropertyTax";

// email renewal
import EmailRenewal from "./pages/Email Renewal/EmailRenewal";
import EmailRenewalRenewal from "./pages/Email Renewal/EmailRenewalRenewal";


import MasterPage from "./pages/master/MasterPage";

// Main Router Configuration
function App() {
  return (
    <Router future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <Toaster position="top-right" />
      <Routes>
        <Route path="/login" element={<Login />} />

        <Route
          path="/"
          element={
            <ProtectedRoute>
              <Layout />
            </ProtectedRoute>
          }
        >
          <Route index element={<Dashboard />} />
          <Route path="summary" element={<Summary />} />
          
          {/* Document Routes */}
          <Route path="document">
            <Route index element={<Navigate to="all" replace />} />
            <Route path="all" element={<AllDocuments />} />
            <Route path="renewal" element={<DocumentRenewal />} />
            <Route path="shared" element={<SharedDocuments />} />
          </Route>

          {/* Subscription Routes */}
          <Route path="subscription">
             <Route index element={<Navigate to="all" replace />} />
             <Route path="all" element={<AllSubscriptions />} />
             <Route path="approval" element={<SubscriptionApproval />} />
             <Route path="payment" element={<SubscriptionPayment />} />
             <Route path="renewal" element={<SubscriptionRenewal />} />
          </Route>

          {/* Loan Routes */}
          <Route path="loan">
             <Route index element={<Navigate to="all" replace />} />
             <Route path="all" element={<AllLoans />} />
             <Route path="foreclosure" element={<LoanForeclosure />} />
             <Route path="noc" element={<LoanNOC />} />
          </Route>

          {/* BG Routes */}
          <Route path="bg">
             <Route index element={<Navigate to="all" replace />} />
             <Route path="all" element={<AllBG />} />
          </Route>


          {/* Insurance Routes */}
          <Route path="Insurance">
             <Route index element={<Navigate to="vehicle" replace />} />
             <Route path="vehicle" element={<VehicleInsurance />} />
             <Route path="health" element={<HealthInsurance />} />
             <Route path="life" element={<LifeInsurance />} />
             <Route path="vehicle-renewal" element={<VehicleRenewal />} />
             <Route path="health-renewal" element={<HealthRenewal />} />
             <Route path="life-renewal" element={<LifeRenewal />} />
             {/* General */}
             <Route path="building" element={<Building />} />
             <Route path="workmancompensation" element={<WorkManCompensation />} />
             <Route path="companystaff" element={<CompanyStaff />} />
             <Route path="construction" element={<Construction />} />
             <Route path="akashdeepcomplex" element={<AkashdeepComplex />} />
             <Route path="firepolicy" element={<FirePolicy />} />
          </Route>

          {/* Property Tax */}
         
         <Route path="propertytax" element={<PropertyTax />} />


          <Route path="emailrenewal" element={<EmailRenewal />} />
          <Route path="email-renewal/renewal" element={<EmailRenewalRenewal />} />

          <Route path="master" element={<MasterPage />} />
          <Route path="resource-manager" element={<ResourceManager />} />

          <Route path="settings" element={<Settings />} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}

export default App;