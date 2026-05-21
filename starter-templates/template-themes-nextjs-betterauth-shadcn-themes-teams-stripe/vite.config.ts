import { defineConfig } from 'vite';
import { resolve } from 'path';
import dts from 'vite-plugin-dts';
import pkg from './package.json';

export default defineConfig({
    plugins: [
        dts({
            include: ['lib'],
            insertTypesEntry: true,
        })
    ],
    build: {
        lib: {
            entry: resolve(__dirname, 'lib/index.ts'),
            formats: ['es', 'cjs'],
            fileName: (format) => `index.${format === 'es' ? 'mjs' : 'js'}`,
        },
        rollupOptions: {
            // Externalize dependencies to avoid bundling them
            external: (id) => {
                // Externalize all dependencies that are not relative paths or absolute paths to source files
                // This covers node_modules and built-in modules
                return !id.startsWith('.') && !id.startsWith('/');
            },
        },
        copyPublicDir: false,
        minify: 'terser',
        terserOptions: {
            compress: {
                passes: 2,
            },
            mangle: true,
            format: {
                comments: false,
            },
        },
    },
});
