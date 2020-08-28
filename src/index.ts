
import XTouch, { on, off } from '@joyfulljs/xtouch';
import { getProperty } from '@joyfulljs/vendor-property';

const REFRESH_INTERVAL = 16.6;
// @ts-ignore
const rAf = window[getProperty('requestAnimationFrame')] || function (callback: Function) {
  return setTimeout(callback, REFRESH_INTERVAL)
};
export default class ViteScroll {

  private _unbindXTouch: () => void;
  private LOG_PREFIX: string = '[ViteScroll]：';

  public VERSION: string = 'v1.0.0';
  public SPEED_DETECT_INTERVAL: number = 200;
  public MAX_OVERFLOW: number = 120;
  public MIN_SPEED: number = 0.01;
  public TOUCH_RESISTANCE: number = 0.1;
  public WINDAGE_RESISTANCE: number = 0.3;
  public ELASTIC_RESISTANCE: number = 0.2;

  private tranformStyleName: string = getProperty('transform');
  private container: HTMLElement;
  private content: HTMLElement;
  private scrollTouches: IScrollTouchList = {};
  private touchStarted: boolean = false;
  private scrolling: boolean = false;
  private containerHeight: number = 0;
  private contentHeight: number = 0;
  private minTranslateY: number = 0;
  // the current translate of Y axis
  private originCurrentY: number = 0;
  private currentY: number = 0;

  constructor(el: HTMLElement, options: IOptions) {

    if (!(this instanceof ViteScroll)) {
      return new ViteScroll(el, options);
    }
    if (!(el instanceof HTMLElement)) {
      throw new Error(this.LOG_PREFIX + 'ViteScroll can only work on HTMLElement. Please check the `el` argument.')
    }
    // @ts-ignore
    if (el.__vite_scroll_instance) {
      console.warn(this.LOG_PREFIX + 'there is already a ViteScroll instance associated with this element.')
      // @ts-ignore
      return el.__vite_scroll_instance;
    }

    this.container = el;
    this.content = el.querySelector(':first-child');

    this.onStart = this.onStart.bind(this);
    this.onMove = this.onMove.bind(this);
    this.onEnd = this.onEnd.bind(this);

    this._unbindXTouch = XTouch(this.container, {
      onStart: this.onStart,
      onEnd: this.onEnd,
      onMove: this.onMove,
      capture: { passive: false }
    });
    on(el, 'touchcancel', this.onEnd, true);
  }

  public destroy() {
    off(this.container, 'touchcancel', this.onEnd, true);
    // @ts-ignore
    this.container.__vite_scroll_instance = undefined;
    this._unbindXTouch();
  }

  public onStart(e: TouchEvent) {
    // console.log('start:', e.touches[0].identifier, e.touches[1] && e.touches[1].identifier);
    // 初始位置的记录忽略后续按下的手指
    if (e.touches.length === 1) {
      this.containerHeight = this.getOccupiedHeight(this.container);
      this.contentHeight = this.getOccupiedHeight(this.content);
      this.originCurrentY = this.currentY = this.getTranslateY(this.content);
      this.minTranslateY = this.containerHeight - this.contentHeight;
      this.scrolling = false;
      this.touchStarted = true;
    }
    this.scrollTouches[e.changedTouches[0].identifier] = {
      touchStartY: e.changedTouches[0].pageY,
      speedStartY: this.currentY,
      speedStartTime: e.timeStamp
    }
  }

  public onMove(e: TouchEvent) {
    if (this.touchStarted) {
      let delt = this._handleMove(e, e.changedTouches[0])
      // console.log('move1', e.changedTouches[0].identifier);
      if (e.changedTouches.length === 2) {
        delt = Math.max(delt, this._handleMove(e, e.changedTouches[1]))
      } else if (e.changedTouches.length > 2) {
        const deltArr = [delt];
        for (let i = 1, len = e.changedTouches.length; i < len; i++) {
          deltArr.push(this._handleMove(e, e.changedTouches[i]))
        }
        delt = Math.max.apply(Math, deltArr);
        // console.log('move2', delt);
      }
      this.originCurrentY += delt;
      if (this.originCurrentY > 0) {
        if (delt > 0) {
          this.currentY = this.originCurrentY * this.ELASTIC_RESISTANCE
        } else {
          this.currentY += delt;
          this.originCurrentY = this.currentY / this.ELASTIC_RESISTANCE;
        }
      } else if (this.originCurrentY < this.minTranslateY) {
        if (delt < 0) {
          this.currentY = this.minTranslateY + (this.originCurrentY - this.minTranslateY) * this.ELASTIC_RESISTANCE;
        } else {
          this.currentY += delt;
          this.originCurrentY = this.minTranslateY + (this.currentY - this.minTranslateY) / this.ELASTIC_RESISTANCE;
        }
      } else {
        this.currentY = this.originCurrentY
      }
      this.setTranslateY(this.currentY);
      e.preventDefault();
    }
  }

  private _handleMove(e: TouchEvent, touchItem: Touch) {
    let touch = this.scrollTouches[touchItem.identifier];
    if (touch) {
      const delt = touchItem.pageY - touch.touchStartY;
      touch.touchStartY = touchItem.pageY;
      if (e.timeStamp - touch.speedStartTime > this.SPEED_DETECT_INTERVAL) {
        touch.speedStartY = this.currentY;
        touch.speedStartTime = e.timeStamp;
      }
      return delt;
    }
    return 0;
  }

  public onEnd(e: TouchEvent) {
    // console.log('end: ', fingerId);
    if (e.touches.length === 0) {
      let fingerId = e.changedTouches[0].identifier;
      this.touchStarted = false;
      let touch = this.scrollTouches[fingerId];
      if (touch) {
        const speed = (this.currentY - touch.speedStartY) / ((e.timeStamp - touch.speedStartTime) / REFRESH_INTERVAL);
        this.scrollAt(speed);
      }
    }
    Array.from(e.changedTouches).forEach(item => {
      this.scrollTouches[item.identifier] = null;
    })
  }

  public scrollTo(y: number) {
    this.scrolling = true;
    let tick = () => {
      if (this.scrolling) {
        let delt = this.currentY - y;
        if (Math.abs(delt) < this.MIN_SPEED) {
          this.currentY = y;
        } else {
          this.currentY -= delt * 0.12;
          rAf(tick);
        }
        this.setTranslateY(this.currentY);
      }
    }
    rAf(tick);
  }

  public scrollAt(speed: number) {
    let startSpeed = Math.abs(speed);
    if (!startSpeed || startSpeed < this.MIN_SPEED) {
      this.resetPosition();
      return;
    }
    this.scrolling = true;
    let currentSpeed = startSpeed;
    let isScrollUp = speed < 0, maxOverflow;
    let tick = () => {
      if (this.scrolling) {
        // 接触摩擦： 0.1;
        // 风阻摩擦： 0.3 与速度成正比；
        currentSpeed -= (currentSpeed / startSpeed * this.WINDAGE_RESISTANCE + this.TOUCH_RESISTANCE);
        this.currentY += isScrollUp ? -currentSpeed : currentSpeed;
        this.setTranslateY(this.currentY);
        // 最大溢出距离为即时速度的3倍
        maxOverflow = Math.min(currentSpeed * 3, this.MAX_OVERFLOW);
        if (this.currentY > maxOverflow) {
          this.scrollTo(0)
        } else if (this.currentY < this.minTranslateY - maxOverflow) {
          this.scrollTo(this.minTranslateY)
        } else if (currentSpeed > 0) {
          rAf(tick);
        }
      }
    };
    rAf(tick);
  }

  public resetPosition() {
    if (this.currentY > 0) {
      this.scrollTo(0)
    } else if (this.currentY < this.minTranslateY) {
      this.scrollTo(this.minTranslateY)
    }
  }

  public setTranslateY(y: number) {
    // @ts-ignore
    this.content.style[this.tranformStyleName] = `translate3d(0,${y}px,0)`;
  }

  public getTranslateY(element: HTMLElement) {
    // @ts-ignore
    const trans = window.getComputedStyle(element)[this.tranformStyleName];
    if (trans && trans !== 'none') {
      return parseFloat(trans.split(')')[0].split(',')[5])
    }
    return 0
  }

  public getOccupiedHeight(element: HTMLElement) {
    const style = window.getComputedStyle(element);
    return parseFloat(style.height)
      + parseFloat(style.marginTop)
      + parseFloat(style.marginBottom);
  }
}

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
  direction?: Direction,
  /**
   * 滚动内容元素选择器
   */
  selector?: string
}

interface IScrollTouchList {
  [index: number]: {
    touchStartY: number;
    speedStartY: number;
    speedStartTime: number;
  }
}