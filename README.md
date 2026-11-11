# Study Quest

Study Quest turns schoolwork, projects, chores, and personal goals into customizable focus quests. It includes a daily command center, flexible goals, seven-day momentum, distraction-free focus mode, classes/realms, detailed mission cards, custom focus timers, light and dark modes, XP, rewards, Spotify focus music, and Moss the focus fox.

The app opens as a clean, universal quest space with no preloaded class, teacher, or assignment. New users choose what they want to work on, and older copies automatically replace the original calculus demo with the same neutral starting space while preserving genuinely customized missions.

## Start with Today

The **Today** command center keeps the next useful action visible: resume the active mission, begin a focus sprint, or forge something new. Set a daily session and minute goal, then use the seven-day momentum view to build consistency without punishing broken streaks. **Focus shield** temporarily hides the deeper game systems while a timer is running; everything returns when you leave focus mode.

## Study Party

Choose **Study Party** to create or join an account-free room with a private invite code. Friends can share a mission, see who is present and ready, synchronize the focus timer, exchange multiline messages and reactions, and celebrate completed sessions together. At least two people must be connected, and every person in the room must mark themselves ready before the timer can start or resume. A running timer pauses only after every connected member approves the pause request; declining keeps the session running. Long chat messages and links wrap safely, and the desktop party window can be resized from its lower-right corner. Party data travels directly between browsers over encrypted WebRTC; public Nostr relays help peers discover each other but do not store the party conversation. Rooms are temporary, work best with small groups, and require an internet connection. Solo Study Quest continues to work offline.

On the hosted app, **Invite friends** offers a secure join link and room code. In the portable HTML app, local `file://` links cannot work on another device, so the invite panel safely copies only the private room code; friends open their own Study Quest copy and enter that code under **Join friends**.

## Spotify focus music

Open **Spotify focus music** and paste a Spotify share link for a playlist, album, track, artist, show, or episode. Study Quest saves the link in this browser and adds Spotify's accessible embedded player beside the focus timer. Spotify playback requires an internet connection; the rest of Study Quest remains available offline.

## Install

Open the published site in a modern browser and choose **Install app**. On iPhone/iPad, use Safari’s Share menu and choose **Add to Home Screen**.

The app works offline after the first visit. Progress is stored only in that browser using local storage; there is no account or cloud sync.

## Move progress between devices

Open **Transfer** in the app. **Export progress** creates a private JSON backup containing every realm, mission, timer, reward, and setting. Save it to iCloud Drive, OneDrive, or Files, then choose **Import progress** on the other device. The app previews the backup before restoring it and keeps a one-import rollback.

## Portable HTML app

Choose **Transfer → Portable HTML app** to download one self-contained file with the app's interface, scripts, styles, and icon embedded. It can be moved through USB, AirDrop, email, or an approved cloud drive and opened without installing anything. Progress stays in that browser and can move between copies through the same JSON export/import flow. Spotify playback still requires an internet connection and may be unavailable when a network administrator blocks Spotify. The portable file is not intended to bypass school or workplace access controls.

## Hosting

This is a static progressive web app. Publish the contents of this folder from the root of any static host, including GitHub Pages.
