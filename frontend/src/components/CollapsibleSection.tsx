import { useState, PropsWithChildren } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faChevronDown } from "@fortawesome/free-solid-svg-icons";

type CollapsibleSectionProps = {
  title: string;
  subtitle?: string;
  defaultOpen?: boolean;
};

const CollapsibleSection = ({
  title,
  subtitle,
  defaultOpen = true,
  children,
}: PropsWithChildren<CollapsibleSectionProps>) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <section className="rounded-xl bg-container/40 shadow-sm print:bg-white">
      <header
        className="flex cursor-pointer items-center justify-between p-4 sm:p-6"
        onClick={() => setIsOpen(!isOpen)}
      >
        <div>
          <h2 className="text-xl font-semibold text-container-foreground">{title}</h2>
          {subtitle && <p className="text-sm text-muted">{subtitle}</p>}
        </div>
        <FontAwesomeIcon
          icon={faChevronDown}
          className={`transform text-muted transition-transform duration-200 ${
            isOpen ? "rotate-180" : ""
          }`}
        />
      </header>
      {isOpen && (
        <div className="px-4 pb-4 space-y-6 sm:px-6 sm:pb-6">
          {children}
        </div>
      )}
    </section>
  );
};

export default CollapsibleSection;