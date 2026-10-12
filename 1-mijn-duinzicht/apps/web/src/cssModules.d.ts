declare module '*.module.css' {
  const classNames: Readonly<Record<string, string>>;
  export default classNames;
}

/** The two global stylesheets `main.tsx` imports for their side effect only. */
declare module '*/tokens.css';
declare module '*/global.css';
