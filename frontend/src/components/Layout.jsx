import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Button } from './ui/button';
import { LogOut, Users, GraduationCap, BookOpen, LayoutDashboard, Database, MessageSquare } from 'lucide-react';

export default function Layout({ children }) {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const isActive = (path) => location.pathname === path;

  const navItems = [];
  
  if (user?.role === 'admin') {
    navItems.push(
      { path: '/', label: 'Dashboard', icon: LayoutDashboard },
      { path: '/instructors', label: 'Instructors', icon: Users },
      { path: '/students', label: 'Students', icon: GraduationCap },
      { path: '/student-groups', label: 'Student Groups', icon: BookOpen },
      { path: '/ragflow', label: 'RAGFlow', icon: Database },
      { path: '/ragflow/chats', label: 'Chat Assistants', icon: MessageSquare }
    );
  } else if (user?.role === 'instructor') {
    navItems.push(
      { path: '/', label: 'Dashboard', icon: LayoutDashboard },
      { path: '/students', label: 'Students', icon: GraduationCap },
      { path: '/student-groups', label: 'Student Groups', icon: BookOpen },
      { path: '/ragflow', label: 'RAGFlow', icon: Database },
      { path: '/ragflow/chats', label: 'Chat Assistants', icon: MessageSquare }
    );
  } else if (user?.role === 'student') {
    navItems.push(
      { path: '/', label: 'My Dashboard', icon: LayoutDashboard }
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <nav className="border-b bg-card">
        <div className="container mx-auto px-4">
          <div className="flex h-16 items-center justify-between">
            <div className="flex items-center space-x-8">
              <h1 className="text-xl font-bold text-primary">Training Portal</h1>
              <div className="flex space-x-1">
                {navItems.map((item) => (
                  <Link key={item.path} to={item.path}>
                    <Button
                      variant={isActive(item.path) ? 'default' : 'ghost'}
                      className="flex items-center space-x-2"
                    >
                      <item.icon className="h-4 w-4" />
                      <span>{item.label}</span>
                    </Button>
                  </Link>
                ))}
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-muted-foreground">
                {user?.email} ({user?.role})
              </span>
              <Button variant="ghost" onClick={handleLogout}>
                <LogOut className="h-4 w-4 mr-2" />
                Logout
              </Button>
            </div>
          </div>
        </div>
      </nav>
      <main className="container mx-auto px-4 py-8">{children}</main>
    </div>
  );
}

