export interface CommandFilter {
  isAllowed(command: string): boolean;
  sanitize(command: string): string;
}

export class DefaultCommandFilter implements CommandFilter {
  private allowedCommands: Set<string>;
  private blockedPatterns: RegExp[];

  constructor(allowedCommands: string[] = []) {
    this.allowedCommands = new Set(allowedCommands);
    this.blockedPatterns = [
      /rm\s+-rf\s+\//,
      /:\(\)\{\s*:\|:\s*&\s*\};\s*:/,
      />\s*\/dev\/sda/,
      /mkfs/,
      /dd\s+if=/,
    ];
  }

  isAllowed(command: string): boolean {
    const trimmedCommand = command.trim();

    if (trimmedCommand === '' || trimmedCommand.startsWith('#')) {
      return true;
    }

    if (trimmedCommand === 'clear' || trimmedCommand === 'cls') {
      return true;
    }

    for (const pattern of this.blockedPatterns) {
      if (pattern.test(trimmedCommand)) {
        return false;
      }
    }

    const baseCommand = trimmedCommand.split(/\s+/)[0];

    if (this.allowedCommands.size === 0) {
      return true;
    }

    return this.allowedCommands.has(baseCommand);
  }

  sanitize(command: string): string {
    return command.replace(/[<>|&;$`\\]/g, (match) => `\\${match}`);
  }
}
