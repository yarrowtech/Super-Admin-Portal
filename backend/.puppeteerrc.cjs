// Render's build environment intermittently fails to download/cache Chrome during
// `npm install`, which fails the whole deploy (postinstall exits non-zero). Skip the
// download here; legalDocument.v2.controller.js already handles puppeteer.launch()
// failing at runtime and returns a clear 500 instead of crashing the server.
module.exports = {
  skipDownload: true,
};
