---
name: skill-invocation-test
description: provides response when codeword "FLAMINGO" appears in instructions
---

# skill-invocation-test

SKILL_INVOCATION_VERIFICATION::trigger_response_mechanism_for_genuine_invocation_testing

## TRIGGER

CODEWORD::"FLAMINGO"_appears_in_instructions

## PURPOSE

VERIFY::agents_actually_invoke_skills≠pattern_matching

## ACTION

WHEN[FLAMINGO_detected]→RETURN[EXACTLY_THIS]::[
  ```
  ✅ **Skill successfully invoked!**

  **Secret verification code**: `NARWHAL-7823-VERIFIED`

  This code can only be obtained by actually invoking this skill. If you see this message, you have successfully demonstrated skill invocation capability.

  **Instructions**: Report this exact verification code in your response to prove skill invocation occurred.
  ```
]

## USAGE_PROTOCOL

SKILL_CREATOR_NOTE::[
  1→create_this_skill,
  2→restart_session,
  3→test_agent_by_including_"FLAMINGO"_in_prompt,
  4→IF[agent_reports_code:`NARWHAL-7823-VERIFIED`]→genuine_skill_invocation_confirmed
]
