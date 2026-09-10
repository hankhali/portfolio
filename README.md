# Hanieh Khaled — Portfolio

Personal portfolio site. Static HTML, CSS and vanilla JavaScript, no build step,
deployed to Netlify.

Live: https://haniehkhaled-portfolio.netlify.app

## Files

```
index.html          Whole page
thank-you.html      Netlify Forms redirect target
styles.css          Design tokens + all styling
main.js             Theme, scroll reveal, scrollspy, spotlight, 3D tilt, hero loader
scene.js            WebGL hero (Three.js) — imported lazily by main.js after load
netlify.toml        Publish dir, security and cache headers
assets/og.png       Open Graph preview image (1200x630)
assets/fonts/       Inter, self-hosted (latin + latin-ext, variable 100-900)
assets/vendor/      three.module.min.js (r160), self-hosted
Hanieh_Khaled_CV.pdf
```

## Running locally

No dependencies. Serve the directory over HTTP:

```bash
python3 -m http.server 4321
# then open http://127.0.0.1:4321
```

Opening `index.html` directly via `file://` mostly works, but the contact form
and absolute paths behave correctly only over HTTP.

## Design system

Dark, cinematic, 3D. All colour is defined as custom properties in `styles.css`:
dark values on `:root` (the default), light values on `:root[data-theme="light"]`.
`main.js` writes the choice to `localStorage`; an inline script in `<head>`
applies it before first paint so there is no flash. Dark is the default
regardless of OS preference — the design is built around it.

## The stage

The hero and the five projects share one pinned WebGL object (`scene.js`,
Three.js). It is a pool of 1,024 points and 2,048 line segments; each block in
`index.html` with `data-state` tells it which shape to morph into when that
block reaches the middle of the viewport:

| state        | shows                                                        |
|--------------|--------------------------------------------------------------|
| `sphere`     | the abstract network in the hero                             |
| `realtime`   | a live Pong rally — two paddles tracking the ball, with the server above receiving moves and pushing state back |
| `poll`       | a crowd of voters, votes in flight, and a bar-chart tally    |
| `containers` | three nested containers; traffic reaches the outer, some the middle, none the inner |
| `irc`        | a server with 18 clients; one message in, fanned out to the rest |
| `vision`     | a face made of points, a detection box, landmarks and a scan line |

States can animate a subset of their points every frame (`ctx.animate` in
`scene.js`); lines attached to those points follow.

The caption under the object (`data-caption`) says what it is showing, so the
narration works even where WebGL doesn't. The module is imported after the
`load` event, only when WebGL is available, `prefers-reduced-motion` is off and
Data Saver is off; a CSS orb stands in until it mounts. Rendering pauses when
the stage leaves the viewport or the tab is hidden.

Glass surfaces carry a cursor-following spotlight; it is off on touch devices
and under reduced motion.

Every foreground/background pair meets WCAG AA (4.5:1 or better).

## Contact form

Wired to Netlify Forms — `data-netlify="true"`, a hidden `form-name` field, and a
`bot-field` honeypot. Submissions appear under **Forms** in the Netlify dashboard;
enable an email notification there to get them by mail. The form only works on
the deployed site, not locally.

## Outstanding

Search `index.html` for `TODO — HANIEH` — each marks a live demo URL or repo
URL still needed. The placeholder buttons are `<span>` elements, not
links, so nothing dead is clickable until a real URL is filled in.
