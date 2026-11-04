import react from '@vitejs/plugin-react';
import { defineConfig, loadEnv } from 'vite';

const apiProxy = {
    '/api': {
        target: 'http://127.0.0.1:3000',
        changeOrigin: true,
    },
};

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, process.cwd(), '');
    return {
        base: env.BASE_PATH || '/sugarcube/',
        plugins: [react()],
        server: {
            host: '127.0.0.1',
            port: 5173,
            strictPort: true,
            proxy: apiProxy,
            hmr: {
                clientPort: 80,
            },
        },
        preview: {
            port: 4173,
            strictPort: true,
            proxy: apiProxy,
        },
    };
});
