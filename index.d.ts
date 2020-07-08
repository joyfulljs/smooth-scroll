export default function Scroll(el: HTMLElement, options: IOptions): {
    destroy(): void;
};
interface IOptions {
    /**
     * 设置之后按照此数值的整数倍滚动
     */
    scrollUnit?: number;
}
export {};
