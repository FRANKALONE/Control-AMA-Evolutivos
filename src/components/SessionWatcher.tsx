'use client';

import { useEffect, useRef } from 'react';
import { signOut, useSession } from 'next-auth/react';

const IDLE_TIMEOUT_MS = 30 * 60 * 1000; // 30 Minutes

export default function SessionWatcher() {
    const { data: session } = useSession();
    const timeoutRef = useRef<NodeJS.Timeout | null>(null);

    useEffect(() => {
        if (!session) return;

        const handleActivity = () => {
            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current);
            }
            timeoutRef.current = setTimeout(() => {
                console.log("SessionWatcher: Idle timeout reached. Signing out...");
                signOut({ callbackUrl: '/login?message=session_expired' });
            }, IDLE_TIMEOUT_MS);
        };

        // Initial start
        handleActivity();

        // Listeners
        window.addEventListener('mousemove', handleActivity);
        window.addEventListener('keydown', handleActivity);
        window.addEventListener('click', handleActivity);
        window.addEventListener('scroll', handleActivity);

        return () => {
            if (timeoutRef.current) clearTimeout(timeoutRef.current);
            window.removeEventListener('mousemove', handleActivity);
            window.removeEventListener('keydown', handleActivity);
            window.removeEventListener('click', handleActivity);
            window.removeEventListener('scroll', handleActivity);
        };
    }, [session]);

    return null; // Invisible component
}
