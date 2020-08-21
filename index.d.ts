export default function Scroll(el: HTMLElement, options: IOptions): {
    destroy(): void;
};
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
}
export {};
