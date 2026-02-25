import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import WebsitePage from "../modules/website/WebsitePage";
import LoginPage from "../modules/auth/LoginPage";
import SignupPage from "../modules/auth/SignupPage";
import DashboardPage from "../modules/dashboard/DashboardPage";

const AppRoutes = () => {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<WebsitePage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/signup" element={<SignupPage />} />
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="*" element={<WebsitePage />} />
      </Routes>
    </Router>
  );
};

export default AppRoutes;
