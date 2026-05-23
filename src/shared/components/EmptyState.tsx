import { PackageOpen } from 'lucide-react';

interface EmptyStateProps {
  message: string;
}

export const EmptyState = ({ message }: EmptyStateProps) => (
  <div className="flex flex-col items-center justify-center py-16 text-slate-400">
    <PackageOpen size={48} strokeWidth={1.5} />
    <p className="mt-4 text-sm">{message}</p>
  </div>
);
