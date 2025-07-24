import React from 'react';
import { cn } from '@/lib/utils';

interface DKEGLLogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

export const DKEGLLogo: React.FC<DKEGLLogoProps> = ({ 
  className = "",
  size = 'md' 
}) => {
  const sizeClasses = {
    sm: 'w-8 h-8 text-xl',
    md: 'w-12 h-12 text-3xl',
    lg: 'w-16 h-16 text-4xl'
  };

  return (
    <div className={cn("flex items-center space-x-2", className)}>
      <div className="relative">
        {/* Hexagonal background with gradient */}
        <div className={sizeClasses[size]}>
          <div className="absolute inset-0 gradient-primary rounded-lg transform rotate-12 opacity-90"></div>
          <div className="absolute inset-1 bg-background rounded-lg transform rotate-12"></div>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="font-bold text-primary font-mono">DK</span>
          </div>
        </div>
      </div>
      <div className="flex flex-col">
        <span className="text-xl font-bold text-primary tracking-tight">DKEGL</span>
        <span className="text-xs text-muted-foreground tracking-wide uppercase">Enterprises</span>
      </div>
    </div>
  );
};

export default DKEGLLogo;