export const THEMES = {
  default: {
    slug: 'default',
    vars: {
      '--clinic-accent': '#2563eb',
      '--clinic-accent-subtle': '#eff6ff',
      '--clinic-surface': '#ffffff',
      '--clinic-text': '#0f172a',
    },
  },
  titan: {
    slug: 'titan',
    vars: {
      '--clinic-accent': '#1a1a2e',
      '--clinic-accent-subtle': '#f0f0f8',
      '--clinic-surface': '#fafafa',
      '--clinic-text': '#0f172a',
    },
  },
  bright: {
    slug: 'bright',
    vars: {
      '--clinic-accent': '#0ea5e9',
      '--clinic-accent-subtle': '#f0f9ff',
      '--clinic-surface': '#ffffff',
      '--clinic-text': '#0c4a6e',
    },
  },
};

export function getTheme(slug) {
  return THEMES[slug] ?? THEMES.default;
}
