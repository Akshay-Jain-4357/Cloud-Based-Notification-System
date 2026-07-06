import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useNavigate, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { Login } from './pages/Login';
import { Dashboard } from './pages/Dashboard';
import { Composer } from './pages/Composer';
import { History } from './pages/History';
import { Templates } from './pages/Templates';
import { Preferences } from './pages/Preferences';
import { Admin } from './pages/Admin';
import {
  LayoutDashboard,
  Send,
  History as HistoryIcon,
  FileCode,
  Sliders,
  Shield,
  LogOut,
  Sun,
  Moon,
  Sparkles,
  Menu,
  X
} from 'lucide-react';

const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [theme, setTheme] = useState<'light' | 'dark'>('dark');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const root = window.document.documentElement;
    if (theme === 'light') {
      root.classList.add('light');
    } else {
      root.classList.remove('light');
    }
  }, [theme]);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const navItems = [
    { label: 'Dashboard', path: '/', icon: LayoutDashboard },
    { label: 'Composer', path: '/composer', icon: Send },
    { label: 'History Logs', path: '/history', icon: HistoryIcon },
    { label: 'Templates', path: '/templates', icon: FileCode },
    { label: 'Preferences', path: '/preferences', icon: Sliders },
  ];

  if (user?.role === 'ADMIN') {
    navItems.push({ label: 'Admin Panel', path: '/admin', icon: Shield });
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col md:flex-row relative">
      {/* Background gradients */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-500/5 rounded-full blur-[120px] pointer-events-none"></div>
      <div className="absolute bottom-0 left-0 w-96 h-96 bg-purple-500/5 rounded-full blur-[120px] pointer-events-none"></div>

      {/* Mobile Top Header */}
      <div className="md:hidden glass flex items-center justify-between p-4 border-b border-slate-900 z-30">
        <div className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-indigo-400" />
          <span className="font-bold text-sm bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">
            NotifyFlow
          </span>
        </div>
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="text-slate-400 hover:text-slate-200"
        >
          {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {/* Sidebar Navigation */}
      <aside
        className={`w-64 glass border-r border-slate-900 p-6 flex flex-col justify-between z-20 md:relative fixed inset-y-0 left-0 transform md:transform-none transition-transform duration-300 ${
          mobileMenuOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        } h-screen md:h-auto`}
      >
        <div className="space-y-8">
          {/* Logo */}
          <div className="hidden md:flex items-center gap-2">
            <div className="w-8 h-8 bg-indigo-600/20 text-indigo-400 rounded-lg flex items-center justify-center border border-indigo-500/20">
              <Sparkles className="w-4.5 h-4.5" />
            </div>
            <span className="font-bold text-base bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">
              NotifyFlow
            </span>
          </div>

          {/* Nav Links */}
          <nav className="space-y-1.5">
            {navItems.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-xs font-semibold text-slate-400 hover:text-slate-100 hover:bg-slate-900/60 border border-transparent hover:border-slate-900 transition-all"
              >
                <item.icon className="w-4 h-4 text-indigo-450" />
                {item.label}
              </Link>
            ))}
          </nav>
        </div>

        {/* User profile / theme */}
        <div className="space-y-4 pt-6 border-t border-slate-900">
          <div className="flex items-center justify-between">
            <div className="flex flex-col">
              <span className="text-xs font-bold text-slate-200">{user?.name}</span>
              <span className="text-[10px] text-indigo-400 font-semibold">{user?.role}</span>
            </div>
            <button
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              className="p-2 bg-slate-900 hover:bg-slate-800 text-slate-405 rounded-lg transition-colors cursor-pointer"
            >
              {theme === 'dark' ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-indigo-400" />}
            </button>
          </div>

          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 bg-slate-900 hover:bg-rose-950/20 hover:text-rose-400 hover:border-rose-900/40 text-slate-400 text-xs font-semibold py-2 px-3 border border-slate-850 rounded-lg cursor-pointer transition-colors"
          >
            <LogOut className="w-3.5 h-3.5" /> Logout
          </button>
        </div>
      </aside>

      {/* Main content frame */}
      <main className="flex-1 p-6 md:p-10 overflow-y-auto max-h-screen">
        {children}
      </main>
    </div>
  );
};

const PrivateRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { token, loading } = useAuth();
  if (loading) return null;
  return token ? <Layout>{children}</Layout> : <Navigate to="/login" />;
};

const AdminRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { token, user, loading } = useAuth();
  if (loading) return null;
  return token && user?.role === 'ADMIN' ? <Layout>{children}</Layout> : <Navigate to="/" />;
};

export const App: React.FC = () => {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/" element={<PrivateRoute><Dashboard /></PrivateRoute>} />
          <Route path="/composer" element={<PrivateRoute><Composer /></PrivateRoute>} />
          <Route path="/history" element={<PrivateRoute><History /></PrivateRoute>} />
          <Route path="/templates" element={<PrivateRoute><Templates /></PrivateRoute>} />
          <Route path="/preferences" element={<PrivateRoute><Preferences /></PrivateRoute>} />
          <Route path="/admin" element={<AdminRoute><Admin /></AdminRoute>} />
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
};

export default App;
