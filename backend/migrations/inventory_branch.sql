-- Normalize inventory.branch into a separate table
-- Existing table: inventory (id INT(11) UNSIGNED PRIMARY KEY)

-- 1) Create table
CREATE TABLE IF NOT EXISTS `inventory_branch` (
  `id` int(11) unsigned NOT NULL AUTO_INCREMENT,
  `inventory_id` int(11) unsigned NOT NULL,
  `branch` varchar(255) NOT NULL,
  `timestamp` timestamp NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_inventory_branch` (`inventory_id`,`branch`),
  KEY `idx_inventory_branch_inventory_id` (`inventory_id`),
  CONSTRAINT `fk_inventory_branch_inventory`
    FOREIGN KEY (`inventory_id`) REFERENCES `inventory` (`id`)
    ON DELETE CASCADE
    ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;

-- 2) Backfill from the legacy inventory.branch column (one row per inventory record)
INSERT INTO `inventory_branch` (`inventory_id`, `branch`)
SELECT `id`, `branch`
FROM `inventory`
WHERE `branch` IS NOT NULL AND `branch` <> ''
ON DUPLICATE KEY UPDATE `branch` = VALUES(`branch`);

-- 3) Optional: once the app is reading/writing branches from inventory_branch,
--    you can drop the legacy column.
-- ALTER TABLE `inventory` DROP COLUMN `branch`;
