import XTouch, { on, off } from '@joyfulljs/xtouch';
import { getProperty } from '@joyfulljs/vendor-property';
export default function Scroll(el, options) {
    // @ts-ignore
    if (el.__joyfulljs_scroll_bound) {
        return;
    }
    // @ts-ignore
    el.__joyfulljs_scroll_bound = true;
    var REFRESH_INTERVAL = 16;
    var SPEED_DETECT_INTERVAL = 200;
    var MAX_OVERFLOW = 120;
    var MIN_SPEED = 0.01;
    var TOUCH_RESISTANCE = 0.1;
    var WINDAGE_RESISTANCE = 0.3;
    var ELASTIC_RESISTANCE = 0.2;
    // @ts-ignore
    var rAf = window[getProperty('requestAnimationFrame')] || function (callback) {
        return setTimeout(callback, REFRESH_INTERVAL);
    };
    var container = el;
    var content = el.querySelector(':first-child'); // el.children[0]
    var scrollTouches = {};
    var tranformStyleName = getProperty('transform');
    var touchStarted = false;
    var scrolling = false;
    var containerHeight = 0;
    var contentHeight = 0;
    var minTranslateY = 0;
    // the current translate of Y axis
    var currentY = 0;
    // the start position
    var startCurrentY = 0;
    // the move distance
    var deltY = 0;
    var destroy = XTouch(container, { onStart: onStart, onEnd: onEnd, onMove: onMove, capture: { passive: false } });
    on(container, 'touchcancel', onEnd, true);
    function onStart(e) {
        // console.log('start:', e.touches[0].identifier, e.touches[1] && e.touches[1].identifier);
        // 初始位置的记录忽略后续按下的手指
        if (e.touches.length === 1) {
            containerHeight = getOccupiedHeight(container);
            contentHeight = getOccupiedHeight(content);
            currentY = getTranslateY(content);
            minTranslateY = containerHeight - contentHeight;
            scrolling = false;
            touchStarted = true;
            startCurrentY = currentY;
            deltY = 0;
            // 需要还原currentY状态下的deltY（划定到顶端或者底部的时候，有个缩减距离的效果）
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
        };
    }
    function onMove(e) {
        if (touchStarted) {
            var delt = handleMove(e, e.changedTouches[0]);
            // console.log('move1', e.changedTouches[0].identifier);
            if (e.changedTouches.length === 2) {
                delt = Math.max(delt, handleMove(e, e.changedTouches[1]));
            }
            else if (e.changedTouches.length > 2) {
                var deltArr = [delt];
                for (var i = 1, len = e.changedTouches.length; i < len; i++) {
                    deltArr.push(handleMove(e, e.changedTouches[i]));
                }
                delt = Math.max.apply(Math, deltArr);
                // console.log('move2', delt);
            }
            deltY += delt;
            currentY = startCurrentY + deltY;
            // console.log('currentY:', currentY, ' deltY:', deltY)
            if (currentY > 0) {
                currentY *= ELASTIC_RESISTANCE;
            }
            else if (currentY < minTranslateY) {
                currentY = minTranslateY + (currentY - minTranslateY) * ELASTIC_RESISTANCE;
            }
            setTranslateY(currentY);
            e.preventDefault();
        }
    }
    function handleMove(e, touchItem) {
        var touch = scrollTouches[touchItem.identifier];
        if (touch) {
            var delt = touchItem.pageY - touch.touchStartY;
            touch.touchStartY = touchItem.pageY;
            if (e.timeStamp - touch.speedStartTime > SPEED_DETECT_INTERVAL) {
                touch.speedStartY = currentY;
                touch.speedStartTime = e.timeStamp;
            }
            return delt;
        }
        return 0;
    }
    function onEnd(e) {
        var fingerId = e.changedTouches[0].identifier;
        // console.log('end: ', fingerId);
        if (e.touches.length === 0) {
            touchStarted = false;
            var touch = scrollTouches[fingerId];
            if (touch) {
                var speed = (currentY - touch.speedStartY) / ((e.timeStamp - touch.speedStartTime) / REFRESH_INTERVAL);
                scrollAt(speed, setTranslateY);
            }
        }
        scrollTouches[fingerId] = null;
    }
    function scrollTo(y) {
        scrolling = true;
        rAf(function tick() {
            if (scrolling) {
                var delt = currentY - y;
                if (Math.abs(delt) < MIN_SPEED) {
                    currentY = y;
                }
                else {
                    currentY -= delt * 0.12;
                    rAf(tick);
                }
                setTranslateY(currentY);
            }
        });
    }
    function scrollAt(speed, tickCallback) {
        var startSpeed = Math.abs(speed);
        if (!startSpeed || startSpeed < MIN_SPEED) {
            resetPosition();
            return;
        }
        scrolling = true;
        var currentSpeed = startSpeed;
        var isScrollUp = speed < 0, maxOverflow;
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
                    scrollTo(0);
                }
                else if (currentY < minTranslateY - maxOverflow) {
                    scrollTo(minTranslateY);
                }
                else if (currentSpeed > 0) {
                    rAf(tick);
                }
            }
        });
    }
    function resetPosition() {
        if (currentY > 0) {
            scrollTo(0);
        }
        else if (currentY < minTranslateY) {
            scrollTo(minTranslateY);
        }
    }
    function setTranslateY(y) {
        // @ts-ignore
        content.style[tranformStyleName] = "translate3d(0," + y + "px,0)";
    }
    function getTranslateY(element) {
        // @ts-ignore
        var trans = window.getComputedStyle(element)[tranformStyleName];
        if (trans && trans !== 'none') {
            return parseFloat(trans.split(')')[0].split(',')[5]);
        }
        return 0;
    }
    function getOccupiedHeight(element) {
        var style = window.getComputedStyle(element);
        return parseFloat(style.height)
            + parseFloat(style.marginTop)
            + parseFloat(style.marginBottom);
    }
    return {
        destroy: function () {
            destroy();
            off(container, 'touchcancel', onEnd, true);
        }
    };
}
;
export var Direction;
(function (Direction) {
    Direction[Direction["X"] = 0] = "X";
    Direction[Direction["Y"] = 1] = "Y";
    Direction[Direction["Both"] = 2] = "Both";
})(Direction || (Direction = {}));
