CREATE TABLE IF NOT EXISTS authorized_users (
  id int(11) NOT NULL AUTO_INCREMENT,
  username varchar(100) NOT NULL,
  full_name varchar(200) DEFAULT NULL,
  email varchar(200) DEFAULT NULL,
  department varchar(100) DEFAULT NULL,
  institution varchar(100) DEFAULT NULL,
  role varchar(50) DEFAULT 'user',
  date_added datetime DEFAULT current_timestamp(),
  approved tinyint(1) NOT NULL DEFAULT 0,
  PRIMARY KEY (id),
  UNIQUE KEY username (username),
  UNIQUE KEY email (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS inventory (
  id int(11) unsigned NOT NULL AUTO_INCREMENT,
  folio_id varchar(255) DEFAULT NULL,
  aleph_id varchar(50) DEFAULT NULL,
  title varchar(255) DEFAULT NULL,
  description text DEFAULT NULL,
  owner varchar(10) DEFAULT NULL,
  location varchar(255) DEFAULT NULL,
  branch varchar(255) DEFAULT NULL,
  sort_order int(10) DEFAULT NULL,
  timestamp timestamp NULL DEFAULT current_timestamp(),
  PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS inventory_branch (
  id int(11) unsigned NOT NULL AUTO_INCREMENT,
  inventory_id int(11) unsigned NOT NULL,
  branch varchar(255) NOT NULL,
  timestamp timestamp NULL DEFAULT current_timestamp(),
  PRIMARY KEY (id),
  UNIQUE KEY uq_inventory_branch (inventory_id, branch),
  KEY idx_inventory_branch_inventory_id (inventory_id),
  CONSTRAINT fk_inventory_branch_inventory FOREIGN KEY (inventory_id) REFERENCES inventory (id) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS label (
  id int(11) unsigned NOT NULL AUTO_INCREMENT,
  name varchar(100) DEFAULT NULL,
  text text DEFAULT NULL,
  location varchar(10) DEFAULT NULL,
  PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS styling (
  id int(11) NOT NULL AUTO_INCREMENT,
  location varchar(10) DEFAULT NULL,
  type varchar(100) DEFAULT NULL,
  color_hash varchar(10) DEFAULT NULL,
  PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS disabled_items (
  id int(11) NOT NULL AUTO_INCREMENT,
  owner varchar(10) NOT NULL,
  item_type enum('branch','location') NOT NULL,
  item_code varchar(50) NOT NULL,
  created_at timestamp NOT NULL DEFAULT current_timestamp(),
  updated_at timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (id),
  UNIQUE KEY unique_item (owner, item_type, item_code),
  KEY idx_owner_type (owner, item_type)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO authorized_users (username, full_name, email, department, institution, role, approved)
VALUES ('admin', 'Local Administrator', 'admin@example.edu', 'Administration', 'local', 'admin', 1)
ON DUPLICATE KEY UPDATE role = VALUES(role), approved = VALUES(approved);

INSERT INTO inventory (id, folio_id, aleph_id, title, description, owner, location, sort_order)
VALUES
  (1, 'demo-camera', '', 'Demo Camera Kit', '<p>Camera kit for local testing.</p>', 'LIB', 'LIBMAIN', 1),
  (2, 'demo-laptop', '', 'Demo Laptop', '<p>Laptop record for local testing.</p>', 'LIB', 'LIBMAIN', 2)
ON DUPLICATE KEY UPDATE title = VALUES(title), description = VALUES(description), owner = VALUES(owner), location = VALUES(location);

INSERT INTO inventory_branch (inventory_id, branch)
VALUES (1, 'LIBMAIN'), (2, 'LIBMAIN')
ON DUPLICATE KEY UPDATE branch = VALUES(branch);

INSERT INTO label (name, text, location)
VALUES
  ('libraryName', 'Main Library', 'LIB'),
  ('headerText', 'Equipment Checkout', 'LIB'),
  ('footerText', '', 'LIB');

INSERT INTO styling (location, type, color_hash)
VALUES
  ('LIB', 'backgroundColor', '#ffffff'),
  ('LIB', 'headerTextColor', '#003c5f'),
  ('LIB', 'titleColor', '#1f2933'),
  ('LIB', 'descriptionColor', '#343a40'),
  ('LIB', 'footerBackgroundColor', '#f8f9fa'),
  ('LIB', 'footer', '#343a40');
