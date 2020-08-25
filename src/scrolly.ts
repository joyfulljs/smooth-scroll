import { getProperty } from '@joyfulljs/vendor-property';
const tranformStyleName = getProperty('transform');

function setTranslate(y: number) {
  // @ts-ignore
  content.style[tranformStyleName] = `translate3d(0,${y}px,0)`;
}

function getTranslate(element: HTMLElement) {
  // @ts-ignore
  const trans = window.getComputedStyle(element)[tranformStyleName];
  if (trans && trans !== 'none') {
    return parseFloat(trans.split(')')[0].split(',')[5])
  }
  return 0
}

function getOffsetSize(element: HTMLElement) {
  const style = window.getComputedStyle(element);
  return parseFloat(style.height)
    + parseFloat(style.marginTop)
    + parseFloat(style.marginBottom);
}

export default {
  setTranslate,
  getTranslate,
  getOffsetSize
}