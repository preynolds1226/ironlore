import React from 'react';

import { AppProviders } from '@/src/boot/AppProviders';

import HomeApp from './home-app';

/** Loaded dynamically from index.tsx after the launch shell paints. */
export default function HomeEntry() {
  return (
    <AppProviders>
      <HomeApp />
    </AppProviders>
  );
}
