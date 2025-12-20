'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Logo } from '@/components/ui/Logo';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { createClient } from '@/lib/supabase/client';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const supabase = createClient();
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (signInError) {
        setError(signInError.message);
        return;
      }

      router.push('/dashboard');
      router.refresh();
    } catch {
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Left Panel - Form */}
      <div className="flex-1 flex flex-col justify-center px-4 sm:px-6 lg:px-8 py-12">
        <div className="mx-auto w-full max-w-md">
          {/* Logo */}
          <div className="mb-10">
            <Logo size="lg" href="/" />
          </div>

          {/* Header */}
          <div className="mb-8">
            <h1 className="text-display text-slate-900">Welcome back</h1>
            <p className="mt-3 text-body text-slate-600">
              Sign in to your account to continue
            </p>
          </div>

          {/* Form */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-8 space-y-6">
            <form onSubmit={handleSubmit} className="space-y-6">
              <Input
                label="Email address"
                type="email"
                name="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
                autoComplete="email"
                leftIcon={
                  <svg className="w-5 h-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207"
                    />
                  </svg>
                }
              />

              <Input
                label="Password"
                type="password"
                name="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                autoComplete="current-password"
                leftIcon={
                  <svg className="w-5 h-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                    />
                  </svg>
                }
              />

              {error && (
                <div className="rounded-lg bg-red-50 border border-red-200 p-4">
                  <div className="flex items-start gap-3">
                    <svg
                      className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                    <p className="text-sm text-red-700">{error}</p>
                  </div>
                </div>
              )}

              <Button type="submit" fullWidth isLoading={isLoading} size="lg" className="mt-8">
                Sign in
              </Button>
            </form>
          </div>

          {/* Footer links */}
          <div className="mt-6 text-center">
            <Link
              href="#"
              className="text-sm text-blue-600 hover:text-blue-700 transition-colors"
            >
              Forgot your password?
            </Link>
          </div>

          <div className="mt-8 pt-6 border-t border-slate-200">
            <p className="text-sm text-slate-600 text-center">
              Don&apos;t have an account?{' '}
              <Link
                href="#"
                className="font-medium text-blue-600 hover:text-blue-700 transition-colors"
              >
                Contact your administrator
              </Link>
            </p>
          </div>
        </div>
      </div>

      {/* Right Panel - Professional Medical Design */}
      <div className="hidden lg:flex lg:flex-1 relative overflow-hidden">
        {/* Background with medical gradient */}
        <div className="absolute inset-0 bg-gradient-to-br from-teal-600 via-teal-500 to-cyan-500" />

        {/* Medical pattern overlay */}
        <div className="absolute inset-0 opacity-10">
          <svg className="h-full w-full" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <pattern id="medical-grid" width="40" height="40" patternUnits="userSpaceOnUse">
                <circle cx="20" cy="20" r="1.5" fill="white" opacity="0.3" />
                <path d="M20 8 L20 32 M8 20 L32 20" stroke="white" strokeWidth="0.5" opacity="0.2" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#medical-grid)" />
          </svg>
        </div>

        {/* Content */}
        <div className="relative z-10 flex flex-col items-center justify-center p-12 text-white">
          <div className="max-w-lg text-center">
            {/* Enhanced medical illustration */}
            <div className="mb-10 flex justify-center">
              <div className="relative">
                <svg
                  viewBox="0 0 160 200"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                  className="w-40 h-48 opacity-95"
                >
                  {/* Professional spine design */}
                  {[0, 35, 70, 105, 140].map((y, i) => (
                    <g key={i} style={{ opacity: 1 - i * 0.1 }}>
                      <ellipse
                        cx="80"
                        cy={y + 20}
                        rx={i === 2 ? 20 : 15 - i * 1.5}
                        ry={i === 2 ? 8 : 6 - i * 0.5}
                        fill="white"
                        fillOpacity="0.25"
                      />
                      <ellipse
                        cx="80"
                        cy={y + 20}
                        rx={i === 2 ? 12 : 9 - i}
                        ry={i === 2 ? 5 : 4 - i * 0.25}
                        fill="white"
                        fillOpacity="0.6"
                      />
                    </g>
                  ))}
                  {/* Central medical cross */}
                  <g transform="translate(76, 90)">
                    <rect x="-2" y="-8" width="4" height="16" fill="white" opacity="0.8" />
                    <rect x="-8" y="-2" width="16" height="4" fill="white" opacity="0.8" />
                  </g>
                  {/* Connecting spine line */}
                  <path
                    d="M80 15 Q85 50 80 85 Q75 120 80 155 Q85 180 80 195"
                    stroke="white"
                    strokeWidth="2"
                    strokeOpacity="0.5"
                    fill="none"
                    strokeLinecap="round"
                  />
                </svg>
                {/* Floating medical icons */}
                <div className="absolute -top-2 -right-2 w-8 h-8 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-sm">
                  <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                  </svg>
                </div>
                <div className="absolute -bottom-2 -left-2 w-8 h-8 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-sm">
                  <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
              </div>
            </div>

            <h2 className="text-3xl font-bold mb-6 leading-tight">
              Expert review for confident decisions
            </h2>
            <p className="text-lg text-teal-50 leading-relaxed mb-8">
              Join hundreds of healthcare providers using First Principles to ensure
              spine surgery appropriateness through peer expertise.
            </p>

            {/* Professional testimonial */}
            <div className="bg-white/10 rounded-2xl backdrop-blur-sm border border-white/20 p-8 shadow-xl">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-white/30 to-white/10 flex items-center justify-center text-white font-bold text-lg">
                  MD
                </div>
                <div className="text-left">
                  <p className="font-semibold text-white">Dr. Michael Davis</p>
                  <p className="text-sm text-teal-100">Spine Surgery, Metro Health</p>
                </div>
              </div>
              <p className="text-teal-50 italic leading-relaxed">
                &ldquo;First Principles has transformed how we approach surgical
                decision-making. The blinded review process gives us confidence
                in our treatment plans.&rdquo;
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

