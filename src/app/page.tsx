import Link from 'next/link';
import { Navbar } from '@/components/layout/Navbar';
import { Button } from '@/components/ui/Button';

export default function LandingPage() {
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />

      {/* Hero Section */}
      <main className="flex-1">
        <div className="relative overflow-hidden">
          {/* Background Pattern */}
          <div className="absolute inset-0 -z-10">
            <div className="absolute inset-0 bg-gradient-to-br from-blue-50 via-white to-blue-50" />
            <svg
              className="absolute inset-0 h-full w-full opacity-[0.03]"
              xmlns="http://www.w3.org/2000/svg"
            >
              <defs>
                <pattern
                  id="grid"
                  width="40"
                  height="40"
                  patternUnits="userSpaceOnUse"
                >
                  <path
                    d="M 40 0 L 0 0 0 40"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1"
                    className="text-blue-900"
                  />
                </pattern>
              </defs>
              <rect width="100%" height="100%" fill="url(#grid)" />
            </svg>
            {/* Gradient orbs */}
            <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-200 rounded-full filter blur-3xl opacity-20 animate-pulse" />
            <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-blue-200 rounded-full filter blur-3xl opacity-20 animate-pulse" style={{ animationDelay: '1s' }} />
          </div>

          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-24 sm:py-32">
            <div className="text-center max-w-4xl mx-auto">
              {/* Badge */}
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-100/80 text-blue-700 text-sm font-medium mb-8 animate-fade-in backdrop-blur-sm border border-blue-200/50">
                <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
                Trusted by leading healthcare institutions
              </div>

              {/* Headline */}
              <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold text-slate-900 tracking-tight leading-[1.1] animate-slide-up">
                Evidence-based
                <br />
                <span className="bg-gradient-to-r from-blue-600 via-blue-500 to-blue-500 bg-clip-text text-transparent">
                  spine surgery review
                </span>
              </h1>

              {/* Subheadline */}
              <p className="mt-8 text-xl text-slate-600 max-w-2xl mx-auto leading-relaxed animate-slide-up delay-100">
                Submit cases for blinded expert review. Get objective appropriateness scores
                backed by peer expertise. Make confident treatment decisions.
              </p>

              {/* CTA Buttons */}
              <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4 animate-slide-up delay-200">
                <Link href="/login">
                  <Button size="lg" variant="primary">
                    Start submitting cases
                    <svg
                      className="w-5 h-5"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M13 7l5 5m0 0l-5 5m5-5H6"
                      />
                    </svg>
                  </Button>
                </Link>
                <Button size="lg" variant="secondary">
                  Learn more
                </Button>
              </div>
            </div>

            {/* Features Grid */}
            <div className="mt-24 grid grid-cols-1 md:grid-cols-3 gap-8 animate-slide-up delay-300">
              {[
                {
                  icon: (
                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                      />
                    </svg>
                  ),
                  title: 'Blinded Review',
                  description:
                    'Expert reviewers evaluate cases without knowing the submitter, ensuring unbiased assessments.',
                },
                {
                  icon: (
                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                      />
                    </svg>
                  ),
                  title: 'Appropriateness Scoring',
                  description:
                    'Aggregated scores classify procedures as appropriate, uncertain, or inappropriate based on clinical criteria.',
                },
                {
                  icon: (
                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                      />
                    </svg>
                  ),
                  title: 'HIPAA Compliant',
                  description:
                    'Patient data is de-identified and protected with enterprise-grade security and audit trails.',
                },
              ].map((feature, index) => (
                <div
                  key={index}
                  className="relative group"
                >
                  <div className="absolute -inset-px bg-gradient-to-r from-blue-500 to-blue-500 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity blur-sm" />
                  <div className="relative bg-white rounded-2xl p-8 border border-slate-200 hover:border-transparent transition-colors h-full">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-blue-500 flex items-center justify-center text-white mb-5">
                      {feature.icon}
                    </div>
                    <h3 className="text-lg font-semibold text-slate-900 mb-2">{feature.title}</h3>
                    <p className="text-slate-600 leading-relaxed">{feature.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Stats Section */}
        <section className="border-y border-slate-200 bg-white">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-16">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
              {[
                { value: '10,000+', label: 'Cases Reviewed' },
                { value: '500+', label: 'Expert Reviewers' },
                { value: '98%', label: 'Provider Satisfaction' },
                { value: '<48h', label: 'Average Turnaround' },
              ].map((stat, index) => (
                <div key={index} className="text-center">
                  <div className="text-3xl sm:text-4xl font-bold text-blue-600">{stat.value}</div>
                  <div className="mt-2 text-sm text-slate-600">{stat.label}</div>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="bg-slate-900 text-slate-400">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8">
                <svg viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <circle cx="20" cy="20" r="18" className="fill-blue-600" />
                  <path
                    d="M20 8C20 8 14 12 14 16C14 18 16 19 20 19C24 19 26 18 26 16C26 12 20 8 20 8Z"
                    className="fill-white/90"
                  />
                  <path
                    d="M20 32C20 32 14 28 14 24C14 22 16 21 20 21C24 21 26 22 26 24C26 28 20 32 20 32Z"
                    className="fill-white/90"
                  />
                  <circle cx="20" cy="20" r="2.5" className="fill-white" />
                </svg>
              </div>
              <span className="text-white font-semibold">First Principles</span>
            </div>
            <p className="text-sm">
              © {new Date().getFullYear()} First Principles. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
