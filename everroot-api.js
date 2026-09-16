// Public configuration only. Never place API keys or passwords in this file.
window.EVERROOT_DECK_API_URL =
  'https://ever-root.vercel.app/api/request-deck';

// Load the current project-content layer after the main site script has initialised.
setTimeout(() => {
  const script = document.createElement('script');
  script.src = 'content-v3.js?v=20260916-1';
  script.async = false;
  document.body.appendChild(script);
}, 0);
