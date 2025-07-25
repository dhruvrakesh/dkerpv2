import React from 'react';
import { cn } from '@/lib/utils';
import { Loader2, RefreshCw, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface EnhancedLoadingProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'spinner' | 'pulse' | 'dots';
  message?: string;
}

export const EnhancedLoading: React.FC<EnhancedLoadingProps> = ({ 
  className, 
  size = 'md',
  variant = 'spinner',
  message = 'Loading...'
}) => {
  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-8 w-8', 
    lg: 'h-12 w-12'
  };

  const renderLoader = () => {
    switch (variant) {
      case 'pulse':
        return (
          <div className="flex space-x-1">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className={cn(
                  'bg-primary rounded-full animate-pulse',
                  size === 'sm' ? 'h-2 w-2' : size === 'md' ? 'h-3 w-3' : 'h-4 w-4'
                )}
                style={{ animationDelay: `${i * 200}ms` }}
              />
            ))}
          </div>
        );
      case 'dots':
        return (
          <div className="flex space-x-1">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className={cn(
                  'bg-primary rounded-full',
                  size === 'sm' ? 'h-1 w-1' : size === 'md' ? 'h-2 w-2' : 'h-3 w-3'
                )}
                style={{
                  animation: `bounce 1.4s ease-in-out ${i * 0.16}s infinite both`
                }}
              />
            ))}
          </div>
        );
      default:
        return (
          <Loader2 
            className={cn(
              'animate-spin text-primary',
              sizeClasses[size]
            )} 
          />
        );
    }
  };

  return (
    <div className={cn('flex items-center justify-center min-h-[100px]', className)}>
      <div className="text-center space-y-3">
        {renderLoader()}
        <p className="text-sm text-muted-foreground fade-in">{message}</p>
      </div>
    </div>
  );
};

interface SmartErrorBoundaryProps {
  message?: string;
  onRetry?: () => void;
  className?: string;
  showDetails?: boolean;
  error?: Error;
}

export const SmartErrorBoundary: React.FC<SmartErrorBoundaryProps> = ({ 
  message = 'Something went wrong', 
  onRetry,
  className,
  showDetails = false,
  error
}) => (
  <div className={cn('flex items-center justify-center min-h-[200px] p-6', className)}>
    <div className="text-center space-y-4 max-w-md">
      <div className="relative">
        <AlertCircle className="h-12 w-12 text-destructive mx-auto" />
        <div className="absolute inset-0 bg-destructive/20 rounded-full blur-xl" />
      </div>
      
      <div className="space-y-2">
        <h3 className="text-lg font-semibold text-foreground">Oops! Something went wrong</h3>
        <p className="text-sm text-muted-foreground">{message}</p>
        
        {showDetails && error && (
          <details className="mt-4 text-left">
            <summary className="text-xs text-muted-foreground cursor-pointer hover:text-foreground transition-colors">
              Technical Details
            </summary>
            <pre className="mt-2 p-2 bg-muted rounded text-xs text-muted-foreground overflow-auto max-h-32">
              {error.message}
            </pre>
          </details>
        )}
      </div>
      
      {onRetry && (
        <Button 
          onClick={onRetry}
          variant="outline"
          size="sm"
          className="gap-2"
        >
          <RefreshCw className="h-4 w-4" />
          Try Again
        </Button>
      )}
    </div>
  </div>
);

interface SkeletonLoaderProps {
  className?: string;
  variant?: 'card' | 'text' | 'avatar' | 'table';
  count?: number;
}

export const SkeletonLoader: React.FC<SkeletonLoaderProps> = ({
  className,
  variant = 'card',
  count = 1
}) => {
  const renderSkeleton = (index: number) => {
    switch (variant) {
      case 'text':
        return (
          <div key={index} className="space-y-2">
            <div className="h-4 bg-muted rounded animate-pulse" />
            <div className="h-3 bg-muted rounded w-3/4 animate-pulse" />
          </div>
        );
      case 'avatar':
        return (
          <div key={index} className="flex items-center space-x-3">
            <div className="h-10 w-10 bg-muted rounded-full animate-pulse" />
            <div className="space-y-2 flex-1">
              <div className="h-3 bg-muted rounded animate-pulse" />
              <div className="h-2 bg-muted rounded w-2/3 animate-pulse" />
            </div>
          </div>
        );
      case 'table':
        return (
          <div key={index} className="space-y-2">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="flex space-x-4">
                <div className="h-8 bg-muted rounded flex-1 animate-pulse" />
                <div className="h-8 bg-muted rounded w-20 animate-pulse" />
                <div className="h-8 bg-muted rounded w-16 animate-pulse" />
              </div>
            ))}
          </div>
        );
      default:
        return (
          <div key={index} className="glass-card p-6 space-y-4">
            <div className="h-6 bg-muted rounded animate-pulse" />
            <div className="h-4 bg-muted rounded w-3/4 animate-pulse" />
            <div className="h-20 bg-muted rounded animate-pulse" />
          </div>
        );
    }
  };

  return (
    <div className={cn('space-y-4', className)}>
      {[...Array(count)].map((_, index) => renderSkeleton(index))}
    </div>
  );
};