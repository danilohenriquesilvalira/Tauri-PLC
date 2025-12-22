/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        // CORES OFICIAIS EDP
        'edp-electric': '#28FF52',
        'edp-marine': '#212E3E',
        'edp-marine-100': '#384156', // Variação mais clara do marine
        'edp-semantic-red': '#E32C2C',
        'edp-semantic-yellow': '#F7D200',
        'edp-semantic-light-red': '#FEE2E2',
        'edp-neutral-white-wash': '#FCFCFC',
        'edp-neutral-lighter': '#E5E7EB',
        'edp-neutral-medium': '#9CA3AF',
        'edp-slate': '#64748B', // Adicionado para compatibilidade
      },
      fontFamily: {
        'sans': ['Mulish', 'sans-serif'],
        'mono': ['JetBrains Mono', 'monospace'],
      },
    },
  },
  plugins: [],
}

