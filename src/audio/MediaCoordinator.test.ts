import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  attachPlaybackSource,
  createHlsHolder,
  type HlsHolder,
} from './adapters/attachPlaybackSource.ts';
import { MediaCoordinator } from './MediaCoordinator.ts';

test('MediaCoordinator ignores stale generation callbacks (B8)', () => {
  const coordinator = new MediaCoordinator();
  let readyCount = 0;
  let errorCount = 0;
  const generation = 1;

  const audio = {
    pause: () => {},
    canPlayType: () => '',
    readyState: 0,
    addEventListener: () => {},
    removeEventListener: () => {},
    src: '',
  } as unknown as HTMLAudioElement;

  coordinator.attach(audio, 'https://example.com/track.mp3', {
    generation,
    isGenerationCurrent: (g) => g === generation,
    onReady: () => {
      readyCount += 1;
    },
    onError: () => {
      errorCount += 1;
    },
  });

  // Second load bumps generation — first callback must not fire.
  coordinator.attach(audio, 'https://example.com/other.mp3', {
    generation: 2,
    isGenerationCurrent: (g) => g === 2,
    onReady: () => {
      readyCount += 1;
    },
    onError: () => {
      errorCount += 1;
    },
  });

  // Simulate stale ready from generation 1.
  const holder = coordinator.getHlsHolder();
  assert.equal(holder.get(), null);
  assert.equal(readyCount, 0);
  assert.equal(errorCount, 0);
});

test('attachPlaybackSource routes unsupported environments to onError (B7)', () => {
  const holder: HlsHolder = createHlsHolder();
  let errorDetail: string | undefined;
  const audio = {
    pause: () => {},
    canPlayType: () => '',
    addEventListener: () => {},
    removeEventListener: () => {},
  } as unknown as HTMLAudioElement;

  attachPlaybackSource(
    audio,
    {
      playbackUrl: 'https://example.com/stream.m3u8',
      generation: 1,
      isGenerationCurrent: () => true,
      onReady: () => {
        assert.fail('ready should not run for unsupported HLS');
      },
      onError: (detail) => {
        errorDetail = detail;
      },
    },
    holder,
  );

  assert.match(String(errorDetail), /not supported/i);
});

test('MediaCoordinator teardown clears loaded url state', () => {
  const coordinator = new MediaCoordinator();
  coordinator.markLoaded('https://example.com/a.mp3');
  assert.equal(coordinator.isLoaded('https://example.com/a.mp3'), true);
  coordinator.invalidateLoads();
  assert.equal(coordinator.isLoaded('https://example.com/a.mp3'), false);
});
