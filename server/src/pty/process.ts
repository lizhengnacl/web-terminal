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
    console.log('[PTYProcess] Starting PTY process...');
    
    if (this.pty) {
      console.log('[PTYProcess] Killing existing PTY process');
      this.pty.kill();
    }

    const shell = '/bin/sh';
    console.log('[PTYProcess] Using shell:', shell);
    
    const env = {
      ...process.env,
      TERM: 'xterm-256color',
      ...this.options.env,
    };

    const cwd = '/tmp';
    console.log('[PTYProcess] Working directory:', cwd);
    
    console.log('[PTYProcess] Spawning PTY with cols:', cols, 'rows:', rows);
    try {
      this.pty = pty.spawn(shell, [], {
        name: 'xterm-256color',
        cols,
        rows,
        cwd,
        env,
      });
      console.log('[PTYProcess] PTY spawned successfully, PID:', this.pty.pid);

      this.isRunning = true;

      this.pty.onData((data: string) => {
        console.log('[PTYProcess] onData triggered, data length:', data.length, 'data:', JSON.stringify(data));
        this.emit('data', data);
      });

      this.pty.onExit(({ exitCode, signal }) => {
        console.log('[PTYProcess] PTY exited, code:', exitCode, 'signal:', signal);
        this.isRunning = false;
        this.emit('exit', { exitCode, signal });
      });
      
      console.log('[PTYProcess] Event listeners attached');
    } catch (error) {
      console.error('[PTYProcess] Failed to spawn PTY:', error);
      console.error('[PTYProcess] Error stack:', error instanceof Error ? error.stack : error);
      throw error;
    }
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
