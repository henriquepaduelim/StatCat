import { PropsWithChildren, useEffect } from "react";

import { useLocaleStore } from "../stores/useLocaleStore";

const LocaleProvider = ({ children }: PropsWithChildren): JSX.Element => {
  const locale = useLocaleStore((state) => state.locale);

  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);

  return <>{children}</>;
};

export default LocaleProvider;
