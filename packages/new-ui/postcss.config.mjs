/** @type {import('postcss-load-config').Config} */
const config = {
    plugins: {
        '@tailwindcss/postcss': {},
        autoprefixer: {}, // autoprefixer is usually good to have explicitly, though v4 might handle it. Legacy had it? Legacy only had @tailwindcss/postcss.
    },
}

export default config
