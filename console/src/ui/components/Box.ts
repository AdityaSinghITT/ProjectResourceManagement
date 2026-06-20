export function drawTitle(title: string, width = 46): void {
  const inner = title.length > width - 4 ? title.slice(0, width - 7) + '...' : title;
  const line = '═'.repeat(width);
  console.log(`╔${line}╗`);
  console.log(`║${centerText(inner, width)}║`);
  console.log(`╚${line}╝`);
}

export function drawSubtitle(text: string): void {
  console.log(text);
}

export function drawDivider(width = 46): void {
  console.log('─'.repeat(width));
}

function centerText(text: string, width: number): string {
  const contentWidth = width;
  const padding = Math.max(0, contentWidth - text.length);
  const left = Math.floor(padding / 2);
  return ' '.repeat(left) + text + ' '.repeat(padding - left);
}
