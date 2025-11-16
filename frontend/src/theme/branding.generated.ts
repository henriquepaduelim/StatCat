export type BrandingAssets = {
  logo: string;
  favicon: string;
};

export type BrandingConfig = {
  id: string;
  name: string;
  assets: BrandingAssets;
};

const brandingConfig: BrandingConfig = {
  id: "elite-1-academy",
  name: "ELITE 1 ACADEMY",
  assets: {
    logo: "/media/1ELITE0LOGO.svg",
    favicon: "/media/Asset 1ELITE0LOGO.svg",
  },
};

export default brandingConfig;
