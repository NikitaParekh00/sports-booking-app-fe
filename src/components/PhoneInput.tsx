"use client";

import { useState, useCallback } from 'react';

interface PhoneInputProps {
    value: string;
    onChange: (phone: string) => void;
    placeholder?: string;
    className?: string;
    disabled?: boolean;
    onValidationChange?: (isValid: boolean) => void;
}

export default function PhoneInput({
    value,
    onChange,
    placeholder = "9876543210",
    className = "",
    disabled = false,
    onValidationChange
}: PhoneInputProps) {
    const [isValid, setIsValid] = useState(true);

    const handlePhoneChange = useCallback((inputValue: string) => {
        // Remove all non-digit characters
        const digitsOnly = inputValue.replace(/\D/g, '');

        // Limit to 10 digits
        const limitedDigits = digitsOnly.slice(0, 10);

        // Update the value
        onChange(limitedDigits);

        // Validate phone number
        const phoneRegex = /^[6-9]\d{9}$/;
        const valid = limitedDigits.length === 10 && phoneRegex.test(limitedDigits);

        setIsValid(valid);
        onValidationChange?.(valid);
    }, [onChange, onValidationChange]);

    const formatDisplayValue = (phone: string) => {
        if (phone.length === 0) return '';
        if (phone.length <= 3) return phone;
        if (phone.length <= 6) return `${phone.slice(0, 3)} ${phone.slice(3)}`;
        if (phone.length <= 8) return `${phone.slice(0, 3)} ${phone.slice(3, 6)} ${phone.slice(6)}`;
        return `${phone.slice(0, 3)} ${phone.slice(3, 6)} ${phone.slice(6, 8)} ${phone.slice(8)}`;
    };

    return (
        <div className="relative">
            <input
                type="tel"
                value={formatDisplayValue(value)}
                onChange={(e) => handlePhoneChange(e.target.value)}
                placeholder={placeholder}
                disabled={disabled}
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 transition-colors ${isValid
                    ? 'border-gray-300 focus:ring-blue-500 focus:border-transparent'
                    : 'border-red-300 focus:ring-red-500 focus:border-red-500'
                    } ${className}`}
                maxLength={14} // Account for formatting spaces
            />

            {/* Validation indicator */}
            {value.length > 0 && (
                <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                    {isValid ? (
                        <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                    ) : (
                        <svg className="w-4 h-4 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    )}
                </div>
            )}

            {/* Error message */}
            {value.length > 0 && !isValid && (
                <p className="text-xs text-red-600 mt-1">
                    Please enter a valid 10-digit mobile number
                </p>
            )}

            {/* Success message */}
            {value.length === 10 && isValid && (
                <p className="text-xs text-green-600 mt-1">
                    ✓ Valid phone number
                </p>
            )}
        </div>
    );
}

// Helper function to validate phone numbers
export const validatePhoneNumber = (phone: string): { isValid: boolean; error?: string } => {
    const cleanPhone = phone.replace(/\D/g, '');
    const phoneRegex = /^[6-9]\d{9}$/;

    if (cleanPhone.length === 0) {
        return { isValid: false, error: 'Phone number is required' };
    }

    if (cleanPhone.length < 10) {
        return { isValid: false, error: 'Phone number must be 10 digits' };
    }

    if (!phoneRegex.test(cleanPhone)) {
        return { isValid: false, error: 'Please enter a valid 10-digit mobile number' };
    }

    return { isValid: true };
};

// Helper function to format phone number for database
export const formatPhoneForDB = (phone: string): string => {
    const cleanPhone = phone.replace(/\D/g, '');
    return `+91-${cleanPhone}`;
};
