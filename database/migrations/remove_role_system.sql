-- Migration: Remove role system
-- Date: 2025-10-03
-- Description: Remove role field from users table to make system suitable for both family and work scenarios

-- Drop the role index first
ALTER TABLE `users` DROP INDEX `idx_role`;

-- Drop the role column
ALTER TABLE `users` DROP COLUMN `role`;
