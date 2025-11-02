import { useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faEye, faEyeSlash } from "@fortawesome/free-solid-svg-icons";

interface PasswordInputProps {
  id?: string;
  name?: string;
  value: string;
  onChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  placeholder?: string;
  autoComplete?: string;
  required?: boolean;
  className?: string;
}

const PasswordInput = ({
  id,
  name,
  value,
  onChange,
  placeholder = "••••••••",
  autoComplete = "password",
  required = false,
  className = "",
}: PasswordInputProps) => {
  const [showPassword, setShowPassword] = useState(false);

  return (
    <div className="relative">
      <input
        id={id}
        type={showPassword ? "text" : "password"}
        name={name}
        autoComplete={autoComplete}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        required={required}
        className={`w-full rounded-md border border-gray-300 bg-gray-50 px-3 py-2 pr-10 text-gray-900 placeholder-gray-500 transition-colors focus:border-action-primary focus:outline-none focus:ring-1 focus:ring-action-primary ${className}`}
      />
      <button
        type="button"
        onClick={() => setShowPassword(!showPassword)}
        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 transition-colors"
        aria-label={showPassword ? "Hide password" : "Show password"}
      >
        <FontAwesomeIcon icon={showPassword ? faEyeSlash : faEye} className="text-sm" />
      </button>
    </div>
  );
};

export default PasswordInput;
