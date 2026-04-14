import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Menu, X, User, LogOut, Settings } from 'lucide-react';
import { Button } from './ui/button';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from './AuthProvider';
import { logout } from '../lib/firebase';

interface LayoutProps {
  children: React.ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const [isMenuOpen, setIsMenuOpen] = React.useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { user, isAdmin } = useAuth();

  const navItems = [
    { name: 'Home', path: '/' },
    { name: 'About', path: '/about' },
    { name: 'Portfolio', path: '/portfolio' },
    { name: 'Reservation', path: '/reservation' },
  ];

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/');
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  return (
    <div className="min-h-screen bg-[#FDFCFB] text-[#1A1A1A] font-sans">
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-md border-b border-[#E5E1DA]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-20">
            <div className="flex items-center">
              <Link to="/" className="text-2xl font-bold tracking-tighter text-[#1A1A1A]">
                LJ<span className="text-[#8B7E74]">INTERIOR</span>
              </Link>
            </div>

            {/* Desktop Menu */}
            <div className="hidden md:flex items-center space-x-8">
              {navItems.map((item) => (
                <Link
                  key={item.name}
                  to={item.path}
                  className={`text-sm font-medium tracking-wide transition-colors hover:text-[#8B7E74] ${
                    location.pathname === item.path ? 'text-[#8B7E74]' : 'text-[#4A4A4A]'
                  }`}
                >
                  {item.name}
                </Link>
              ))}
              
              <div className="flex items-center space-x-4 ml-4 pl-4 border-l border-[#E5E1DA]">
                {user ? (
                  <>
                    <Link to="/mypage">
                      <Button variant="ghost" size="sm" className="flex items-center gap-2">
                        <User className="w-4 h-4" />
                        My Page
                      </Button>
                    </Link>
                    {isAdmin && (
                      <Link to="/admin">
                        <Button variant="ghost" size="sm" className="flex items-center gap-2">
                          <Settings className="w-4 h-4" />
                          Admin
                        </Button>
                      </Link>
                    )}
                    <Button variant="ghost" size="sm" onClick={handleLogout}>
                      <LogOut className="w-4 h-4" />
                    </Button>
                  </>
                ) : (
                  <Link to="/login">
                    <Button variant="outline" size="sm" className="border-[#8B7E74] text-[#8B7E74] hover:bg-[#8B7E74] hover:text-white">
                      Login
                    </Button>
                  </Link>
                )}
              </div>
            </div>

            {/* Mobile menu button */}
            <div className="md:hidden flex items-center">
              <button
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                className="text-[#4A4A4A] hover:text-[#1A1A1A]"
              >
                {isMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Menu */}
        <AnimatePresence>
          {isMenuOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="md:hidden bg-white border-b border-[#E5E1DA] overflow-hidden"
            >
              <div className="px-4 pt-2 pb-6 space-y-1">
                {navItems.map((item) => (
                  <Link
                    key={item.name}
                    to={item.path}
                    onClick={() => setIsMenuOpen(false)}
                    className="block px-3 py-4 text-base font-medium text-[#4A4A4A] hover:text-[#8B7E74] hover:bg-[#FDFCFB] rounded-lg"
                  >
                    {item.name}
                  </Link>
                ))}
                <div className="pt-4 border-t border-[#E5E1DA] mt-4">
                  {user ? (
                    <>
                      <Link
                        to="/mypage"
                        onClick={() => setIsMenuOpen(false)}
                        className="block px-3 py-4 text-base font-medium text-[#4A4A4A]"
                      >
                        My Page
                      </Link>
                      {isAdmin && (
                        <Link
                          to="/admin"
                          onClick={() => setIsMenuOpen(false)}
                          className="block px-3 py-4 text-base font-medium text-[#4A4A4A]"
                        >
                          Admin
                        </Link>
                      )}
                      <button
                        onClick={() => {
                          handleLogout();
                          setIsMenuOpen(false);
                        }}
                        className="block w-full text-left px-3 py-4 text-base font-medium text-[#4A4A4A]"
                      >
                        Logout
                      </button>
                    </>
                  ) : (
                    <Link
                      to="/login"
                      onClick={() => setIsMenuOpen(false)}
                      className="block px-3 py-4 text-base font-medium text-[#8B7E74]"
                    >
                      Login
                    </Link>
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </nav>

      <main className="pt-20">
        {children}
      </main>

      <footer className="bg-[#1A1A1A] text-white py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-12">
            <div className="col-span-1 md:col-span-2">
              <Link to="/" className="text-2xl font-bold tracking-tighter mb-6 block">
                LJ<span className="text-[#8B7E74]">INTERIOR</span>
              </Link>
              <p className="text-[#A0A0A0] max-w-md leading-relaxed">
                머릿속에 그리던 공간, 가장 완벽한 현실이 되다.
                설계부터 시공까지, LJInterior가 당신의 일상에 가치를 더합니다.
              </p>
            </div>
            <div>
              <h4 className="text-sm font-bold uppercase tracking-widest mb-6">Explore</h4>
              <ul className="space-y-4 text-[#A0A0A0]">
                <li><Link to="/about" className="hover:text-white transition-colors">About Us</Link></li>
                <li><Link to="/portfolio" className="hover:text-white transition-colors">Portfolio</Link></li>
                <li><Link to="/reservation" className="hover:text-white transition-colors">Reservation</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="text-sm font-bold uppercase tracking-widest mb-6">Contact</h4>
              <ul className="space-y-4 text-[#A0A0A0]">
                <li>T. 031-292-4589</li>
                <li>E. lj_interior@naver.com</li>
                <li>A. 경기도 화성시 효행구 봉담읍 분천길95번길 47-4</li>
              </ul>
            </div>
          </div>
          <div className="mt-20 pt-8 border-t border-white/10 text-center text-[#666666] text-sm">
            © 2024 LJInterior. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}
