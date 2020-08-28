import XTouch, { on, off } from '@joyfulljs/xtouch';
import { getProperty } from '@joyfulljs/vendor-property';
var REFRESH_INTERVAL = 16.6;
// @ts-ignore
var rAf = window[getProperty('requestAnimationFrame')] || function (callback) {
    return setTimeout(callback, REFRESH_INTERVAL);
};
var ViteScroll = /** @class */ (function () {
    function ViteScroll(el, options) {
        this.LOG_PREFIX = '[ViteScroll]：';
        this.VERSION = 'v1.0.0';
        this.SPEED_DETECT_INTERVAL = 200;
        this.MAX_OVERFLOW = 120;
        this.MIN_SPEED = 0.01;
        this.TOUCH_RESISTANCE = 0.1;
        this.WINDAGE_RESISTANCE = 0.3;
        this.ELASTIC_RESISTANCE = 0.2;
        this.tranformStyleName = getProperty('transform');
        this.scrollTouches = {};
        this.touchStarted = false;
        this.scrolling = false;
        this.containerHeight = 0;
        this.contentHeight = 0;
        this.minTranslate = 0;
        // the current translate of Y axis
        this.originCurrent = 0;
        this.current = 0;
        if (!(this instanceof ViteScroll)) {
            return new ViteScroll(el, options);
        }
        if (!(el instanceof HTMLElement)) {
            throw new Error(this.LOG_PREFIX + 'ViteScroll can only work on HTMLElement. Please check the `el` argument.');
        }
        // @ts-ignore
        if (el.__vite_scroll_instance) {
            console.warn(this.LOG_PREFIX + 'there is already a ViteScroll instance associated with this element.');
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
    ViteScroll.prototype.destroy = function () {
        off(this.container, 'touchcancel', this.onEnd, true);
        // @ts-ignore
        this.container.__vite_scroll_instance = undefined;
        this._unbindXTouch();
    };
    ViteScroll.prototype.onStart = function (e) {
        // console.log('start:', e.touches[0].identifier, e.touches[1] && e.touches[1].identifier);
        // 初始位置的记录忽略后续按下的手指
        if (e.touches.length === 1) {
            this.containerHeight = this.getOccupiedHeight(this.container);
            this.contentHeight = this.getOccupiedHeight(this.content);
            this.originCurrent = this.current = this.getTranslate(this.content);
            this.minTranslate = this.containerHeight - this.contentHeight;
            this.scrolling = false;
            this.touchStarted = true;
        }
        this.scrollTouches[e.changedTouches[0].identifier] = {
            touchStart: e.changedTouches[0].pageY,
            speedStart: this.current,
            speedStartTime: e.timeStamp
        };
    };
    ViteScroll.prototype.onMove = function (e) {
        if (this.touchStarted) {
            var delt = this._handleMove(e, e.changedTouches[0]);
            // console.log('move1', e.changedTouches[0].identifier);
            if (e.changedTouches.length === 2) {
                delt = Math.max(delt, this._handleMove(e, e.changedTouches[1]));
            }
            else if (e.changedTouches.length > 2) {
                var deltArr = [delt];
                for (var i = 1, len = e.changedTouches.length; i < len; i++) {
                    deltArr.push(this._handleMove(e, e.changedTouches[i]));
                }
                delt = Math.max.apply(Math, deltArr);
                // console.log('move2', delt);
            }
            this.originCurrent += delt;
            if (this.originCurrent > 0) {
                if (delt > 0) {
                    this.current = this.originCurrent * this.ELASTIC_RESISTANCE;
                }
                else {
                    this.current += delt;
                    this.originCurrent = this.current / this.ELASTIC_RESISTANCE;
                }
            }
            else if (this.originCurrent < this.minTranslate) {
                if (delt < 0) {
                    this.current = this.minTranslate + (this.originCurrent - this.minTranslate) * this.ELASTIC_RESISTANCE;
                }
                else {
                    this.current += delt;
                    this.originCurrent = this.minTranslate + (this.current - this.minTranslate) / this.ELASTIC_RESISTANCE;
                }
            }
            else {
                this.current = this.originCurrent;
            }
            this.setTranslate(this.current);
            e.preventDefault();
        }
    };
    ViteScroll.prototype._handleMove = function (e, touchItem) {
        var touch = this.scrollTouches[touchItem.identifier];
        if (touch) {
            var delt = touchItem.pageY - touch.touchStart;
            touch.touchStart = touchItem.pageY;
            if (e.timeStamp - touch.speedStartTime > this.SPEED_DETECT_INTERVAL) {
                touch.speedStart = this.current;
                touch.speedStartTime = e.timeStamp;
            }
            return delt;
        }
        return 0;
    };
    ViteScroll.prototype.onEnd = function (e) {
        var _this = this;
        // console.log('end: ', fingerId);
        if (e.touches.length === 0) {
            var fingerId = e.changedTouches[0].identifier;
            this.touchStarted = false;
            var touch = this.scrollTouches[fingerId];
            if (touch) {
                var speed = (this.current - touch.speedStart) / ((e.timeStamp - touch.speedStartTime) / REFRESH_INTERVAL);
                this.scrollAt(speed);
            }
        }
        Array.from(e.changedTouches).forEach(function (item) {
            _this.scrollTouches[item.identifier] = null;
        });
    };
    ViteScroll.prototype.scrollTo = function (y) {
        var _this = this;
        this.scrolling = true;
        var tick = function () {
            if (_this.scrolling) {
                var delt = _this.current - y;
                if (Math.abs(delt) < _this.MIN_SPEED) {
                    _this.current = y;
                }
                else {
                    _this.current -= delt * 0.12;
                    rAf(tick);
                }
                _this.setTranslate(_this.current);
            }
        };
        rAf(tick);
    };
    ViteScroll.prototype.scrollAt = function (speed) {
        var _this = this;
        var startSpeed = Math.abs(speed);
        if (!startSpeed || startSpeed < this.MIN_SPEED) {
            this.resetPosition();
            return;
        }
        this.scrolling = true;
        var currentSpeed = startSpeed;
        var isScrollUp = speed < 0, maxOverflow;
        var tick = function () {
            if (_this.scrolling) {
                // 接触摩擦： 0.1;
                // 风阻摩擦： 0.3 与速度成正比；
                currentSpeed -= (currentSpeed / startSpeed * _this.WINDAGE_RESISTANCE + _this.TOUCH_RESISTANCE);
                _this.current += isScrollUp ? -currentSpeed : currentSpeed;
                _this.setTranslate(_this.current);
                // 最大溢出距离为即时速度的3倍
                maxOverflow = Math.min(currentSpeed * 3, _this.MAX_OVERFLOW);
                if (_this.current > maxOverflow) {
                    _this.scrollTo(0);
                }
                else if (_this.current < _this.minTranslate - maxOverflow) {
                    _this.scrollTo(_this.minTranslate);
                }
                else if (currentSpeed > 0) {
                    rAf(tick);
                }
            }
        };
        rAf(tick);
    };
    ViteScroll.prototype.resetPosition = function () {
        if (this.current > 0) {
            this.scrollTo(0);
        }
        else if (this.current < this.minTranslate) {
            this.scrollTo(this.minTranslate);
        }
    };
    ViteScroll.prototype.setTranslate = function (y) {
        // @ts-ignore
        this.content.style[this.tranformStyleName] = "translate3d(0," + y + "px,0)";
    };
    ViteScroll.prototype.getTranslate = function (element) {
        // @ts-ignore
        var trans = window.getComputedStyle(element)[this.tranformStyleName];
        if (trans && trans !== 'none') {
            return parseFloat(trans.split(')')[0].split(',')[5]);
        }
        return 0;
    };
    ViteScroll.prototype.getOccupiedHeight = function (element) {
        var style = window.getComputedStyle(element);
        return parseFloat(style.height)
            + parseFloat(style.marginTop)
            + parseFloat(style.marginBottom);
    };
    return ViteScroll;
}());
export default ViteScroll;
export var Direction;
(function (Direction) {
    Direction[Direction["X"] = 0] = "X";
    Direction[Direction["Y"] = 1] = "Y";
    Direction[Direction["Both"] = 2] = "Both";
})(Direction || (Direction = {}));
