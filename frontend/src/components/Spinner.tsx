type SpinnerProps = {
  size?: "sm" | "md" | "lg";
  className?: string;
  label?: string;
};

const sizeClasses: Record<NonNullable<SpinnerProps["size"]>, string> = {
  sm: "h-4 w-4 border-2",
  md: "h-6 w-6 border-2",
  lg: "h-10 w-10 border-[3px]",
};

const Spinner = ({ size = "md", className = "", label = "Loading" }: SpinnerProps) => (
  <div className={`flex items-center justify-center ${className}`}>
    <div
      className={`animate-spin rounded-full border-action-primary border-t-transparent ${sizeClasses[size]}`}
      role="status"
      aria-label={label}
    />
  </div>
);

export default Spinner;
