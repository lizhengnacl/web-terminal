import * as pty from 'node-pty';
import { EventEmitter } from 'events';
import { CommandFilter, DefaultCommandFilter } from '../utils/commandFilter';

export interface PTYOptions {
  cols?: number;
  rows?: number;
  cwd?: string;
  env?: { [key: string]: string };
  commandFilter?: CommandFilter;
}

export class PTYProcess extends EventEmitter {
  private pty: pty.IPty | null = null;
  private commandFilter: CommandFilter;
  private isRunning: boolean = false;

  constructor(private options: PTYOptions = {}) {
    super();
    this.commandFilter = options.commandFilter || new DefaultCommandFilter();
  }

  start(cols: number = 80, rows: number = 24): void {
    if (this.pty) {
      this.pty.kill();
    }

    const shell = process.env.SHELL || '/bin/bash';
    const env = {
      ...process.env,
      TERM: 'xterm-256color',
      ...this.options.env,
    };

    this.pty = pty.spawn(shell, [], {
      name: 'xterm-256color',
      cols,
      rows,
      cwd: this.options.cwd || process.env.HOME || '/root',
      env,
    });

    this.isRunning = true;

    this.pty.onData((data: string) => {
      this.emit('data', data);
    });

    this.pty.onExit(({ exitCode, signal }) => {
      this.isRunning = false;
      this.emit('exit', { exitCode, signal });
    });
  }

  write(data: string): boolean {
    if (!this.pty || !this.isRunning) {
      return false;
    }

    if (!this.commandFilter.isAllowed(data)) {
      this.emit('error', new Error('Command not allowed'));
      return false;
    }

    this.pty.write(data);
    return true;
  }

  resize(cols: number, rows: number): void {
    if (this.pty && this.isRunning) {
      this.pty.resize(cols, rows);
    }
  }

  kill(): void {
    if (this.pty) {
      this.pty.kill();
      this.pty = null;
      this.isRunning = false;
    }
  }

  isActive(): boolean {
    return this.isRunning;
  }
}
