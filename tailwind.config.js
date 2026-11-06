/** @type {import('tailwindcss').Config} */

// Warm neutral scale on the near-black surfaces of the "Werkzeug" design (globals.css).
// gray, neutral and zinc all map here so older components land on the same palette.
const neutral = {
  50: "#f6f5f3",
  100: "#edebe8",
  200: "#d9d6d1",
  300: "#bdb9b3",
  400: "#a3a09b",
  500: "#85827d",
  600: "#6d6a66",
  700: "#3b3a3d",
  800: "#232327",
  900: "#1a1a1d",
  950: "#141416",
};

module.exports = {
  darkMode: ["class"],
  content: [
    "./*.html",
    "./src/**/*.{js,ts,jsx,tsx}",
    "*.{js,ts,jsx,tsx,mdx}",
    "app/**/*.{ts,tsx}",
    "components/**/*.{ts,tsx}",
  ],
  theme: {
    borderRadius: {
      none: "0",
      sm: "var(--r-sm)",
      DEFAULT: "var(--r-sm)",
      md: "var(--r-md)",
      lg: "var(--r-md)",
      xl: "var(--r-lg)",
      "2xl": "var(--r-lg)",
      "3xl": "var(--r-lg)",
      full: "9999px",
    },
    extend: {
      colors: {
        // text-white is the warm off-white of the palette, not #fff
        white: "rgb(237 235 232 / <alpha-value>)",
        gray: neutral,
        neutral,
        zinc: neutral,
        bg: "rgb(var(--bg-ch) / <alpha-value>)",
        s1: "rgb(var(--s1-ch) / <alpha-value>)",
        s2: "rgb(var(--s2-ch) / <alpha-value>)",
        s3: "rgb(var(--s3-ch) / <alpha-value>)",
        s4: "rgb(var(--s4-ch) / <alpha-value>)",
        line: {
          DEFAULT: "var(--line)",
          2: "var(--line-2)",
          3: "var(--line-3)",
        },
        fg: {
          DEFAULT: "rgb(var(--fg-ch) / <alpha-value>)",
          2: "var(--fg-2)",
          3: "var(--fg-3)",
          4: "var(--fg-4)",
        },
        ok: "rgb(var(--ok-ch) / <alpha-value>)",
        warn: "rgb(var(--warn-ch) / <alpha-value>)",
        err: "rgb(var(--err-ch) / <alpha-value>)",
        info: "rgb(var(--info-ch) / <alpha-value>)",
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        // the theme accent (crimson by default), with Tailwind opacity: bg-accent/20
        accent: {
          DEFAULT: "rgb(var(--accent-ch) / <alpha-value>)",
          foreground: "var(--on-accent)",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        norisk: {
          DEFAULT: "rgb(var(--accent-ch) / <alpha-value>)",
          light: "rgb(var(--accent-ch) / <alpha-value>)",
          dark: "rgb(var(--accent-ch) / <alpha-value>)",
        },
        panel: {
          DEFAULT: "var(--s1)",
          light: "var(--s2)",
          border: "var(--line-2)",
        },
        dark: "var(--bg)",
      },
      fontFamily: {
        smallcaps: ["var(--font-smallcaps)"],
        minecraft: ["var(--font-minecraft)"],
        display: ["var(--font-display)"],
        mono: ["var(--font-mono)"],
      },
      fontSize: {
        "2xs": ["10.5px", { lineHeight: "14px" }],
      },
      backgroundImage: {
        "gradient-radial": "radial-gradient(var(--tw-gradient-stops))",
      },
      transitionTimingFunction: {
        DEFAULT: "cubic-bezier(0.2, 0.8, 0.2, 1)",
        out: "cubic-bezier(0.2, 0.8, 0.2, 1)",
      },
      transitionDuration: {
        DEFAULT: "150ms",
        fast: "120ms",
        med: "180ms",
        slow: "260ms",
      },
      animation: {
        float: "float 3s ease-in-out infinite",
        pulse: "pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite",
      },
      keyframes: {
        float: {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-4px)" },
        },
      },
      boxShadow: {
        pop: "var(--shadow-pop)",
        glow: "0 0 0 1px var(--line-2)",
        "glow-lg": "0 0 0 1px var(--line-3)",
        "inner-glow": "inset 0 0 0 1px var(--line-2)",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};
