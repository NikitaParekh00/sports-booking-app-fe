"use client";

import { useEffect } from "react";

interface BottomSheetProps {
    isOpen: boolean;
    onClose: () => void;
    title?: string;
    children: React.ReactNode;
}

export default function BottomSheet({ isOpen, onClose, title, children }: BottomSheetProps) {
    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = "hidden";
        } else {
            document.body.style.overflow = "";
        }
        return () => {
            document.body.style.overflow = "";
        };
    }, [isOpen]);

    return (
        <div
            className={`fixed inset-0 z-50 ${isOpen ? "pointer-events-auto" : "pointer-events-none"}`}
            aria-hidden={!isOpen}
        >
            {/* Backdrop */}
            <div
                className={`absolute inset-0 bg-black/40 transition-opacity duration-200 ${isOpen ? "opacity-100" : "opacity-0"}`}
                onClick={onClose}
            />

            {/* Sheet */}
            <div
                className={`absolute left-0 right-0 bottom-0 rounded-t-2xl shadow-2xl border-t transform transition-transform duration-300 ${isOpen ? "translate-y-0" : "translate-y-full"}`}
                style={{ backgroundColor: '#111827', borderColor: '#1F2937' }}
            >
                <div className="flex justify-center py-2">
                    <div className="h-1.5 w-14 rounded-full" style={{ backgroundColor: '#1F2937' }} />
                </div>
                {title && (
                    <div className="px-4 pb-2">
                        <h3 className="text-base font-semibold" style={{ color: '#E5E7EB' }}>{title}</h3>
                    </div>
                )}
                <div className="px-4 pb-6 pt-2 max-h-[70vh] overflow-y-auto">
                    {children}
                </div>
            </div>
        </div>
    );
}


