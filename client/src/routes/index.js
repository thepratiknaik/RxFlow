import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import WebsitePage from "../modules/website/WebsitePage";
import LoginPage from "../modules/auth/LoginPage";
import SignupPage from "../modules/auth/SignupPage";
import DashboardPage from "../modules/dashboard/DashboardPage";
import ProtectedRoute from "../components/ProtectedRoute.js";
import { AuthProvider } from "../context/AuthContext.js";

const AppRoutes = () => {
  return (
    <Router>
      <AuthProvider>
        <Routes>
          <Route path="/" element={<WebsitePage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/signup" element={<SignupPage />} />
          <Route
            path="/dashboard"
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
