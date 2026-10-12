var CMTV_Code = window.CMTV_Code || {};

(function ()
{
    'use strict';

    CMTV_Code.CodeBlock = XF.Element.newHandler({
        init: function ()
        {
            this.codeContainer = this.target.querySelector('.bbCodeBlock-content');
            this.pre = this.target.querySelector('pre');
            this.code = this.pre.querySelector('code');
            this.resizeButtons = {
                expand: this.target.querySelector('.action--expand'),
                collapse: this.target.querySelector('.action--collapse')
            };
            this.minHeight = null;
            this.maxHeight = null;
            this.expanded = false;
            this.frame = null;
            this.resizeObserver = new ResizeObserver(this.scheduleLayout.bind(this));
            this.resizeObserver.observe(this.target);
            this.resizeObserver.observe(this.pre);
            this.resizeObserver.observe(this.code);
            this.scheduleLayout();
        },

        scheduleLayout: function ()
        {
            if (this.frame !== null) return;
            this.frame = requestAnimationFrame(() =>
            {
                this.frame = null;
                this.visibleInit();
            });
        },

        visibleInit: function ()
        {
            if (!this.target.getClientRects().length || !this.pre.offsetHeight) return;

            // Work in border-box pixels, including horizontal scrollbar space.
            var container = this.codeContainer;
            var style = getComputedStyle(container);
            var border = parseFloat(style.borderTopWidth) + parseFloat(style.borderBottomWidth);
            var padding = parseFloat(style.paddingTop) + parseFloat(style.paddingBottom);
            var scrollbar = Math.max(0, container.offsetHeight - container.clientHeight - border);
            if (this.minHeight === null)
            {
                this.minHeight = container.getBoundingClientRect().height;
                // Freeze the CSS-limited height before relaxing max-height.
                // Otherwise height:auto immediately expands to the full content.
                container.style.boxSizing = 'border-box';
                container.style.height = this.minHeight + 'px';
            }
            this.maxHeight = Math.max(this.minHeight, this.pre.getBoundingClientRect().height + padding + border + scrollbar);
            container.style.boxSizing = 'border-box';
            container.style.minHeight = this.minHeight + 'px';
            container.style.maxHeight = this.maxHeight + 'px';
            if (this.expanded) container.style.height = this.maxHeight + 'px';

            var grip = this.target.querySelector('.bbCodeBlock-grip');
            grip.classList.toggle('resizer--hidden', this.maxHeight <= this.minHeight + 1);
            this.updateButtons();
            this.updateHighlights();
        },

        resize: function (height)
        {
            if (this.minHeight === null) this.visibleInit();
            if (this.minHeight === null) return;
            height = Math.max(this.minHeight, Math.min(this.maxHeight, height));
            this.expanded = height >= this.maxHeight - 1;
            this.codeContainer.style.height = height + 'px';
            this.updateButtons();
        },

        updateButtons: function ()
        {
            var height = this.codeContainer.getBoundingClientRect().height;
            this.resizeButtons.expand.classList.toggle('action--hidden', height >= this.maxHeight - 1);
            this.resizeButtons.collapse.classList.toggle('action--hidden', height <= this.minHeight + 1);
        },

        updateHighlights: function ()
        {
            // Range backgrounds must cover long unwrapped lines too.
            var style = getComputedStyle(this.pre);
            var width = Math.max(this.pre.clientWidth, this.code.getBoundingClientRect().width
                + parseFloat(style.paddingLeft) + parseFloat(style.paddingRight));
            this.pre.querySelectorAll('.line-highlight').forEach(function (line)
            {
                line.style.minWidth = width + 'px';
            });
        },

        destroy: function ()
        {
            this.resizeObserver.disconnect();
            if (this.frame !== null) cancelAnimationFrame(this.frame);
        }
    });

    CMTV_Code.CodeBlockExtend = XF.extend(XF.CodeBlock, {
        __backup: { init: '_init' },

        init: function ()
        {
            var code = this.target.querySelector('code');
            if (!code) return;
            // The bundled plugin assumes valid, ascending, bounded ranges.
            var count = code.textContent.split('\n').length;
            this.target.dataset.line = (this.target.dataset.line || '').split(',').map(function (range)
            {
                var match = range.trim().match(/^(\d+)(?:-(\d+))?$/);
                if (!match) return '';
                var start = Number(match[1]), end = Number(match[2] || match[1]);
                if (start < 1 || start > count || end < start) return '';
                return start + (end > start ? '-' + Math.min(end, count) : '');
            }).filter(Boolean).join(',');
            this._init();
            // XF skips Prism for plain code. Plugins still need its complete hook.
            if (!this.options.lang && typeof Prism === 'object')
            {
                Prism.highlightElement(code);
            }
        }
    });

    XF.Element.register('CMTV-code-block', 'CMTV_Code.CodeBlock');
    XF.Element.register('CMTV-code-block-extend', 'CMTV_Code.CodeBlockExtend');
})();
