export default class ViteScroll {
    private _unbindXTouch;
    private LOG_PREFIX;
    VERSION: string;
    SPEED_DETECT_INTERVAL: number;
    MAX_OVERFLOW: number;
    MIN_SPEED: number;
    TOUCH_RESISTANCE: number;
    WINDAGE_RESISTANCE: number;
    ELASTIC_RESISTANCE: number;
    private tranformStyleName;
    private container;
    private content;
    private scrollTouches;
    private touchStarted;
    private scrolling;
    private containerHeight;
    private contentHeight;
    private minTranslateY;
    private originCurrentY;
    private currentY;
    constructor(el: HTMLElement, options: IOptions);
    destroy(): void;
    onStart(e: TouchEvent): void;
    onMove(e: TouchEvent): void;
    private _handleMove;
    onEnd(e: TouchEvent): void;
    scrollTo(y: number): void;
    scrollAt(speed: number): void;
    resetPosition(): void;
    setTranslateY(y: number): void;
    getTranslateY(element: HTMLElement): number;
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
