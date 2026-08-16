Agent Carry dashboard license bundle
====================================

This directory is copied into dashboard/dist during every production build, so
the notices remain beside the actual offline application even when dist is used
on its own.

- fonts/ contains the exact SIL Open Font License 1.1 text distributed with
  each packaged font family.
- dashboard-production-dependencies.json is a machine-readable inventory of
  the npm production dependency tree used for the browser bundle.
- dashboard-production-dependencies.txt contains the corresponding package
  license and notice texts.
- source-code/ contains the machine-readable provenance map and exact license
  text for source templates copied or adapted into the repository rather than
  installed as npm dependencies.

The browser application, styles and framework code are embedded in
dashboard/dist/index.html. Fonts, snapshot.js and this license bundle remain
local sibling files. No runtime asset is fetched from a CDN.
