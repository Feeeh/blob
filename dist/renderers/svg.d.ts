import type { Renderer, SoftBodyState } from '../types';
export declare class SvgRenderer implements Renderer {
    private svg;
    private path;
    mount(host: HTMLElement): void;
    render(body: SoftBodyState): void;
    resize(): void;
    destroy(): void;
}
