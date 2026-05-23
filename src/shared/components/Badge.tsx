interface BadgeProps {
  color: string;
  label: string;
}

export const Badge = ({ color, label }: BadgeProps) => (
  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${color}`}>
    {label}
  </span>
);
