# North Star Authorization Command

## Purpose
Authorize North Star document modifications for the current session.

## Usage
```bash
/authorize-north-star-change [reason]
```

## What it does
1. Creates session-specific authorization token
2. Allows North Star document modifications
3. Authorization expires when session ends
4. Logs authorization reason for audit trail

## Example
```bash
/authorize-north-star-change "Market conditions require pivot to mobile-first approach"
```

## Security
- Authorization is session-scoped (PID-based)
- Cannot be transferred between sessions
- Automatically expires
- All usage is logged

## Governance
This command should only be used when:
- Legitimate business requirements change
- Technical constraints require scope adjustment  
- Strategic direction needs evolution
- NOT for scope creep or feature additions