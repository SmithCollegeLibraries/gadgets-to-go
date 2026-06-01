ALTER TABLE authorized_users
  ADD COLUMN auth_provider varchar(50) NOT NULL DEFAULT 'shibboleth' AFTER approved,
  ADD COLUMN password_hash varchar(255) DEFAULT NULL AFTER auth_provider,
  ADD COLUMN password_reset_token_hash varchar(255) DEFAULT NULL AFTER password_hash,
  ADD COLUMN password_reset_expires_at datetime DEFAULT NULL AFTER password_reset_token_hash,
  ADD COLUMN last_login_at datetime DEFAULT NULL AFTER password_reset_expires_at;

UPDATE authorized_users
SET auth_provider = 'shibboleth'
WHERE auth_provider IS NULL OR auth_provider = '';
