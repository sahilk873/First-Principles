'use client';

import { cn } from '@/lib/utils';

interface MedicalIconProps {
  name: keyof typeof medicalIcons;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

const sizes = {
  sm: 'w-4 h-4',
  md: 'w-5 h-5',
  lg: 'w-6 h-6',
};

export const medicalIcons = {
  stethoscope: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M4.8 2.3A.3.3 0 1 0 5 2H4a2 2 0 0 0-2 2v5a6 6 0 0 0 6 6v0a4 4 0 0 0 8 0v0a6 6 0 0 0 6-6V4a2 2 0 0 0-2-2h-1a.3.3 0 1 0 .2.3" />
      <path d="M8 15v1a6 6 0 0 0 6 6v0a6 6 0 0 0 6-6v-4" />
      <circle cx="20" cy="10" r="2" />
    </svg>
  ),
  heart: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
    </svg>
  ),
  spine: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2v20" />
      <circle cx="12" cy="6" r="2" />
      <circle cx="12" cy="12" r="2" />
      <circle cx="12" cy="18" r="2" />
      <path d="M8 6h8" />
      <path d="M8 12h8" />
      <path d="M8 18h8" />
    </svg>
  ),
  clipboard: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
      <path d="M16 2H8a2 2 0 0 0-2 2v0a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2v0a2 2 0 0 0-2-2z" />
      <path d="M9 12h6" />
      <path d="M9 16h6" />
    </svg>
  ),
  syringe: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 2l4 4" />
      <path d="M17 7l3-3" />
      <path d="M19 9l-2-2" />
      <path d="M2 11l10 10" />
      <path d="M5 13l4 4" />
      <path d="M14 7l-9 9" />
      <path d="M10 9l-4 4" />
    </svg>
  ),
  pill: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M10.5 20.5h3l.5-.5v-9a1 1 0 0 0-1-1h-2a1 1 0 0 0-1 1v9l.5.5z" />
      <path d="M13.5 9.5h-3l-.5-.5v-2a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v2l-.5.5z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  ),
  microscope: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 18h8" />
      <path d="M3 22h18" />
      <path d="M14 22a7 7 0 1 0 0-14h4a7 7 0 1 1 0 14" />
      <path d="M9 14l2 2 4-4" />
      <path d="M9 9h6" />
      <path d="M9 12h3" />
    </svg>
  ),
  thermometer: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 14.76V3.5a2.5 2.5 0 0 0-5 0v11.26a2 2 0 1 0 4 0z" />
      <path d="M12 21.5V14" />
      <circle cx="12" cy="14" r="2" />
    </svg>
  ),
  brain: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M9.5 2a2.5 2.5 0 0 1 5 0v.5c0 .5.5.5 1 .5a2.5 2.5 0 0 1 0 5c-.5 0-1 0-1 .5V9a2.5 2.5 0 0 1-5 0V8c0-.5-.5-.5-1-.5a2.5 2.5 0 0 1 0-5c.5 0 1 0 1-.5V2z" />
      <path d="M7 15.5a2.5 2.5 0 0 1 5 0v.5c0 .5.5.5 1 .5a2.5 2.5 0 0 1 0 5c-.5 0-1 0-1 .5V23a2.5 2.5 0 0 1-5 0v-.5c0-.5-.5-.5-1-.5a2.5 2.5 0 0 1 0-5c.5 0 1 0 1-.5v-.5z" />
      <path d="M17 15.5a2.5 2.5 0 0 0-5 0v.5c0 .5-.5.5-1 .5a2.5 2.5 0 0 0 0 5c.5 0 1 0 1 .5V23a2.5 2.5 0 0 0 5 0v-.5c0-.5.5-.5 1-.5a2.5 2.5 0 0 0 0-5c-.5 0-1 0-1-.5v-.5z" />
    </svg>
  ),
  activity: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
    </svg>
  ),
  shield: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    </svg>
  ),
  checkCircle: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
      <polyline points="22,4 12,14.01 9,11.01" />
    </svg>
  ),
  alertTriangle: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
      <line x1="12" y1="9" x2="12" y2="13" />
      <line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  ),
  info: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <path d="M12 16v-4" />
      <path d="M12 8h.01" />
    </svg>
  ),
} as const;

export function MedicalIcon({ name, className, size = 'md' }: MedicalIconProps) {
  const icon = medicalIcons[name];
  if (!icon) return null;

  return (
    <div className={cn(sizes[size], className)}>
      {icon}
    </div>
  );
}

// Export individual icon components for convenience
export const StethoscopeIcon = (props: Omit<MedicalIconProps, 'name'>) => (
  <MedicalIcon name="stethoscope" {...props} />
);

export const HeartIcon = (props: Omit<MedicalIconProps, 'name'>) => (
  <MedicalIcon name="heart" {...props} />
);

export const SpineIcon = (props: Omit<MedicalIconProps, 'name'>) => (
  <MedicalIcon name="spine" {...props} />
);

export const ClipboardIcon = (props: Omit<MedicalIconProps, 'name'>) => (
  <MedicalIcon name="clipboard" {...props} />
);

export const SyringeIcon = (props: Omit<MedicalIconProps, 'name'>) => (
  <MedicalIcon name="syringe" {...props} />
);

export const PillIcon = (props: Omit<MedicalIconProps, 'name'>) => (
  <MedicalIcon name="pill" {...props} />
);

export const MicroscopeIcon = (props: Omit<MedicalIconProps, 'name'>) => (
  <MedicalIcon name="microscope" {...props} />
);

export const ThermometerIcon = (props: Omit<MedicalIconProps, 'name'>) => (
  <MedicalIcon name="thermometer" {...props} />
);

export const BrainIcon = (props: Omit<MedicalIconProps, 'name'>) => (
  <MedicalIcon name="brain" {...props} />
);

export const ActivityIcon = (props: Omit<MedicalIconProps, 'name'>) => (
  <MedicalIcon name="activity" {...props} />
);

export const ShieldIcon = (props: Omit<MedicalIconProps, 'name'>) => (
  <MedicalIcon name="shield" {...props} />
);

export const CheckCircleIcon = (props: Omit<MedicalIconProps, 'name'>) => (
  <MedicalIcon name="checkCircle" {...props} />
);

export const AlertTriangleIcon = (props: Omit<MedicalIconProps, 'name'>) => (
  <MedicalIcon name="alertTriangle" {...props} />
);

export const InfoIcon = (props: Omit<MedicalIconProps, 'name'>) => (
  <MedicalIcon name="info" {...props} />
);
