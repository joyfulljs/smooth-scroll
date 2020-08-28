export default class ViteScroll {
    private _unbindXTouch;
    readonly LOG_PREFIX: string;
    readonly VERSION: string;
    readonly SPEED_DETECT_INTERVAL: number;
    readonly MAX_OVERFLOW: number;
    readonly MIN_SPEED: number;
    readonly TOUCH_RESISTANCE: number;
    readonly WINDAGE_RESISTANCE: number;
    readonly ELASTIC_RESISTANCE: number;
    private tranformStyleName;
    private container;
    private content;
    private scrollTouches;
    private touchStarted;
    private scrolling;
    private containerHeight;
    private contentHeight;
    private minTranslate;
    private originCurrent;
    private current;
    constructor(el: HTMLElement, options: IOptions);
    destroy(): void;
    onStart(e: TouchEvent): void;
    onMove(e: TouchEvent): void;
    private _handleMove;
    onEnd(e: TouchEvent): void;
    scrollTo(y: number): void;
    scrollAt(speed: number): void;
    resetPosition(): void;
    setTranslate(y: number): void;
    getTranslate(element: HTMLElement): number;
    getOccupiedHeight(element: HTMLElement): number;
}
export declare enum Direction {
    X = 0,
    Y = 1,
    Both = 2
}
interface IOptions {
    /**
     * 设置之后按照此数值的整数倍滚动
     */
    scrollUnit?: number;
    /**
     * 滚动方向
     */
    direction?: Direction;
    /**
     * 滚动内容元素选择器
     */
    selector?: string;
}
export {};
