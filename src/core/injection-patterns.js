// Editable rule list for prompt-injection heuristics.
// Add/remove/tune entries here without touching detection logic (injection.js).
//
// Each rule: { id, regex, label, weight }
//   id     stable identifier (used in findings / tests)
//   regex  matched against text; use the 'i' flag, no global flag needed
//   label  human-readable description shown in the UI
//   weight rough confidence 1..3 (reserved for future scoring refinements)

/** @type {{ id: string, regex: RegExp, label: string, weight: number }[]} */
export const INJECTION_PATTERNS = [
  {
    id: 'ignore-previous',
    regex: /\b(ignore|disregard|forget)\b[^.\n]{0,40}\b(previous|prior|above|earlier|all)\b[^.\n]{0,20}\b(instruction|prompt|message|context|rule)s?\b/i,
    label: 'asks the AI to ignore previous instructions',
    weight: 3,
  },
  {
    id: 'new-instructions',
    regex: /\b(new|updated|revised|the following)\b[^.\n]{0,20}\b(instruction|directive|rule|task)s?\b/i,
    label: 'introduces "new instructions"',
    weight: 2,
  },
  {
    id: 'you-are-now',
    regex: /\byou\s+are\s+(now|a|an|hereby)\b/i,
    label: 'attempts to reassign the AI\'s role ("you are now…")',
    weight: 2,
  },
  {
    id: 'system-prompt',
    regex: /\bsystem\s*(prompt|message|instruction)s?\b/i,
    label: 'references the system prompt',
    weight: 2,
  },
  {
    id: 'as-an-ai',
    regex: /\bas\s+an?\s+(ai|assistant|language\s+model|llm)\b/i,
    label: 'addresses the reader as an AI',
    weight: 1,
  },
  {
    id: 'assistant-turn',
    regex: /^\s*(assistant|ai|system|user)\s*:/im,
    label: 'fakes a chat turn ("assistant:")',
    weight: 2,
  },
  {
    id: 'do-not-tell',
    regex: /\bdo\s+not\s+(tell|inform|reveal|mention|disclose)\b[^.\n]{0,30}\b(user|human|anyone)\b/i,
    label: 'tells the AI to hide something from the user',
    weight: 3,
  },
  {
    id: 'role-tag',
    regex: /<\/?\s*(system|user|assistant|instructions?|im_start|im_end)\s*>|\[\/?\s*(INST|SYS)\s*\]/i,
    label: 'contains chat/role markup (<system>, [INST]…)',
    weight: 3,
  },
  {
    id: 'override-directive',
    regex: /\b(override|bypass|jailbreak|developer\s+mode)\b/i,
    label: 'uses override/jailbreak language',
    weight: 2,
  },
  {
    id: 'imperative-to-ai',
    regex: /\b(your\s+(new\s+)?(task|goal|instruction|objective)\s+is)\b/i,
    label: 'states a task/goal directed at the AI',
    weight: 2,
  },
];
