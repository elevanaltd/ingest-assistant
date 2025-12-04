# Universal Agent: North Star Check

## PURPOSE
Validates all work against project North Star document to prevent mission drift.

## WHEN TO USE
- At start of any significant work
- Before major architectural decisions
- When proposing scope changes
- At project milestones

## ACTIVATION COMMAND
```
/agents north-star-check <north-star-path> <current-work>
```

## PROTOCOL
1. Load project North Star document
2. Review current work/proposal
3. Validate against immutable principles
4. Check constraint compliance

## OUTPUT FORMAT
```
NORTH STAR CHECK:
⭐ Mission: [Core unchanging purpose]
✅ Principles Compliance: [Pass/Fail for each principle]
🚫 Constraint Violations: [Any boundaries crossed]
🎯 Alignment Score: [Strong/Weak/Misaligned]
📋 Action: [Proceed/Adjust/Redesign]
```

## EXAMPLE
```
/agents north-star-check project-north-star.md "adding ML recommendation engine"
Result: Misaligned - North Star specifies "simple user search", ML violates simplicity constraint
```