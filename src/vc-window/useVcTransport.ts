import type { VcTransportCommand } from '@shared/vcMode/vcTransport';

import { getApp } from '../lib/bridge';

/** Send a playback command from the VC window to the main listener. */
export function sendVcTransport(command: VcTransportCommand): void {
  getApp()?.vc?.sendTransport?.(command);
}
