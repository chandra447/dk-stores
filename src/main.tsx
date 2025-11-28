import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import './App.css'
import App from './App.tsx'

// Store registration globally for update checks
let swRegistration: ServiceWorkerRegistration | null = null;

// Function to reload the app
const reloadApp = () => {
  // Clear all caches before reloading
  if ('caches' in window) {
    caches.keys().then((names) => {
      names.forEach((name) => {
        caches.delete(name);
      });
    });
  }
  // Force reload from server
  window.location.reload();
};

// Service Worker Registration with update detection
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then((registration) => {
        console.log('[App] SW registered:', registration);
        swRegistration = registration;

        // Check for updates every 30 seconds
        setInterval(() => {
          registration.update().catch(console.error);
        }, 30000);

        // Handle updates when a new SW is found
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing;
          console.log('[App] New service worker installing...');
          
          if (newWorker) {
            newWorker.addEventListener('statechange', () => {
              if (newWorker.state === 'installed') {
                if (navigator.serviceWorker.controller) {
                  // New version available - store flag for toast notification
                  console.log('[App] New version available!');
                  sessionStorage.setItem('sw_update_available', 'true');
                  // Dispatch custom event for App component to show toast
                  window.dispatchEvent(new CustomEvent('sw-update-available'));
                } else {
                  // First install, no action needed
                  console.log('[App] Service worker installed for the first time');
                }
              }
            });
          }
        });
      })
      .catch((registrationError) => {
        console.log('[App] SW registration failed:', registrationError);
      });

    // Listen for controller change (happens when new SW takes over)
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      console.log('[App] New service worker controller, reloading...');
      reloadApp();
    });

    // Listen for messages from SW
    navigator.serviceWorker.addEventListener('message', (event) => {
      if (event.data && event.data.type === 'SW_UPDATED') {
        console.log('[App] SW sent update notification, version:', event.data.version);
        sessionStorage.setItem('sw_update_available', 'true');
        window.dispatchEvent(new CustomEvent('sw-update-available'));
      }
    });
  });
}

// Export function to trigger SW update (can be called from components)
export const checkForUpdates = () => {
  if (swRegistration) {
    swRegistration.update();
  }
};

// Export function to force reload
export const forceReload = reloadApp;

// Ensure dark theme is applied
if (!document.documentElement.classList.contains('dark')) {
  document.documentElement.classList.add('dark');
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)