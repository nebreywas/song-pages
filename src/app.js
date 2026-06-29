/**
 * Renderer entry point — behaves like a normal web application.
 *
 * No Node.js APIs here. Native features are accessed through window.app,
 * which is defined in the preload script.
 */

const loadExampleButton = document.getElementById('load-example');
const versionEl = document.getElementById('version');

async function init() {
  if (!window.app) {
    versionEl.textContent = 'Preload bridge unavailable.';
    return;
  }

  const version = await window.app.getVersion();
  versionEl.textContent = `App version ${version}`;
}

loadExampleButton.addEventListener('click', async () => {
  const url = await window.app.getExamplePageUrl();
  // Navigate within the same window to demonstrate renderer navigation.
  window.location.href = url;
});

init();
