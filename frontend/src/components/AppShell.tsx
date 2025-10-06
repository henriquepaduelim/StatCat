import { PropsWithChildren } from "react";
import { NavLink } from "react-router-dom";

const linkClasses = ({ isActive }: { isActive: boolean }) =>
  `px-4 py-2 rounded-md text-sm font-medium transition-colors ${
    isActive
      ? "bg-primary text-white"
      : "text-slate-600 hover:bg-primary/10 hover:text-primary"
  }`;

const AppShell = ({ children }: PropsWithChildren) => (
  <div className="min-h-screen bg-slate-100">
    <header className="bg-white shadow-sm">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <span className="text-xl font-semibold text-primary">Combine Futebol</span>
        <nav className="hidden gap-2 md:flex">
          <NavLink to="/dashboard" className={linkClasses}>
            Dashboard
          </NavLink>
          <NavLink to="/athletes" className={linkClasses}>
            Atletas
          </NavLink>
          <NavLink to="/sessions" className={linkClasses}>
            Sessões
          </NavLink>
          <NavLink to="/reports" className={linkClasses}>
            Relatórios
          </NavLink>
        </nav>
      </div>
    </header>
    <main className="mx-auto max-w-6xl px-6 py-8">{children}</main>
  </div>
);

export default AppShell;
