import { lazy, Suspense } from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { AdminGate } from "./components/AdminGate";
import { SiteChrome } from "./components/SiteChrome";

const StudentPage = lazy(() =>
  import("./pages/StudentPage").then((m) => ({ default: m.StudentPage })),
);
const AdminPage = lazy(() => import("./pages/AdminPage").then((m) => ({ default: m.AdminPage })));

const routerBasename = import.meta.env.BASE_URL.replace(/\/$/, "");

function RouteFallback() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-16 text-center font-body text-tri-lead text-tri-ink/70">
      Loading…
    </div>
  );
}

export default function App() {
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <BrowserRouter basename={routerBasename || undefined}>
        <Suspense fallback={<RouteFallback />}>
          <Routes>
            <Route path="/" element={<SiteChrome />}>
              <Route index element={<StudentPage />} />
              <Route
                path="admin"
                element={
                  <AdminGate>
                    <AdminPage />
                  </AdminGate>
                }
              />
            </Route>
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
      </BrowserRouter>
    </div>
  );
}
