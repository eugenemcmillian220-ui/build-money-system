export function trimContextWindow(context: string[], maxItems = 12): string[] {
  if (context.length <= maxItems) return context
  return context.slice(context.length - maxItems)
}

export function buildPromptContext(context: string[]): string {
  return trimContextWindow(context)
    .map((entry, index) => `#${index + 1} ${entry}`)
    .join('\n')
}
