export default function Scroll(el, options) {

  const REFRESH_INTERVAL = 16;
  const MAX_OVERFLOW = 120;
  const MIN_SPEED = 0.1;
  const TOUCH_RESISTANCE = 0.1;
  const WINDAGE_RESISTANCE = 0.3;
  const ELASTIC_RESISTANCE = 0.3;

  const rAf = window.requestAnimationFrame || window.webkitRequestAnimationFrame || function (callback) {
    return setTimeout(callback, REFRESH_INTERVAL)
  };

  const container = el;
  const content = el.querySelector(':first-child'); // el.children[0]
  const scrollTouches = {};

  let tranformStyleName = 'transform';
  if (!(tranformStyleName in content.style)) {
    tranformStyleName = 'webkitTransform';
  }

  let scrolling = false;
  let containerHeight = 0;
  let contentHeight = 0;
  let minTranslateY = 0;
  let currentY = 0;
  let startCurrentY = 0;
  let deltY = 0

  on('touchstart', onStart);
  on('touchmove', onMove);
  on('touchend', onEnd);
  on('touchcancel', onEnd);

  function onStart(e) {
    scrolling = false;
    containerHeight = getOccupiedHeight(container);
    contentHeight = getOccupiedHeight(content);
    currentY = getTranslateY(content);
    minTranslateY = containerHeight - contentHeight;
    if (e.touches.length === 1) {
      startCurrentY = currentY;
      deltY = 0;
      // 需要还原deltY
      if (currentY >= 0) {
        deltY = currentY / ELASTIC_RESISTANCE - startCurrentY;
      }
      else if (currentY <= minTranslateY) {
        deltY = (currentY - minTranslateY) / ELASTIC_RESISTANCE + minTranslateY - startCurrentY;
      }
    }
    scrollTouches[e.changedTouches[0].identifier] = {
      touchStartY: e.changedTouches[0].pageY,
      speedStartY: currentY,
      speedStartTime: e.timeStamp
    }
    e.preventDefault();
  }

  function onMove(e) {
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
    }
    else if (currentY < minTranslateY) {
      currentY = minTranslateY + (currentY - minTranslateY) * ELASTIC_RESISTANCE;
    }
    setTranslateY(currentY);
    e.preventDefault();
  }

  function handleMove(e, touchItem) {
    let touch = scrollTouches[touchItem.identifier];
    if (touch) {
      const delt = touchItem.pageY - touch.touchStartY;
      touch.touchStartY = touchItem.pageY;
      if (e.timeStamp - touch.speedStartTime > 200) {
        touch.speedStartY = currentY;
        touch.speedStartTime = e.timeStamp;
      }
      return delt;
    }
    return 0;
  }

  function onEnd(e) {
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

  function scrollTo(y) {
    scrolling = true;
    rAf(function tick() {
      if (scrolling) {
        let delt = currentY - y;
        if (Math.abs(delt) < MIN_SPEED) {
          currentY = y;
        }
        else {
          currentY -= delt * 0.12;
          rAf(tick);
        }
        setTranslateY(currentY);
      }
    })
  }

  function scrollAt(speed, tickCallback) {
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
    }
    else if (currentY < minTranslateY) {
      scrollTo(minTranslateY)
    }
  }

  function on(type, handler) {
    container.addEventListener(type, handler, false)
  }

  function off(type, handler) {
    container.removeEventListener(type, handler);
  }

  function setTranslateY(y) {
    content.style[tranformStyleName] = `translate3d(0,${y}px,0)`;
  }

  function getTranslateY(element) {
    const trans = window.getComputedStyle(element)[tranformStyleName];
    if (trans && trans !== 'none') {
      return parseFloat(trans.split(')')[0].split(',')[5])
    }
    return 0
  }

  function getOccupiedHeight(element) {
    const style = window.getComputedStyle(element);
    return parseFloat(style.height)
      + parseFloat(style.marginTop)
      + parseFloat(style.marginBottom);
  }

  // function getVendorProperty(prop, propOwner) {
  //   if (prop in propOwner) {
  //     return prop
  //   }
  //   prop = prop.charAt(0).toUpperCase() + prop.substr(1);
  //   const VENDOR_PREFIXS = ['webkit', 'ms', 'moz'];
  //   for (let i in VENDOR_PREFIXS) {
  //     const propName = VENDOR_PREFIXS[i] + prop;
  //     if (propName in propOwner) {
  //       return propName;
  //     }
  //   }
  // }

  return {
    destroy() {
      off('touchstart', onStart);
      off('touchmove', onMove);
      off('touchend', onEnd);
      off('touchcancel', onEnd);
    }
  }
};