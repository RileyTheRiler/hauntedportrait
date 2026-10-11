# The Haunted Portrait — Version 2

A two-screen Halloween prop: an animated Victorian portrait on an Android tablet, controlled by a phone. Designed to deploy on Vercel as a simple static site with an authenticated serverless command relay.

## New in Version 2

- **Live hold-to-talk:** WebRTC sends microphone audio directly from your phone to the tablet. The relay sends only WebRTC connection messages, character controls, and optional short recordings — **not live microphone audio**.
- **Six live voice presets:** Deep Monster, Echoing Ghost, Raspy Witch, Robot Spirit, Haunted Doll, and Natural. Effects use Web Audio filtering, a simple granular pitch shifter (where AudioWorklet is available), distortion, ring modulation, and delay. These are theatrical effects, not studio-quality pitch/formant conversion. Some voices will sound synthetic or distorted; quality depends on speakers and device performance.
- **Facial expressions:** Watch, Smirk, Scowl, Startled, and Neutral. Automatic blinks, slight movement, random glances, and pointer-following gaze on the tablet. **No automatic camera-based visitor tracking** in this version.
- **Retained from Version 1:** Preset phrases, typed dialogue, browser text-to-speech, recorded messages, three characters, scene effects, and emergency stop.
- A connection indicator shows when portrait heartbeat messages have reached the phone. This indicates application presence, not guaranteed WebRTC audio health.

## Files

| File | Purpose |
|---|---|
| `portrait.html` | Tablet display; first enable sound and join the room |
| `remote.html` | Phone controller and press-and-hold microphone |
| `assets/portrait.js` | Portrait animation, TTS, voice playback, WebRTC receiver |
| `assets/remote.js` | Phone controls, microphone streaming, WebRTC sender |
| `assets/webrtc.js` | Peer-to-peer connection and signaling |
| `assets/live-audio.js` | Real-time audio effects on the tablet |
| `assets/live-effects-worklet.js` | Low-latency granular pitch effect |
| `api/events.js` | Authenticated Redis-backed Vercel event relay |
| `server.mjs` | Local demo server (no Redis needed) |
| `tests/api.test.mjs` | Input validation tests |

## Deploy on Vercel

1. Extract the ZIP and push its **contents** to a new GitHub repository.
2. In [Vercel](https://vercel.com/new), import the repository. Use framework **Other**, with the root directory containing `index.html` and `api/`. The site needs **no build command**.
3. Attach **Upstash Redis** from the Vercel Marketplace. Confirm the project receives the server-side environment variables `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN`. The code also supports `KV_REST_API_URL` and `KV_REST_API_TOKEN`.
4. In Vercel project **Settings → Environment Variables**, add `PORTRAIT_PIN` with a **long random secret**, at least six characters. Do **not** prefix it with `NEXT_PUBLIC_` or add it to source control.
5. Redeploy after adding the environment variables.
6. Visit your deployed addresses:
   - Tablet: `https://YOUR-PROJECT.vercel.app/portrait.html`
   - Phone: `https://YOUR-PROJECT.vercel.app/remote.html`

## Using the app at the party

1. **Tablet first.** Open `/portrait.html` in Chrome, enter room (such as `halloween`) and your PIN, tap **Awaken the Portrait** and enable sound. Leave the tab visible and the screen awake. Use full screen or Android's home-screen shortcut.
2. **Phone second.** Open `/remote.html`, enter the **same** room and PIN, then tap **Connect**. Look for an eventual `Tablet online` indicator (a heartbeat is emitted every 12 seconds).
3. Press **Connect live microphone** and allow microphone permission. There may be a brief connection negotiation delay. When the status changes to **Audio connected**, hold **HOLD TO SPEAK**, say something, and release to mute.
4. Choose a live voice effect on your phone. The tablet processes the audio and lip-syncs its mouth approximately to audio loudness. The remote also has typed dialogue, a quick-lines soundboard, expressions, and reactions.
5. Tap **Disconnect live audio** to release the microphone and close the peer connection. **Silence / Reset** is the emergency stop for tablet audio.

**During testing:** Keep the phone away from the tablet speaker to avoid feedback. Use an external Bluetooth or wired speaker if the tablet is hidden behind a picture frame. Wired audio typically avoids extra Bluetooth delay.

## Local demo

Requires Node.js 20+.

```bash
npm test
npm run dev
```

Open `http://localhost:3000/portrait.html` and `/remote.html` on the **same computer** in Chrome. Local demo PIN: `haunt2026`; use room `halloween`. The PIN is a development example **only**, not appropriate for a publicly deployed Vercel site.

**Physical phones generally need HTTPS** for browser microphone access. `localhost` is a special exception for development, but an HTTP local-network address such as `http://192.168.x.x` is normally not secure enough. For your phone/tablet test, use the deployed HTTPS URL.

## Network requirements and limitations

- Vercel and Upstash need internet on both devices for commands and WebRTC setup.
- **Live audio is peer-to-peer over WebRTC** using a public STUN server. That commonly works on the same Wi-Fi and on many different networks. **Some NATs/firewalls require a TURN relay**, which is not bundled with this starter. If a connection reports `failed`, test both devices on the same Wi-Fi first. A TURN deployment would be needed for more dependable use across different networks.
- Remote + tablet exchange SDP (WebRTC session descriptions) via the REST API by polling roughly every 1 second. Initial audio connection setup may take several seconds. **Once connected, audio itself is not polled**; it flows over WebRTC. Bluetooth output adds device-dependent audio delay.
- Chrome mobile can suspend microphone capture or JavaScript when the remote screen is locked, the tab loses focus, or the phone enters battery-saving mode. Keep the remote screen on while using hold-to-talk.
- The audio visualizer responds to amplitude, not speech phonemes. Natural eye tracking is simulated, not computer-vision tracking.
- Device speech synthesis voices depend on the tablet's TTS engine. Pitch shifting is an experimental granular effect; if an AudioWorklet fails to initialize, the app automatically falls back to filtering and modulation.
- **This has not been tested on your specific Android devices.** Local API validation and server event-flow tests passed; a physical WebRTC and audio test is still necessary before the party.
- Redis free usage limits and Vercel function limits apply. Expect around two polling API calls per second while the tablet and phone are active, plus heartbeat and control messages. Upstash currently advertises a free allowance of 500,000 commands/month; verify your project plan before extended use.

## Safety and privacy

- Keep your PIN private, and do not use the development default on the internet. The room name and PIN are saved in localStorage on each device for convenience.
- HTTPS encrypts the browser connection to the hosted relay; WebRTC uses encrypted real-time transport. SDP for connection setup and the commands are temporarily stored in the app's Redis room event list. Short recordings you explicitly send are also temporarily stored in Redis as part of command history for up to approximately 12 hours. Live microphone audio is **not** stored by this program.
- Tell people if they are being recorded or if you enable any separate AI/listening feature. This version does **not** automatically activate the tablet microphone or camera.

## More development

- A TURN relay and more detailed connectivity diagnostics would make remote operation more dependable.
- Custom photographic portraits with aligned eyes and mouth sprites can replace the supplied SVG artwork.
- ESP32 props can be attached via a gateway on the same internet-connected Wi-Fi that sends the `scene` and `expression` event types.
- Vercel added WebSocket support in 2026; replacing command polling with a WebSocket-backed relay is an optional future optimization. This starter deliberately retains its tested HTTP Redis event architecture.
