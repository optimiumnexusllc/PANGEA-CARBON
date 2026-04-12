/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Palantir elite dark palette
        void:    { DEFAULT: '#080B0F', 50: '#0D1117', 100: '#111820', 200: '#161E28' },
        surface: { DEFAULT: '#121920', 50: '#172029', 100: '#1C2733', 200: '#223040' },
        border:  { DEFAULT: '#1E2D3D', muted: '#162030', bright: '#2A3F55' },
        // Accent: neon électrique
        acid:    { DEFAULT: '#00FF94', dim: '#00CC77', ghost: 'rgba(0,255,148,0.08)' },
        sky:     { DEFAULT: '#38BDF8', dim: '#0EA5E9' },
        amber:   { DEFAULT: '#FCD34D', dim: '#F59E0B' },
        danger:  { DEFAULT: '#F87171', dim: '#EF4444' },
        // Text
        ink:     { primary: '#E8EFF6', secondary: '#8FA3B8', muted: '#4A6278', ghost: '#2A3F55' },
      },
      fontFamily: {
        display: ['var(--font-syne)', 'sans-serif'],
        body:    ['var(--font-inter)', 'sans-serif'],
        mono:    ['var(--font-jetbrains)', 'monospace'],
      },
      backgroundImage: {
        'grid-dark': "url(\"data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%231E2D3D' fill-opacity='0.4'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E\")",
      },
      animation: {
        'pulse-acid': 'pulseAcid 2s cubic-bezier(0.4,0,0.6,1) infinite',
        'slide-up':   'slideUp 0.4s cubic-bezier(0.16,1,0.3,1)',
        'fade-in':    'fadeIn 0.3s ease',
        'scan':       'scan 3s linear infinite',
      },
      keyframes: {
        pulseAcid: { '0%,100%': { opacity: 1 }, '50%': { opacity: 0.4 } },
        slideUp:   { from: { opacity: 0, transform: 'translateY(16px)' }, to: { opacity: 1, transform: 'translateY(0)' } },
        fadeIn:    { from: { opacity: 0 }, to: { opacity: 1 } },
        scan:      { '0%': { transform: 'translateY(-100%)' }, '100%': { transform: 'translateY(100vh)' } },
      },
    },
  },
  plugins: [],
};
