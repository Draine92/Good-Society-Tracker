export default function manifest() {
  return {
    name: 'The Corvane Concord',
    short_name: 'Corvane',
    description: 'The shared notice board for our Corvane campaign.',
    start_url: '/',
    scope: '/',
    display: 'standalone',
    orientation: 'portrait',
    background_color: '#7c1226',
    theme_color: '#7c1226',
    icons: [
      { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
      { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
      { src: '/icons/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  };
}
