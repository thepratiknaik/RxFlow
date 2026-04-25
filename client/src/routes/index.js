import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import WebsitePage from "../modules/website/WebsitePage";
import LoginPage from "../modules/auth/LoginPage";
import SignupPage from "../modules/auth/SignupPage";
import DashboardPage from "../modules/dashboard/DashboardPage";
import ResetPasswordPage from "../modules/auth/ResetPasswordPage";
import ProfilePage from "../modules/profile/ProfilePage";
import PatientsPage from "../modules/patients/PatientsPage";
import PrescriptionsPage from "../modules/prescriptions/PrescriptionsPage";
import PrescriberReviewPage from "../modules/prescriptionReview/PrescriberReviewPage";
import InventoryPage from "../modules/inventory/InventoryPage";
import PrescriberPage from "../modules/prescriber/PrescriberPage";
import BillingPage from "../modules/billing/BillingPage";
import ProtectedRoute from "../components/ProtectedRoute.js";
import AdminRoute from "../components/AdminRoute.js";
import { AuthProvider } from "../context/AuthContext.js";
import { ROUTES } from "../config/routes.js";
import UsersPage from "../modules/admin/UsersPage.js";

const AppRoutes = () => {
  return (
    <Router>
      <AuthProvider>
        <Routes>
          <Route path={ROUTES.HOME} element={<WebsitePage />} />
          <Route path={ROUTES.LOGIN} element={<LoginPage />} />
          <Route path={ROUTES.SIGNUP} element={<SignupPage />} />
          <Route path={ROUTES.RESET_PASSWORD} element={<ResetPasswordPage />} />
          <Route
            path={ROUTES.PROFILE}
            element={
              <ProtectedRoute>
                <ProfilePage />
              </ProtectedRoute>
            }
          />
          <Route
            path={ROUTES.PATIENTS}
            element={
              <ProtectedRoute>
                <PatientsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path={ROUTES.DASHBOARD}
            element={
              <ProtectedRoute>
                <DashboardPage />
              </ProtectedRoute>
            }
          />
          <Route
            path={ROUTES.PRESCRIPTIONS}
            element={
              <ProtectedRoute>
                <PrescriptionsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path={ROUTES.PRESCRIPTION_REVIEW}
            element={<PrescriberReviewPage />}
          />
          <Route
            path={ROUTES.PRESCRIBER}
            element={
              <ProtectedRoute>
                <PrescriberPage />
              </ProtectedRoute>
            }
          />
          <Route
            path={ROUTES.INVENTORY}
            element={
              <ProtectedRoute>
                <InventoryPage />
              </ProtectedRoute>
            }
          />
          <Route
            path={ROUTES.ADMIN_USERS}
            element={
              <ProtectedRoute>
                <AdminRoute>
                  <UsersPage />
                </AdminRoute>
              </ProtectedRoute>
            }
          />
          <Route
            path={ROUTES.BILLING}
            element={
              <ProtectedRoute>
                <BillingPage />
              </ProtectedRoute>
            }
          />
          <Route path="*" element={<WebsitePage />} />
        </Routes>
      </AuthProvider>
    </Router>
  );
};

export default AppRoutes;
