'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

/**
 * bind event
 * @param target window | HTMLElement
 * @param type event type
 * @param handler event handler
 * @param capture if capture phase
 */
function on(target, type, handler, capture) {
    if (capture === void 0) { capture = false; }
    target.addEventListener(type, handler, capture);
}
/**
 * unbind event
 * @param target window | HTMLElement
 * @param type event type
 * @param handler event handler
 * @param capture if capture phase
 */
function off(target, type, handler, capture) {
    if (capture === void 0) { capture = false; }
    target.removeEventListener(type, handler, capture);
}
/**
 * To bind event
 * @param el taget element. required.
 * @param options event handlers and other configration. required.
 */
function XTouch(el, options) {
    if (Object.prototype.toString.call(options) !== '[object Object]') {
        throw new Error('[xtouch]: argument `options` is missing or illegal.');
    }
    var onStart = options.onStart, onMove = options.onMove, onEnd = options.onEnd, capture = options.capture;
    var startTarget = null;
    var _onStart = function (e) {
        if (e.type === 'mousedown') {
            startTarget = e.target;
            // @ts-ignore
            e.identifier = 0;
            // @ts-ignore
            e.touches = e.changedTouches = [e];
            // @ts-ignore
            e.targetTouches = [e];
        }
        onStart(e);
    }, _onMove = function (e) {
        if (e.type === 'mousemove') {
            // @ts-ignore
            e.identifier = 0;
            // @ts-ignore
            e.touches = e.changedTouches = [e];
            // @ts-ignore
            e.targetTouches = e.target === startTarget ? [e] : [];
        }
        onMove(e);
    }, _onEnd = function (e) {
        if (e.type === 'mouseup') {
            // @ts-ignore
            e.identifier = 0;
            // @ts-ignore
            e.touches = [];
            // @ts-ignore
            e.changedTouches = [e];
            // @ts-ignore
            e.targetTouches = e.target === startTarget ? [e] : [];
        }
        onEnd(e);
    };
    if (onStart) {
        on(el, 'touchstart', _onStart, capture);
        on(el, 'mousedown', _onStart, capture);
    }
    if (onMove) {
        on(window, 'touchmove', _onMove, capture);
        on(window, 'mousemove', _onMove, capture);
    }
    if (onEnd) {
        on(window, 'touchend', _onEnd, capture);
        on(window, 'mouseup', _onEnd, capture);
    }
    return function unbind() {
        off(el, 'touchstart', _onStart, capture);
        off(window, 'touchmove', _onMove, capture);
        off(window, 'touchend', _onEnd, capture);
        off(el, 'mousedown', _onStart, capture);
        off(window, 'mousemove', _onMove, capture);
        off(window, 'mouseup', _onEnd, capture);
    };
}

/**
 * vendor prefixes that being taken into consideration.
 */
var vendors = ['webkit', 'ms', 'moz', 'o'];
/**
 * get vendor property name that contains uppercase letter.
 * e.g. webkitTransform
 * @param prop property name. for example: transform
 * @param host optional. property owner. default to `document.body.style`.
 */
function getProperty(prop, host) {
    var targetHost = host || document.body.style;
    if (!(prop in targetHost)) {
        var char1 = prop.charAt(0).toUpperCase();
        var charLeft = prop.substr(1);
        for (var i = 0; i < vendors.length; i++) {
            var vendorProp = vendors[i] + char1 + charLeft;
            if (vendorProp in targetHost) {
                return vendorProp;
            }
        }
    }
    return prop;
}

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
        this.minTranslateY = 0;
        // the current translate of Y axis
        this.originCurrentY = 0;
        this.currentY = 0;
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
            this.originCurrentY = this.currentY = this.getTranslateY(this.content);
            this.minTranslateY = this.containerHeight - this.contentHeight;
            this.scrolling = false;
            this.touchStarted = true;
        }
        this.scrollTouches[e.changedTouches[0].identifier] = {
            touchStartY: e.changedTouches[0].pageY,
            speedStartY: this.currentY,
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
            this.originCurrentY += delt;
            if (this.originCurrentY > 0) {
                if (delt > 0) {
                    this.currentY = this.originCurrentY * this.ELASTIC_RESISTANCE;
                }
                else {
                    this.currentY += delt;
                    this.originCurrentY = this.currentY / this.ELASTIC_RESISTANCE;
                }
            }
            else if (this.originCurrentY < this.minTranslateY) {
                if (delt < 0) {
                    this.currentY = this.minTranslateY + (this.originCurrentY - this.minTranslateY) * this.ELASTIC_RESISTANCE;
                }
                else {
                    this.currentY += delt;
                    this.originCurrentY = this.minTranslateY + (this.currentY - this.minTranslateY) / this.ELASTIC_RESISTANCE;
                }
            }
            else {
                this.currentY = this.originCurrentY;
            }
            this.setTranslateY(this.currentY);
            e.preventDefault();
        }
    };
    ViteScroll.prototype._handleMove = function (e, touchItem) {
        var touch = this.scrollTouches[touchItem.identifier];
        if (touch) {
            var delt = touchItem.pageY - touch.touchStartY;
            touch.touchStartY = touchItem.pageY;
            if (e.timeStamp - touch.speedStartTime > this.SPEED_DETECT_INTERVAL) {
                touch.speedStartY = this.currentY;
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
                var speed = (this.currentY - touch.speedStartY) / ((e.timeStamp - touch.speedStartTime) / REFRESH_INTERVAL);
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
                var delt = _this.currentY - y;
                if (Math.abs(delt) < _this.MIN_SPEED) {
                    _this.currentY = y;
                }
                else {
                    _this.currentY -= delt * 0.12;
                    rAf(tick);
                }
                _this.setTranslateY(_this.currentY);
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
                _this.currentY += isScrollUp ? -currentSpeed : currentSpeed;
                _this.setTranslateY(_this.currentY);
                // 最大溢出距离为即时速度的3倍
                maxOverflow = Math.min(currentSpeed * 3, _this.MAX_OVERFLOW);
                if (_this.currentY > maxOverflow) {
                    _this.scrollTo(0);
                }
                else if (_this.currentY < _this.minTranslateY - maxOverflow) {
                    _this.scrollTo(_this.minTranslateY);
                }
                else if (currentSpeed > 0) {
                    rAf(tick);
                }
            }
        };
        rAf(tick);
    };
    ViteScroll.prototype.resetPosition = function () {
        if (this.currentY > 0) {
            this.scrollTo(0);
        }
        else if (this.currentY < this.minTranslateY) {
            this.scrollTo(this.minTranslateY);
        }
    };
    ViteScroll.prototype.setTranslateY = function (y) {
        // @ts-ignore
        this.content.style[this.tranformStyleName] = "translate3d(0," + y + "px,0)";
    };
    ViteScroll.prototype.getTranslateY = function (element) {
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
(function (Direction) {
    Direction[Direction["X"] = 0] = "X";
    Direction[Direction["Y"] = 1] = "Y";
    Direction[Direction["Both"] = 2] = "Both";
})(exports.Direction || (exports.Direction = {}));

exports.default = ViteScroll;
