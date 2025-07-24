import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { AlertTriangle, TrendingUp, TrendingDown, CheckCircle } from 'lucide-react';

interface PricingVarianceIndicatorProps {
  itemCode: string;
  masterPrice?: number;
  currentPrice?: number;
  tolerance?: number;
  showTooltip?: boolean;
}

export const PricingVarianceIndicator = ({
  itemCode,
  masterPrice,
  currentPrice,
  tolerance = 10,
  showTooltip = true
}: PricingVarianceIndicatorProps) => {
  if (!masterPrice || !currentPrice) {
    return null;
  }

  const variancePercentage = Math.abs((currentPrice - masterPrice) / masterPrice) * 100;
  const isWithinTolerance = variancePercentage <= tolerance;
  const isHigher = currentPrice > masterPrice;

  const getVarianceIcon = () => {
    if (isWithinTolerance) {
      return <CheckCircle className="h-3 w-3" />;
    }
    if (isHigher) {
      return <TrendingUp className="h-3 w-3" />;
    }
    return <TrendingDown className="h-3 w-3" />;
  };

  const getVarianceColor = () => {
    if (isWithinTolerance) return 'default';
    if (variancePercentage > tolerance * 3) return 'destructive';
    if (variancePercentage > tolerance * 2) return 'secondary';
    return 'outline';
  };

  const getVarianceText = () => {
    if (isWithinTolerance) return 'Within tolerance';
    return `${isHigher ? '+' : '-'}${variancePercentage.toFixed(1)}%`;
  };

  const indicator = (
    <Badge variant={getVarianceColor()} className="flex items-center gap-1 text-xs">
      {getVarianceIcon()}
      {getVarianceText()}
    </Badge>
  );

  if (!showTooltip) {
    return indicator;
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          {indicator}
        </TooltipTrigger>
        <TooltipContent>
          <div className="space-y-1">
            <p className="font-semibold">{itemCode} - Price Variance</p>
            <p>Master Price: ₹{masterPrice.toFixed(2)}</p>
            <p>Current Price: ₹{currentPrice.toFixed(2)}</p>
            <p>Tolerance: ±{tolerance}%</p>
            <p>Variance: {variancePercentage.toFixed(1)}%</p>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};