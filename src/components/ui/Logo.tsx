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
      {/* Icon - Professional medical spine representation */}
      <div className={`${sizes[size].icon} relative`}>
        <svg
          viewBox="0 0 40 40"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="w-full h-full"
        >
          {/* Background with medical gradient */}
          <circle cx="20" cy="20" r="18" className="fill-teal-600" />

          {/* Enhanced spine design with multiple vertebrae */}
          {[0, 8, 16, 24, 32].map((y, i) => (
            <g key={i} className={i === 2 ? 'opacity-100' : 'opacity-80'}>
              <ellipse
                cx="20"
                cy={y + 6}
                rx={i === 2 ? 6 : 4}
                ry={i === 2 ? 3 : 2}
                className="fill-white"
              />
            </g>
          ))}

          {/* Central medical cross */}
          <path
            d="M18 16H22M20 14V18"
            stroke="white"
            strokeWidth="1.5"
            strokeLinecap="round"
            className="opacity-90"
          />

          {/* Connecting spine line */}
          <path
            d="M20 6V34"
            stroke="white"
            strokeWidth="1.5"
            strokeLinecap="round"
            className="opacity-70"
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

