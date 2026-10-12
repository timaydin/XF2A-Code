var CMTV_Code = window.CMTV_Code || {};

(function ()
{
    'use strict';

    CMTV_Code.CodeBlock_Copy = XF.Event.newHandler({
        eventType: 'click',
        eventNameSpace: 'CMTV_CodeCodeBlock_Copy',
        init: function () {},

        click: async function (e)
        {
            e.preventDefault();
            var code = this.target.closest('.bbCodeBlock--code').querySelector('code').cloneNode(true);
            // Prism can append range labels and measuring nodes to the code element.
            code.querySelectorAll('.line-numbers-rows, .line-numbers-sizer, .line-highlight').forEach(node => node.remove());
            var text = code.textContent;
            try
            {
                if (!navigator.clipboard || !window.isSecureContext) throw new Error('Clipboard API unavailable');
                await navigator.clipboard.writeText(text);
            }
            catch (error)
            {
                // Native fallback for HTTP or denied clipboard permission.
                var input = document.createElement('textarea');
                var active = document.activeElement;
                input.value = text;
                input.style.cssText = 'position:fixed;left:-10000px;top:0';
                document.body.appendChild(input);
                input.select();
                var copied = false;
                try { copied = document.execCommand('copy'); }
                catch (ignored) { /* Show selectable text below. */ }
                finally
                {
                    input.remove();
                    if (active) active.focus({ preventScroll: true });
                }
                if (!copied)
                {
                    window.prompt(XF.phrase('CMTV_Code_copy'), text);
                    return;
                }
            }
            XF.flashMessage(XF.phrase('CMTV_Code_copied'), 1500);
        }
    });

    CMTV_Code.CodeBlock_Expand = XF.Event.newHandler({
        eventType: 'click',
        eventNameSpace: 'CMTV_CodeCodeBlock_Expand',
        init: function () {},
        click: function (e)
        {
            e.preventDefault();
            var handler = XF.Element.getHandler(this.target.closest('.bbCodeBlock--code'), 'CMTV-code-block');
            handler.visibleInit();
            handler.resize(handler.maxHeight);
        }
    });

    CMTV_Code.CodeBlock_Collapse = XF.Event.newHandler({
        eventType: 'click',
        eventNameSpace: 'CMTV_CodeCodeBlock_Collapse',
        init: function () {},
        click: function (e)
        {
            e.preventDefault();
            var handler = XF.Element.getHandler(this.target.closest('.bbCodeBlock--code'), 'CMTV-code-block');
            handler.resize(handler.minHeight);
        }
    });

    XF.Event.register('click', 'CMTV-code-block-copy', 'CMTV_Code.CodeBlock_Copy');
    XF.Event.register('click', 'CMTV-code-block-expand', 'CMTV_Code.CodeBlock_Expand');
    XF.Event.register('click', 'CMTV-code-block-collapse', 'CMTV_Code.CodeBlock_Collapse');
})();
