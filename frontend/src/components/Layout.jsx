import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Button } from './ui/button';
import { LogOut, Users, GraduationCap, BookOpen, LayoutDashboard, Database, MessageSquare, UserCircle, Shield, Plus } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import LanguageSwitcher from './LanguageSwitcher';
import NewChatButton from './NewChatButton';

export default function Layout({ children }) {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const { t } = useTranslation();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const isActive = (path) => {
    if (path === '/') {
      return location.pathname === '/';
    }
    
    // Handle special case for /ragflow and /ragflow/chats overlap
    if (path === '/ragflow') {
      // Only highlight Dataset if we're on /ragflow or /ragflow/* but NOT /ragflow/chats/*
      return location.pathname.startsWith('/ragflow') && !location.pathname.startsWith('/ragflow/chats');
    }
    
    if (path === '/ragflow/chats') {
      // Only highlight Chat Assistants if we're on /ragflow/chats or any sub-path
      return location.pathname.startsWith('/ragflow/chats');
    }
    
    // For other paths, use standard prefix matching
    return location.pathname.startsWith(path);
  };

  const navItems = [];
  
  if (user?.role === 'admin') {
    navItems.push(
      { path: '/', label: t('layout.dashboard'), icon: LayoutDashboard },
      { path: '/instructors', label: t('layout.instructors'), icon: Users },
      { path: '/students', label: t('layout.students'), icon: GraduationCap },
      { path: '/student-groups', label: t('layout.studentGroups'), icon: BookOpen },
      { path: '/admin/profile', label: t('layout.profileInformation'), icon: Shield }
    );
  } else if (user?.role === 'instructor') {
    navItems.push(
      { path: '/', label: t('layout.dashboard'), icon: LayoutDashboard },
      { path: '/students', label: t('layout.students'), icon: GraduationCap },
      { path: '/student-groups', label: t('layout.studentGroups'), icon: BookOpen },
      { path: '/ragflow', label: t('layout.dataset'), icon: Database },
      { path: '/ragflow/chats', label: t('layout.chatAssistants'), icon: MessageSquare },
      { path: '/instructor/profile', label: t('layout.profileInformation'), icon: UserCircle }
    );
  } else if (user?.role === 'student') {
    navItems.push(
      { path: '/', label: t('layout.history'), icon: LayoutDashboard },
      { path: '/student/my-groups', label: t('layout.myGroups'), icon: BookOpen },
      { path: '/student/chats', label: t('layout.chatAssistants'), icon: MessageSquare },
      { path: '/student/profile', label: t('layout.profileInformation'), icon: UserCircle }
    );
  }

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      {/* Sidebar */}
      <aside className="w-64 bg-card border-r flex flex-col">
        {/* Logo/Title */}
        <div className="h-16 border-b flex items-center justify-between px-6">
          <h1 className="text-xl font-bold text-primary">{t('layout.trainingPortal')}</h1>
          <LanguageSwitcher />
        </div>
        
        {/* Navigation Items */}
        <nav className="flex-1 overflow-y-auto py-4">
          <div className="space-y-1 px-3">
            {user?.role === 'student' && (
              <div className="mb-2 px-3">
                <NewChatButton 
                  variant="default" 
                  size="default" 
                  className="w-full justify-start"
                />
              </div>
            )}
            {navItems.map((item) => (
              <Link key={item.path} to={item.path}>
                <Button
                  variant={isActive(item.path) ? 'default' : 'ghost'}
                  className={`w-full justify-start ${
                    isActive(item.path) ? 'bg-primary text-primary-foreground' : ''
                  }`}
                >
                  <item.icon className="h-4 w-4 mr-3" />
                  <span>{item.label}</span>
                </Button>
              </Link>
            ))}
          </div>
        </nav>
        
        {/* User Info and Logout */}
        <div className="border-t p-4 space-y-2">
          <div className="px-3 py-2">
            <div className="text-sm font-medium text-foreground">{user?.email}</div>
            <div className="text-xs text-muted-foreground capitalize">{user?.role}</div>
          </div>
          <Button 
            variant="ghost" 
            onClick={handleLogout}
            className="w-full justify-start"
          >
            <LogOut className="h-4 w-4 mr-3" />
            {t('layout.logout')}
          </Button>
        </div>
      </aside>
      
      {/* Main Content */}
      <main className="flex-1 overflow-y-auto">
        <div className="container mx-auto px-6 py-8">{children}</div>
      </main>
    </div>
  );
}

