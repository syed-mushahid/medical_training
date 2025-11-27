import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Instructors from './pages/Instructors';
import Students from './pages/Students';
import StudentGroups from './pages/StudentGroups';
import StudentDashboard from './pages/StudentDashboard';
import StudentMyGroups from './pages/StudentMyGroups';
import StudentProfile from './pages/StudentProfile';
import InstructorProfile from './pages/InstructorProfile';
import AdminProfile from './pages/AdminProfile';
import RAGFlow from './pages/RAGFlow';
import DatasetDocuments from './pages/DatasetDocuments';
import DocumentChunks from './pages/DocumentChunks';
import Retrieval from './pages/Retrieval';
import ChatAssistants from './pages/ChatAssistants';
import ChatSessions from './pages/ChatSessions';
import ChatMessages from './pages/ChatMessages';
import ChatAssignments from './pages/ChatAssignments';
import StudentChats from './pages/StudentChats';
import Layout from './components/Layout';
import { Toaster } from './components/ui/use-toast.jsx';
import Loading from './components/Loading';

function ProtectedRoute({ children, allowedRoles = [] }) {
  const { user, loading } = useAuth();

  if (loading) {
    return <Loading />;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles.length > 0 && !allowedRoles.includes(user.role)) {
    return <Navigate to="/" replace />;
  }

  return children;
}

function AppRoutes() {
  const { user, loading } = useAuth();

  if (loading) {
    return <Loading />;
  }

  return (
    <Routes>
      <Route path="/login" element={!user ? <Login /> : <Navigate to="/" replace />} />
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <Layout>
              {user?.role === 'student' ? <StudentDashboard /> : <Dashboard />}
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/instructors"
        element={
          <ProtectedRoute allowedRoles={['admin']}>
            <Layout>
              <Instructors />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/students"
        element={
          <ProtectedRoute allowedRoles={['admin', 'instructor']}>
            <Layout>
              <Students />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/student-groups"
        element={
          <ProtectedRoute allowedRoles={['admin', 'instructor']}>
            <Layout>
              <StudentGroups />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/ragflow"
        element={
          <ProtectedRoute allowedRoles={['admin', 'instructor']}>
            <Layout>
              <RAGFlow />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/ragflow/datasets/:datasetId/documents"
        element={
          <ProtectedRoute allowedRoles={['admin', 'instructor']}>
            <Layout>
              <DatasetDocuments />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/ragflow/datasets/:datasetId/documents/:documentId/chunks"
        element={
          <ProtectedRoute allowedRoles={['admin', 'instructor']}>
            <Layout>
              <DocumentChunks />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/ragflow/retrieval"
        element={
          <ProtectedRoute allowedRoles={['admin', 'instructor']}>
            <Layout>
              <Retrieval />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/ragflow/chats"
        element={
          <ProtectedRoute allowedRoles={['admin', 'instructor']}>
            <Layout>
              <ChatAssistants />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/ragflow/chats/:chatId/sessions"
        element={
          <ProtectedRoute allowedRoles={['admin', 'instructor']}>
            <Layout>
              <ChatSessions />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/ragflow/chats/:chatId/sessions/:sessionId/messages"
        element={
          <ProtectedRoute allowedRoles={['admin', 'instructor']}>
            <Layout>
              <ChatMessages />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/ragflow/chats/:chatId/assignments"
        element={
          <ProtectedRoute allowedRoles={['admin', 'instructor']}>
            <Layout>
              <ChatAssignments />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/student/chats"
        element={
          <ProtectedRoute allowedRoles={['student']}>
            <Layout>
              <StudentChats />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/student/chats/:chatId"
        element={
          <ProtectedRoute allowedRoles={['student']}>
            <Layout>
              <StudentChats />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/student/my-groups"
        element={
          <ProtectedRoute allowedRoles={['student']}>
            <Layout>
              <StudentMyGroups />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/student/profile"
        element={
          <ProtectedRoute allowedRoles={['student']}>
            <Layout>
              <StudentProfile />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/instructor/profile"
        element={
          <ProtectedRoute allowedRoles={['instructor']}>
            <Layout>
              <InstructorProfile />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/profile"
        element={
          <ProtectedRoute allowedRoles={['admin']}>
            <Layout>
              <AdminProfile />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/student/chats/:chatId/sessions/:sessionId/messages"
        element={
          <ProtectedRoute allowedRoles={['student']}>
            <Layout>
              <ChatMessages />
            </Layout>
          </ProtectedRoute>
        }
      />
    </Routes>
  );
}

function App() {
  return (
    <AuthProvider>
      <Router>
        <AppRoutes />
        <Toaster />
      </Router>
    </AuthProvider>
  );
}

export default App;

