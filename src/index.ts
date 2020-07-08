
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
  const ELASTIC_RESISTANCE = 0.3;

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
  let currentY = 0;
  // the start position
  let startCurrentY = 0;
  // the move distance
  let deltY = 0

  const destroy = XTouch(container, { onStart, onEnd, onMove, capture: { passive: false } })
  on(container, 'touchcancel', onEnd, true);

  function onStart(e: TouchEvent) {
    containerHeight = getOccupiedHeight(container);
    contentHeight = getOccupiedHeight(content);
    currentY = getTranslateY(content);
    minTranslateY = containerHeight - contentHeight;
    scrolling = false;
    touchStarted = true;
    // 初始位置的记录忽略后续按下的手指
    if (e.touches.length === 1) {
      startCurrentY = currentY;
      deltY = 0;
      // 需要还原currentY状态下的deltY
      if (currentY >= 0) {
        deltY = currentY / ELASTIC_RESISTANCE - startCurrentY;
      } else if (currentY <= minTranslateY) {
        deltY = (currentY - minTranslateY) / ELASTIC_RESISTANCE + minTranslateY - startCurrentY;
      }
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
      if (e.changedTouches.length > 1) {
        for (let i = 1, len = e.changedTouches.length; i < len; i++) {
          delt += handleMove(e, e.changedTouches[i])
        }
      }
      deltY += delt;
      currentY = startCurrentY + deltY;
      if (currentY > 0) {
        currentY *= ELASTIC_RESISTANCE
      } else if (currentY < minTranslateY) {
        currentY = minTranslateY + (currentY - minTranslateY) * ELASTIC_RESISTANCE;
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
    touchStarted = false;
    let fingerId = e.changedTouches[0].identifier;
    if (e.touches.length === 0) {
      let touch = scrollTouches[fingerId];
      if (touch) {
        const speed = (currentY - touch.speedStartY) / ((e.timeStamp - touch.speedStartTime) / REFRESH_INTERVAL);
        scrollAt(speed, setTranslateY);
      }
    }
    delete scrollTouches[fingerId]
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
        if (isScrollUp) {
          currentY -= currentSpeed;
        }
        else {
          currentY += currentSpeed;
        }
        tickCallback(currentY);
        // 最大溢出距离为即时速度的3倍
        maxOverflow = Math.min(currentSpeed * 3, MAX_OVERFLOW);
        if (currentY > maxOverflow) {
          scrollTo(0)
        }
        else if (currentY < minTranslateY - maxOverflow) {
          scrollTo(minTranslateY)
        }
        else if (currentSpeed > 0) {
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

interface IOptions {
  /**
   * 设置之后按照此数值的整数倍滚动
   */
  scrollUnit?: number;
}

interface IScrollTouchList {
  [index: number]: {
    touchStartY: number;
    speedStartY: number;
    speedStartTime: number;
  }
}