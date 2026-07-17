import React from 'react';
import type { LucideIcon } from 'lucide-react';

interface EmptyStateProps {
  title: string;
  description: string;
  Icon: LucideIcon;
  actionLabel?: string;
  onAction?: () => void;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  title,
  description,
  Icon,
  actionLabel,
  onAction,
}) => {
  return (
    <div className="flex flex-col items-center justify-center text-center p-8 bg-brand-surface border border-dashed border-brand-border rounded-[18px] my-4">
      <div className="p-4 bg-light-blue text-primary rounded-full mb-4">
        <Icon size={28} className="stroke-[1.5]" />
      </div>
      <h3 className="text-text-primary text-base font-semibold mb-1">{title}</h3>
      <p className="text-text-secondary text-sm max-w-[260px] leading-relaxed mb-5">
        {description}
      </p>
      {actionLabel && onAction && (
        <button
          onClick={onAction}
          className="ripple-btn px-5 py-2.5 bg-primary text-white text-sm font-medium rounded-full active:scale-95 transition-transform duration-100 shadow-sm shadow-primary/20"
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
};
