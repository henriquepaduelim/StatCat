import { PropsWithChildren } from "react";
import { Navigate, useLocation } from "react-router-dom";

import { useAuthStore } from "../stores/useAuthStore";
import { useAuthBootstrap } from "../hooks/useAuthBootstrap";
import { useTranslation } from "../i18n/useTranslation";

const RequireAuth = ({ children }: PropsWithChildren): JSX.Element => {
  useAuthBootstrap();

  const { token, isInitialized } = useAuthStore((state) => ({
    token: state.token,
    isInitialized: state.isInitialized,
  }));
  const location = useLocation();
  const t = useTranslation();

  if (!isInitialized) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background text-muted">
        {t.common.loading}...
      </div>
    );
  }

  if (!token) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <>{children}</>;
};

export default RequireAuth;
