'use client';

import Link from 'next/link';

interface LogoProps {
  size?: 'sm' | 'md' | 'lg';
  showText?: boolean;
  href?: string;
}

export function Logo({ size = 'md', showText = true, href = '/' }: LogoProps) {
  const sizes = {
    sm: { icon: 'w-7 h-7', text: 'text-lg' },
    md: { icon: 'w-9 h-9', text: 'text-xl' },
    lg: { icon: 'w-12 h-12', text: 'text-2xl' },
  };

  const content = (
    <div className="flex items-center gap-2.5">
      {/* Icon - Abstract spine/vertebrae representation */}
      <div className={`${sizes[size].icon} relative`}>
        <svg
          viewBox="0 0 40 40"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="w-full h-full"
        >
          {/* Background circle */}
          <circle cx="20" cy="20" r="18" className="fill-blue-600" />
          
          {/* Stylized vertebrae/spine design */}
          <path
            d="M20 8C20 8 14 12 14 16C14 18 16 19 20 19C24 19 26 18 26 16C26 12 20 8 20 8Z"
            className="fill-white/90"
          />
          <path
            d="M20 32C20 32 14 28 14 24C14 22 16 21 20 21C24 21 26 22 26 24C26 28 20 32 20 32Z"
            className="fill-white/90"
          />
          <circle cx="20" cy="20" r="2.5" className="fill-white" />
          
          {/* Connecting line */}
          <path
            d="M20 12V28"
            stroke="white"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeDasharray="2 2"
            className="opacity-60"
          />
        </svg>
      </div>
      
      {showText && (
        <div className="flex flex-col leading-none">
          <span className={`font-semibold tracking-tight text-slate-900 ${sizes[size].text}`}>
            First Principles
          </span>
          {size === 'lg' && (
            <span className="text-xs text-slate-500 mt-0.5 tracking-wide">
              SPINE SURGERY REVIEW
            </span>
          )}
        </div>
      )}
    </div>
  );

  if (href) {
    return (
      <Link href={href} className="hover:opacity-90 transition-opacity">
        {content}
      </Link>
    );
  }

  return content;
}

