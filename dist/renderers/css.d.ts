import type { Renderer, SoftBodyState } from '../types';
export declare class CssRenderer implements Renderer {
    private element;
    mount(host: HTMLElement): void;
    render(body: SoftBodyState): void;
    destroy(): void;
}
