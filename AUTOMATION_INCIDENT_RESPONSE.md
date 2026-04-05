# Automation Incident Response

## Trigger conditions
- Degraded automation health with repeated override/failure burden.
- Governance conflict on risky workflow.
- Unsafe policy mismatch during rollout.

## Immediate actions
1. Pause affected rollout scope.
2. Capture current state (trace, health, blockers, governance conflicts).
3. Assign incident owner and reviewer.
4. Decide rollback vs constrained retry.

## Recovery
- Run governance gap scan.
- Re-run simulation with updated policy/config.
- Validate readiness checklist before reactivation.
- Resume staged rollout only after stability window.

## Post-incident
- Add success/support intervention note.
- Update known limitations if pattern repeats.
- Attach compliance/evidence references where required.
