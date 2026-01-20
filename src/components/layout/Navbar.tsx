'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Logo } from '@/components/ui/Logo';
import { Button } from '@/components/ui/Button';
import { createClient } from '@/lib/supabase/client';
import { Profile, Organization } from '@/types/database';

interface NavbarProps {
  user?: {
    profile: Profile;
    organization: Organization;
  } | null;
}

export function Navbar({ user }: NavbarProps) {
  const router = useRouter();
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  const handleLogout = async () => {
    setIsLoggingOut(true);
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push('/login');
    router.refresh();
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'SYS_ADMIN':
        return 'bg-[#4A6FA5]/10 text-[#4A6FA5]';
      case 'ORG_ADMIN':
        return 'bg-[#2FA4A9]/10 text-[#2FA4A9]';
      case 'EXPERT_REVIEWER':
        return 'bg-[#1ECAD3]/10 text-[#1ECAD3]';
      case 'CLINICIAN':
        return 'bg-slate-100 text-[#3A4754]';
      default:
        return 'bg-slate-100 text-[#3A4754]';
    }
  };

  const formatRole = (role: string) => {
    return role.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, (l) => l.toUpperCase());
  };

  return (
    <nav className="sticky top-0 z-50 w-full border-b border-slate-200/60 bg-white/90 backdrop-blur-lg">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          {/* Logo */}
          <Logo size="md" href={user ? '/dashboard' : '/'} />

          {/* Right side */}
          <div className="flex items-center gap-4">
            {user ? (
              <div className="relative">
                <button
                  onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                  className="flex items-center gap-3 rounded-lg px-3 py-2 hover:bg-slate-50 transition-colors"
                >
                  {/* Avatar */}
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#2FA4A9] to-[#1ECAD3] flex items-center justify-center text-white font-medium text-sm">
                    {user.profile.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="hidden sm:block text-left">
                    <p className="text-sm font-medium text-slate-900">{user.profile.name}</p>
                    <p className="text-xs text-slate-500">{user.organization.name}</p>
                  </div>
                  <svg
                    className={`w-4 h-4 text-slate-400 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`}
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                {/* Dropdown */}
                {isDropdownOpen && (
                  <>
                    <div
                      className="fixed inset-0 z-10"
                      onClick={() => setIsDropdownOpen(false)}
                    />
                    <div className="absolute right-0 mt-2 w-64 rounded-xl bg-white shadow-lg border border-slate-200 z-20 animate-slide-down">
                      <div className="p-4 border-b border-slate-100">
                        <p className="text-sm font-medium text-slate-900">{user.profile.name}</p>
                        <p className="text-xs text-slate-500 mt-0.5">{user.profile.email}</p>
                        <span
                          className={`inline-block mt-2 px-2 py-0.5 rounded-full text-xs font-medium ${getRoleBadgeColor(
                            user.profile.role
                          )}`}
                        >
                          {formatRole(user.profile.role)}
                        </span>
                      </div>
                      <div className="p-2">
                        <Link
                          href="/dashboard"
                          className="flex items-center gap-2 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 rounded-lg transition-colors"
                          onClick={() => setIsDropdownOpen(false)}
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"
                            />
                          </svg>
                          Dashboard
                        </Link>
                        <button
                          onClick={handleLogout}
                          disabled={isLoggingOut}
                          className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                            />
                          </svg>
                          {isLoggingOut ? 'Signing out...' : 'Sign out'}
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <Link href="/login">
                  <Button variant="ghost" size="md">
                    Log in
                  </Button>
                </Link>
                <Link href="/login">
                  <Button variant="primary" size="md">
                    Get Started
                  </Button>
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}

