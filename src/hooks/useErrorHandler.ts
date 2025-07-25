import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useDKEGLAuth } from '@/hooks/useDKEGLAuth';

interface ErrorLogEntry {
  error_type: string;
  error_code?: string;
  error_message: string;
  stack_trace?: string;
  context?: Record<string, any>;
  severity: 'low' | 'medium' | 'high' | 'critical';
}

interface RetryConfig {
  maxRetries: number;
  baseDelay: number;
  maxDelay: number;
  exponentialBase: number;
}

export const useErrorHandler = () => {
  const { toast } = useToast();
  const { organization } = useDKEGLAuth();
  const [isRetrying, setIsRetrying] = useState(false);

  // Log error to database
  const logError = useCallback(async (errorData: ErrorLogEntry) => {
    try {
      if (!organization?.id) return;

      await supabase
        .from('dkegl_error_log')
        .insert({
          organization_id: organization.id,
          ...errorData,
        });
    } catch (error) {
      console.error('Failed to log error:', error);
    }
  }, [organization?.id]);

  // Exponential backoff retry mechanism
  const withRetry = useCallback(async <T>(
    operation: () => Promise<T>,
    config: RetryConfig = {
      maxRetries: 3,
      baseDelay: 1000,
      maxDelay: 10000,
      exponentialBase: 2
    }
  ): Promise<T> => {
    let lastError: Error;
    
    for (let attempt = 0; attempt <= config.maxRetries; attempt++) {
      try {
        if (attempt > 0) {
          setIsRetrying(true);
          const delay = Math.min(
            config.baseDelay * Math.pow(config.exponentialBase, attempt - 1),
            config.maxDelay
          );
          await new Promise(resolve => setTimeout(resolve, delay));
        }
        
        const result = await operation();
        if (attempt > 0) {
          setIsRetrying(false);
        }
        return result;
      } catch (error) {
        lastError = error as Error;
        
        if (attempt === config.maxRetries) {
          setIsRetrying(false);
          
          // Log the final error
          await logError({
            error_type: 'operation_failed',
            error_message: lastError.message,
            stack_trace: lastError.stack,
            context: {
              attempts: attempt + 1,
              operation: operation.name || 'anonymous',
            },
            severity: 'high',
          });
          
          throw lastError;
        }
      }
    }
    
    throw lastError!;
  }, [logError]);

  // Circuit breaker pattern
  const circuitBreaker = useCallback((
    operation: () => Promise<any>,
    failureThreshold: number = 5,
    recoveryTime: number = 60000
  ) => {
    let failureCount = 0;
    let lastFailureTime = 0;
    let state: 'closed' | 'open' | 'half-open' = 'closed';

    return async () => {
      const now = Date.now();

      if (state === 'open') {
        if (now - lastFailureTime >= recoveryTime) {
          state = 'half-open';
        } else {
          throw new Error('Circuit breaker is open');
        }
      }

      try {
        const result = await operation();
        
        if (state === 'half-open') {
          state = 'closed';
          failureCount = 0;
        }
        
        return result;
      } catch (error) {
        failureCount++;
        lastFailureTime = now;
        
        if (failureCount >= failureThreshold) {
          state = 'open';
        }
        
        throw error;
      }
    };
  }, []);

  // Error boundary handler
  const handleError = useCallback(async (
    error: Error,
    context?: Record<string, any>,
    showToast: boolean = true
  ) => {
    // Determine severity based on error type
    let severity: 'low' | 'medium' | 'high' | 'critical' = 'medium';
    
    if (error.message.toLowerCase().includes('network')) {
      severity = 'high';
    } else if (error.message.toLowerCase().includes('auth')) {
      severity = 'critical';
    } else if (error.message.toLowerCase().includes('database')) {
      severity = 'high';
    }

    // Log the error
    await logError({
      error_type: error.constructor.name,
      error_message: error.message,
      stack_trace: error.stack,
      context,
      severity,
    });

    // Show user-friendly error message
    if (showToast) {
      toast({
        title: "Error",
        description: getErrorMessage(error),
        variant: "destructive",
      });
    }
  }, [logError, toast]);

  // Get user-friendly error message
  const getErrorMessage = (error: Error): string => {
    if (error.message.includes('network')) {
      return 'Network connection issue. Please check your internet connection.';
    } else if (error.message.includes('timeout')) {
      return 'Request timed out. Please try again.';
    } else if (error.message.includes('unauthorized')) {
      return 'You are not authorized to perform this action.';
    } else if (error.message.includes('not found')) {
      return 'The requested resource was not found.';
    } else {
      return 'An unexpected error occurred. Please try again.';
    }
  };

  return {
    logError,
    withRetry,
    circuitBreaker,
    handleError,
    isRetrying,
  };
};