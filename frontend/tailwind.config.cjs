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
        page: colorToken("page-background"),
        "page-foreground": colorToken("page-foreground"),
        container: colorToken("container-background"),
        "container-foreground": colorToken("container-foreground"),
        header: colorToken("header-background"),
        "header-foreground": colorToken("header-foreground"),
        sidebar: colorToken("sidebar-background"),
        "sidebar-foreground": colorToken("sidebar-foreground"),
        footer: colorToken("footer-background"),
        "footer-foreground": colorToken("footer-foreground"),
        "action-primary": colorToken("action-primary-background"),
        "action-primary-foreground": colorToken("action-primary-foreground"),
        accent: colorToken("accent"),
        border: colorToken("border"),
        muted: colorToken("muted"),
      },
      keyframes: {
        'slide-up': {
          '0%': { transform: 'translateY(100%)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
      },
      animation: {
        'slide-up': 'slide-up 0.3s ease-out',
      },
    },
  },
  plugins: [],
};
