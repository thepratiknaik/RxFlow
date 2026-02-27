import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import WebsitePage from "../modules/website/WebsitePage";
import LoginPage from "../modules/auth/LoginPage";
import SignupPage from "../modules/auth/SignupPage";
import DashboardPage from "../modules/dashboard/DashboardPage";
import ProtectedRoute from "../components/ProtectedRoute.js";
import { AuthProvider } from "../context/AuthContext.js";
import { ROUTES } from "../config/routes.js";

const AppRoutes = () => {
  return (
    <Router>
      <AuthProvider>
        <Routes>
          <Route path={ROUTES.HOME} element={<WebsitePage />} />
          <Route path={ROUTES.LOGIN} element={<LoginPage />} />
          <Route path={ROUTES.SIGNUP} element={<SignupPage />} />
          <Route
            path={ROUTES.DASHBOARD}
            element={
              <ProtectedRoute>
                <DashboardPage />
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
