# CMTV Code 2.2.3 — XenForo 2.3.4 compatibility checklist

Status: release-format staging candidate, not certified on a XenForo runtime.
Base: CMTV/XF2A-Code 978ab69, add-on ID CMTV/Code. Target XF version ID 2030470.
No production forum was accessed or changed.

## Completed in this workspace

- [x] Audit upstream PHP, first-party scripts, bundled Prism plugins, template modifications, exported data and release manifest.
- [x] Replace add-on jQuery usage and obsolete XF DOM wrappers with native JS/XF 2.3-style handlers.
- [x] Remove external Clipboard constructor dependency; native secure clipboard plus native fallback.
- [x] Preserve BBCode option names and original renderer/RuleSet extension architecture.
- [x] Preserve bundled Prism line-number and line-highlight plugins byte for byte.
- [x] Parse all four PHP files using php-parser 3.7.0 in PHP 7.2 mode.
- [x] Check JavaScript syntax, XML/JSON parsing, template asset references and diff whitespace (preserving existing CRLF PHP source).
- [x] Pass browser action regression tests without XF.Click or jQuery; the old 2.2.1 package fails the same registration test.
- [x] Pass 17 isolated DOM/contract tests with no `$`, `jQuery` or external `Clipboard` global.
- [x] Rebuild minified assets; regenerate SHA256 manifest; verify every packaged hash and ZIP integrity.

The DOM tests use jsdom and a small XF contract stub, not the real XF runtime.
PHP grammar parsing is not native `php -l`, inheritance validation, or execution.
Live public XF JavaScript was inspected as reference; exact 2.3.4 files were unavailable.
A Chromium regression test now covers actual XF.Event dispatch, initial height, repeated expand/collapse, real clipboard copying and denied-permission fallback. It uses live public XF core JavaScript as reference, not a pinned 2.3.4 distribution or the full forum. Full target-version testing remains required.

## Staging setup and installation

- [ ] Use a private licensed XenForo **2.3.4** instance and the same PHP version as the intended forum; disable outbound email and external callbacks.
- [ ] Snapshot its files/database. Test a fresh install and, separately, an upgrade from original CMTV Code 2.2.0 with existing posts/options, and an upgrade from port candidate 2.2.1.
- [ ] Install `CMTV-Code-2.2.3-XF2.3.4.zip` through the ACP add-on ZIP installer, or copy the ZIP's `upload/` contents into the staging XF root and install/upgrade **CMTV/Code** from ACP.
- [ ] Confirm version 2.2.3, all existing option values preserved, all add-on file health checks pass, and no server errors.
- [ ] Run `find src/addons/CMTV/Code -name '*.php' -print0 | xargs -0 -n1 php -l` on staging.
- [ ] Verify PHP extension methods against 2.3.4 parents: RuleSet::addDefaultTags/parseValidateCode, Html::renderTagCode/getRenderedCode, EmailHtml::renderTagCode, and both event listener signatures.
- [ ] In ACP, confirm all seven template modifications below apply without errors and inspect each replacement.

Authoritative upstream modification keys (seven):

1. `CMTV_Code_bb_code_tag_code`
2. `CMTV_Code_editor`
3. `CMTV_Code_editor_dialog_code_common_languages`
4. `CMTV_Code_editor_dialog_code_default_language`
5. `CMTV_Code_editor_dialog_code_title`
6. `CMTV_Code_helper_js_global_phrase`
7. `CMTV_Code_prism_macros_plugins`

- [ ] Confirm templates/LESS compile in the default style and the intended custom style.
- [ ] Test normal asset mode and development/unminified mode. Confirm no stale cached 2.2.0 JS is served.

## BBCode regression fixtures

Create posts with these exact opening tags and a six-line code body; preview, save, edit and quote each. Existing posts must remain unchanged in storage.

| Opening tag | Expected behavior |
| --- | --- |
| `[CODE]` | Plain code or configured default language |
| `[CODE=php]` | Legacy positional language; syntax highlighting |
| `[CODE lang="javascript"]` | Named language; syntax highlighting |
| `[CODE title="Example"]` | Custom title; configured default language |
| `[CODE lang="javascript" title="Example" highlight="1,3-5"]` | Title, syntax, numbers, single line and range |
| `[CODE=Old title\|php]` | Legacy title/language syntax only when backward compatibility is enabled |
| `[CODE lang="rich"]` | Original rich-code behavior remains usable |
| `[CODE lang="unknown"]` | Readable text without JavaScript errors |
| `[CODE highlight="5-2,x,0,2-999999999"]` | Invalid ranges ignored; valid overlong range clamped to content |

Always close with `[/CODE]`. Sample six-line JavaScript body:

```javascript
const text = "<tag> & literal";
const values = [1, 2, 3];
for (const value of values) {
    console.log(value);
}
console.log(text);
```

- [ ] Test empty code, one line, trailing newline, 1,000+ lines, long unbroken lines, tabs, spaces, Unicode and RTL surrounding posts.
- [ ] Test all four combinations of line numbering on/off and line-range highlighting on/off.
- [ ] Check range positions and line numbers after font loading, window resizing and browser zoom.
- [ ] Check HTML/email rendering of positional and named options; no array-to-string errors or unsafe HTML.
- [ ] Verify title/class escaping and code containing HTML-like text does not execute markup.
- [ ] Confirm old stored titles containing quotes/brackets still render; new dialog titles normalize double quotes to single quotes and brackets/newlines to spaces to avoid breaking option syntax.
- [ ] Confirm one configured accent highlight color remains the original behavior; distinct per-range colors were not an original feature and are not added by this port.

## Display, actions and dynamic content

- [ ] Test Firefox on Debian and Chromium, plus a touch device.
- [ ] Short blocks have no unnecessary expand/collapse/grip; long blocks expand, collapse and resize within bounds.
- [ ] Horizontal scrollbars remain usable; range backgrounds cover long lines without increasing the block width continuously.
- [ ] Test drag using mouse, touch and pen, drag beyond grip, pointer cancellation, and removal of content during a drag. Cursor must not remain in resize mode.
- [ ] Respect reduced-motion preference; resize drag must not lag behind an animation.
- [ ] Test code inside initially closed spoilers, nested spoilers, tabs and overlays, and after AJAX preview/quick-edit/reply loading. No missing or duplicate line numbers/highlights.
- [ ] Copy retains exact code text/whitespace and excludes numbers/range labels with numbering both enabled and disabled.
- [ ] Test HTTPS clipboard success, denied permission and unavailable Clipboard API. Failed automatic copying offers selectable text and does not show a false success message.

## Editor integration and dependency acceptance

- [ ] Open code dialog, enter title/ranges/language, submit and reopen. Defaults, selected text, CodeMirror mode, clear/reset and cursor focus behave correctly.
- [ ] Cancel/reopen, switch languages repeatedly, use multiple editors, and test Android textarea fallback.
- [ ] Undo/redo code insertion works; ordinary three-argument `XF.EditorHelpers.insertCode` callers still work.
- [ ] Common language configuration, default code language, default insert language and custom language modes still work.
- [ ] Run with other add-ons disabled and **without a global jQuery shim**. Do not remove dependencies owned by XenForo's own editor.
- [ ] Network/assets inspection shows no add-on-loaded jQuery, jQuery bridge, clipboard adapter, or third-party CDN dependency.
- [ ] Browser console and XF error log remain clear through these cases.
- [ ] Repeat acceptance checks separately on 2.3.13 before claiming compatibility with that version. The dependency minimum alone is not a compatibility guarantee.

## Reproduce local checks and rebuild

Use Node 22+ and Python 3; no runtime Node dependency is installed into XenForo.

```sh
npm ci --ignore-scripts
npm test
npm run build
python3 tools/static-checks.py
```

`tools/build.py` writes the installable ZIP to `dist/`, regenerates `hashes.json`
using XenForo's SHA-256 normalization (remove every `\r` byte before hashing),
and verifies the archive. It excludes tests, development exports, archived releases,
node_modules and documentation from the installable payload. The source bundle
contains the build/test tooling and lockfile. Use `_data` as the release authority;
upstream `_output` is incomplete and must not be imported wholesale over `_data`.

XenForo removes every carriage-return byte before computing add-on file hashes.
The installer ZIP must still preserve the original file bytes; only the hash
input is normalized. Regression tests cover CRLF/LF equivalence and byte preservation.

Rollback on staging: restore the pre-test files/database snapshot. Do not uninstall
the add-on just to downgrade, as uninstalling removes its configuration. Production
deployment is outside the scope of this work and has not been authorized or performed.


## 2.2.2 focused retest

The user confirmed that title and line-range rendering worked in 2.2.1, but
collapse and copy did not. That package incorrectly used XF.Click. The original
unit-test stub supplied that obsolete API and masked the registration failure.
2.2.2 uses XF.Event.newHandler and XF.Event.register with explicit click type,
and freezes the CSS-limited initial height before raising max-height.

- [ ] Upgrade 2.2.1 to 2.2.2 through ACP; do not uninstall first.
- [ ] Hard-refresh the test page after the upgrade so the new assets load.
- [ ] Long code starts collapsed, then expands and collapses repeatedly.
- [ ] Copy a code block and paste into a plain-text editor; verify exact content.
- [ ] Recheck custom title and highlighted ranges.

## 2.2.3 hash-manifest correction

XenForo's installed-file checker removes carriage returns before comparing the
SHA-256 manifest. 2.2.3 applies this rule to every manifest entry while retaining
the original CRLF PHP files in the archive. For an existing 2.2.2 install, the
companion `CMTV-Code-2.2.2-hashes.json` contains a normalized manifest for that
release without changing its add-on version.

To reproduce the real browser action test (requires local Chromium and XF JS):

```sh
XF_CORE_PATH=/path/to/xf/core.js \
XF_CODE_BLOCK_PATH=/path/to/xf/code_block.js \
CHROMIUM_PATH=/path/to/chromium npm run test:browser
```

The test uses the actual XF dispatcher and shipped action attributes. It
simplifies icon markup and CSS instead of compiling XF templates. Clipboard
read/write is exercised on an isolated local page; tooltip and flash-message UI,
PHP and the rich-text editor are outside this regression test. No XF source files
are redistributed in the source bundle.
