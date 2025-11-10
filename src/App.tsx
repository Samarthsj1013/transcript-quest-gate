import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import ProtectedRoute from "@/components/ProtectedRoute";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import NotFound from "./pages/NotFound";
import COELayout from "./components/dashboard/COELayout";
import RequestsPage from "./pages/coe/RequestsPage";
import StudentsPage from "./pages/coe/StudentsPage";
import StudentDetailPage from "./pages/coe/StudentDetailPage";
import BranchesPage from "./pages/coe/BranchesPage";
import BatchesPage from "./pages/coe/BatchesPage";
import StudentDashboard from "./pages/student/StudentDashboard";
import RequestTranscript from "./pages/student/RequestTranscript";
import VerifyTranscript from "./pages/VerifyTranscript";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/auth" element={<Auth />} />
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute>
                  <Dashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/coe"
              element={
                <ProtectedRoute allowedRoles={['COE', 'ADMIN']}>
                  <COELayout />
                </ProtectedRoute>
              }
            >
              <Route index element={<Navigate to="/coe/requests" replace />} />
              <Route path="requests" element={<RequestsPage />} />
              <Route path="students" element={<StudentsPage />} />
              <Route path="students/:id" element={<StudentDetailPage />} />
              <Route path="branches" element={<BranchesPage />} />
              <Route path="batches" element={<BatchesPage />} />
            </Route>
            <Route
              path="/student/dashboard"
              element={
                <ProtectedRoute allowedRoles={['STUDENT']}>
                  <StudentDashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/student/request-transcript"
              element={
                <ProtectedRoute allowedRoles={['STUDENT']}>
                  <RequestTranscript />
                </ProtectedRoute>
              }
            />
            <Route path="/verify/:token" element={<VerifyTranscript />} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
