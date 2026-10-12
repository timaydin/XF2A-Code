// Isolated DOM/contract tests, NOT a XenForo runtime or browser layout test.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { JSDOM } = require('jsdom');
const root = path.resolve(__dirname, '..');
const source = name => fs.readFileSync(path.join(root, '_files/js/CMTV/Code', name), 'utf8');
function fixture(html = '') {
    const dom = new JSDOM('<!doctype html><body>' + html, { runScripts: 'outside-only', pretendToBeVisual: true, url: 'https://example.test/' });
    const w = dom.window;
    w.XF = {
        Element: { newHandler: x => x, register() {}, getHandler: el => el.handler },
        Event: { newHandler: x => x, register() {} },
        extend(base, extension) {
            const result = Object.assign({}, base, extension);
            for (const [old, backup] of Object.entries(extension.__backup || {})) result[backup] = base[old];
            return result;
        },
        CodeBlock: { init() {
            if (!this.options.lang) return;
            const code = this.target.querySelector('code');
            code.classList.add('language-' + this.options.lang);
            w.Prism.highlightElement(code);
        } },
        EditorDialogCode: { _init() {}, _afterShow() { this.coreAfterShow = true; } },
        EditorHelpers: { insertCode(...args) { w.coreInsertArgs = args; }, normalizeAfterInsert() { w.normalized = true; } },
        on: (el, event, fn) => el.addEventListener(event, fn),
        trigger: (el, event) => el.dispatchEvent(new w.Event(event, { bubbles: true })),
        phrase: x => x,
        flashMessage: (...args) => { w.flash = args; }
    };
    w.ResizeObserver = class { observe() {} disconnect() { this.disconnected = true; } };
    w.Prism = { manual: true };
    w.eval(fs.readFileSync(require.resolve('prismjs'), 'utf8'));
    w.eval(source('vendor/prism-plugins/line-numbers.min.js'));
    w.eval(source('vendor/prism-plugins/line-highlight.min.js'));
    for (const file of ['code-block.js', 'code-block-actions.js', 'code-block-resizer.js', 'editor-dialog-code.js']) w.eval(source(file));
    assert.equal(w.jQuery, undefined);
    assert.equal(w.$, undefined);
    assert.equal(w.Clipboard, undefined);
    assert.equal(w.XF.Click, undefined);
    return w;
}
function block(w, lang = 'javascript', ranges = '1,3-4', numbers = true) {
    w.document.body.innerHTML = '<div class="bbCodeBlock--code"><i class="action--copy"></i><i class="action--expand"></i><i class="action--collapse"></i><div class="bbCodeBlock-content"><pre style="line-height:20px;padding:0" class="language-none ' + (numbers ? 'line-numbers' : '') + '"><code></code></pre></div><div class="bbCodeBlock-grip"></div></div>';
    const pre = w.document.querySelector('pre');
    pre.dataset.line = ranges;
    pre.querySelector('code').textContent = 'const a = 1;\n// two\nconst b = 2;\nconsole.log(a + b);';
    const handler = Object.assign({}, w.CMTV_Code.CodeBlockExtend, { target: pre, options: { lang } });
    handler.init();
    return pre;
}
for (const numbers of [true, false]) for (const lang of ['javascript', '', 'unknown-language']) {
    test(`Prism: language=${lang || 'plain'}, numbers=${numbers}, range highlighting`, () => {
        const w = fixture();
        const pre = block(w, lang, '1,3-4', numbers);
        assert.equal(pre.querySelectorAll('.line-numbers-rows > span').length, numbers ? 4 : 0);
        assert.equal(pre.querySelectorAll('.line-highlight').length, 2);
        if (lang === 'javascript') assert.ok(pre.querySelector('.token.keyword'));
        w.close();
    });
}
test('invalid and huge ranges are filtered/clamped before the plugin runs', () => {
    const w = fixture();
    const pre = block(w, '', '0,4-2,x,1-999999999999,9999999999,-1,2', false);
    assert.equal(pre.dataset.line, '1-4,2');
    assert.equal(pre.querySelectorAll('.line-highlight').length, 2);
    w.close();
});
test('clipboard copies only original text, including with line numbers disabled', async () => {
    const w = fixture();
    block(w, '', '1,3-4', false);
    let copied;
    Object.defineProperty(w, 'isSecureContext', { value: true });
    Object.defineProperty(w.navigator, 'clipboard', { value: { writeText: async text => { copied = text; } } });
    await w.CMTV_Code.CodeBlock_Copy.click.call({ target: w.document.querySelector('.action--copy') }, { preventDefault() {} });
    assert.equal(copied, 'const a = 1;\n// two\nconst b = 2;\nconsole.log(a + b);');
    assert.equal(w.flash[0], 'CMTV_Code_copied');
    w.close();
});
test('denied clipboard uses native fallback and removes temporary textarea', async () => {
    const w = fixture(); block(w);
    Object.defineProperty(w, 'isSecureContext', { value: true });
    Object.defineProperty(w.navigator, 'clipboard', { value: { writeText: async () => { throw Error('denied'); } } });
    w.document.execCommand = command => command === 'copy';
    await w.CMTV_Code.CodeBlock_Copy.click.call({ target: w.document.querySelector('.action--copy') }, { preventDefault() {} });
    assert.equal(w.document.querySelector('textarea'), null);
    assert.ok(w.flash);
    w.close();
});
test('failed native copy offers selectable text without false success', async () => {
    const w = fixture(); block(w);
    w.document.execCommand = () => false;
    w.prompt = (label, value) => { w.promptText = value; };
    await w.CMTV_Code.CodeBlock_Copy.click.call({ target: w.document.querySelector('.action--copy') }, { preventDefault() {} });
    assert.ok(w.promptText.startsWith('const a'));
    assert.equal(w.flash, undefined);
    w.close();
});
test('three-argument editor API delegates to XF unchanged', () => {
    const w = fixture(); const ed = {};
    w.XF.EditorHelpers.insertCode(ed, 'PHP', '<?php echo 1;');
    assert.deepEqual(Array.from(w.coreInsertArgs), [ed, 'PHP', '<?php echo 1;']);
    w.close();
});
test('named options, code escaping, undo and normalization', () => {
    const w = fixture(); let output, undo = 0;
    const ed = { undo: { saveStep() { undo++; } }, html: { insert(value) { output = value; } } };
    w.XF.EditorHelpers.insertCode(ed, 'JavaScript', '<script>\n  a & b', { title: '<img src=x onerror=alert(1)>', highlight: '1,3-4' });
    assert.ok(output.includes('lang=&quot;javascript&quot;'));
    assert.ok(output.includes('highlight=&quot;1,3-4&quot;'));
    assert.ok(output.includes('&lt;img'));
    assert.ok(!output.includes('<script>'));
    assert.equal(undo, 2);
    assert.equal(w.normalized, true);
    w.close();
});
test('editor lifecycle retains default, refreshes mode, invokes core afterShow and resets fields', () => {
    const w = fixture('<div id="dialog"><form id="editor_code_form"><div data-xf-init="code-editor-switcher-container"><select id="editor_code_type"><option value="">Plain</option><option value="php" selected>PHP</option></select><textarea id="editor_code_code" data-xf-init="code-editor"></textarea><input id="editor_code_title"><input id="editor_code_highlight"></div></form></div>');
    const container = w.document.querySelector('#dialog');
    const overlay = { container, hide() { this.hidden = true; } };
    let inserted;
    const ed = { selection: { restore() {} }, undo: { saveStep() {} }, html: { insert(x) { inserted = x; } } };
    const handler = Object.assign({}, w.XF.EditorDialogCode, { overlay, ed });
    handler._init(overlay); handler._afterShow(overlay);
    assert.equal(handler.coreAfterShow, true);
    container.querySelector('#editor_code_code').value = 'echo 1;';
    container.querySelector('#editor_code_title').value = 'Sample';
    container.querySelector('#editor_code_highlight').value = '1';
    handler.submit({ preventDefault() {} });
    assert.ok(inserted.includes('Sample'));
    assert.equal(overlay.hidden, true);
    assert.equal(container.querySelector('#editor_code_type').value, 'php');
    assert.equal(container.querySelector('#editor_code_title').value, '');
    assert.equal(container.querySelector('#editor_code_code').value, '');
    w.close();
});
test('resize clamps and button state; observer cleanup', () => {
    const w = fixture(); block(w);
    const target = w.document.querySelector('.bbCodeBlock--code');
    const h = Object.assign({}, w.CMTV_Code.CodeBlock, { target }); h.init();
    h.minHeight = 100; h.maxHeight = 400;
    h.codeContainer.getBoundingClientRect = () => ({ height: parseFloat(h.codeContainer.style.height) || 100 });
    h.resize(1000);
    assert.equal(h.codeContainer.style.height, '400px');
    assert.equal(h.resizeButtons.expand.classList.contains('action--hidden'), true);
    h.resize(-200);
    assert.equal(h.codeContainer.style.height, '100px');
    assert.equal(h.resizeButtons.collapse.classList.contains('action--hidden'), true);
    h.destroy(); assert.equal(h.resizeObserver.disconnected, true); w.close();
});
test('pointer cancellation removes resizing state and capture', () => {
    const w = fixture(); block(w);
    const target = w.document.querySelector('.bbCodeBlock-grip');
    let released;
    target.hasPointerCapture = () => true;
    target.releasePointerCapture = id => { released = id; };
    const h = Object.assign({}, w.CMTV_Code.CodeBlock_Resizer, { target, pointerId: 7 });
    w.document.body.classList.add('CMTV_Code_resizing');
    h.handleEvent({ type: 'pointercancel', pointerId: 7 });
    assert.equal(released, 7);
    assert.equal(h.pointerId, null);
    assert.equal(w.document.body.classList.contains('CMTV_Code_resizing'), false);
    w.close();
});
test('PHP parses under the configured PHP 7.2 grammar', () => {
    const Parser = require('php-parser');
    const parser = new Parser({ parser: { phpVersion: '7.2', suppressErrors: false } });
    for (const file of ['EventsListener.php', 'XF/BbCode/RuleSet.php', 'XF/BbCode/Renderer/Html.php', 'XF/BbCode/Renderer/EmailHtml.php']) {
        assert.doesNotThrow(() => parser.parseCode(fs.readFileSync(path.join(root, file), 'utf8'), file));
    }
});
test('shipped JS contains no legacy DOM/clipboard adapter dependencies', () => {
    const files = fs.readdirSync(path.join(root, '_files/js/CMTV/Code'), { recursive: true }).filter(f => f.endsWith('.js'));
    for (const file of files) assert.doesNotMatch(source(file), /\bjQuery\b|\$target|\$container|XF\.proxy|XF\.Click|new Clipboard\b|\$\s*\(/, file);
});
