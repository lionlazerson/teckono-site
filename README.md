# teckono.com — static site

Plain HTML/CSS/JS, no build step. Upload the whole folder as is.

- `index.html` — the page
- `assets/css/style.css`, `assets/js/main.js` — styles and behaviour
- `assets/js/transition.js` — hero → brands card transition with glow and haze
- `assets/js/logo3d.js` + `vendor/` — hero scene: 3D logo, drone, robot with flashlight (three.js r160, self-hosted)
- `assets/img/robot-*.webp` — robot render cut into layers (body, arm, head) for the micro-animation
- `assets/img/brands/` — brand logos as grey masks (colour set in CSS)
- `assets/img/bg-hex-*.webp` — honeycomb backgrounds (dark hero, light sections)
- `assets/fonts/` — self-hosted fonts (no Google requests, GDPR-friendly)

## Deploy (IONOS Deploy Now)
Push this folder to the root of a GitHub repo, connect the repo in IONOS Deploy Now
as a static site, publish directory `/` (no build command).

## Contact form
Set `data-endpoint="..."` on `<form id="inquiry">` in `index.html` to a form service URL
(e.g. Formspree). Until then the form shows a message pointing to info@teckono.com.
