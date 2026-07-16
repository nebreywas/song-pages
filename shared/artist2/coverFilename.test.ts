import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  buildCoverFilename,
  isAlreadyCoverNamed,
  slugifyForCoverFilename,
} from './coverFilename.ts';

describe('coverFilename', () => {
  it('slugifies names for filenames', () => {
    assert.equal(slugifyForCoverFilename('Night Almighty'), 'night-almighty');
    assert.equal(slugifyForCoverFilename('  '), 'untitled');
  });

  it('uses COVER then COVER-n for collisions', () => {
    assert.equal(buildCoverFilename('Night Almighty', '.jpeg', []), 'night-almighty-COVER.jpeg');
    assert.equal(
      buildCoverFilename('Night Almighty', 'jpeg', ['night-almighty-COVER.jpeg']),
      'night-almighty-COVER-2.jpeg',
    );
    assert.equal(
      buildCoverFilename('Night Almighty', '.png', [
        'night-almighty-COVER.png',
        'night-almighty-COVER-2.png',
      ]),
      'night-almighty-COVER-3.png',
    );
  });

  it('detects already-named covers', () => {
    assert.equal(isAlreadyCoverNamed('night-almighty-COVER.jpeg', 'Night Almighty'), true);
    assert.equal(isAlreadyCoverNamed('night-almighty-COVER-2.jpeg', 'Night Almighty'), true);
    assert.equal(isAlreadyCoverNamed('aaaaaaaa-bbbb-cccc.jpeg', 'Night Almighty'), false);
  });
});
