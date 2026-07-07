import type {
  IAudioBuffer,
  IAudioBufferSourceNode,
  IAudioContext,
  IAudioDestinationNode,
  IAudioNode,
  IAudioParam,
  IAudioWorkletContext,
  IAudioWorkletNode,
  IAudioWorkletNodeOptions,
  IAudioWorkletParameterMap,
  IBiquadFilterNode,
  IConvolverNode,
  IDelayNode,
  IDynamicsCompressorNode,
  IGainNode,
  IOfflineAudioContext,
  IStereoPannerNode,
} from "../audio-context";

export type FakeAutomationEvent =
  | { op: "setValueAtTime"; value: number; time: number }
  | { op: "linearRampToValueAtTime"; value: number; time: number }
  | { op: "cancelScheduledValues"; time: number };

/**
 * Always-succeeding fakes of the Web Audio node/context surface — no real
 * audio device exists in this package's Node test environment. Mirrors
 * `packages/rendering/src/test-support/fake-webgpu-context.ts`'s approach
 * of exercising the real call sequence (connections, param automation,
 * start/stop) without a real backend.
 */
export class FakeAudioParam implements IAudioParam {
  value = 0;
  readonly automation: FakeAutomationEvent[] = [];

  setValueAtTime(value: number, startTime: number): IAudioParam {
    this.value = value;
    this.automation.push({ op: "setValueAtTime", value, time: startTime });
    return this;
  }

  linearRampToValueAtTime(value: number, endTime: number): IAudioParam {
    this.value = value;
    this.automation.push({ op: "linearRampToValueAtTime", value, time: endTime });
    return this;
  }

  cancelScheduledValues(startTime: number): IAudioParam {
    this.automation.push({ op: "cancelScheduledValues", time: startTime });
    return this;
  }
}

class FakeAudioNodeBase implements IAudioNode {
  readonly connections: IAudioNode[] = [];

  connect(destination: IAudioNode): IAudioNode {
    this.connections.push(destination);
    return destination;
  }

  disconnect(destination?: IAudioNode): void {
    if (!destination) {
      this.connections.length = 0;
      return;
    }
    const index = this.connections.indexOf(destination);
    if (index >= 0) {
      this.connections.splice(index, 1);
    }
  }
}

export class FakeGainNode extends FakeAudioNodeBase implements IGainNode {
  readonly gain = new FakeAudioParam();
}

export class FakeStereoPannerNode extends FakeAudioNodeBase implements IStereoPannerNode {
  readonly pan = new FakeAudioParam();
}

export class FakeBiquadFilterNode extends FakeAudioNodeBase implements IBiquadFilterNode {
  type = "peaking";
  readonly frequency = new FakeAudioParam();
  readonly Q = new FakeAudioParam();
  readonly gain = new FakeAudioParam();
}

export class FakeDynamicsCompressorNode
  extends FakeAudioNodeBase
  implements IDynamicsCompressorNode
{
  readonly threshold = new FakeAudioParam();
  readonly knee = new FakeAudioParam();
  readonly ratio = new FakeAudioParam();
  readonly attack = new FakeAudioParam();
  readonly release = new FakeAudioParam();
}

export class FakeDelayNode extends FakeAudioNodeBase implements IDelayNode {
  readonly delayTime = new FakeAudioParam();

  constructor(readonly maxDelayTime: number) {
    super();
  }
}

export class FakeConvolverNode extends FakeAudioNodeBase implements IConvolverNode {
  buffer: IAudioBuffer | null = null;
  normalize = true;
}

export class FakeAudioBufferSourceNode extends FakeAudioNodeBase implements IAudioBufferSourceNode {
  buffer: IAudioBuffer | null = null;
  loop = false;
  onended: (() => void) | null = null;
  readonly playbackRate = new FakeAudioParam();
  readonly startCalls: Array<{
    when: number | undefined;
    offset: number | undefined;
    duration: number | undefined;
  }> = [];
  readonly stopCalls: number[] = [];

  start(when?: number, offset?: number, duration?: number): void {
    this.startCalls.push({ when, offset, duration });
  }

  stop(when?: number): void {
    this.stopCalls.push(when ?? 0);
  }
}

export class FakeAudioDestinationNode extends FakeAudioNodeBase implements IAudioDestinationNode {}

export class FakeAudioWorkletNode extends FakeAudioNodeBase implements IAudioWorkletNode {
  readonly parameters: IAudioWorkletParameterMap = {
    get: () => undefined,
  };

  constructor(
    readonly processorName: string,
    readonly options?: IAudioWorkletNodeOptions,
  ) {
    super();
  }
}

export class FakeAudioContext implements IAudioContext {
  currentTime = 0;

  constructor(readonly sampleRate = 48000) {}

  readonly destination = new FakeAudioDestinationNode();

  createGain(): IGainNode {
    return new FakeGainNode();
  }

  createStereoPanner(): IStereoPannerNode {
    return new FakeStereoPannerNode();
  }

  createBiquadFilter(): IBiquadFilterNode {
    return new FakeBiquadFilterNode();
  }

  createDynamicsCompressor(): IDynamicsCompressorNode {
    return new FakeDynamicsCompressorNode();
  }

  createDelay(maxDelayTime = 1): IDelayNode {
    return new FakeDelayNode(maxDelayTime);
  }

  createConvolver(): IConvolverNode {
    return new FakeConvolverNode();
  }

  createBufferSource(): IAudioBufferSourceNode {
    return new FakeAudioBufferSourceNode();
  }
}

export class FakeOfflineAudioContext extends FakeAudioContext implements IOfflineAudioContext {
  private readonly renderedDuration: number;

  constructor(options: { sampleRate?: number; lengthSeconds: number }) {
    super(options.sampleRate ?? 48000);
    this.renderedDuration = options.lengthSeconds;
  }

  async startRendering(): Promise<IAudioBuffer> {
    return {
      duration: this.renderedDuration,
      numberOfChannels: 2,
      sampleRate: this.sampleRate,
    };
  }
}

export class FakeAudioWorkletContext extends FakeAudioContext implements IAudioWorkletContext {
  readonly addModuleCalls: string[] = [];
  readonly createdWorkletNodes: FakeAudioWorkletNode[] = [];

  readonly audioWorklet = {
    addModule: async (moduleUrl: string): Promise<void> => {
      this.addModuleCalls.push(moduleUrl);
    },
  };

  createAudioWorkletNode(
    processorName: string,
    options?: IAudioWorkletNodeOptions,
  ): IAudioWorkletNode {
    const node = new FakeAudioWorkletNode(processorName, options);
    this.createdWorkletNodes.push(node);
    return node;
  }
}
