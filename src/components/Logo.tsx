import React, { useId } from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function Logo({ className, ...props }: React.SVGProps<SVGSVGElement>) {
  const gradientId = useId();

  return (
    <svg
      viewBox="0 0 1024 1024"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={twMerge(clsx('h-8 w-8', className))}
      aria-hidden={props['aria-label'] ? undefined : true}
      {...props}
    >
      <defs>
        <linearGradient id={gradientId} x1="244" y1="278" x2="778" y2="758" gradientUnits="userSpaceOnUse">
          <stop stopColor="#28D7FF" />
          <stop offset="0.48" stopColor="#5A83FF" />
          <stop offset="1" stopColor="#C45CFF" />
        </linearGradient>
      </defs>
      <path
        d="M244 314 474 730c17 31 59 31 76 0l230-416"
        stroke={`url(#${gradientId})`}
        strokeWidth="92"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M337 322 495 609c7 13 27 13 34 0l158-287"
        stroke="currentColor"
        strokeOpacity=".9"
        strokeWidth="22"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="512" cy="744" r="17" fill="#9C6CFF" />
    </svg>
  );
}
