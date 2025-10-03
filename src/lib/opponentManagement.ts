import { createClient } from './supabaseClient';
import { validatePhoneNumber, formatPhoneForDB } from '@/components/PhoneInput';

export interface OpponentInfo {
    user_id: string | null;
    player_name: string;
    phone: string;
    isNewUser: boolean;
}

export class OpponentManager {
    private supabase = createClient();

    /**
     * Find or create opponent user
     * @param phone - Opponent's phone number (10 digits)
     * @param name - Opponent's name (optional)
     * @returns OpponentInfo with user details
     */
    async findOrCreateOpponent(phone: string, name?: string): Promise<OpponentInfo> {
        // Validate phone number first
        const phoneValidation = validatePhoneNumber(phone);
        if (!phoneValidation.isValid) {
            throw new Error(phoneValidation.error || 'Invalid phone number');
        }

        const formattedPhone = formatPhoneForDB(phone);

        try {
            // Check if opponent already exists as a PLAYER (role-specific lookup)
            const { data: existingOpponent, error: fetchError } = await this.supabase
                .from('profiles')
                .select('user_id, full_name, role')
                .eq('phone', formattedPhone)
                .eq('role', 'player') // Check for player role specifically
                .single();

            if (existingOpponent && !fetchError) {
                // Player found - they can be opponents
                return {
                    user_id: existingOpponent.user_id,
                    player_name: existingOpponent.full_name,
                    phone: formattedPhone,
                    isNewUser: false
                };
            }

            // Check if phone exists with other roles (owner/admin)
            const { data: otherRoleUser } = await this.supabase
                .from('profiles')
                .select('user_id, full_name, role')
                .eq('phone', formattedPhone)
                .neq('role', 'player')
                .single();

            if (otherRoleUser) {
                // User exists but not as a player - they need a separate player account
                // We'll create a new player account for them
                console.log('User exists with different role - creating new player account');
            }

            // Opponent doesn't exist - create new profile
            const newUserId = crypto.randomUUID();
            const playerName = name || 'Opponent';

            const { error: createError } = await this.supabase
                .from('profiles')
                .insert({
                    user_id: newUserId,
                    full_name: playerName,
                    phone: formattedPhone,
                    role: 'player'
                });

            if (createError) {
                console.error('Error creating opponent profile:', createError);
                // Return opponent info without user_id (will be handled gracefully)
                return {
                    user_id: null,
                    player_name: playerName,
                    phone: formattedPhone,
                    isNewUser: true
                };
            }

            return {
                user_id: newUserId,
                player_name: playerName,
                phone: formattedPhone,
                isNewUser: true
            };

        } catch (error) {
            console.error('Error in findOrCreateOpponent:', error);
            // Fallback - return basic info without user_id
            return {
                user_id: null,
                player_name: name || 'Opponent',
                phone: formattedPhone,
                isNewUser: true
            };
        }
    }

    /**
     * Validate phone number format
     */
    validatePhoneNumber(phone: string): { isValid: boolean; error?: string } {
        const cleanPhone = phone.replace(/\D/g, '');
        const phoneRegex = /^[6-9]\d{9}$/;

        if (!phoneRegex.test(cleanPhone)) {
            return {
                isValid: false,
                error: 'Please enter a valid 10-digit mobile number'
            };
        }

        return { isValid: true };
    }

    /**
     * Check if user is trying to create match with themselves
     */
    isSelfMatch(opponentPhone: string, currentUserPhone: string): boolean {
        const cleanOpponent = opponentPhone.replace(/\D/g, '');
        const cleanCurrent = currentUserPhone.replace(/\D/g, '');
        return cleanOpponent === cleanCurrent;
    }
}

// Export singleton instance
export const opponentManager = new OpponentManager();
