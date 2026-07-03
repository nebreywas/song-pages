declare module 'butterchurn' {
  export type ButterchurnVisualizer = {
    connectAudio: (node: AudioNode) => void;
    disconnectAudio?: (node: AudioNode) => void;
    loadPreset: (preset: object, blendTimeSeconds: number) => void;
    render: () => void;
    destroy?: () => void;
    setRendererSize?: (width: number, height: number, opts?: Record<string, unknown>) => void;
  };

  export type ButterchurnStatic = {
    createVisualizer: (
      audioContext: AudioContext,
      canvas: HTMLCanvasElement,
      options: { width: number; height: number; pixelRatio?: number },
    ) => ButterchurnVisualizer;
  };

  const butterchurn: ButterchurnStatic;
  export default butterchurn;
}

declare module 'butterchurn-presets' {
  export type ButterchurnPresetsStatic = {
    getPresets: () => Record<string, object>;
  };

  const butterchurnPresets: ButterchurnPresetsStatic;
  export default butterchurnPresets;
}
