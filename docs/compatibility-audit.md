# Compatibility audit — before implementation

Baseline: CMTV/XF2A-Code commit 978ab69 (2.2.0). Target: XenForo 2.3.4.

## Findings

- All four first-party JavaScript files require jQuery; XF handlers use obsolete `$target`, overlay `$container`, `XF.proxy`, DOM traversal, events and animation APIs.
- Copy assumes an externally supplied `Clipboard` constructor; the add-on neither includes nor declares it. Replace this dependency with native clipboard handling.
- The editor overrides a copied older submit/insert implementation and suppresses core afterShow behavior. Port to native overlay.container and preserve core selection, undo, normalization and code-editor lifecycle.
- CodeBlockExtend calls core init and highlights again; its parent also calls the extension init manually. Remove repeated highlighting and handler-order coupling; size after Prism completion and on layout changes.
- Visibility observation watches only one ancestor and never disconnects. Drag events lack touchcancel cleanup. Use ResizeObserver and pointer capture/cancellation.
- Bundled Prism line numbers and line highlighting plugins contain no jQuery usage. Preserve these assets and existing BBCode option names/configuration.
- PHP passes a potentially null code option to strpos (deprecated with PHP 8.1) and reads absent language array keys. Add narrow guards.
- Original hashes.json refers to absent Setup.php and minified files; rebuild the manifest from the actual package.
- `_output` is incomplete and differs from `_data`; use `_data` as release authority and regenerate matching development exports for changed template records.
- Existing template modifications match literal XF template fragments. Application counts require verification against a licensed 2.3.4 installation.

## Evidence and limitations

Public upstream repository cloned directly from https://github.com/CMTV/XF2A-Code.
Native API references inspected at https://xenforo.com/community/js/xf/editor.js,
https://xenforo.com/community/js/xf/code_block.js and
https://xenforo.com/community/js/xf/code_editor.js on 2026-10-12 UTC.
These are live public assets, NOT a pinned 2.3.4 distribution. No licensed XF
PHP source, template set, database, or runtime was supplied. PHP parent signatures,
template compilation/application, installer and complete editor integration therefore
remain staging acceptance gates. No production forum access is involved.

The dependency boundary is add-on code and bundled assets. XenForo's own editor
internals remain owned by XenForo; using its supported editor APIs does not remove
libraries that XenForo itself ships. The add-on must not load a jQuery bridge,
Clipboard library, or another adapter requiring jQuery.

Original line-range highlighting uses one style-controlled accent color. It does
not provide separate per-range colors; this port preserves the original behavior.


## Implemented changes and validation

Release candidate: Code 2.2.1, minimum XenForo 2.3.4. Version was increased
from 2.2.0 so ACP can recognize an upgrade. No database schema changes.

- Four first-party scripts now use native DOM and XF handlers. Native copy
  strips Prism-generated helper nodes; no external clipboard adapter is loaded.
- Expand/collapse use CSS height transitions (disabled during dragging and for
  reduced motion). Pointer capture handles drag cancellation. ResizeObserver
  handles initially hidden blocks and subsequent layout changes.
- Core code highlighting runs once; plain code still invokes Prism for plugins.
  Malformed, reversed and oversized ranges are filtered/clamped before the old
  plugin can allocate an invalid array. Valid stored range syntax is unchanged.
- Editor integration uses overlay.container, XF.on/trigger, original named
  options and core selection/undo/normalization APIs. Ordinary helper calls
  delegate to XF. New title input is HTML-escaped and delimiter characters
  normalized before generating BBCode; existing stored posts are not migrated.
- Null code options and unknown/malformed language config entries have narrow
  PHP guards. Renderer classes and tag interpretation otherwise remain intact.
- Plugin assets are unchanged. Source and minified assets are packaged together;
  old archived releases and developer dependencies are not shipped.

Validation completed: 17 isolated jsdom tests pass; Node syntax checks pass for
all six JS files; all exported XML and package JSON parse; changed template
exports match release data; asset references resolve; diff whitespace checks
pass with original CRLF recognized; all four PHP files parse with php-parser
3.7.0's PHP 7.2 grammar. XenForo computes add-on SHA-256 values after removing
all carriage-return bytes, so the build applies that normalization for every
manifest entry while preserving original bytes in the upload ZIP. ZIP integrity
and all normalized manifest hashes pass.

Not completed: native PHP CLI lint (CLI unavailable, installation blocked by the
environment), browser layout/input tests (browser archive downloads failed),
XF 2.3.4 installation, compiled template/LESS validation, PHP inheritance checks,
full Froala/CodeMirror integration, and XF 2.3.13 testing. These limitations are
listed as unchecked acceptance gates in the companion checklist. A valid release
layout is not proof that XF's installer/runtime will accept every integration.

The bundled tests use stubs only at the XF boundary and actual shipped Prism
plugins. They must not be described as a full XenForo test suite. To certify the
port, supply a licensed 2.3.4 test installation/source and run the checklist.


## Follow-up correction — 2.2.2

User testing confirmed working titles and line-range rendering, but nonfunctional
collapse and copy. Root cause found in code: the port retained XF.Click from the
original add-on. The inspected XF core exposes XF.Event, and has no XF.Click.
Consequently the actions script throws before any action can register. The
original test stub incorrectly provided XF.Click and hid this incompatibility.

Changes are limited to action registration, initial height, release metadata,
and the supporting tests/documentation:

- Use XF.Event.newHandler, explicit eventType:'click', and
  XF.Event.register('click', identifier, className) for all three actions.
- Freeze the measured CSS-limited height before relaxing max-height, preventing
  height:auto from immediately expanding the block at initialization.
- Remove XF.Click from test fixtures and reject it in runtime dependency scans.
- Add a real Chromium test that loads actual public XF core and CodeBlock code,
  then clicks nested SVG elements through the actual XF.Event dispatcher. The
  old 2.2.1 release fails with an undefined-newHandler error; 2.2.2 passes initial
  collapsed height, three expand/collapse cycles, exact Clipboard API copying,
  and denied-API native fallback. No jQuery or obsolete XF.Click shim is present.

This supersedes the earlier browser-test limitation for those narrow action
scenarios only. The test uses simplified CSS/icon output and live public XF
JavaScript, not a complete licensed/pinned 2.3.4 forum. Full 2.3.4 integration,
PHP CLI/inheritance checks and 2.3.13 verification remain outstanding.

## Follow-up correction — 2.2.3 file-health hashes

XenForo calculates add-on file-health SHA-256 values after removing every
carriage-return byte. The 2.2.2 build hashed raw bytes instead, so the renderer
manifest listed `811a0fb6…` while XenForo expected `473d9a8d…` for the same
CRLF source file. The 2.2.3 build now applies this normalization to every
manifest entry and keeps the original bytes unchanged in the install ZIP. A
standalone `CMTV-Code-2.2.2-hashes.json` provides the corrected manifest for
existing 2.2.2 installs without changing their add-on version.
