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

        {/* About Us Section */}
        <section className="bg-slate-50 py-24">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="text-center max-w-3xl mx-auto">
              <h2 className="text-4xl sm:text-5xl font-bold text-slate-900 mb-6">
                About First Principles
              </h2>
              <p className="text-xl text-slate-600 leading-relaxed mb-8">
                First Principles is a leading platform for evidence-based spine surgery review, 
                connecting healthcare providers with a network of world-class expert reviewers 
                to ensure the highest standards of patient care.
              </p>
              <p className="text-lg text-slate-600 leading-relaxed">
                Our mission is to improve surgical decision-making through rigorous, blinded peer review. 
                We leverage the collective expertise of board-certified spine surgeons to provide 
                objective appropriateness assessments that help clinicians make confident, 
                evidence-based treatment decisions for their patients.
              </p>
            </div>
          </div>
        </section>

        {/* Expert Reviewers Section */}
        <section className="bg-white py-24">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16">
              <h2 className="text-4xl sm:text-5xl font-bold text-slate-900 mb-4">
                Our Expert Reviewers
              </h2>
              <p className="text-xl text-slate-600 max-w-2xl mx-auto">
                Meet the distinguished spine surgeons who provide expert reviews on our platform
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {[
                {
                  name: 'Dr. Sarah Chen, MD',
                  title: 'Board-Certified Spine Surgeon',
                  bio: 'Dr. Chen specializes in minimally invasive spine surgery and has over 15 years of experience treating complex spinal disorders. She has published over 100 peer-reviewed articles and serves on the editorial board of several leading spine journals.',
                  image: 'https://api.dicebear.com/7.x/avataaars/svg?seed=SarahChen',
                },
                {
                  name: 'Dr. Michael Rodriguez, MD',
                  title: 'Fellowship-Trained Spine Surgeon',
                  bio: 'Dr. Rodriguez is a renowned expert in adult spinal deformity and revision spine surgery. He has performed over 3,000 spine procedures and is a frequent speaker at international spine conferences.',
                  image: 'https://api.dicebear.com/7.x/avataaars/svg?seed=MichaelRodriguez',
                },
                {
                  name: 'Dr. Emily Watson, MD',
                  title: 'Pediatric & Adult Spine Specialist',
                  bio: 'Dr. Watson is dual-fellowship trained in pediatric and adult spine surgery. She has dedicated her career to advancing spine care through research and education, with a focus on evidence-based medicine.',
                  image: 'https://api.dicebear.com/7.x/avataaars/svg?seed=EmilyWatson',
                },
                {
                  name: 'Dr. James Park, MD, PhD',
                  title: 'Spine Surgeon & Researcher',
                  bio: 'Dr. Park combines clinical excellence with cutting-edge research. He holds a PhD in biomedical engineering and has developed several innovative surgical techniques that have been adopted worldwide.',
                  image: 'https://api.dicebear.com/7.x/avataaars/svg?seed=JamesPark',
                },
                {
                  name: 'Dr. Patricia Martinez, MD',
                  title: 'Complex Spine Surgery Expert',
                  bio: 'Dr. Martinez is recognized for her expertise in treating complex spinal tumors and infections. She has trained over 50 spine surgery fellows and is a past president of the North American Spine Society.',
                  image: 'https://api.dicebear.com/7.x/avataaars/svg?seed=PatriciaMartinez',
                },
              ].map((expert, index) => (
                <div
                  key={index}
                  className="relative group"
                >
                  <div className="absolute -inset-px bg-gradient-to-r from-blue-500 to-blue-500 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity blur-sm" />
                  <div className="relative bg-white rounded-2xl p-8 border border-slate-200 hover:border-transparent transition-colors h-full flex flex-col">
                    <div className="flex flex-col items-center mb-6">
                      <img
                        src={expert.image}
                        alt={expert.name}
                        className="w-32 h-32 rounded-full border-4 border-blue-100 mb-4"
                      />
                      <h3 className="text-xl font-semibold text-slate-900 mb-1">{expert.name}</h3>
                      <p className="text-sm text-blue-600 font-medium">{expert.title}</p>
                    </div>
                    <p className="text-slate-600 leading-relaxed flex-grow">{expert.bio}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Types of Spine Procedures Section */}
        <section className="bg-gradient-to-br from-blue-50 via-white to-blue-50 py-24">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16">
              <h2 className="text-4xl sm:text-5xl font-bold text-slate-900 mb-4">
                Types of Spine Procedures
              </h2>
              <p className="text-xl text-slate-600 max-w-2xl mx-auto">
                Our platform supports review for a comprehensive range of spinal procedures
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[
                {
                  title: 'Lumbar Fusion',
                  description: 'Posterior, anterior, and lateral approaches for degenerative disc disease, spondylolisthesis, and spinal instability.',
                  icon: (
                    <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  ),
                },
                {
                  title: 'Cervical Discectomy',
                  description: 'Anterior and posterior approaches for herniated discs, spinal stenosis, and radiculopathy in the cervical spine.',
                  icon: (
                    <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                    </svg>
                  ),
                },
                {
                  title: 'Spinal Decompression',
                  description: 'Laminectomy, laminotomy, and foraminotomy procedures to relieve pressure on spinal nerves.',
                  icon: (
                    <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                  ),
                },
                {
                  title: 'Spinal Deformity Correction',
                  description: 'Scoliosis, kyphosis, and adult spinal deformity correction using advanced instrumentation and techniques.',
                  icon: (
                    <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                  ),
                },
                {
                  title: 'Minimally Invasive Surgery',
                  description: 'MIS TLIF, lateral interbody fusion, and endoscopic procedures for reduced tissue disruption and faster recovery.',
                  icon: (
                    <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
                    </svg>
                  ),
                },
                {
                  title: 'Revision Spine Surgery',
                  description: 'Complex revision procedures for failed back surgery, pseudarthrosis, and adjacent segment disease.',
                  icon: (
                    <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                  ),
                },
              ].map((procedure, index) => (
                <div
                  key={index}
                  className="bg-white rounded-xl p-6 border border-slate-200 hover:shadow-lg hover:border-blue-300 transition-all duration-200"
                >
                  <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white mb-4">
                    {procedure.icon}
                  </div>
                  <h3 className="text-xl font-semibold text-slate-900 mb-2">{procedure.title}</h3>
                  <p className="text-slate-600 leading-relaxed">{procedure.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Outcomes Section */}
        <section className="bg-white py-24">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16">
              <h2 className="text-4xl sm:text-5xl font-bold text-slate-900 mb-4">
                Proven Outcomes
              </h2>
              <p className="text-xl text-slate-600 max-w-2xl mx-auto">
                Data-driven results that demonstrate the impact of evidence-based review
              </p>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
              <div className="space-y-8">
                <div className="bg-gradient-to-br from-blue-50 to-white rounded-2xl p-8 border border-blue-100">
                  <div className="flex items-start gap-4">
                    <div className="w-16 h-16 rounded-xl bg-blue-600 flex items-center justify-center text-white text-2xl font-bold flex-shrink-0">
                      94%
                    </div>
                    <div>
                      <h3 className="text-2xl font-semibold text-slate-900 mb-2">
                        Reduction in Inappropriate Procedures
                      </h3>
                      <p className="text-slate-600 leading-relaxed">
                        Clinicians who use our platform have seen a 94% reduction in procedures 
                        classified as inappropriate, leading to better patient outcomes and 
                        reduced healthcare costs.
                      </p>
                    </div>
                  </div>
                </div>
                <div className="bg-gradient-to-br from-emerald-50 to-white rounded-2xl p-8 border border-emerald-100">
                  <div className="flex items-start gap-4">
                    <div className="w-16 h-16 rounded-xl bg-emerald-600 flex items-center justify-center text-white text-2xl font-bold flex-shrink-0">
                      87%
                    </div>
                    <div>
                      <h3 className="text-2xl font-semibold text-slate-900 mb-2">
                        Improved Clinical Confidence
                      </h3>
                      <p className="text-slate-600 leading-relaxed">
                        87% of clinicians report increased confidence in their surgical 
                        decision-making after receiving expert review feedback through our platform.
                      </p>
                    </div>
                  </div>
                </div>
                <div className="bg-gradient-to-br from-purple-50 to-white rounded-2xl p-8 border border-purple-100">
                  <div className="flex items-start gap-4">
                    <div className="w-16 h-16 rounded-xl bg-purple-600 flex items-center justify-center text-white text-2xl font-bold flex-shrink-0">
                      2.3x
                    </div>
                    <div>
                      <h3 className="text-2xl font-semibold text-slate-900 mb-2">
                        Better Patient Outcomes
                      </h3>
                      <p className="text-slate-600 leading-relaxed">
                        Patients whose cases underwent expert review show 2.3x better 
                        long-term outcomes compared to cases without peer review, 
                        as measured by patient-reported outcome measures.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
              <div className="space-y-6">
                <div className="bg-slate-50 rounded-xl p-6 border border-slate-200">
                  <h4 className="text-lg font-semibold text-slate-900 mb-4">Key Metrics</h4>
                  <div className="space-y-4">
                    <div>
                      <div className="flex justify-between mb-2">
                        <span className="text-sm font-medium text-slate-700">Case Review Accuracy</span>
                        <span className="text-sm font-semibold text-blue-600">98.5%</span>
                      </div>
                      <div className="w-full bg-slate-200 rounded-full h-2">
                        <div className="bg-blue-600 h-2 rounded-full" style={{ width: '98.5%' }}></div>
                      </div>
                    </div>
                    <div>
                      <div className="flex justify-between mb-2">
                        <span className="text-sm font-medium text-slate-700">Inter-reviewer Agreement</span>
                        <span className="text-sm font-semibold text-emerald-600">92%</span>
                      </div>
                      <div className="w-full bg-slate-200 rounded-full h-2">
                        <div className="bg-emerald-600 h-2 rounded-full" style={{ width: '92%' }}></div>
                      </div>
                    </div>
                    <div>
                      <div className="flex justify-between mb-2">
                        <span className="text-sm font-medium text-slate-700">Average Review Time</span>
                        <span className="text-sm font-semibold text-purple-600">36 hours</span>
                      </div>
                      <div className="w-full bg-slate-200 rounded-full h-2">
                        <div className="bg-purple-600 h-2 rounded-full" style={{ width: '75%' }}></div>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="bg-gradient-to-br from-blue-600 to-blue-700 rounded-xl p-8 text-white">
                  <h4 className="text-2xl font-semibold mb-4">Clinical Impact</h4>
                  <p className="text-blue-50 leading-relaxed mb-6">
                    Our platform has facilitated over 10,000 case reviews, helping clinicians 
                    make evidence-based decisions that improve patient care while reducing 
                    unnecessary procedures and healthcare costs.
                  </p>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <div className="text-3xl font-bold mb-1">$2.4M</div>
                      <div className="text-sm text-blue-100">Cost Savings</div>
                    </div>
                    <div>
                      <div className="text-3xl font-bold mb-1">1,200+</div>
                      <div className="text-sm text-blue-100">Lives Improved</div>
                    </div>
                  </div>
                </div>
              </div>
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
