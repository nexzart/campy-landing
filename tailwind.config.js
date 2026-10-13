// Brand palette is intentionally limited to two colours plus white;
// use opacity modifiers (e.g. text-primary/70, border-primary/10) for neutrals.
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{html,js}', './worker/**/*.js'],
  theme: {
    extend: {
      colors: {
        primary: '#0A204E',
        secondary: '#7EBB02',
      },
      // Poppins has tall ascenders and descenders; Tailwind's default line-height of 1 makes headline lines collide.
      fontSize: {
        '5xl': ['3rem', { lineHeight: '1.1' }],
        '6xl': ['3.75rem', { lineHeight: '1.1' }],
      },
      fontFamily: {
        sans: ['Poppins', 'system-ui', '-apple-system', 'Segoe UI', 'sans-serif'],
      },
      boxShadow: {
        card: '0 1px 2px rgb(10 32 78 / 0.06), 0 24px 48px -24px rgb(10 32 78 / 0.28)',
      },
    },
  },
};
