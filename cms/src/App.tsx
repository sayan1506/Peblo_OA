import { Navigate, Route, Routes } from "react-router-dom";
import { ProtectedRoute } from "./auth/ProtectedRoute";
import { EpisodeFormPage } from "./pages/EpisodeFormPage";
import { LoginPage } from "./pages/LoginPage";
import { ShowDetailPage } from "./pages/ShowDetailPage";
import { ShowFormPage } from "./pages/ShowFormPage";
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
        path="/shows/new"
        element={
          <ProtectedRoute>
            <ShowFormPage />
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
      <Route
        path="/shows/:showId/edit"
        element={
          <ProtectedRoute>
            <ShowFormPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/shows/:showId/seasons/:seasonId/episodes/new"
        element={
          <ProtectedRoute>
            <EpisodeFormPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/shows/:showId/episodes/:episodeId/edit"
        element={
          <ProtectedRoute>
            <EpisodeFormPage />
          </ProtectedRoute>
        }
      />
      <Route path="/" element={<Navigate to="/shows" replace />} />
      <Route path="*" element={<Navigate to="/shows" replace />} />
    </Routes>
  );
}

export default App;
