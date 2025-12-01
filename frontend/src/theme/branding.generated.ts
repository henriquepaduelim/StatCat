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
  id: "statcat-sports-analysis",
  name: "StatCat Sports Analysis",
  assets: {
    logo: "/media/statCatLogo2.png",
    favicon: "/media/statCatLogo2-black.ico",
  },
};

export default brandingConfig;
