const withOpacityValue = (variable) => {
  return ({ opacityValue }) => {
    if (opacityValue === undefined) {
      return `rgb(var(${variable}) / 1)`;
    }
    return `rgb(var(${variable}) / ${opacityValue})`;
  };
};

module.exports = {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        primary: withOpacityValue("--color-primary"),
        accent: withOpacityValue("--color-accent"),
        background: withOpacityValue("--color-background"),
        surface: withOpacityValue("--color-surface"),
        muted: withOpacityValue("--color-muted"),
        "on-primary": withOpacityValue("--color-on-primary"),
        "on-surface": withOpacityValue("--color-on-surface"),
      },
    },
  },
  plugins: [],
};
