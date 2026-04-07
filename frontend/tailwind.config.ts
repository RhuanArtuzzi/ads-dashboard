import type { Config } from 'tailwindcss'

const config: Config = {
  darkMode: 'class',
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        ominy: {
          bg:      '#0A0A1A',
          surface: '#0F0F2A',
          border:  '#1A1A3A',
          cyan:    '#00FFFF',
          purple:  '#8A2BE2',
          text:    '#FFFFFF',
          muted:   '#6B7280',
        },
      },
      fontFamily: {
        heading: ['var(--font-orbitron)', 'sans-serif'],
        body:    ['var(--font-roboto)', 'sans-serif'],
      },
      backgroundImage: {
        'ominy-gradient': 'linear-gradient(135deg, #00FFFF, #8A2BE2)',
      },
      boxShadow: {
        'cyan-glow': '0 0 20px rgba(0, 255, 255, 0.3)',
        'purple-glow': '0 0 20px rgba(138, 43, 226, 0.3)',
      },
    },
  },
  plugins: [],
}

export default config
