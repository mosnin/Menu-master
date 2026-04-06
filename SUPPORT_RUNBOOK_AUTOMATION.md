# Automation Support Runbook

## Triage order
1. Confirm org context and membership.
2. Check setup blockers in `/ops/automation-success`.
3. Check import/install state in `/ops/automation-library`.
4. Check governance conflicts in `/ops/automation-governance`.
5. Check ROI/negative signals in `/ops/automation-economics`.

## Common stuck states
- **Blocked setup**: missing entitlement, owner, or reviewer.
- **Import blocked**: missing tools/entitlements or policy mismatch.
- **Activated but no value**: low usage, high overrides, low ROI.

## Intervention playbook
- Recommend simulation completion.
- Assign owner/reviewer.
- Complete release review.
- Reduce rollout scope to pilot.
- Trigger ROI recompute after fixes.

## Permissions
Only `broker_admin` can run mutation actions for setup, import/export, and success notes.
