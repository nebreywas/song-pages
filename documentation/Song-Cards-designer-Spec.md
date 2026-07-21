Cards
To draw a simple portrait style card from Song Data we need to explain to the rendering routine for Song Cards what information we would like placed where this allows us to control the structure of a card and it begins the process of having specific names for elements in the visual language of Song Pages.

**Status (first goal):** Song Editor → **Song Cards…** opens the designer modal (options left / live preview right). Shared types live in `shared/songCards/`; renderer + modal in `src/song-cards/`. Structural choices are session-only for now (not persisted / not named reusable cards yet).

**Primitives:** Top-of-modal switcher selects the card shape family — **Portrait** (vertical 230×300), **Compact Rectangle** (horizontal editorial; see [`archive/Compact-rectangle-song-cards.md`](archive/Compact-rectangle-song-cards.md)), or **Wide** (full-width stack rows for albums/playlists; see [`archive/Wide-song-cards-design.md`](archive/Wide-song-cards-design.md) and [`assets/song-cards-wide-reference.png`](assets/song-cards-wide-reference.png)).

**Templates:** Portrait skins — Classic · Broadcast · Poster · Parchment · Neon · Nocturne · Organic. Compact Rectangle skins — Editorial Light · Signal Dark · Rail · Moss Strip. Wide skins — Classic Info Row · Compact Tags · Artwork Emphasis · Lyrics Preview · Progressive List · Minimal Elegant. Structure checkboxes still override content after you pick a skin.

**Artist-facing variance (direction):** Prefer a larger library of locked card skins (~a dozen) over exposing every skin token. **No artist color controls for now** — palette lives on the skin. **Themes are deferred** until all major UI primitives (Portrait / Compact / Wide cards, Chips, …) are stubbed; then one shared theme system. Limited **type pairing** (title + body) may come later after we ship a stronger shared typeface catalog.

Card Render
For each major Song Page UI Widget/Card etc. we make the design/publishing/compiler system will have a renderer for them. The renderers are component code that we can reuse across the Song Pages application architecture (I’m going to assume they’re all essentially react components well defined by the time we complete the iterative design/development process this spec is kicking off)

In this case the Song Portrait Card renderer is responsible for taking Song Data plus user structural choices plus a selected card design and producing a finished Song Card.

Zones
Portrait Song Cards have three zones
1. Cover Zone

Responsible for:  artwork, cover overlays, corner bugs, play button, animated cover.

2. Information Zone (aka Text Zone) (see list below)

3. Footer Zone  (see below)

The Cover Zone takes up a set %
The Footer Zone takes up a specific set of pixel height
The Information Zone is auto based on total size of the card and the space given to the Cover Zone and Footer Zone

Cover Zone
Cover Area [the area of a card devoted to showing the cover image] (note: cover images are square objects or but the cover area itself might be square or rectangular.

Animated Cover settings
Since songs can have animated covers we need the user to set rules for how a card handles static vs. animated cover

	[ ] Use animated cover instead when available
	[ ] Never use animated cover
	[ ] Show animated cover when playing when available
	
	[ ] Animate on click
	[ ] Animate on play
	[ ] Animate when in view

	[ ] Play once
	[ ] Loop

[Cover Corners]
On a cover area there are four corners that can accept display information.

The user [or just us] should be able to choose what information can display in each corner if available from data]

As simple 2 x 2 grid could be used where you click toggles to indicate which bugs [a bug is a small piece of text, pill (square or rounded), icon] to display. You can only display one per corner. Thus what to present is determined by the UI that I and eventually the user get to set. There is no priority - the priority is set at design time.
Lyric Bug, Explicit Bug	(Favorite/Like)/(Length/Time left)
Play button	(Favorite/Like)/(Length/TimeLeft)
Also nothing is a choice if no specific item is actually toggled on.

In specific cases we also need to offer options (elsewhere) on how to configure certain bugs:

	Like / Favorite
		Heart icon
		+ in a circle icon
		Like tiny text pill (square / rounded)
		
	Play button
		Normal (matches rough sizing of other elements)
		Outside
	
		Filled 
		Outline

Cover Bugs Overall Decision
The setting to expose for design now might be:

	Overlay on cover (enables expanded sized cover)
	Outside cover frame

	Otherwise how we finalize designs per card, shadows, padding, etc. I leave to you.


Fitting and blending Covers?
Covers will come in different shapes and sizes so we need eventually a consistent cropping/positioning/blending strategy.

In general I imagine we enable covers to have light/middle/dark background blends relative to the background of the card design itself, and border one/off setting. The issue is that cards will be set against a page design and so cards needs their own background and then covers need to exist within that. Except covers themselves come in all forms of color and design so our challenge will be to find a consistent square/rectangle setup per final card design that survives the final card background color and the cover color. It will never be perfect but in general if we have some smart rendering ideas it should be good enough given the gamut these cards will encounter.

Information Zone
Next we have the Card’s Text block structure to define. The best way to do this would be to first define EVERYTHING that COULD appear in the Text Block area and then decide what limits should apply so we don’t end up with cards that are 5X taller that they are wide.

Item’s that MUST show if available from data
* Song Title
* Artist

Item’s that can show depending on final card design
* Caption
* Subtitle
* Top genres (draw genre text or pills based on what room is available)
* Top themes (draw genre text or pills based on what room is avaialble)
		-> what this means is if there are 12 genres you draw the main one plus the 1-X more that fit on the card you don’t draw all 12
* Lyric quote
		scroll/fit -> does the card try to fit the quote or truncate, does it scroll the quote if it doesn’t fit. 
		if scroll does it scroll when focused, scroll when played, scroll on display?

What fits?
We will be designing specific final card designs together using the tooling we build right now. Once we see what can fit we can set some limits on how many or which items from the above list work together or not. Then we can finalize what the card designs are and which designs allow for which content choices the artist can make when customizing song cards. It is not imperative that we give the artists maximum flexibility. Once we lock designs for cards there will still be plenty of basic decisions they can use to have a say but we’re not bending over backwards to enable every last pixel as an artist decision.

Overflow Policy
We will be exploring what forms of overflow our card designs and user settings can and will enable some of this is already described in this document we will handle additional questions iteratively during development.

In general we’ll be choosing ideas like:

	Clamp : the design clamps content overflow with … or other ideas.
	Fade: design overflow fades to background
	Scroll: design enables scrolling content, marquee, up/down, auto etc.
	Expand: some action enables the content to expand in view (tbd)

FOOTER ZONE
Then our design calls for a footer on cards and the footer has three clear areas of activity:

Left Corner
Center Content
Right Corner

Left Corner: 
Options:
	1. Track number (if song card is part of an album/playlist display vs. standalone)
	2. Explicit Bug: [E] or [Explicit] <— bug format choice
	
Optional Play Feature (only active if the user PLAYs the song/sample from the card)
	1. Freq bars animation when playing [yes/no] 
		this is not a visualizer it’s just an animation
	2. Waveform animation when playing [yes/no]
		this is not a visualizer it’s just an animation
	3. Animated speaker icon

Center Metadata
	Choose two of:
    * Length/time remaining (if playing)
    * Creation date
    * Bitrate/Codec
    * Main genre (text/pill (rectangle/rounded)

Right Corner
	Reserved for menu bug
		Types
			… horizontal 3 dots
			| vertical 3 dots
			(i) circular info button
			h hamburger 3 lines?
			() Flip icon (if we offer flipping the card)

	* right now we’re not 100% sure what the menu does actionably but reserving this space for the UI for it is still important

Footer Options
	<hr> separator (at top of footer)
	<shaded> shade the footer for separation?

Card States
We need to have the ability to show cards in the following states:

Default (first most important)
Hover (can be follow on sprint)
Playing/Active (follow on sprint)
Click/Active (not playing but actively selected)
Disabled (aka ghosted)
Loading (ideally all our UI elements have page loading behaviors)

Card Actions
We will eventually need to decide how the card SYSTEM eventually handles:

Clicks cover
Clicks title
Clicks play
Clicks footer elements
Clicks menu
Double clicks
Right clicks
Long press
Keyboard
Touch

What’s important to understand about actions right now are:

	1. Cards do not always connect to underlying song pages
	2. Cards do not always connect to playable content like a recording
	3. We have yet to decide what these actions are in general
	4. I am unsure if flipping a card option is MVP 1.0 I can imagine having very nice cards that when offering a flip option perhaps put additional longer text like About this song on the back so they can be like baseball cards.
	5. We should not hardwire behaviors/actions too much

First Goal
Our first goal will be to in the Song Editor have a button titled Song Cards…

You press it and it opens up a modal
On one side are options (left side) on the right side is a preview
The first option is 
	[Card Design]
		1, 2, 3, 4, 5, 6

The next options are the structural decisions I’ve outlined here.

Think of the CURRENT USER of this feature as ME — the application designer. I am going to play with the options, look over your initial template designs and schemes and then we’ll iterate on two things:

	The designer itself
	The card designs themselves

Overtime both will stabilize and eventually… we’ll lock the card designs and which CHOICES from the Dev oriented designer should survive to be User available.

The goal is eventually an interface where a user can…

	Mary a Card Design Template (1,2,3,4,5…)
	A theme (colors, general theming)
	Content structure decisions

And then NAME that card as a reusable Song Card they can then use on their page designs.

So for example an artist is designing a custom page for their Holiday Songs Collection

They decide to create a Holiday Card design using Card Template 3 and some basic color choices, content choices focused on Lyric Quote, etc. and then use that on the page. Easy to do, easy to outline, easy to reuse.

That’s the goal of what we’re building— and eventually evolving it to.

NOTE: By making this work via a button on the Song Editor the system can pull the sample data from whichever song is currently being edited.