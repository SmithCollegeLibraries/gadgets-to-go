# Custom Filter Options Backend Contract

The Five Colleges frontend expects the production backend to provide custom,
institution-scoped item filters. The frontend is already wired to these endpoints.

## Schema

```sql
CREATE TABLE custom_filter_group (
  id INT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  owner VARCHAR(10) NOT NULL,
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(255) NOT NULL,
  sort_order INT NOT NULL DEFAULT 0,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_custom_filter_group_owner_slug (owner, slug)
);

CREATE TABLE custom_filter_option (
  id INT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  group_id INT UNSIGNED NOT NULL,
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(255) NOT NULL,
  sort_order INT NOT NULL DEFAULT 0,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_custom_filter_option_group_slug (group_id, slug),
  CONSTRAINT fk_custom_filter_option_group
    FOREIGN KEY (group_id) REFERENCES custom_filter_group(id)
    ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE inventory_filter_option (
  inventory_id INT(11) UNSIGNED NOT NULL,
  filter_option_id INT UNSIGNED NOT NULL,
  PRIMARY KEY (inventory_id, filter_option_id),
  CONSTRAINT fk_inventory_filter_option_inventory
    FOREIGN KEY (inventory_id) REFERENCES inventory(id)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_inventory_filter_option_option
    FOREIGN KEY (filter_option_id) REFERENCES custom_filter_option(id)
    ON DELETE CASCADE ON UPDATE CASCADE
);
```

## Endpoints

- `GET /api/filter-options?owner=MHC`
  - Public-safe.
  - Returns active groups and active options ordered by `sort_order`.
- `GET /api/filter-options?owner=MHC&include_inactive=1`
  - Admin-only.
  - Returns active and inactive groups/options for editing.
- `POST /api/filter-options`
  - Admin-only.
  - Body: `{ "owner": "MHC", "groups": [...] }`.
  - Replace/update the owner tree transactionally and return the saved tree.
- `POST /api/inventory/create`
  - Accept repeated `filter_option_ids[]` form fields.
- `POST /api/inventory/update/:id`
  - Accept repeated `filter_option_ids[]` form fields and replace assignments.
- `GET /api/inventory/location-data?owner=MHC`
  - Include `filter_option_ids: number[]` on each inventory item.

## Response Shape

```json
[
  {
    "id": 1,
    "owner": "MHC",
    "name": "Collections",
    "slug": "collections",
    "sort_order": 1,
    "is_active": true,
    "options": [
      {
        "id": 10,
        "name": "MH Media Resources",
        "slug": "mh-media-resources",
        "sort_order": 1,
        "is_active": true
      }
    ]
  }
]
```
