import { createContext, useContext, type ReactNode } from 'react';

type VcVisualizerNameReveal = {
  name: string;
  visible: boolean;
};

type VcVisualizerRotationContextValue = {
  activeVisualizerId: string;
  rotateVisualizer: () => void;
  visualizerClickEnabled: boolean;
  /** Timed name chrome — consumed only inside the visualizer cell/float surface. */
  nameReveal: VcVisualizerNameReveal;
};

const VcVisualizerRotationContext = createContext<VcVisualizerRotationContextValue | null>(null);

export function VcVisualizerRotationProvider({
  value,
  children,
}: {
  value: VcVisualizerRotationContextValue;
  children: ReactNode;
}) {
  return (
    <VcVisualizerRotationContext.Provider value={value}>
      {children}
    </VcVisualizerRotationContext.Provider>
  );
}

export function useVcVisualizerRotationContext(): VcVisualizerRotationContextValue {
  const value = useContext(VcVisualizerRotationContext);
  if (!value) {
    throw new Error('useVcVisualizerRotationContext must be used within VcVisualizerRotationProvider');
  }
  return value;
}

/** Optional access for cells that may render outside the provider during tests. */
export function useOptionalVcVisualizerRotationContext(): VcVisualizerRotationContextValue | null {
  return useContext(VcVisualizerRotationContext);
}
