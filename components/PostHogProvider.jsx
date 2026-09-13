'use client';

import { useEffect } from 'react';
import posthog from 'posthog-js';

export default function PostHogProvider({ children }) {
  useEffect(() => {
    const posthogKey = process.env.NEXT_PUBLIC_POSTHOG_KEY;
    const posthogHost = process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://us.i.posthog.com';

    if (posthogKey && typeof window !== 'undefined') {
      posthog.init(posthogKey, {
        api_host: posthogHost,
        person_profiles: 'identified_only',
        session_recording: {
          maskAllInputs: false,
          maskInputOptions: {
            password: true
          }
        },
        loaded: (ph) => {
          if (process.env.NODE_ENV === 'development') ph.debug();
        }
      });
    }
  }, []);

  return children;
}
