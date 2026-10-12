(function ()
{
    'use strict';

    XF.EditorDialogCode = XF.extend(XF.EditorDialogCode, {
        __backup: { _init: 'CMTV_Code_init', _afterShow: 'CMTV_Code_afterShow' },

        _init: function (overlay)
        {
            this.CMTV_Code_init(overlay);
            this.CMTV_Code_defaultLanguage = overlay.container.querySelector('#editor_code_type').value;
            XF.on(overlay.container, 'code-editor:init', () => this.setDefaultLanguage());
        },

        _beforeShow: function ()
        {
            // Blur the native active element, without accessing Froala's DOM wrapper.
            if (document.activeElement) document.activeElement.blur();
        },

        _afterShow: function (overlay)
        {
            // Preserve XF's selection handling and code-editor refresh.
            this.setDefaultLanguage();
            this.CMTV_Code_afterShow(overlay);
        },

        submit: function (e)
        {
            e.preventDefault();
            var container = this.overlay.container;
            var codeMirror = container.querySelector('.CodeMirror');
            if (codeMirror)
            {
                var instance = codeMirror.CodeMirror;
                instance.save();
                instance.getDoc().setValue('');
                instance.setOption('mode', '');
            }

            var type = container.querySelector('#editor_code_type');
            var code = container.querySelector('#editor_code_code');
            var title = container.querySelector('#editor_code_title');
            var highlight = container.querySelector('#editor_code_highlight');
            this.ed.selection.restore();
            XF.EditorHelpers.insertCode(this.ed, type.value, code.value, {
                title: title ? title.value.trim() : '',
                highlight: highlight ? highlight.value.trim() : ''
            });
            this.overlay.hide();
            code.value = '';
            type.value = this.CMTV_Code_defaultLanguage;
            if (title) title.value = '';
            if (highlight) highlight.value = '';
        },

        setDefaultLanguage: function ()
        {
            var container = this.overlay.container;
            var type = container.querySelector('#editor_code_type');
            type.value = this.CMTV_Code_defaultLanguage;
            var textarea = container.querySelector('[data-xf-init~="code-editor"]');
            // submit clears CodeMirror's mode; force the switcher to restore it.
            if (textarea) textarea.dataset.lang = '';
            var switcher = container.querySelector('[data-xf-init~="code-editor-switcher-container"]');
            if (switcher) XF.trigger(switcher, 'code-editor:reinit');
        }
    });

    var insertCode = XF.EditorHelpers.insertCode;
    XF.EditorHelpers.insertCode = function (ed, type, code, extra)
    {
        extra = extra || {};
        if (!extra.title && !extra.highlight)
        {
            return insertCode.call(this, ed, type, code);
        }

        // Keep the existing named BBCode options. Escape HTML after composing
        // attributes so titles cannot insert markup into the rich-text editor.
        var escapeHtml = value => String(value).replace(/&/g, '&amp;')
            .replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
        var option = value => String(value).replace(/"/g, "'").replace(/[\r\n\[\]]/g, ' ');
        var lang = type.toLowerCase();
        var open = '[CODE' + (lang ? ' lang="' + option(lang) + '"' : '')
            + (extra.title ? ' title="' + option(extra.title) + '"' : '')
            + (extra.highlight ? ' highlight="' + option(extra.highlight) + '"' : '') + ']';
        code = escapeHtml(code).replace(/\t/g, '    ')
            .replace(/\n /g, '\n&nbsp;').replace(/ {2}/g, '&nbsp; ')
            .replace(/ {2}/g, ' &nbsp;').replace(/\n/g, '</p><p>');
        var output = escapeHtml(open) + code + '[/CODE]';
        if (output.match(/<\/p>/i))
        {
            output = ('<p>' + output + '</p>').replace(/<p><\/p>/g, '<p><br></p>');
        }
        ed.undo.saveStep();
        ed.html.insert(output);
        ed.undo.saveStep();
        XF.EditorHelpers.normalizeAfterInsert(ed);
    };
})();
