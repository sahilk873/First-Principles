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
        <div className="mx-auto w-full max-w-sm">
          {/* Logo */}
          <div className="mb-8">
            <Logo size="lg" href="/" />
          </div>

          {/* Header */}
          <div className="mb-8">
            <h1 className="text-2xl font-bold text-slate-900">Welcome back</h1>
            <p className="mt-2 text-sm text-slate-600">
              Sign in to your account to continue
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
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
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
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
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
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

            <Button type="submit" fullWidth isLoading={isLoading} size="lg">
              Sign in
            </Button>
          </form>

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

      {/* Right Panel - Decorative */}
      <div className="hidden lg:flex lg:flex-1 relative overflow-hidden">
        {/* Background */}
        <div className="absolute inset-0 bg-gradient-to-br from-blue-600 via-blue-500 to-blue-500" />
        
        {/* Pattern overlay */}
        <div className="absolute inset-0 opacity-10">
          <svg className="h-full w-full" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <pattern id="login-grid" width="32" height="32" patternUnits="userSpaceOnUse">
                <path d="M 32 0 L 0 0 0 32" fill="none" stroke="white" strokeWidth="1" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#login-grid)" />
          </svg>
        </div>

        {/* Content */}
        <div className="relative z-10 flex flex-col items-center justify-center p-12 text-white">
          <div className="max-w-md text-center">
            {/* Decorative vertebrae illustration */}
            <div className="mb-8 flex justify-center">
              <svg
                viewBox="0 0 120 200"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                className="w-32 h-48 opacity-90"
              >
                {/* Stylized spine/vertebrae */}
                {[0, 40, 80, 120, 160].map((y, i) => (
                  <g key={i} style={{ opacity: 1 - i * 0.15 }}>
                    <ellipse
                      cx="60"
                      cy={y + 15}
                      rx={25 - i * 2}
                      ry={12 - i}
                      fill="white"
                      fillOpacity="0.3"
                    />
                    <ellipse
                      cx="60"
                      cy={y + 15}
                      rx={15 - i}
                      ry={8 - i * 0.5}
                      fill="white"
                      fillOpacity="0.6"
                    />
                  </g>
                ))}
                {/* Connecting line */}
                <path
                  d="M60 15 Q65 50 60 55 Q55 90 60 95 Q65 130 60 135 Q55 170 60 175"
                  stroke="white"
                  strokeWidth="2"
                  strokeOpacity="0.4"
                  fill="none"
                />
              </svg>
            </div>

            <h2 className="text-3xl font-bold mb-4">
              Expert review for confident decisions
            </h2>
            <p className="text-lg text-blue-100 leading-relaxed">
              Join hundreds of healthcare providers using First Principles to ensure 
              spine surgery appropriateness through peer expertise.
            </p>

            {/* Testimonial */}
            <div className="mt-12 p-6 bg-white/10 rounded-2xl backdrop-blur-sm border border-white/20">
              <p className="text-blue-50 italic leading-relaxed">
                &ldquo;First Principles has transformed how we approach surgical 
                decision-making. The blinded review process gives us confidence 
                in our treatment plans.&rdquo;
              </p>
              <div className="mt-4 flex items-center justify-center gap-3">
                <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center text-white font-semibold">
                  MD
                </div>
                <div className="text-left">
                  <p className="font-medium text-white">Dr. Michael Davis</p>
                  <p className="text-sm text-blue-200">Spine Surgery, Metro Health</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

