import ScrollY from './scrolly';
import { assign } from './utils';
import { TRANSFORM_STYLE_NAME } from './consts';

function ScrollX() {
  ScrollY.apply(this, arguments)
}

assign(ScrollX.prototype, ScrollY.prototype);
assign(ScrollX.prototype, {
  setTranslate(x) {
    this.content.style[TRANSFORM_STYLE_NAME] = `translate3d(${x}px,0, 0)`;
  },
  getTranslate(element) {
    const trans = window.getComputedStyle(element);
    if (trans && trans !== 'none') {
      return parseFloat(transtrans[TRANSFORM_STYLE_NAME].split(',')[4])
    }
    return 0
  },
  getBounding(element) {
    const style = window.getComputedStyle(element);
    return parseFloat(style.width)
      + parseFloat(style.marginLeft)
      + parseFloat(style.marginRight);
  }
});

export default ScrollX;