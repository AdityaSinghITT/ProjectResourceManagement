export const AiMessages = {
  NOT_CONFIGURED:
    'LLM is not configured. Set provider, base URL, model, and API key in Admin > System Configuration.',
  GENERATION_FAILED: 'LLM request failed. Check base URL, model name, and API key.',
  INVALID_RESPONSE: 'LLM returned an unexpected response format.',
  PROJECT_NOT_OWNED: 'You can only request AI summaries for your own projects.',
  PROJECT_NOT_FOUND: 'Project not found',
  DISCLAIMER:
    'AI-generated suggestion based on current system data. Verify before making allocation decisions.',
  RISK_DISCLAIMER:
    'AI-generated summary based on milestones, allocations, and timesheet data. Confirm with structured risk flags.',
  TEAM_BUILDER_DISCLAIMER:
    'AI-generated team suggestions based on current organization data. No allocation was performed. Verify before staffing decisions.',
} as const;
