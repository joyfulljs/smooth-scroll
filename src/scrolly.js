
import XBind from "./xbind";
import { assign } from './utils';
import {
  REFRESH_INTERVAL,
  TRANSFORM_STYLE_NAME,
  RAF
} from './consts';

const MAX_OVERFLOW = 120;
const MIN_SPEED = 0.1;
const ELASTIC_RESISTANCE = 0.3;

function ScrollY(el, options) {

  this.config = {
    max_overflow: 120,
    min_speed: 0.1,
    resistance: 0.3
  };

  if (options) {
    assign(this.config, options);
  }

  this.container = el;
  this.content = el.querySelector(':first-child'); // el.children[0]
  this.scrollTouches = {};

  this.scrolling = false;
  this.minTranslate = 0;
  this.current = 0;
  this.startCurrent = 0;
  this.delt = 0;

  this.onStart = this.onStart.bind(this);
  this.onMove = this.onMove.bind(this);
  this.onEnd = this.onEnd.bind(this);
  this.setTranslate = this.setTranslate.bind(this);

  this.xbind = XBind(
    this.container,
    this.onStart,
    this.onMove,
    this.onEnd,
    this.onEnd
  );
};

const pt = ScrollY.prototype;
pt.onStart = function (e) {
  const containerHeight = this.getBounding(this.container);
  const contentHeight = this.getBounding(this.content);
  this.scrolling = false;
  this.current = this.getTranslate(this.content);
  this.minTranslate = containerHeight - contentHeight;
  if (e.touches.length === 1) {
    this.startCurrent = this.current;
    this.delt = 0;
    // 需要还原delt
    if (this.current >= 0) {
      this.delt = this.current / ELASTIC_RESISTANCE - this.startCurrent;
    }
    else if (this.current <= this.minTranslate) {
      this.delt = (this.current - this.minTranslate) / ELASTIC_RESISTANCE + this.minTranslate - this.startCurrent;
    }
  }
  this.scrollTouches[e.changedTouches[0].identifier] = {
    touchStartY: e.changedTouches[0].pageY,
    speedStartY: this.current,
    speedStartTime: e.timeStamp
  }
  e.preventDefault();
}

pt.onMove = function (e) {
  let delt = this.handleMove(e, e.changedTouches[0])
  if (e.changedTouches.length > 1) {
    for (let i = 1, len = e.changedTouches.length; i < len; i++) {
      delt += this.handleMove(e, e.changedTouches[i])
    }
  }
  this.deltY += delt;
  this.current = this.startCurrent + this.deltY;
  if (this.current > 0) {
    this.current *= ELASTIC_RESISTANCE
  }
  else if (this.current < this.minTranslate) {
    this.current = this.minTranslate + (this.current - this.minTranslate) * ELASTIC_RESISTANCE;
  }
  this.setTranslate(this.current);
  e.preventDefault();
}

pt.handleMove = function (e, touchItem) {
  let touch = scrollTouches[touchItem.identifier];
  if (touch) {
    const delt = touchItem.pageY - touch.touchStartY;
    touch.touchStartY = touchItem.pageY;
    if (e.timeStamp - touch.speedStartTime > 200) {
      touch.speedStartY = this.current;
      touch.speedStartTime = e.timeStamp;
    }
    return delt;
  }
  return 0;
}

pt.onEnd = function (e) {
  let fingerId = e.changedTouches[0].identifier;
  if (e.touches.length === 0) {
    let touch = this.scrollTouches[fingerId];
    if (touch) {
      const speed = (this.current - touch.speedStartY) / ((e.timeStamp - touch.speedStartTime) / REFRESH_INTERVAL);
      this.scrollAt(speed, this.setTranslate);
    }
  }
  delete scrollTouches[fingerId]
}

pt.scrollTo = function (y) {
  this.scrolling = true;
  const self = this;
  RAF(function tick() {
    if (self.scrolling) {
      let delt = self.current - y;
      if (Math.abs(delt) < MIN_SPEED) {
        self.current = y;
      }
      else {
        self.current -= delt * 0.12;
        RAF(tick);
      }
      self.setTranslate(self.current);
    }
  })
}

pt.scrollAt = function (speed, tickCallback) {
  let startSpeed = Math.abs(speed);
  if (!startSpeed || startSpeed < MIN_SPEED) {
    resetPosition();
    return;
  }
  this.scrolling = true;
  let currentSpeed = startSpeed;
  let isScrollUp = speed < 0, maxOverflow;
  const self = this;
  RAF(function tick() {
    if (self.scrolling) {
      // 接触摩擦： 0.1;
      // 风阻摩擦： 0.3 与速度成正比；
      currentSpeed -= (currentSpeed / startSpeed * 0.3 + MIN_SPEED);
      if (isScrollUp) {
        self.current -= currentSpeed;
      }
      else {
        self.current += currentSpeed;
      }
      self.setTranslate(self.current);
      // 最大溢出距离为即时速度的3倍
      maxOverflow = Math.min(currentSpeed * 3, MAX_OVERFLOW);
      if (self.current > maxOverflow) {
        scrollTo(0)
      }
      else if (self.current < self.minTranslate - maxOverflow) {
        scrollTo(self.minTranslate)
      }
      else if (currentSpeed > 0) {
        RAF(tick);
      }
    }
  })
}

pt.resetPosition = function () {
  if (this.current > 0) {
    this.scrollTo(0)
  }
  else if (this.current < this.minTranslate) {
    this.scrollTo(this.minTranslate)
  }
}

pt.setTranslate = function (y) {
  this.content.style[TRANSFORM_STYLE_NAME] = `translate3d(0,${y}px,0)`;
}

pt.getTranslate = function (element) {
  const trans = window.getComputedStyle(element)[TRANSFORM_STYLE_NAME];
  if (trans && trans !== 'none') {
    return parseFloat(trans.split(')')[0].split(',')[5])
  }
  return 0
}

pt.getBounding = function (element) {
  const style = window.getComputedStyle(element);
  return parseFloat(style.height)
    + parseFloat(style.marginTop)
    + parseFloat(style.marginBottom);
}

pt.destroy = function () {
  this.xbind.unbind()
}

export default ScrollY;