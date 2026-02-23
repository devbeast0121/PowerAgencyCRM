
import React from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import { BookingPublicPage } from './components/BookingPublicPage';

const container = document.getElementById('root');
if (container) {
  const root = createRoot(container);

  // Check for public booking route: /#/book/{userId}/{slug}
  const hash = window.location.hash;
  const bookingMatch = hash.match(/^#\/book\/([^/]+)\/([^/]+)$/);

  if (bookingMatch) {
    const [, userId, slug] = bookingMatch;
    root.render(<BookingPublicPage userId={userId} slug={slug} />);
  } else {
    root.render(<App />);
  }
}
