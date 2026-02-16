import { resolve } from 'path';
import { defineConfig } from 'electron-vite';
import preact from '@preact/preset-vite';
import tailwindcss from '@tailwindcss/vite';

const alias = {
    '@main': resolve(__dirname, 'src/main'),
    '@preload': resolve(__dirname, 'src/preload'),
    '@renderer': resolve(__dirname, 'src/renderer'),
    '@common': resolve(__dirname, 'common')
}

export default defineConfig({
    main: {
        root: resolve(__dirname, 'src/main'),
        resolve: { alias },
        build: {
            sourcemap: true,
            rollupOptions: {
                external: ['@lancedb/lancedb','@llamaindex/lancedb',]
            },
        }
    },
    preload: { 
        root: resolve(__dirname, 'src/preload'),
        resolve: { alias }
    },
    renderer: {
        root: resolve(__dirname, 'src/renderer'),
        resolve: {
            alias: {
                ...alias,
                '@': resolve(__dirname, 'src/renderer/src'),
            }
        },
        plugins: [preact(), tailwindcss()],
        server: { hmr: true }
    }
});