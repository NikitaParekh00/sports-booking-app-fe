import { createClient } from './supabaseClient';

export interface UserRole {
    user_id: string;
    roles: string[];
    full_name: string;
    phone: string;
    email?: string;
}

export class RoleManager {
    private supabase = createClient();

    /**
     * Get user with all their roles
     */
    async getUserWithRoles(userId: string): Promise<UserRole | null> {
        const { data, error } = await this.supabase
            .from('profiles')
            .select('user_id, full_name, phone, email, roles')
            .eq('user_id', userId)
            .single();

        if (error || !data) return null;

        return {
            user_id: data.user_id,
            roles: data.roles || ['player'],
            full_name: data.full_name,
            phone: data.phone,
            email: data.email
        };
    }

    /**
     * Check if user has a specific role
     */
    async hasRole(userId: string, role: string): Promise<boolean> {
        const user = await this.getUserWithRoles(userId);
        return user?.roles.includes(role) || false;
    }

    /**
     * Add role to user
     */
    async addRole(userId: string, role: string): Promise<boolean> {
        const user = await this.getUserWithRoles(userId);
        if (!user) return false;

        if (user.roles.includes(role)) return true; // Already has role

        const { error } = await this.supabase
            .from('profiles')
            .update({
                roles: [...user.roles, role]
            })
            .eq('user_id', userId);

        return !error;
    }

    /**
     * Remove role from user
     */
    async removeRole(userId: string, role: string): Promise<boolean> {
        const user = await this.getUserWithRoles(userId);
        if (!user) return false;

        if (!user.roles.includes(role)) return true; // Already doesn't have role

        const { error } = await this.supabase
            .from('profiles')
            .update({
                roles: user.roles.filter(r => r !== role)
            })
            .eq('user_id', userId);

        return !error;
    }

    /**
     * Check if user can be a player (business logic)
     */
    async canBePlayer(userId: string): Promise<{ canPlay: boolean; reason?: string }> {
        const user = await this.getUserWithRoles(userId);
        if (!user) {
            return { canPlay: false, reason: 'User not found' };
        }

        // Everyone can be a player (owners, players, admins)
        return { canPlay: true };
    }

    /**
     * Check if user can be an owner
     */
    async canBeOwner(userId: string): Promise<{ canOwn: boolean; reason?: string }> {
        const user = await this.getUserWithRoles(userId);
        if (!user) {
            return { canOwn: false, reason: 'User not found' };
        }

        // Check if user already has owner role
        if (user.roles.includes('owner')) {
            return { canOwn: true };
        }

        // Business rules for becoming an owner
        // 1. Must have valid phone number
        if (!user.phone || user.phone.length < 10) {
            return { canOwn: false, reason: 'Valid phone number required to become an owner' };
        }

        // 2. Must have full name
        if (!user.full_name || user.full_name.trim().length < 2) {
            return { canOwn: false, reason: 'Full name required to become an owner' };
        }

        return { canOwn: true };
    }

    /**
     * Get user's primary role for UI display
     */
    getPrimaryRole(roles: string[]): string {
        // Priority: admin > owner > player
        if (roles.includes('admin')) return 'admin';
        if (roles.includes('owner')) return 'owner';
        return 'player';
    }

    /**
     * Get user's role-based dashboard URL
     */
    getDashboardUrl(roles: string[]): string {
        const primaryRole = this.getPrimaryRole(roles);

        switch (primaryRole) {
            case 'admin': return '/admin';
            case 'owner': return '/owner';
            case 'player': return '/dashboard';
            default: return '/dashboard';
        }
    }
}

// Export singleton instance
export const roleManager = new RoleManager();
