import { ElectronPlatform } from './electron-platform';
import type { VoxaPlatform } from './types';
import { WebPlatform } from './web-platform';

export * from './types';
export const platform: VoxaPlatform = typeof window !== 'undefined' && window.recorder
  ? new ElectronPlatform()
  : new WebPlatform();
