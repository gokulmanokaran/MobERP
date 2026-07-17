import React from 'react';

interface SkeletonProps {
  className?: string;
  style?: React.CSSProperties;
}

export const Skeleton: React.FC<SkeletonProps> = ({ className = '', style }) => {
  return (
    <div
      className={`animate-pulse bg-slate-200 rounded-md ${className}`}
      style={{ animationDuration: '1.2s', ...style }}
    />
  );
};

export const CardSkeleton: React.FC = () => {
  return (
    <div className="p-4 bg-brand-surface border border-brand-border rounded-[18px] space-y-3">
      <Skeleton className="h-4 w-2/3" />
      <Skeleton className="h-7 w-1/2" />
      <div className="flex justify-between items-center pt-2">
        <Skeleton className="h-3 w-1/3" />
        <Skeleton className="h-3 w-1/4" />
      </div>
    </div>
  );
};

export const ListSkeleton: React.FC = () => {
  return (
    <div className="space-y-3">
      {[1, 2, 3, 4].map((i) => (
        <div key={i} className="flex items-center justify-between p-3 border-b border-brand-border/40">
          <div className="flex items-center space-x-3 w-2/3">
            <Skeleton className="h-10 w-10 rounded-full shrink-0" />
            <div className="space-y-2 w-full">
              <Skeleton className="h-4 w-4/5" />
              <Skeleton className="h-3 w-1/2" />
            </div>
          </div>
          <Skeleton className="h-4 w-1/5" />
        </div>
      ))}
    </div>
  );
};

export const ChartSkeleton: React.FC = () => {
  return (
    <div className="p-4 bg-white border border-brand-border rounded-[18px] space-y-4">
      <div className="flex justify-between items-center">
        <Skeleton className="h-5 w-1/3" />
        <Skeleton className="h-4 w-1/4" />
      </div>
      <div className="h-40 flex items-end justify-between space-x-2 pt-4">
        {[40, 70, 50, 90, 60, 80, 45, 75, 55, 85].map((h, i) => (
          <Skeleton key={i} className="w-full rounded-t-md" style={{ height: `${h}%` }} />
        ))}
      </div>
      <div className="flex justify-between text-xs text-text-secondary">
        <Skeleton className="h-3 w-10" />
        <Skeleton className="h-3 w-10" />
        <Skeleton className="h-3 w-10" />
      </div>
    </div>
  );
};
