import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
    return {
        name: 'Control AMA Evolutivos',
        short_name: 'Control AMA',
        description: 'Dashboard operativo para la gestión de evolutivos en Altim.',
        start_url: '/',
        display: 'standalone',
        background_color: '#FAFAFA',
        theme_color: '#18D450',
        icons: [
            {
                src: '/web-app-manifest-192x192.png',
                sizes: '192x192',
                type: 'image/png',
            },
            {
                src: '/web-app-manifest-512x512.png',
                sizes: '512x512',
                type: 'image/png',
            },
        ],
    }
}
