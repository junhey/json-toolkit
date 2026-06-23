/// <reference types="vite/client" />

declare module '*.wasm' {
  const value: any;
  export default value;
}
