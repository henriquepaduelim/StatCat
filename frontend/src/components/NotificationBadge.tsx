interface BadgeProps {
  count: number;
  className?: string;
}

const NotificationBadge = ({ count, className = "" }: BadgeProps) => {
  if (count === 0) return null;

  return (
    <span className={`inline-flex items-center justify-center h-5 w-5 text-xs font-medium text-white bg-red-500 rounded-full ${className}`}>
      {count > 99 ? "99+" : count}
    </span>
  );
};

export default NotificationBadge;
