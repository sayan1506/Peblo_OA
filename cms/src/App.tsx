import { Navigate, Route, Routes } from "react-router-dom";
import { ProtectedRoute } from "./auth/ProtectedRoute";
import { LoginPage } from "./pages/LoginPage";
import { ShowDetailPage } from "./pages/ShowDetailPage";
import { ShowsListPage } from "./pages/ShowsListPage";

function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route
        path="/shows"
        element={
          <ProtectedRoute>
            <ShowsListPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/shows/:showId"
        element={
          <ProtectedRoute>
            <ShowDetailPage />
          </ProtectedRoute>
        }
      />
      <Route path="/" element={<Navigate to="/shows" replace />} />
      <Route path="*" element={<Navigate to="/shows" replace />} />
    </Routes>
  );
}

export default App;
