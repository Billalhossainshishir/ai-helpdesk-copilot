# Database Schema - Milestone 1

This milestone implements the three core tables specified in the roadmap.

## tickets
- id
- ticket_number
- name
- email
- title
- description
- device_type
- category
- priority
- status
- assigned_to
- created_at
- resolved_at
- resolution

Statuses: `Open`, `In Progress`, `Waiting`, `Resolved`, `Closed`.

Priorities: `Low`, `Medium`, `High`, `Critical`.

## ticket_notes
- id
- ticket_id
- author
- note
- created_at

## knowledge_base
- id
- title
- category
- problem
- solution
- keywords

`ticket_notes` and `knowledge_base` are created now so later milestones can add technician notes and troubleshooting retrieval without redesigning the database.
