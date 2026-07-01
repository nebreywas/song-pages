/** Default content shown in the listener web area before a song page is opened. */
export function ListenerWelcome() {
  return (
    <div className="listener-welcome">
      <h2>Welcome to Song Pages</h2>
      <p>
        Subscribe to an artist by URL, then explore their catalog and play songs. Canonical song pages
        appear here when you play a track; select an artist on the left to view their profile.
      </p>
      <ul>
        <li>Subscribe with an artist&apos;s published site URL</li>
        <li>Click an artist name to see their bio and links</li>
        <li>Double-click a song or press play to listen and load its song page</li>
      </ul>
    </div>
  );
}
