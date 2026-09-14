-- Ensure future tables created by ANY role (e.g. Django migrations run
-- as the admin user) are automatically accessible to Vault's dynamic
-- roles (granted via PUBLIC) without manual re-granting.

ALTER DEFAULT PRIVILEGES IN SCHEMA public
GRANT ALL PRIVILEGES ON TABLES TO PUBLIC;

ALTER DEFAULT PRIVILEGES IN SCHEMA public
GRANT ALL PRIVILEGES ON SEQUENCES TO PUBLIC;

ALTER DEFAULT PRIVILEGES IN SCHEMA public
GRANT ALL PRIVILEGES ON FUNCTIONS TO PUBLIC;