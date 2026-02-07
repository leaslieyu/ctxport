/**
 * Extract a value from a nested object by dot-separated path.
 * Example: getByPath({ a: { b: "hello" } }, "a.b") -> "hello"
 */
export function getByPath(obj: unknown, path: string): unknown {
  const parts = path.split(".");
  let current: unknown = obj;
  for (const part of parts) {
    if (current == null || typeof current !== "object") return undefined;
    current = (current as Record<string, unknown>)[part];
  }
  return current;
}

/**
 * Simple URL template substitution.
 * Replaces {key} with the corresponding value (auto-encodeURIComponent).
 */
export function resolveTemplate(
  template: string,
  vars: Record<string, string>,
): string {
  let result = template;
  for (const [key, value] of Object.entries(vars)) {
    result = result.replace(
      new RegExp(`\\{${key}\\}`, "g"),
      encodeURIComponent(value),
    );
  }
  return result;
}
