# Final Reliability Fixes

This build fixes the technician-dashboard issue seen during local testing.

## What was fixed

1. **Requester identity is dynamic**
   - The exact name and email submitted by the customer are stored on the ticket.
   - They are shown in AI triage, the ticket receipt, the technician queue and ticket detail drawer.

2. **Legacy demo email bug cannot blank the dashboard**
   - New demo records use valid `example.com` addresses.
   - Existing `DEMO-*` rows using the old `.local` addresses are repaired automatically at startup.
   - Ticket output uses a safe string representation so an older database row cannot make `GET /tickets` fail.

3. **Demo seeding is idempotent**
   - Demo records are identified by `DEMO-*` ticket numbers.
   - Restarting the app no longer tries to insert duplicate `DEMO-0001` records.

4. **Reset demo data is safe**
   - Only `DEMO-*` tickets are reset.
   - User-created `HD-*` tickets remain untouched.

5. **Technician dashboard live updates**
   - Same-browser customer submissions notify an open technician tab immediately.
   - A 5-second polling fallback keeps the queue current.
   - Returning focus to the tab also triggers a refresh.

6. **Dashboard failure isolation**
   - Analytics and ticket-list requests load independently.
   - A problem in one request no longer leaves the entire dashboard showing dashes.

7. **Browser-cache protection for local development**
   - HTML, JavaScript and CSS are served with no-cache headers so replaced files are picked up immediately.

## Verification

- `pytest -q`: **25 passed**
- JavaScript syntax checks passed for both customer and technician scripts.
- Integration verification confirmed:
  - legacy demo email repair;
  - successful custom requester ticket creation;
  - custom name/email visible through `GET /tickets`;
  - analytics updates after submission.
