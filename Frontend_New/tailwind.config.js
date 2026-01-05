// tailwind.config.js - Padrão EDP Real
export default {
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    screens: {
      'xs': '320px',
      'sm': '375px', 
      'md': '425px',
      'lg': '768px',
      'xl': '1024px',
      '2xl': '1280px',
      '3xl': '1440px',
      '4xl': '1920px',
      '5xl': '2560px',
      '6xl': '3840px',
    },
    extend: {
      colors: {
        // CORES OFICIAIS EDP - BRAND GUIDELINES MARCH 2023
        
        // Paleta da Web (Tons corrigidos)
        'edp-electric': {
          DEFAULT: '#28FF52',
          100: '#D4FFDD',
          200: '#A9FFBA',
          300: '#7EFF97',
        },
        'edp-marine': {
          DEFAULT: '#212E3E',
          100: '#424D5B',
          200: '#646D78',
          300: '#90979F',
        },
        'edp-spruce': {
          DEFAULT: '#143F47',
          100: '#365960',
          200: '#5B797E',
        },
        'edp-seaweed': {
          DEFAULT: '#225E66',
          100: '#43767D',
        },
        'edp-slate': {
          DEFAULT: '#7C9599',
          100: '#90A5A8',
        },
        'edp-violet': {
          DEFAULT: '#6D32FF',
          100: '#8351FF',
          200: '#A784FF',
          300: '#C5ADFF',
        },
        'edp-ice': {
          DEFAULT: '#0CD3F8',
          100: '#3DDCF9',
          200: '#6DE5FB',
          300: '#9EEDFC',
        },
        'edp-cobalt': {
          DEFAULT: '#263CC8',
          100: '#4759D0',
          200: '#7D8ADE',
          300: '#A8B1E9',
        },
        
        // Paleta Semântica (Cores de advertência corrigidas e expandidas)
        'edp-semantic': {
          'red': '#E32C2C',
          'light-red': '#EDD5D3',
          'yellow': '#F7D200',
          'light-yellow': '#FFF1BE',
          'blue': '#263CC8',
          'light-blue': '#A8B1E9',
          'green': '#225E66',
          'light-green': '#91AFB3',
        },
        
        // WORDMARK ONLY - NÃO FAZ PARTE DA PALETA
        'edp-wordmark': '#3B4B5D',
        
        // Paleta Neutra (Tons corrigidos)
        'edp-neutral': {
          'darkest': '#222222',
          'darker': '#455558',
          'dark': '#7C9599',
          'medium': '#90A5A8',
          'light': '#A3B5B8',
          'lighter': '#BECACC',
          'lightest': '#D7DFE0',
          'white-tint': '#E6EBEC',
          'white-wash': '#F1F4F4',
        },
        
        white: '#FFFFFF',
        black: '#000000',
      },
      fontFamily: {
        'sans': ['Mulish', 'sans-serif'],
        'edp': ['Mulish', 'sans-serif'],
        'display': ['Mulish', 'sans-serif'],
        'body': ['Mulish', 'sans-serif'],
        'mono': ['JetBrains Mono', 'SF Mono', 'Monaco', 'Consolas', 'monospace'],
        'tech': ['JetBrains Mono', 'SF Mono', 'Monaco', 'Consolas', 'monospace'],
      },
      fontSize: {
        'tech-xs': ['0.75rem', { lineHeight: '1.5', letterSpacing: '0.05em' }],
        'tech-sm': ['0.875rem', { lineHeight: '1.5', letterSpacing: '0.025em' }],
        'tech-base': ['1rem', { lineHeight: '1.5', letterSpacing: '0.01em' }],
        'tech-lg': ['1.125rem', { lineHeight: '1.4', letterSpacing: '0.01em' }],
        'tech-xl': ['1.25rem', { lineHeight: '1.4', letterSpacing: '0.005em' }],
      },
      spacing: {
        '18': '4.5rem',
        '22': '5.5rem',
      },
      container: {
        center: true,
        padding: {
          DEFAULT: '1rem',
          xs: '1rem',
          sm: '1.5rem', 
          md: '2rem',
          lg: '2.5rem',
          xl: '3rem',
          '2xl': '4rem',
          '3xl': '5rem',
          '4xl': '6rem',
          '5xl': '8rem',
          '6xl': '10rem',
        },
        screens: {
          xs: '320px',
          sm: '375px',
          md: '425px', 
          lg: '768px',
          xl: '1024px',
          '2xl': '1280px',
          '3xl': '1440px',
          '4xl': '1920px',
          '5xl': '2560px',
          '6xl': '3840px',
        }
      }
    },
  },
  plugins: [],
}