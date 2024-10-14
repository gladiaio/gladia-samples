declare module "mic" {
  type MicOptions = {
    rate: number
    channels: number
  }
  type Mic = {
    start(): void
    stop(): void
    getAudioStream(): NodeJS.ReadableStream & {
      on(event: "data", listener: (data: Buffer) => void): void
      on(event: "error", listener: (error: Error) => void): void
    }
  }
  function MicConstructor(options: MicOptions): Mic
  export = MicConstructor
}
