var CMTV_Code = window.CMTV_Code || {};

(function ()
{
    'use strict';

    CMTV_Code.CodeBlock_Resizer = XF.Element.newHandler({
        init: function ()
        {
            this.pointerId = null;
            this.target.addEventListener('pointerdown', this);
            this.target.addEventListener('pointermove', this);
            this.target.addEventListener('pointerup', this);
            this.target.addEventListener('pointercancel', this);
            this.target.addEventListener('lostpointercapture', this);
        },

        handleEvent: function (e)
        {
            if (e.type === 'pointerdown')
            {
                if (!e.isPrimary || e.button !== 0 || this.pointerId !== null) return;
                this.codeBlockH = XF.Element.getHandler(this.target.closest('.bbCodeBlock--code'), 'CMTV-code-block');
                this.codeBlockH.visibleInit();
                this.pointerId = e.pointerId;
                this.startY = e.clientY;
                this.startHeight = this.codeBlockH.codeContainer.getBoundingClientRect().height;
                this.target.setPointerCapture(e.pointerId);
                document.body.classList.add('CMTV_Code_resizing');
                e.preventDefault();
            }
            else if (e.pointerId === this.pointerId)
            {
                if (e.type === 'pointermove')
                {
                    e.preventDefault();
                    this.codeBlockH.resize(this.startHeight + e.clientY - this.startY);
                }
                else this.endResize();
            }
        },

        endResize: function ()
        {
            var id = this.pointerId;
            this.pointerId = null;
            if (id !== null && this.target.hasPointerCapture(id)) this.target.releasePointerCapture(id);
            document.body.classList.remove('CMTV_Code_resizing');
        },

        destroy: function ()
        {
            this.endResize();
            ['pointerdown', 'pointermove', 'pointerup', 'pointercancel', 'lostpointercapture'].forEach(type =>
                this.target.removeEventListener(type, this));
        }
    });

    XF.Element.register('CMTV-code-block-resizer', 'CMTV_Code.CodeBlock_Resizer');
})();
