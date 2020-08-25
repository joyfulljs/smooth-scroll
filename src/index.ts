
import XTouch, { on, off } from '@joyfulljs/xtouch';
import { getProperty } from '@joyfulljs/vendor-property';

export default function Scroll(el: HTMLElement, options: IOptions) {

  // @ts-ignore
  if (el.__joyfulljs_scroll_bound) {
    return;
  }
  // @ts-ignore
  el.__joyfulljs_scroll_bound = true;

  const REFRESH_INTERVAL = 16;
  const SPEED_DETECT_INTERVAL = 200;
  const MAX_OVERFLOW = 120;
  const MIN_SPEED = 0.01;
  const TOUCH_RESISTANCE = 0.1;
  const WINDAGE_RESISTANCE = 0.3;
  const ELASTIC_RESISTANCE = 0.2;

  // @ts-ignore
  const rAf = window[getProperty('requestAnimationFrame')] || function (callback: Function) {
    return setTimeout(callback, REFRESH_INTERVAL)
  };

  const container = el;
  const content = el.querySelector(':first-child') as HTMLElement; // el.children[0]
  const scrollTouches: IScrollTouchList = {};
  const tranformStyleName = getProperty('transform');

  let touchStarted = false;
  let scrolling = false;
  let containerHeight = 0;
  let contentHeight = 0;
  let minTranslateY = 0;
  // the current translate of Y axis
  let originCurrentY = 0;
  let currentY = 0;

  const destroy = XTouch(container, { onStart, onEnd, onMove, capture: { passive: false } })
  on(container, 'touchcancel', onEnd, true);

  function onStart(e: TouchEvent) {
    // console.log('start:', e.touches[0].identifier, e.touches[1] && e.touches[1].identifier);
    // 初始位置的记录忽略后续按下的手指
    if (e.touches.length === 1) {
      containerHeight = getOccupiedHeight(container);
      contentHeight = getOccupiedHeight(content);
      originCurrentY = currentY = getTranslateY(content);
      minTranslateY = containerHeight - contentHeight;
      scrolling = false;
      touchStarted = true;
    }
    scrollTouches[e.changedTouches[0].identifier] = {
      touchStartY: e.changedTouches[0].pageY,
      speedStartY: currentY,
      speedStartTime: e.timeStamp
    }
  }

  function onMove(e: TouchEvent) {
    if (touchStarted) {
      let delt = handleMove(e, e.changedTouches[0])
      // console.log('move1', e.changedTouches[0].identifier);
      if (e.changedTouches.length === 2) {
        delt = Math.max(delt, handleMove(e, e.changedTouches[1]))
      } else if (e.changedTouches.length > 2) {
        const deltArr = [delt];
        for (let i = 1, len = e.changedTouches.length; i < len; i++) {
          deltArr.push(handleMove(e, e.changedTouches[i]))
        }
        delt = Math.max.apply(Math, deltArr);
        // console.log('move2', delt);
      }
      originCurrentY += delt;
      if (originCurrentY > 0) {
        if (delt > 0) {
          currentY = originCurrentY * ELASTIC_RESISTANCE
        } else {
          currentY += delt;
          originCurrentY = currentY / ELASTIC_RESISTANCE;
        }
      } else if (originCurrentY < minTranslateY) {
        if (delt < 0) {
          currentY = minTranslateY + (originCurrentY - minTranslateY) * ELASTIC_RESISTANCE;
        } else {
          currentY += delt;
          originCurrentY = minTranslateY + (currentY - minTranslateY) / ELASTIC_RESISTANCE;
        }
      } else {
        currentY = originCurrentY
      }
      setTranslateY(currentY);
      e.preventDefault();
    }
  }

  function handleMove(e: TouchEvent, touchItem: Touch) {
    let touch = scrollTouches[touchItem.identifier];
    if (touch) {
      const delt = touchItem.pageY - touch.touchStartY;
      touch.touchStartY = touchItem.pageY;
      if (e.timeStamp - touch.speedStartTime > SPEED_DETECT_INTERVAL) {
        touch.speedStartY = currentY;
        touch.speedStartTime = e.timeStamp;
      }
      return delt;
    }
    return 0;
  }

  function onEnd(e: TouchEvent) {
    let fingerId = e.changedTouches[0].identifier;
    // console.log('end: ', fingerId);
    if (e.touches.length === 0) {
      touchStarted = false;
      let touch = scrollTouches[fingerId];
      if (touch) {
        const speed = (currentY - touch.speedStartY) / ((e.timeStamp - touch.speedStartTime) / REFRESH_INTERVAL);
        scrollAt(speed, setTranslateY);
      }
    }
    scrollTouches[fingerId] = null;
  }

  function scrollTo(y: number) {
    scrolling = true;
    rAf(function tick() {
      if (scrolling) {
        let delt = currentY - y;
        if (Math.abs(delt) < MIN_SPEED) {
          currentY = y;
        } else {
          currentY -= delt * 0.12;
          rAf(tick);
        }
        setTranslateY(currentY);
      }
    })
  }

  function scrollAt(speed: number, tickCallback: (e: number) => void) {
    let startSpeed = Math.abs(speed);
    if (!startSpeed || startSpeed < MIN_SPEED) {
      resetPosition();
      return;
    }
    scrolling = true;
    let currentSpeed = startSpeed;
    let isScrollUp = speed < 0, maxOverflow;
    rAf(function tick() {
      if (scrolling) {
        // 接触摩擦： 0.1;
        // 风阻摩擦： 0.3 与速度成正比；
        currentSpeed -= (currentSpeed / startSpeed * WINDAGE_RESISTANCE + TOUCH_RESISTANCE);
        currentY += isScrollUp ? -currentSpeed : currentSpeed;
        tickCallback(currentY);
        // 最大溢出距离为即时速度的3倍
        maxOverflow = Math.min(currentSpeed * 3, MAX_OVERFLOW);
        if (currentY > maxOverflow) {
          scrollTo(0)
        } else if (currentY < minTranslateY - maxOverflow) {
          scrollTo(minTranslateY)
        } else if (currentSpeed > 0) {
          rAf(tick);
        }
      }
    })
  }

  function resetPosition() {
    if (currentY > 0) {
      scrollTo(0)
    } else if (currentY < minTranslateY) {
      scrollTo(minTranslateY)
    }
  }

  function setTranslateY(y: number) {
    // @ts-ignore
    content.style[tranformStyleName] = `translate3d(0,${y}px,0)`;
  }

  function getTranslateY(element: HTMLElement) {
    // @ts-ignore
    const trans = window.getComputedStyle(element)[tranformStyleName];
    if (trans && trans !== 'none') {
      return parseFloat(trans.split(')')[0].split(',')[5])
    }
    return 0
  }

  function getOccupiedHeight(element: HTMLElement) {
    const style = window.getComputedStyle(element);
    return parseFloat(style.height)
      + parseFloat(style.marginTop)
      + parseFloat(style.marginBottom);
  }

  return {
    destroy() {
      destroy();
      off(container, 'touchcancel', onEnd, true);
    }
  }
};

export enum Direction {
  X,
  Y,
  Both
}

interface IOptions {
  /**
   * 设置之后按照此数值的整数倍滚动
   */
  scrollUnit?: number;
  /**
   * 滚动方向
   */
  direction?: Direction
}

interface IScrollTouchList {
  [index: number]: {
    touchStartY: number;
    speedStartY: number;
    speedStartTime: number;
  }
}