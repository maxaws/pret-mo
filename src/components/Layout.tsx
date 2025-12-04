import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import {
  LayoutDashboard,
  Calendar,
  Clock,
  Receipt,
  FileCheck,
  FolderLock,
  History,
  Settings,
  LogOut,
  Menu,
  X,
  User,
  ClipboardList,
  CheckSquare
} from 'lucide-react';

interface LayoutProps {
  children: React.ReactNode;
}

export const Layout: React.FC<LayoutProps> = ({ children }) => {
  const { profile, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleSignOut = async () => {
    await signOut();
    navigate('/connexion');
  };

  const navigation = [
    { name: 'Tableau de bord', href: '/tableau-de-bord', icon: LayoutDashboard, roles: ['preteuse', 'compta'] },
    { name: 'Planning', href: '/planning', icon: Calendar, roles: ['salarie', 'accueil', 'preteuse'] },
    { name: 'Heures', href: '/heures', icon: Clock, roles: ['salarie', 'accueil', 'preteuse', 'compta'] },
    { name: 'Frais professionnels', href: '/frais', icon: Receipt, roles: ['salarie', 'accueil', 'preteuse', 'compta'] },
    { name: 'Bilan hebdomadaire', href: '/bilan-hebdomadaire', icon: ClipboardList, roles: ['salarie'] },
    { name: 'Validation bilans', href: '/validation-bilans', icon: CheckSquare, roles: ['accueil', 'preteuse'] },
    { name: 'Clôture mensuelle', href: '/cloture', icon: FileCheck, roles: ['salarie', 'accueil', 'preteuse'] },
    { name: 'Paramètres', href: '/parametres', icon: Settings, roles: ['salarie', 'accueil'] },
    { name: 'Coffre-fort', href: '/documents', icon: FolderLock, roles: ['preteuse', 'compta'] },
    { name: 'Audit', href: '/audit', icon: History, roles: ['preteuse'] },
    { name: 'Administration', href: '/administration', icon: Settings, roles: ['preteuse'] },
  ];

  const filteredNavigation = navigation.filter(item =>
    !item.roles || (profile && item.roles.includes(profile.role))
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="lg:flex">
        <div
          className={`fixed inset-0 z-40 flex lg:hidden ${sidebarOpen ? '' : 'pointer-events-none'}`}
          onClick={() => setSidebarOpen(false)}
        >
          <div
            className={`relative flex w-full max-w-xs flex-1 flex-col bg-white transition-transform ${
              sidebarOpen ? 'translate-x-0' : '-translate-x-full'
            }`}
          >
            <div className="flex h-16 items-center justify-between px-4 border-b border-gray-200">
              <h1 className="text-xl font-bold text-gray-900">Gestion RH</h1>
              <button
                onClick={() => setSidebarOpen(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <X className="h-6 w-6" />
              </button>
            </div>
            <nav className="flex-1 space-y-1 px-2 py-4">
              {filteredNavigation.map((item) => {
                const isActive = location.pathname === item.href || location.pathname.startsWith(item.href + '/');
                return (
                  <Link
                    key={item.name}
                    to={item.href}
                    className={`flex items-center px-4 py-3 text-sm font-medium rounded-lg transition-colors ${
                      isActive
                        ? 'bg-blue-50 text-blue-700'
                        : 'text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    <item.icon className={`mr-3 h-5 w-5 ${isActive ? 'text-blue-700' : 'text-gray-500'}`} />
                    {item.name}
                  </Link>
                );
              })}
            </nav>
            <div className="border-t border-gray-200 p-4">
              <div className="flex items-center mb-4">
                <div className="flex-shrink-0">
                  <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                    <User className="h-5 w-5 text-blue-600" />
                  </div>
                </div>
                <div className="ml-3">
                  <p className="text-sm font-medium text-gray-900">
                    {profile?.prenom} {profile?.nom}
                  </p>
                  <p className="text-xs text-gray-500 capitalize">{profile?.role}</p>
                </div>
              </div>
              <button
                onClick={handleSignOut}
                className="flex w-full items-center px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-50 rounded-lg transition-colors"
              >
                <LogOut className="mr-3 h-5 w-5" />
                Déconnexion
              </button>
            </div>
          </div>
        </div>

        <div className="hidden lg:flex lg:w-64 lg:flex-col lg:fixed lg:inset-y-0">
          <div className="flex flex-col flex-grow bg-white border-r border-gray-200">
            <div className="flex items-center h-16 px-4 border-b border-gray-200">
              <h1 className="text-xl font-bold text-gray-900">Gestion RH</h1>
            </div>
            <nav className="flex-1 space-y-1 px-2 py-4">
              {filteredNavigation.map((item) => {
                const isActive = location.pathname === item.href || location.pathname.startsWith(item.href + '/');
                return (
                  <Link
                    key={item.name}
                    to={item.href}
                    className={`flex items-center px-4 py-3 text-sm font-medium rounded-lg transition-colors ${
                      isActive
                        ? 'bg-blue-50 text-blue-700'
                        : 'text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    <item.icon className={`mr-3 h-5 w-5 ${isActive ? 'text-blue-700' : 'text-gray-500'}`} />
                    {item.name}
                  </Link>
                );
              })}
            </nav>
            <div className="border-t border-gray-200 p-4">
              <div className="flex items-center mb-4">
                <div className="flex-shrink-0">
                  <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                    <User className="h-5 w-5 text-blue-600" />
                  </div>
                </div>
                <div className="ml-3">
                  <p className="text-sm font-medium text-gray-900">
                    {profile?.prenom} {profile?.nom}
                  </p>
                  <p className="text-xs text-gray-500 capitalize">{profile?.role}</p>
                </div>
              </div>
              <button
                onClick={handleSignOut}
                className="flex w-full items-center px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-50 rounded-lg transition-colors"
              >
                <LogOut className="mr-3 h-5 w-5" />
                Déconnexion
              </button>
            </div>
          </div>
        </div>

        <div className="lg:pl-64 flex flex-col flex-1">
          <div className="sticky top-0 z-10 flex h-16 flex-shrink-0 bg-white border-b border-gray-200 lg:hidden">
            <button
              onClick={() => setSidebarOpen(true)}
              className="px-4 text-gray-500 focus:outline-none lg:hidden"
            >
              <Menu className="h-6 w-6" />
            </button>
            <div className="flex-1 flex items-center justify-center">
              <h1 className="text-lg font-semibold text-gray-900">Gestion RH</h1>
            </div>
          </div>

          <main className="flex-1">
            <div className="py-6">
              <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                {children}
              </div>
            </div>
          </main>
        </div>
      </div>
    </div>
  );
};
