const PERCENT_PATTERN = /(\d+(?:\.\d+)?)\s*%/;
const HOURS_PATTERN = /(\d+(?:\.\d+)?)\s*(?:hours?|hrs?)\b/i;
const FULL_TIME_PATTERN = /\bfull[\s-]?time\b/i;

export interface ParsedRequirement {
  requiredUtilizationPercent: number | null;
}

export function parseRequirement(requirement: string, maxWeeklyHours: number): ParsedRequirement {
  const normalized = requirement.trim();

  if (FULL_TIME_PATTERN.test(normalized)) {
    return { requiredUtilizationPercent: 100 };
  }

  const percentMatch = normalized.match(PERCENT_PATTERN);
  if (percentMatch) {
    return { requiredUtilizationPercent: Number(percentMatch[1]) };
  }

  const hoursMatch = normalized.match(HOURS_PATTERN);
  if (hoursMatch && maxWeeklyHours > 0) {
    const hours = Number(hoursMatch[1]);
    return { requiredUtilizationPercent: (hours / maxWeeklyHours) * 100 };
  }

  return { requiredUtilizationPercent: null };
}

export function extractJsonArray(text: string): unknown[] {
  const trimmed = stripLlmJsonText(text);

  try {
    const direct = JSON.parse(trimmed) as unknown;
    if (Array.isArray(direct)) {
      return direct;
    }
  } catch {
    // fall through
  }

  const start = trimmed.indexOf('[');
  const end = trimmed.lastIndexOf(']');
  if (start === -1 || end === -1 || end <= start) {
    throw new Error('No JSON array found in LLM response');
  }

  const slice = trimmed.slice(start, end + 1);
  const parsed = JSON.parse(slice) as unknown;
  if (!Array.isArray(parsed)) {
    throw new Error('Parsed LLM payload is not an array');
  }

  return parsed;
}

export function stripLlmJsonText(text: string): string {
  const trimmed = text.trim();
  const fenceMatch = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
  return fenceMatch ? fenceMatch[1].trim() : trimmed;
}

export function extractJsonObject(text: string): Record<string, unknown> {
  const trimmed = stripLlmJsonText(text);

  try {
    const direct = JSON.parse(trimmed) as unknown;
    if (direct && typeof direct === 'object' && !Array.isArray(direct)) {
      return direct as Record<string, unknown>;
    }
  } catch {
    // fall through
  }

  const start = trimmed.indexOf('{');
  const end = trimmed.lastIndexOf('}');
  if (start === -1 || end === -1 || end <= start) {
    throw new Error('No JSON object found in LLM response');
  }

  const slice = trimmed.slice(start, end + 1);
  const parsed = JSON.parse(slice) as unknown;
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error('Parsed LLM payload is not an object');
  }

  return parsed as Record<string, unknown>;
}
