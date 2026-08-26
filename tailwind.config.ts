/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        arctic: {
          50: 'rgb(var(--arctic-50) / <alpha-value>)',
          100: 'rgb(var(--arctic-100) / <alpha-value>)',
          200: 'rgb(var(--arctic-200) / <alpha-value>)',
          300: 'rgb(var(--arctic-300) / <alpha-value>)',
          400: 'rgb(var(--arctic-400) / <alpha-value>)',
          500: 'rgb(var(--arctic-500) / <alpha-value>)',
          600: 'rgb(var(--arctic-600) / <alpha-value>)',
          700: 'rgb(var(--arctic-700) / <alpha-value>)',
          800: 'rgb(var(--arctic-800) / <alpha-value>)',
          900: 'rgb(var(--arctic-900) / <alpha-value>)',
          950: 'rgb(var(--arctic-950) / <alpha-value>)',
        },
        cyan: {
          50: 'rgb(var(--cyan-50) / <alpha-value>)',
          100: 'rgb(var(--cyan-100) / <alpha-value>)',
          200: 'rgb(var(--cyan-200) / <alpha-value>)',
          300: 'rgb(var(--cyan-300) / <alpha-value>)',
          400: 'rgb(var(--cyan-400) / <alpha-value>)',
          500: 'rgb(var(--cyan-500) / <alpha-value>)',
          600: 'rgb(var(--cyan-600) / <alpha-value>)',
          700: 'rgb(var(--cyan-700) / <alpha-value>)',
          800: 'rgb(var(--cyan-800) / <alpha-value>)',
          900: 'rgb(var(--cyan-900) / <alpha-value>)',
          950: 'rgb(var(--cyan-950) / <alpha-value>)',
        },
        frost: {
          50: 'rgb(var(--frost-50) / <alpha-value>)',
          100: 'rgb(var(--frost-100) / <alpha-value>)',
          200: 'rgb(var(--frost-200) / <alpha-value>)',
          300: 'rgb(var(--frost-300) / <alpha-value>)',
          400: 'rgb(var(--frost-400) / <alpha-value>)',
          500: 'rgb(var(--frost-500) / <alpha-value>)',
          600: 'rgb(var(--frost-600) / <alpha-value>)',
          700: 'rgb(var(--frost-700) / <alpha-value>)',
          800: 'rgb(var(--frost-800) / <alpha-value>)',
          900: 'rgb(var(--frost-900) / <alpha-value>)',
          950: 'rgb(var(--frost-950) / <alpha-value>)',
        },
        surface: {
          50: '#ffffff',
          100: '#f8fafc',
          200: '#f1f5f9',
          300: '#e2e8f0',
          400: '#cbd5e1',
          500: '#94a3b8',
          600: '#64748b',
          700: '#475569',
          800: '#334155',
          900: '#1e293b',
          950: '#0f172a',
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      animation: {
        'fade-in': 'fadeIn 0.3s ease-out',
        'slide-in': 'slideIn 0.3s ease-out',
        'slide-up': 'slideUp 0.3s ease-out',
        'scale-in': 'scaleIn 0.2s ease-out',
        'pulse-glow': 'pulseGlow 2s ease-in-out infinite',
        'float': 'float 6s ease-in-out infinite',
        'shimmer': 'shimmer 2s linear infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideIn: {
          '0%': { transform: 'translateX(-10px)', opacity: '0' },
          '100%': { transform: 'translateX(0)', opacity: '1' },
        },
        slideUp: {
          '0%': { transform: 'translateY(10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        scaleIn: {
          '0%': { transform: 'scale(0.95)', opacity: '0' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
        pulseGlow: {
          '0%, 100%': { boxShadow: '0 0 20px rgba(14, 165, 233, 0.3)' },
          '50%': { boxShadow: '0 0 40px rgba(14, 165, 233, 0.5)' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-10px)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'gradient-conic': 'conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))',
        'frost-pattern': 'url("data:image/svg+xml,%3Csvg width=\'60\' height=\'60\' viewBox=\'0 0 60 60\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cg fill=\'none\' fill-rule=\'evenodd\'%3E%3Cg fill=\'%230ea5e9\' fill-opacity=\'0.03\'%3E%3Cpath d=\'M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z\'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")',
      },
      boxShadow: {
        'glass': '0 8px 32px 0 rgba(0, 0, 0, 0.37)',
        'glass-hover': '0 12px 40px 0 rgba(0, 0, 0, 0.45)',
        'glow': '0 0 20px rgba(14, 165, 233, 0.3)',
        'glow-strong': '0 0 40px rgba(14, 165, 233, 0.5)',
        'inner-glow': 'inset 0 1px 0 rgba(255, 255, 255, 0.1)',
      },
      backdropBlur: {
        'xs': '2px',
        '4xl': '72px',
      },
      borderRadius: {
        '4xl': '2rem',
      },
    },
  },
  plugins: [],
}