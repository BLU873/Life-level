export default function Skeleton({ className = '', ...props }) {
  return (
    <div
      className={`animate-pulse rounded-lg bg-surface-2 ${className}`}
      {...props}
    />
  );
}