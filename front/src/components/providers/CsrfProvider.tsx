'use client';

import { useEffect, useState } from 'react';
import { initializeCsrf } from '@/lib/api';

/**
 * CSRF Provider - Initializes CSRF token on app startup
 *
 * This component should wrap the app to ensure CSRF token
 * is fetched before any authenticated requests are made
 */
export function CsrfProvider({ children }: { children: React.ReactNode }) {
    const [isInitialized, setIsInitialized] = useState(false);

    useEffect(() => {
        // Initialize CSRF token on mount
        initializeCsrf()
            .then(() => {
                setIsInitialized(true);
            })
            .catch((error) => {
                console.error('Failed to initialize CSRF token:', error);
                // Still set as initialized to not block the app
                setIsInitialized(true);
            });
    }, []);

    // Optionally, you can show a loading state
    // For now, we render children immediately to avoid flash
    return <>{children}</>;
}
