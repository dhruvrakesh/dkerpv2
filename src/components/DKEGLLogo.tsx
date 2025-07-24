import React from 'react';

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
    <div className={`${sizeClasses[size]} bg-primary rounded-lg flex items-center justify-center font-bold text-primary-foreground shadow-lg ${className}`}>
      <span className="font-inter tracking-tight">dk</span>
    </div>
  );
};

export default DKEGLLogo;