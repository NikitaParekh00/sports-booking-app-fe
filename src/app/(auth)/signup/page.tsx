"use client";

import { Suspense, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

function SignupRedirect() {
    const router = useRouter();
    const searchParams = useSearchParams();

    useEffect(() => {
        const qs = searchParams.toString();
        router.replace(qs ? `/login?${qs}` : '/login');
    }, [router, searchParams]);

    return (
        <div className="min-h-screen bg-white flex items-center justify-center">
            <div className="text-gray-500">Loading...</div>
        </div>
    );
}

export default function SignupPage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen bg-white flex items-center justify-center">
                <div className="text-gray-500">Loading...</div>
            </div>
        }>
            <SignupRedirect />
        </Suspense>
    );
}
