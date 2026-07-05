Host content
Because host materials may remain fairly constant over time, during configuration create a specific editable tab/area for all host specific content.

The goal of this design is that hosts maintain their content database separate from the surface designs they choose. Then in the surface designer the content from their Host Content database is exposed as content assignment choices.

Pressing the host content button can generate a large popover or present it like a tab that replaces the visualizer plugin button and designer canvas area that will let the user completely create, edit, delete, host content.

The Host content wireframe I have attached clearly shows a proposed ui wireframe and basic approach to adding/removing/renaming/editing content.
￼

A scrollable list at the top shows the inventory of content already in the system. When naming an object and hitting + you can add a new piece of content to the system. A pop up lets you choose the type of content to add when creating a new object. 

If an item requires a filename (graphics/video) then the item must have a filename button.

Graphics should only load… .png, .jpg, .heic (if possible), .webp (if possible), .gif and no other formats (up to 5mb 2560 limit on x, y axis)
Video should only load .mp4 (up to 12mb, 2560 limit on x or y axis)

If an item is not compliant provide simple feedback to the user - 

	File must be (.png/.jpg/.heic/gif/.webp) format. 

	or

	Image or video size can not exceed  2560 x 2560

	or

	File size can not exceed 5mb

The type of content then determines the default name (e.g. SlideShow1, Graphic11) and then the right hand side of the dialog box is where they can edit the information that details the information needed to display and operate the content in VC mode.

Naming
Names of content are assigned by the host and must be <=24 chars
Names can be alpha-numeric plus _ and - no other special characters allowed
Default names are assigned by the system
All names normalize to lower case

Each item also offers a preview when being defined.

Types of content
Type	Explanation	Role Types	Details
Graphics	A still graphic to display	Background, Banner, Logo, Image	Image or video dimensions cannot exceed 2560 pixels on either axis.
Title text	A slug of text (max 36 chars) that is likely to be a headline element in VC Mode	Headline, Title	Overflow rule: Scroll fast, medium, slow
Bounce or restart
Default font
Default font size
Default font color
Text areas	These work similar to title texts but offer more characters (max XXX chars)	Information, List, Narrative	Overflow rule: Scroll fast, medium, slow
Bounce or restart
Default font
Default font size
Default font color
Video	Host can add short <=12mb .mp4 video files	Animation, video	Size is more about the file size not dimensions but image or video dimensions cannot exceed 2560 pixels on either axis.
Graphics group	User can define a package of graphics already in the system as a graphics group then assign specific presentation style at assignment time.		Gallery options in host mode are just the list of graphics assigned to group. Behaviors for VC mode of graphic groups are assigned at runtime.

Roles
Roles are mostly tags that help to organize information and make it easier to manage assets because they explain the role that content is likely playing in the design of VC mode. 

But some can describe behaviors.

	Slideshow -> images in this role stack on top of each other
	Gallery -> images in the mode are drawn out a thumbnails 

Right now the table explains the roles we have designed so far for the system. * denotes roles that have behaviors attached which are described below.

Fonts
For titles, text areas we allow the host to set font style, size, color

Font style is basically the name - we use general styles instead of specific font names for consistency and ability to map our choices to the style name to make easy changes to typography during and post development. Users do not get access to their entire font directory for simplicity, ease of use and consistency.

Font Style	Internal ID	macOS mapped font	Windows mapped font
Clean	clean	Apple system UI	Segoe UI
Bold	bold	Apple system UI 700/800	Segoe UI 700/800
Condensed	condensed	Avenir Next Condensed	Arial Narrow
Elegant	elegant	Didot / Bodoni 72	Bodoni MT / Georgia
Classic	classic	Georgia	Georgia
Playful	playful	Bundled	Bundled (in src/assets/fonts directory)
Retro	retro	Bundled	Bundled (in src/assets/fonts directory)
Digital	digital	Bundled	Bundled (in src/assets/fonts directory)
Handwritten	handwritten	Bundled	Bundled (in src/assets/fonts directory)
Mono	mono	SF Mono / Menlo	Consolas
Impact	impact	Impact	Impact
Editorial	editorial	Iowan Old Style / Palatino	Palatino / Georgia

Font size should be standardized as well with named choices:
Tiny	tiny	9px
Very Small	very-small	12 px
Small	small	18 px
Medium	medium	24 px
Large	large	32 px
X-Large	xlarge	48 px
Display	display	72 px
Hero	hero	96 px

Color
Use a basic palette picker design

For Title text content user can also choose to convert the text to all caps or display as typed

For Area text content user can also choose to display the text as formatted markdown or plain text regardless of its source style

Explaining Graphics Groups Further
When creating a graphics group the resulting settings area would list the current graphics in the host content database. It is possible to create a graphics group with no graphics listed if there are none in the system. This way if you remove graphics that are part of a graphics group nothing happens to the associated group. It simply exists as an empty container. Behind the scenes you might remove the association but my preference is to preserve the missing reference as a ghosted unresolved member, because that lets the host understand why a group changed.

Videos can not be in graphics groups for now.

HOST CONTENT CONTENT SETTINGS ARE DEFAULTS
Host content design decisions such as font size and style stay bundled with item HOWEVER, when a user is in the Surface designer of VC mode and assigns a host content item to an area the idea is that any setting made in Host Content is the DEFAULT setting shown in the surface designer and can be overridden in the settings dialog by the user and those settings are what are saved when saving a VC Mode surface design.

The thinking behind this behavior is that a host will use the Host Content editor to organize all their content and at that time making specific choices on size, color, font, etc. are useful because it sets the default and helps them visualize what they’re creating/adding at the time. Then we they are on surface designer they can override those settings without having to go back to host materials design. In many cases they’ll likely accept and want their defaults but the option to change them then and there is useful. The defaults are never changed unless changed in the Host Content dialog itself.

Host Content: Setting Fallbacks
VC mode as designed hopes but does not depend on all Song Pages content being available to it. To improve the user experience VC mode has Host definable fallbacks and player defined fallbacks to use. Fallbacks are PRE-LISTED in the Host Content content list. They are not able to be deleted and these items are essentially blank content until populated with data. Unpopulated data for Host Content Fallbacks pass fallback content to the system itself.

In Host Content the user can add and edit fallbacks
Cover	Cover Fallback	Choose Image from uploaded graphics already added to host content.
Video Cover	Video cover fallback	Choose video from uploaded videos already added to host content.
Lyrics	Lyrics Fallback	Choose text area from list of text areas already added to host content.
About Song	About song fallback	Choose text area from list of text areas already added to host content.
Artist name	Artist name fallback	Give four fields they can fill out with various options up to 36 chars
Artist image	Artist image fallback	Choose Image from uploaded graphics already added to host content.
Song Name/Title	Song name fallback	Give four fields they can fill out with various options up to 36 chars
Main Genre	Main genre fallback	Give four fields they can fill out with various options up to 36 chars
Additional Genres	Additional genres fallback	Give four fields they can fill out with various options up to 64 chars
All settings have a reset to System Default checkbox that clears the Host Setting Fallback if checked (but preserves their settings should they change their mind)
System fallback settings
The system is the ultimate fallback for content not provided or loaded for any song. If the data is unavailable VC mode should look for it in the Host Content Fallback data and if there are no answers there use the system defaults as follows:

VC Mode Content		
Visualizer		
Cover	Cover Fallback	/src/assets/fallbacks/cover-fallback.png
Video Cover	Video cover fallback	/src/assets/fallbacks/videocover-fallback.mp4
Lyrics	Lyrics Fallback	La la la, la-la la la
Something should be sung here
La la la, la-la la la
But the words did not appear

Maybe there was heartbreak
Maybe there was rain
Maybe someone left someone
Then came back again

La la la, la-la la la
The lyrics weren’t provided
La la la, la-la la la
So these will stand beside it

Sing a little louder
No one seems to mind
Every song needs something
Moving down the line

La la la, la-la la la
La la la again

Please enjoy the music
We’re doing what we can
Sing whatever comes to mind
We fully understand

La la la, la-la la la
We’ve finally reached the end
About Song	About song fallback	Normally we’d tell you something amazing about this song but we couldn’t find any content provided by the artist or your host(s). Please accept our apology, but we’re pretty certain they’re the greatest songwriter of all time—and incredibly modest as well.
Artist name	Artist name fallback	Currently Anonymous
Artist image	Artist image fallback	/src/assets/fallbacks/artistimage-fallback.png
Song Name/Title	Song name fallback	Greatest Song Ever! (After Freebird!)
Main Genre	Main genre fallback	Only the shadow knows!
Additional Genres	Additional genres fallback	Our experts are still debating this.

REQUESTED VC CONTENT
        ↓

Does current song provide it?
        ├── YES → Use Song Content
        └── NO
             ↓

Are fallbacks enabled?
        ├── NO → Blank
        └── YES
             ↓

Does Host Content Fallback provide it?
        ├── YES → Use Host Fallback
        └── NO
             ↓
Use Song Pages System Fallback

NOTES: Once we do a complete revision on the overall structure of Song Pages meta-data and get the updated editor going we will be adding more fallbacks for each area of content we expose to VC mode. Also these fallbacks are NOT used in the player itself just for VC mode where having blank visual content due to missing data or latency of retrieved data results in subpar streaming. At same time host can choose to go with blank content vs. fallbacks as a choice.

Visualizer Fallback
There are two visualizer fallbacks — First is the built in Spectrum visualizer and second is a blank area. But Spectrum should almost never fail as it’s a system default.

How Settings Work for Content in Surface Designer

Show Song Pages content choices:

SONG CONTENT

  Artist Name
  Artist Image
  Song Title
  About Song
  Main Genre
  Additional Genres
  Lyrics
  Visualizer

After showing Song Pages content have a divider line in drop down.
Then show host content choices as:

	Host graphic
	Host video
	Host title text
	Host area text
	Host graphics group

Then if these are chosen look at the Host Content Assignment wireframe where it shows there would be a scrollable list of matched content types from the host content database that can be chosen. Below that is a settings area to make override settings or additional run time settings.
￼
Assignment Time Settings Available
Type	Explanation	Role Types	Run time options (set when assigning content to surface/floats)
Graphics	A still graphic to display	Background, Banner, Logo, Image	Inset % - you can set an inset percentage of 0 to 70%  (default is 0 most will set if anything to 10-20%)		
Stretch - stretches x and y values to the area or float container sizes (taking into consideration the effect of Inset %) do not hold for existing ratio		
Max size X - stretch to the X value of the area or float  (taking into consideration the effect of Inset %)  keeping the Y value in proportion regardless of its fit.		
Max size Y - stretch to the Y value of the area of float  (taking into consideration the effect of Inset %)  keeping the X value in proportion regardless of its fit.		
Original Size - place in its original size (taking into consideration the effect of Inset %) 		
		
Overflow rule		
If a graphic exceeds its sizing these rules are available:		
		
Static - do not move or allow it to be moved [if checked no other options] [if unchecked then other options]		
	Scroll - lets host scroll graphic [if checked host can scroll] [if unchecked host can’t scroll]	
	Auto scroll - system auto scrolls oversized graphics	
		NOTE: Bounce goes center to up, then down, then center, then left, then center, then right as needed
Title text	A slug of text (max 36 chars) that is likely to be a headline element in VC Mode	Headline, Title	All caps or As Typed
Remaining attributes inherited from Host Content settings for this object
Text areas	These work similar to title texts but offer more characters (max XXX chars)	Information, List, Narrative	Plain Text always
Remaining attributes inherited from Host Content settings for this object
Video	Host can add short <=12mb .mp4 video files	Animation, video	Inset % - you can set an inset percentage of 0 to 70%  (default is 0 most will set if anything to 10-20%)		
Stretch - stretches x and y values to the area or float container sizes (taking into consideration the effect of Inset %) do not hold for existing ratio		
Max size X - stretch to the X value of the area or float  (taking into consideration the effect of Inset %)  keeping the Y value in proportion regardless of its fit.		
Max size Y - stretch to the Y value of the area of float  (taking into consideration the effect of Inset %)  keeping the X value in proportion regardless of its fit.		
Original Size - place in its original size (taking into consideration the effect of Inset %) 			
		
NOTE: videos can not be scrolled like graphics		
		
Play once		
Loop (default)		
Bounce (plays forward then backwards and bounces back and forth)	
Graphics group	User can define a package of graphics already in the system as a graphics group then assign specific presentation style at assignment time.		If Gallery set max images per view which can help the system know how many images to show in a horizontal Cover Flow style gallery or if the area can fit multiple rows how many rows to make. Galleries can be set to coverflow or scrolling when placed in content areas …. SLIDESHOWS have Frame time: X Seconds, Fade/Flip (we’re not supporting tons of transitions initially), play once/loop

## Host Content Defaults and Surface Assignment Overrides

Host Content items store their own default presentation settings. These defaults help the host organize and preview reusable content while building their Host Content database.

For example, a Host Title Text item may define its default font style, font size, color, all-caps behavior, and other text settings. A Host Graphic may define its default fit behavior or preview behavior. These settings belong to the Host Content item and remain unchanged unless edited directly in the Host Content editor.

When a host assigns a Host Content item to a VC Surface area or float, the Surface Designer displays the Host Content item’s saved defaults as the effective initial settings. The host may then override individual settings for that specific surface assignment. Only explicit overrides are saved as assignment overrides; inherited Host Content defaults should remain inherited rather than being unnecessarily copied into the assignment record.

Assignment overrides are saved as part of the VC Surface design. They do not modify the original Host Content item.

This creates a three-level resolution model:

1. **Surface Assignment Override** — used first when present.
2. **Host Content Default** — used when no assignment override exists.
3. **System Default** — used when neither the assignment nor Host Content provides a value.

This allows a host to define reusable defaults once while still customizing how the same Host Content item appears in different VC layouts.

Example:

A Host Title Text item named `show_title` may default to:

- Font Style: Bold
- Font Size: Large
- Color: White
- All Caps: Off

In one VC Surface design, the host may assign `show_title` to Area 1 and override:

- Font Size: Display
- Color: Blue
- All Caps: On

Those overrides apply only to that specific assignment. The original `show_title` Host Content item remains unchanged.

Changes made in Host Content auto-save to the Host Content database. Changes made in Surface Designer auto-save to the current Surface design. Auto-save does not alter the ownership rules described above.

Host Content owns reusable source material and default presentation settings. 
Surface Designer owns placement, assignment, and per-assignment overrides. Assignment overrides never mutate the Host Content source object.
Setting	Host Content Default	Surface Assignment Override	Notes
Content name	Yes	No	Database identifier; not automatically displayed.
Content type	Yes	No	Graphic, video, title text, area text, graphics group, fallback.
Source file	Yes	No	Images/videos selected in Host Content only.
Text value	Yes	No	Title/area text source lives in Host Content.
Markdown/plain text source	Yes	Yes	Host Content stores default; assignment may choose markdown or plain display.
Graphics group membership	Yes	No	Group composition managed in Host Content.
Font style	Yes	Yes	Assignment starts from Host Content default.
Font size	Yes	Yes	Use standardized named sizes.
Text color	Yes	Yes	Palette picker.
All caps	Yes	Yes	Title text only.
Fit mode	Yes	Yes	Useful for graphics/video: contain, cover, stretch, etc.
Position/alignment	Yes	Yes	Center, top, bottom, left, right, etc.
Opacity	Optional	Yes	Mostly assignment-level, but default may be useful.
Slideshow/gallery behavior	Yes	Yes	If using groups; assignment can override runtime behavior.
Cycle speed/timing	Yes	Yes	Default in group; override in layout.
Muted/autoplay/loop for video	Yes	Yes	Store default in Host Content; override per surface.
Fallback value	Yes	No	Fallback objects edited in Host Content only.
Reset to system default	Yes	No	Applies to fallback objects.
Area/float placement	No	Yes	Surface Designer owns geometry.
Area content assignment	No	Yes	Surface Designer owns what item is placed where.
Runtime slot/cycle state	No	Yes	Assignment/display behavior, not Host Content identity.