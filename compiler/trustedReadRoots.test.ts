import { describe, it } from "node:test";
import assert from "node:assert/strict";
import os from "node:os";
import path from "node:path";

import {
  buildDevReadRoots,
  buildElectronReadRoots,
  isPathUnderAnyRoot,
  isPathUnderRoot,
} from "./trustedReadRoots";

describe("trustedReadRoots", () => {
  it("treats project tree and home as trusted", () => {
    const projectRoot = path.join(os.homedir(), "Projects", "song-pages");
    const roots = buildDevReadRoots(projectRoot);
    const underProject = path.join(projectRoot, "src", "main.ts");
    const underHome = path.join(os.homedir(), "Music", "track.mp3");
    assert.equal(isPathUnderAnyRoot(underProject, roots), true);
    assert.equal(isPathUnderAnyRoot(underHome, roots), true);
  });

  it("rejects paths outside project and home", () => {
    const projectRoot = path.join(os.homedir(), "Projects", "song-pages");
    const roots = buildDevReadRoots(projectRoot);
    const external = path.parse(os.homedir()).root + "Volumes/ExternalSSD/track.mp3";
    assert.equal(isPathUnderAnyRoot(external, roots), false);
  });

  it("includes userData managed folders for Electron compile", () => {
    const userData = path.join(os.homedir(), "Library", "Application Support", "song-pages");
    const roots = buildElectronReadRoots("/app", userData);
    const upload = path.join(userData, "compile-uploads", "audio-1.mp3");
    assert.equal(isPathUnderRoot(upload, userData), true);
    assert.equal(isPathUnderAnyRoot(upload, roots), true);
  });
});
