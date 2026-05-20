import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { SiteChrome } from "./components/SiteChrome";
import { AdminPage } from "./pages/AdminPage";
import { StudentPage } from "./pages/StudentPage";

const routerBasename = import.meta.env.BASE_URL.replace(/\/$/, "");

export default function App() {
  return (
    <BrowserRouter basename={routerBasename || undefined}>
      <Routes>
        <Route path="/" element={<SiteChrome />}>
          <Route index element={<StudentPage />} />
          <Route path="admin" element={<AdminPage />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
