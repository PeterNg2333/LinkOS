import { resolve } from 'path';
import { defineConfig } from 'electron-vite';
import preact from '@preact/preset-vite';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
    main: {},
    preload: {},
    renderer: {
        root: resolve(__dirname, 'src/renderer'),
        resolve: {
            alias: {
                '@': resolve(__dirname, 'src'),
                '@renderer': resolve(__dirname, 'src/renderer')
            }
        },
        plugins: [preact(), tailwindcss()]
    }
});