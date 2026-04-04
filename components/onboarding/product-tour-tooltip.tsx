'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils';

interface ProductTourTooltipProps {
  title: string;
  description: string;
  position?: 'top' | 'bottom' | 'left' | 'right';
  children: React.ReactNode;
  className?: string;
}

const positionStyles = {
  top: 'bottom-full left-1/2 -translate-x-1/2 mb-3',
  bottom: 'top-full left-1/2 -translate-x-1/2 mt-3',
  left: 'right-full top-1/2 -translate-y-1/2 mr-3',
  right: 'left-full top-1/2 -translate-y-1/2 ml-3',
};

const arrowStyles = {
  top: 'top-full left-1/2 -translate-x-1/2 border-t-foreground border-x-transparent border-b-transparent',
  bottom:
    'bottom-full left-1/2 -translate-x-1/2 border-b-foreground border-x-transparent border-t-transparent',
  left: 'left-full top-1/2 -translate-y-1/2 border-l-foreground border-y-transparent border-r-transparent',
  right:
    'right-full top-1/2 -translate-y-1/2 border-r-foreground border-y-transparent border-l-transparent',
};

export function ProductTourTooltip({
  title,
  description,
  position = 'top',
  children,
  className,
}: ProductTourTooltipProps) {
  const [isVisible, setIsVisible] = useState(false);

  return (
    <div
      className={cn('relative inline-flex items-center', className)}
      onMouseEnter={() => setIsVisible(true)}
      onMouseLeave={() => setIsVisible(false)}
    >
      {children}

      {/* Pulsing indicator dot */}
      <span className="relative ml-1.5 flex h-3 w-3 cursor-pointer">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary/40 duration-[1500ms]" />
        <span className="relative inline-flex h-3 w-3 rounded-full bg-primary/70" />
      </span>

      {/* Tooltip */}
      {isVisible && (
        <div
          className={cn(
            'absolute z-50 w-56 rounded-xl bg-foreground px-4 py-3 shadow-lg',
            'animate-in fade-in-0 zoom-in-95 duration-200',
            positionStyles[position]
          )}
          role="tooltip"
        >
          {/* Arrow */}
          <span
            className={cn(
              'absolute h-0 w-0 border-[5px]',
              arrowStyles[position]
            )}
          />
          <p className="text-xs font-semibold text-background tracking-tight">
            {title}
          </p>
          <p className="mt-1 text-[11px] leading-relaxed text-background/70">
            {description}
          </p>
        </div>
      )}
    </div>
  );
}
