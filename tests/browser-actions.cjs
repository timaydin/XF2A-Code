// Real browser + real XF event/element dispatch. Supply licensed/local XF JS paths.
// No XF PHP/templates, installer, or editor integration is emulated by this test.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const http = require('node:http');
const path = require('node:path');
const { chromium } = require('playwright-core');
const root = path.resolve(__dirname, '..');
const assets = process.env.CMTV_ASSETS || path.join(root, '_files/js/CMTV/Code');
for (const key of ['XF_CORE_PATH', 'XF_CODE_BLOCK_PATH', 'CHROMIUM_PATH']) {
    assert.ok(process.env[key], `Set ${key} to a local file`);
}
// Keep the shipped action attributes; only expand icons/template expressions.
const template = fs.readFileSync(path.join(root, '_output/templates/public/CMTV_Code_bb_code_tag_code.html'), 'utf8');
const html = template.replace(/<xf:(?:macro|css|js)\b[^>]*\/>/g, '')
    .replace(/<xf:fa\b([^>]+)\/>/g, '<i $1><svg width="16" height="16"><rect width="16" height="16" /></svg></i>')
    .replace(/\{\{[\s\S]*?\}\}/g, '').replace(/\{\$[^}]+\}/g, '')
    .replace(/data-xf-init="tooltip"/g, ''); // Tooltip script is outside this test.
const css = `body{font:14px sans-serif}.bbCodeBlock{width:640px}.bbCodeBlock-content{max-height:120px;overflow:auto;transition:height .2s}
pre{margin:0;line-height:20px;padding:0}code{display:block;white-space:pre;font:14px/20px monospace}.action{display:inline-block;padding:8px;cursor:pointer}
.action--hidden,.resizer--hidden{display:none}.bbCodeBlock-grip{height:20px;touch-action:none}.line-highlight{position:absolute;pointer-events:none}
body.CMTV_Code_resizing .bbCodeBlock-content{transition:none!important}`;
const codeText = Array.from({length:30}, (_, i) => `const line${i + 1} = ${i + 1};`).join('\n');
(async () => {
    const server = http.createServer((req, res) => {
        res.setHeader('Content-Type', 'text/html; charset=utf-8');
        res.end(`<!doctype html><html><head><style>${css}</style></head><body>${html}</body></html>`);
    });
    await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
    let browser;
    try {
        browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH, headless: true,
            args: ['--no-sandbox', '--no-zygote', '--single-process', '--use-gl=angle', '--use-angle=swiftshader'] });
        const context = await browser.newContext({ permissions: ['clipboard-read', 'clipboard-write'] });
        const page = await context.newPage();
        const errors = [];
        page.on('pageerror', e => errors.push(e.message));
        page.on('console', msg => { if (msg.type() === 'error') errors.push(msg.text()); });
        await page.goto(`http://127.0.0.1:${server.address().port}/`);
        await page.evaluate(text => {
            // Suppress unrelated forum-page bootstrap, but use actual core dispatch.
            window.XF = { ready() {}, config: {} };
            window.Prism = { manual: true };
            document.querySelector('code').textContent = text;
            document.querySelector('pre').dataset.line = '1,3-4';
        }, codeText);
        await page.addScriptTag({ path: process.env.XF_CORE_PATH });
        await page.addScriptTag({ path: require.resolve('prismjs') });
        await page.addScriptTag({ path: require.resolve('prismjs/plugins/custom-class/prism-custom-class.js') });
        await page.addScriptTag({ path: process.env.XF_CODE_BLOCK_PATH });
        await page.evaluate(() => {
            window.flashes = [];
            XF.phrase = name => name;
            XF.flashMessage = (...args) => flashes.push(args); // Message UI is unrelated.
        });
        for (const file of ['vendor/prism-plugins/line-numbers.min.js', 'vendor/prism-plugins/line-highlight.min.js',
            'code-block.js', 'code-block-actions.js', 'code-block-resizer.js']) {
            const name = process.env.CMTV_MINIFIED && !file.includes('vendor/') ? file.replace('.js', '.min.js') : file;
            await page.addScriptTag({ path: path.join(assets, name) });
        }
        assert.deepEqual(errors, [], 'Scripts must load without an obsolete XF.Click shim');
        assert.deepEqual(await page.evaluate(() => [typeof XF.Click, typeof jQuery, typeof $]), ['undefined', 'undefined', 'undefined']);
        await page.evaluate(() => XF.Element.initialize(document));
        const height = () => page.locator('.bbCodeBlock-content').evaluate(el => el.getBoundingClientRect().height);
        const waitHeight = async expected => {
            await page.waitForFunction(n => Math.abs(document.querySelector('.bbCodeBlock-content').getBoundingClientRect().height - n) < 1, expected);
        };
        await page.waitForFunction(() => XF.Element.getHandler(document.querySelector('.bbCodeBlock'), 'CMTV-code-block').minHeight !== null);
        await waitHeight(120);
        assert.equal(await page.locator('.action--collapse').isVisible(), false);
        assert.equal(await page.locator('.action--expand').isVisible(), true);
        const max = await page.evaluate(() => XF.Element.getHandler(document.querySelector('.bbCodeBlock'), 'CMTV-code-block').maxHeight);
        assert.ok(max > 120);
        // Click the SVG child, through actual XF delegated event dispatch.
        for (let i = 0; i < 3; i++) {
            await page.locator('.action--expand rect').click();
            await waitHeight(max);
            await page.locator('.action--collapse rect').click();
            await waitHeight(120);
        }
        assert.ok(Math.abs(await height() - 120) < 1);
        console.log('PASS: initially collapsed; three expand/collapse cycles through XF.Event');
        await page.locator('.action--copy rect').click();
        await page.waitForFunction(() => flashes.length === 1);
        assert.equal(await page.evaluate(() => navigator.clipboard.readText()), codeText);
        console.log('PASS: real Clipboard API copies exact text, excludes Prism range helpers');
        // Also exercise denied async clipboard -> native execCommand fallback.
        await page.evaluate(() => Object.defineProperty(navigator.clipboard, 'writeText', {
            configurable: true, value: async () => { throw new DOMException('Denied', 'NotAllowedError'); }
        }));
        await page.locator('.action--copy rect').click();
        await page.waitForFunction(() => flashes.length === 2);
        assert.equal(await page.evaluate(() => navigator.clipboard.readText()), codeText);
        assert.equal(await page.locator('textarea').count(), 0);
        console.log('PASS: denied Clipboard API falls back to native copy and cleans up');
        assert.deepEqual(errors, []);
        console.log('PASS: no JavaScript errors; no XF.Click, jQuery, or $ shim');
    }
    finally {
        if (browser) await browser.close();
        await new Promise(resolve => server.close(resolve));
    }
})().catch(error => { console.error(error); process.exitCode = 1; });
