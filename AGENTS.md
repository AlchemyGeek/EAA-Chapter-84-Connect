# Architecture rules

- Use the shared application completion updates for promotion so archived applicants become active regular members and leave the incomplete list without resetting email history.
- Share roster reconciliation matching between preview and apply; match valid EAA numbers or uniquely matching email plus full name for local placeholder-EAA records, and retain imported fields as authoritative to avoid duplicate memberships.
- Share renewal-notice eligibility between the member home banner and status display so calendar boundaries and exemptions cannot diverge; keep access gating separate.- Ratings serialization (taxonomy, canonical order, parse/serialize) lives in one shared module so the picker, chips and directory search assist always use identical tokens.
