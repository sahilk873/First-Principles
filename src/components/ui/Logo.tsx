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
    <div className="flex items-center gap-3">
      {/* Icon - Clean, minimal system structure representation */}
      <div className={`${sizes[size].icon} relative`}>
        <svg
          viewBox="0 0 40 40"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="w-full h-full"
        >
          {/* Clean geometric structure suggesting systems and convergence */}
          <rect x="4" y="4" width="32" height="32" rx="4" className="fill-[#0E1A26]" />
          
          {/* Layered structure - represents systems thinking */}
          <path
            d="M12 12H28V14H12V12Z"
            className="fill-[#2FA4A9]"
          />
          <path
            d="M12 18H28V20H12V18Z"
            className="fill-[#1ECAD3]"
          />
          <path
            d="M12 24H28V26H12V24Z"
            className="fill-[#4A6FA5]"
          />
          
          {/* Vertical connector showing integration */}
          <rect x="19" y="10" width="2" height="22" className="fill-white opacity-20" />
        </svg>
      </div>
      
      {showText && (
        <div className="flex flex-col leading-none">
          <span className={`font-semibold tracking-tight text-[#0E1A26] ${sizes[size].text}`}>
            First Principles
          </span>
          {size === 'lg' && (
            <span className="text-xs text-[#3A4754] mt-0.5 tracking-wide font-medium">
              HEALTHCARE INTELLIGENCE
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

