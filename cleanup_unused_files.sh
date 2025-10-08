#!/bin/bash

# Cleanup script for unused database files
# This script removes all the old migration and debug files

echo "🧹 Cleaning up unused database files..."

# List of files to delete (old migration scripts, debug files, etc.)
FILES_TO_DELETE=(
    # Old migration scripts
    "db/enable_multi_role_system.sql"
    "db/enforce_single_role.sql"
    "db/enforce_single_role_simple.sql"
    "db/step1_add_role_column.sql"
    "db/step2_cleanup_old_columns.sql"
    "db/fix_roles_column_final.sql"
    "db/cleanup_roles_references.sql"
    "db/fix_roles_policies.sql"
    
    # Debug/Test scripts
    "db/debug_bookings.sql"
    "db/debug_user_creation.sql"
    "db/debug_user_flow.sql"
    "db/test_match_creation.sql"
    "db/check_and_create_user.sql"
    "db/check_and_fix_user.sql"
    "db/check_current_schema.sql"
    "db/check_database_functions.sql"
    "db/check_matches_constraints.sql"
    "db/check_matches_table_structure.sql"
    "db/check_user_exists.sql"
    "db/create_missing_user.sql"
    
    # Old fix scripts
    "db/fix_matches_foreign_key.sql"
    "db/fix_matches_properly.sql"
    "db/fix_matches_rls.sql"
    "db/fix_matches_rls_dev.sql"
    "db/fix_matches_rls_dev_final.sql"
    "db/disable_rls_completely.sql"
    "db/disable_rls_temporarily.sql"
    "db/make_matches_dev_friendly.sql"
    "db/create_matches_table_if_missing.sql"
    "db/fix_foreign_key_to_profiles.sql"
    "db/fix_matches_constraints.sql"
    "db/fix_matches_rls_dev_final.sql"
    
    # Booking-related scripts (if not using bookings)
    "db/add_booking_columns.sql"
    "db/bookings_schema.sql"
    "db/check_bookings_structure.sql"
    "db/clean_bookings_table.sql"
    "db/clean_bookings_with_dependencies.sql"
    "db/complete_bookings_cleanup.sql"
    "db/fix_bookings_rls.sql"
    "db/fix_bookings_structure.sql"
    "db/fix_bookings_table.sql"
    "db/recreate_bookings_table.sql"
    "db/remove_foreign_key_constraint.sql"
    
    # Other old scripts
    "db/fix_profiles_foreign_key.sql"
    "db/fix_role_constraint.sql"
    "db/fix_user_id_column.sql"
    "db/make_court_id_nullable.sql"
    "db/standardize_phone_format.sql"
    "db/update_profiles_schema.sql"
    "db/time_slots_schema.sql"
    
    # Test data files
    "db/setup_test_users.sql"
    "insert_test_profile.sql"
    
    # Documentation (optional)
    "db/setup_dummy_data.md"
)

# Delete each file
for file in "${FILES_TO_DELETE[@]}"; do
    if [ -f "$file" ]; then
        echo "🗑️  Deleting: $file"
        rm "$file"
    else
        echo "⚠️  File not found: $file"
    fi
done

echo ""
echo "✅ Cleanup complete!"
echo ""
echo "📁 Remaining database files:"
ls -la db/

echo ""
echo "📋 Summary:"
echo "✅ Kept: 01_complete_schema.sql (all table definitions)"
echo "✅ Kept: 02_rls_permissions.sql (all RLS policies)"
echo "✅ Kept: add_points_system.sql (points system)"
echo "✅ Kept: schema.sql (dummy data - optional)"
echo "✅ Kept: scoring_schema.sql (scoring system - optional)"
echo ""
echo "🗑️  Deleted: $(echo "${FILES_TO_DELETE[@]}" | wc -w) unused files"
