import { createClient } from './supabaseClient';

export async function fixUserProfile(userId: string, role: 'owner' | 'customer') {
  const supabase = createClient();
  
  try {
    // First, check if profile exists
    const { data: existingProfile, error: fetchError } = await supabase
      .from('profiles')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (fetchError && fetchError.code !== 'PGRST116') {
      console.error('Error fetching profile:', fetchError);
      return { success: false, error: fetchError.message };
    }

    if (existingProfile) {
      // Update existing profile
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ role })
        .eq('user_id', userId);

      if (updateError) {
        console.error('Error updating profile:', updateError);
        return { success: false, error: updateError.message };
      }

      console.log(`Updated profile for user ${userId} to role: ${role}`);
      return { success: true, message: 'Profile updated successfully' };
    } else {
      // Create new profile
      const { error: insertError } = await supabase
        .from('profiles')
        .insert({
          user_id: userId,
          full_name: role === 'owner' ? 'Nikita Parekh' : 'Test Customer',
          phone: '+91-9876543210',
          role: role
        });

      if (insertError) {
        console.error('Error creating profile:', insertError);
        return { success: false, error: insertError.message };
      }

      console.log(`Created profile for user ${userId} with role: ${role}`);
      return { success: true, message: 'Profile created successfully' };
    }
  } catch (error) {
    console.error('Unexpected error:', error);
    return { success: false, error: 'Unexpected error occurred' };
  }
}

// Helper function to get current user and fix their profile
export async function fixCurrentUserProfile(role: 'owner' | 'customer') {
  const supabase = createClient();
  
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  
  if (userError || !user) {
    return { success: false, error: 'No authenticated user found' };
  }

  return await fixUserProfile(user.id, role);
}
