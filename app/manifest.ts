import { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Hopeline',
    short_name: 'Hopeline',
    description: 'The answers you are looking for.',
    start_url: '/',
    display: 'standalone', // This hides the browser URL bar to make it feel native
    background_color: '#f8fafc', // slate-50
    theme_color: '#0ea5e9', // sky-500
    icons: [
      {
        src: '/icon-192x192.png',
        sizes: '192x192',
        type: 'image/png',
      },
      {
        src: '/icon-512x512.png',
        sizes: '512x512',
        type: 'image/png',
      },
    ],
  };
}
