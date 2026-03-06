/** @type {import('tailwindcss').Config} */
module.exports = {
    darkMode: ["class"],
    content: [
        "./src/**/*.{js,jsx,ts,tsx}",
        "./public/index.html"
    ],
    theme: {
        extend: {
            fontFamily: {
                sans: ['Manrope', 'sans-serif'],
                mono: ['JetBrains Mono', 'monospace'],
                heading: ['Manrope', 'sans-serif'],
            },
            colors: {
                background: 'hsl(var(--background))',
                foreground: 'hsl(var(--foreground))',
                card: {
                    DEFAULT: 'hsl(var(--card))',
                    foreground: 'hsl(var(--card-foreground))'
                },
                popover: {
                    DEFAULT: 'hsl(var(--popover))',
                    foreground: 'hsl(var(--popover-foreground))'
                },
                primary: {
                    DEFAULT: 'hsl(var(--primary))',
                    foreground: 'hsl(var(--primary-foreground))'
                },
                secondary: {
                    DEFAULT: 'hsl(var(--secondary))',
                    foreground: 'hsl(var(--secondary-foreground))'
                },
                muted: {
                    DEFAULT: 'hsl(var(--muted))',
                    foreground: 'hsl(var(--muted-foreground))'
                },
                accent: {
                    DEFAULT: 'hsl(var(--accent))',
                    foreground: 'hsl(var(--accent-foreground))'
                },
                destructive: {
                    DEFAULT: 'hsl(var(--destructive))',
                    foreground: 'hsl(var(--destructive-foreground))'
                },
                border: 'hsl(var(--border))',
                input: 'hsl(var(--input))',
                ring: 'hsl(var(--ring))',
                // VitalSense custom colors
                vital: {
                    bg: '#0b1320',
                    surface: '#121a2f',
                    highlight: '#1e293b',
                    cyan: '#00d4ff',
                    green: '#4ade80',
                    text: '#e6edf3',
                    muted: '#94a3b8',
                },
                risk: {
                    low: '#22c55e',
                    moderate: '#facc15',
                    high: '#f97316',
                    critical: '#ef4444',
                },
            },
            borderRadius: {
                lg: 'var(--radius)',
                md: 'calc(var(--radius) - 2px)',
                sm: 'calc(var(--radius) - 4px)'
            },
            keyframes: {
                'accordion-down': {
                    from: { height: '0' },
                    to: { height: 'var(--radix-accordion-content-height)' }
                },
                'accordion-up': {
                    from: { height: 'var(--radix-accordion-content-height)' },
                    to: { height: '0' }
                },
                'pulse-slow': {
                    '0%, 100%': { opacity: '1' },
                    '50%': { opacity: '0.7' }
                },
                'glow': {
                    '0%, 100%': { boxShadow: '0 0 20px rgba(239, 68, 68, 0.3)' },
                    '50%': { boxShadow: '0 0 40px rgba(239, 68, 68, 0.6)' }
                }
            },
            animation: {
                'accordion-down': 'accordion-down 0.2s ease-out',
                'accordion-up': 'accordion-up 0.2s ease-out',
                'pulse-slow': 'pulse-slow 2s ease-in-out infinite',
                'glow': 'glow 2s ease-in-out infinite'
            },
            boxShadow: {
                'cyan': '0 0 20px rgba(0, 212, 255, 0.3)',
                'critical': '0 0 30px rgba(239, 68, 68, 0.4)',
            }
        }
    },
    plugins: [require("tailwindcss-animate")],
};
