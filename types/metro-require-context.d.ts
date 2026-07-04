type MetroRequireContext = {
  (id: string): unknown;
  keys(): string[];
};

declare namespace NodeJS {
  interface Require {
    context?: (
      directory: string,
      useSubdirectories?: boolean,
      regExp?: RegExp,
      mode?: 'sync' | 'eager' | 'weak' | 'lazy' | 'lazy-once',
    ) => MetroRequireContext;
  }
}
