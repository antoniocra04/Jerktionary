declare const registerProcessor: (
  name: string,
  processorCtor: typeof AudioWorkletProcessor
) => void;

declare class AudioWorkletProcessor {
  readonly port: MessagePort;
  process(
    inputs: Float32Array[][],
    outputs: Float32Array[][],
    parameters: Record<string, Float32Array>
  ): boolean;
}

class JerktionaryAudioProcessor extends AudioWorkletProcessor {
  private readonly buffer: number[] = [];
  private readonly chunkSize = 4096;

  process(inputs: Float32Array[][]): boolean {
    const input = inputs[0];
    const channel = input?.[0];

    if (!channel) {
      return true;
    }

    for (const sample of channel) {
      this.buffer.push(sample);
    }

    if (this.buffer.length >= this.chunkSize) {
      const chunk = new Float32Array(this.buffer.splice(0, this.chunkSize));
      this.port.postMessage(chunk, [chunk.buffer]);
    }

    return true;
  }
}

registerProcessor("jerktionary-audio-processor", JerktionaryAudioProcessor);

export {};
