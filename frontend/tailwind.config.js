import scrollbar from 'tailwind-scrollbar';

/** @type {import('tailwindcss').Config} */
export default {
    darkMode: "class",
    content: [
        "./index.html",
        "./src/**/*.{js,jsx,ts,tsx}"
    ],
    theme: {
        extend: {
            animation: {
                rotate: "rotate 5s linear infinite alternate",
                float: "float 3s ease-in-out infinite",
                reveal: "reveal .5s ease-in",
                "fade-upwards": "fade-upwards 1s ease-in",
            },

            colors: {
                primary: "#059669",
                primaryDarker: "#059669",
                secondary: "#1e2a44",
                secondaryDarker: "#092C1B",
                light: "#FFFFFF",
                lightGray: "#CECECE",
                softWhite: "#FAFAFA",
                paleWhite: "#FBFBFB",
            },

            fontFamily: {
                lora: ['Lora', 'serif'],
                montserrat: ['Montserrat', 'sans-serif'],
                playfair: ['Playfair Display', 'serif'],
                robotoslab: ['Roboto Slab', 'serif'],
            },

            gridTemplateColumns: {
                quizzes: "repeat(auto-fit, minmax(330px, 1fr))",
                options: "repeat(auto-fit, minmax(300px, 1fr))",
            },

            keyframes: {
                rotate: {
                    "100%": { transform: "rotateY(360deg)" },
                },
                float: {
                    "0%, 100%": { transform: "translateY(0)" },
                    "50%": { transform: "translateY(-10px)" },
                },
                reveal: {
                    "0%": { opacity: "0" },
                    "100%": { opacity: "1" },
                },

                "fade-upwards": {
                    "45%": { opacity: "0.5", width: "300px" },
                    "75%": { opacity: "0.5", width: "400px" },
                    "100%": { opacity: "0.1", width: "512px" },
                },
            },
        },
    },
    plugins: [
        scrollbar,
    ],
}
