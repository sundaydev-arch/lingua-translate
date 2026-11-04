/**
 * Unit tests run in Node with no VS Code runtime.
 * This provides the minimal `vscode` stub the tests need, avoiding imports of the real module.
 */
const configuration = {
  get<T>(_key: string, fallback: T): T {
    return fallback;
  },
  update(): Thenable<void> {
    return Promise.resolve();
  }
};

export const workspace = {
  getConfiguration: () => configuration,
  workspaceFolders: []
};

export const env = {
  language: 'zh-cn'
};

export const ConfigurationTarget = {
  Global: 1,
  Workspace: 2,
  WorkspaceFolder: 3
};

export const window = {
  showInformationMessage: () => Promise.resolve(undefined),
  showWarningMessage: () => Promise.resolve(undefined),
  setStatusBarMessage: () => undefined
};

export class EventEmitter<T> {
  private listeners: Array<(value: T) => void> = [];
  readonly event = (listener: (value: T) => void) => {
    this.listeners.push(listener);
    return { dispose: () => undefined };
  };
  fire(value: T): void {
    for (const listener of this.listeners) listener(value);
  }
  dispose(): void {
    this.listeners = [];
  }
}

export default { workspace, env, window, ConfigurationTarget, EventEmitter };
