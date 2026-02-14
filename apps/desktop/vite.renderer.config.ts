import { defineConfig } from 'vite';
import { resolve } from 'path';
import preact from '@preact/preset-vite';

export default defineConfig({
    root: resolve(__dirname, 'src/renderer'),
    resolve: {
        alias: {
            '@': resolve(__dirname, 'src'),
            '@renderer': resolve(__dirname, 'src/renderer'),
        },
    },
    plugins: [preact()],
});
