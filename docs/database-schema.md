# Database Schema

## `tickets`

- `id`
- `ticket_number`
- `name`
- `email`
- `title`
- `description`
- `device_type`
- `category`
- `priority`
- `status`
- `assigned_to`
- `created_at`
- `resolved_at`
- `resolution`

Statuses: `Open`, `In Progress`, `Waiting`, `Resolved`, `Closed`.

Priorities: `Low`, `Medium`, `High`, `Critical`.

## `ticket_notes`

- `id`
- `ticket_id`
- `author`
- `note`
- `created_at`

## `knowledge_base`

- `id`
- `title`
- `category`
- `problem`
- `solution`
- `keywords`

The knowledge base is initially seeded from `data/knowledge_base.json`. Ticket notes and resolved incidents remain relational so the technician workflow and similar-incident search can use the same operational data.
