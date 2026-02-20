module.exports = {
    content: ["./src/**/*.{html,js}"],
    darkMode: "class",
    theme: {
        extend: {
            colors: {
                "primary": "#5E6AD2",
                "background-light": "#ffffff",
                "background-dark": "#0B0E14",
                "card-dark": "#151921",
                "border-dark": "#272B36",
                "aws": "#FF9900",
                "azure": "#0078D4",
                "gcp": "#DB4437",
                "muted-text": "#8A8F98",
                "highlight": "#E0E6ED",
            },
            fontFamily: {
                "display": ["Inter", "sans-serif"],
                "sans": ["Inter", "sans-serif"],
            },
            boxShadow: {
                "glow": "0 0 20px rgba(94, 106, 210, 0.15)",
                "glass": "0 8px 32px 0 rgba(0, 0, 0, 0.37)",
            },
            backgroundImage: {
                "gradient-radial": "radial-gradient(var(--tw-gradient-stops))",
            }
        },
    },
    plugins: [],
}
