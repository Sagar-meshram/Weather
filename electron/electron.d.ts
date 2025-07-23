/// <reference types="node" />

declare module 'electron' {
  export interface BrowserWindowConstructorOptions {
    width?: number;
    height?: number;
    x?: number;
    y?: number;
    minWidth?: number;
    minHeight?: number;
    show?: boolean;
    frame?: boolean;
    transparent?: boolean;
    alwaysOnTop?: boolean;
    fullscreenable?: boolean;
    hasShadow?: boolean;
    opacity?: number;
    backgroundColor?: string;
    focusable?: boolean;
    skipTaskbar?: boolean;
    type?: 'normal' | 'desktop' | 'dock' | 'toolbar' | 'splash' | 'notification' | 'panel';
    paintWhenInitiallyHidden?: boolean;
    titleBarStyle?: 'default' | 'hidden' | 'hiddenInset' | 'customButtonsOnHover';
    enableLargerThanScreen?: boolean;
    movable?: boolean;
    webPreferences?: {
      nodeIntegration?: boolean;
      contextIsolation?: boolean;
      preload?: string;
      scrollBounce?: boolean;
    };
  }

  export class BrowserWindow {
    constructor(options: BrowserWindowConstructorOptions);
    static getAllWindows(): BrowserWindow[];
    loadFile(filePath: string): Promise<void>;
    loadURL(url: string): Promise<void>;
    show(): void;
    showInactive(): void;
    hide(): void;
    focus(): void;
    restore(): void;
    isMinimized(): boolean;
    isDestroyed(): boolean;
    getBounds(): { x: number; y: number; width: number; height: number };
    setBounds(bounds: { x?: number; y?: number; width?: number; height?: number }): void;
    getPosition(): [number, number];
    setPosition(x: number, y: number): void;
    getOpacity(): number;
    setOpacity(opacity: number): void;
    setIgnoreMouseEvents(ignore: boolean, options?: { forward?: boolean }): void;
    setAlwaysOnTop(flag: boolean, level?: string, relativeLevel?: number): void;
    setVisibleOnAllWorkspaces(visible: boolean, options?: { visibleOnFullScreen?: boolean }): void;
    setContentProtection(enable: boolean): void;
    setHiddenInMissionControl?(hidden: boolean): void;
    setWindowButtonVisibility?(visible: boolean): void;
    setBackgroundColor(color: string): void;
    setSkipTaskbar(skip: boolean): void;
    setHasShadow(hasShadow: boolean): void;
    webContents: WebContents;
    on(event: string, listener: (...args: any[]) => void): void;
  }

  export interface WebContents {
    setZoomFactor(factor: number): void;
    openDevTools(): void;
    setWindowOpenHandler(handler: (details: { url: string }) => { action: 'allow' | 'deny' }): void;
    setBackgroundThrottling(allowed: boolean): void;
    setFrameRate(fps: number): void;
    getZoomLevel(): number;
    setZoomLevel(level: number): void;
    send(channel: string, ...args: any[]): void;
    on(event: string, listener: (...args: any[]) => void): void;
  }

  export interface Display {
    workAreaSize: { width: number; height: number };
  }

  export interface Screen {
    getPrimaryDisplay(): Display;
  }

  export interface App {
    getPath(name: string): string;
    setPath(name: string, path: string): void;
    setAsDefaultProtocolClient(protocol: string, path?: string, args?: string[]): boolean;
    requestSingleInstanceLock(): boolean;
    quit(): void;
    whenReady(): Promise<void>;
    on(event: string, listener: (...args: any[]) => void): App;
  }

  export interface GlobalShortcut {
    register(accelerator: string, callback: () => void): boolean;
    unregisterAll(): void;
  }

  export interface Shell {
    openExternal(url: string): Promise<void>;
  }

  export const app: App;
  export const screen: Screen;
  export const shell: Shell;
  export const globalShortcut: GlobalShortcut;
  export const ipcMain: any;
}

declare namespace NodeJS {
  interface Process {
    defaultApp?: boolean;
    resourcesPath?: string;
  }
}

export {};
