import AnsiToHtml from 'ansi-to-html';

const ansiConverter = new AnsiToHtml({
  fg: '#d4d4d4',
  bg: '#0a0a0a',
  newline: false,
  escapeXML: true,
  stream: false,
});

export function ansiToHtml(text: string): string {
  return ansiConverter.toHtml(text);
}

export function escapeHtml(text: string): string {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}
