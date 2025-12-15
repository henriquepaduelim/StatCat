const withOpacityValue = (variable) => ({ opacityValue }) => {
  if (opacityValue === undefined) {
    return `rgb(var(${variable}) / 1)`;
  }
  return `rgb(var(${variable}) / ${opacityValue})`;
};

const colorToken = (token) => withOpacityValue(`--color-${token}`);

module.exports = {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        primary: withOpacityValue("--color-primary"),
        secondary: withOpacityValue("--color-secondary"),
        accent: withOpacityValue("--color-accent"),
        success: withOpacityValue("--color-success"),
        error: withOpacityValue("--color-error"),
        surface: {
          primary: withOpacityValue("--color-surface-primary"),
          secondary: withOpacityValue("--color-surface-secondary"),
        },
        page: withOpacityValue("--color-page"),
        text: {
          primary: withOpacityValue("--color-text-primary"),
          secondary: withOpacityValue("--color-text-secondary"),
          onprimary: withOpacityValue("--color-text-on-primary"),
        },
        border: {
          primary: withOpacityValue("--color-border-primary"),
          muted: withOpacityValue("--color-border-muted"),
        },
        page: colorToken("page-background"),
        "page-foreground": colorToken("page-foreground"),
        container: colorToken("container-background"),
        "container-foreground": colorToken("container-foreground"),
        header: colorToken("header-background"),
        "header-foreground": colorToken("header-foreground"),
        sidebar: colorToken("sidebar-background"),
        "sidebar-foreground": colorToken("sidebar-foreground"),
        "sidebar-button": colorToken("sidebar-button-background"),
        "sidebar-button-hover": colorToken("sidebar-button-hover-background"),
        footer: colorToken("footer-background"),
        "footer-foreground": colorToken("footer-foreground"),
        "action-primary": colorToken("action-primary-background"),
        "action-primary-foreground": colorToken("action-primary-foreground"),
      },
      backgroundImage: {
        "gradient-container": "var(--gradient-container)",
      },
      keyframes: {
        'slide-up': {
          '0%': { transform: 'translateY(100%)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        slideDown: {
          '0%': { transform: 'translateY(-100%)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
      },
      animation: {
        'slide-up': 'slide-up 0.3s ease-out',
        slideDown: 'slideDown 0.3s ease-out',
      },
    },
  },
  plugins: [],
};
