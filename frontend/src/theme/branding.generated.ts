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
  id: "statcat-sports-analytics",
  name: "StatCat Sports Analytics",
  assets: {
    logo: "/media/statCatLogo2.png",
    favicon: "/pwa-192x192.png",
  },
};

export default brandingConfig;
