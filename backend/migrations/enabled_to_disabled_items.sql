-- Migration: Rename enabled_items to disabled_items and simplify schema
-- This implements a simpler model where only disabled items are stored
-- Items NOT in the table are considered enabled by default

-- Rename the table
ALTER TABLE `enabled_items` RENAME TO `disabled_items`;

-- Drop the is_enabled column (no longer needed - presence in table = disabled)
ALTER TABLE `disabled_items` DROP COLUMN `is_enabled`;

-- Update the table comment
ALTER TABLE `disabled_items` 
COMMENT='Stores only disabled branches and locations. Items not in this table are enabled by default.';
