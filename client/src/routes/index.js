import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import WebsitePage from "../modules/website/WebsitePage";
import AuthPage from "../modules/auth/AuthPage";
import DashboardPage from "../modules/dashboard/DashboardPage";

const AppRoutes = () => {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<WebsitePage />} />
        <Route path="/auth" element={<AuthPage />} />
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="*" element={<WebsitePage />} />
      </Routes>
    </Router>
  );
};

export default AppRoutes;
