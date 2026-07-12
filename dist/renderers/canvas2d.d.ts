/**
 * Default renderer. It draws a smooth closed Catmull-Rom curve through the
 * soft-body points on a DPR-aware canvas and applies an SVG goo filter.
 */
import type { Renderer, SoftBodyState } from '../types';
export declare class Canvas2DRenderer implements Renderer {
    private readonly reducedMotion;
    private canvas;
    private context;
    private gooFilter;
    private width;
    private height;
    constructor(reducedMotion?: boolean);
    mount(host: HTMLElement): void;
    render(body: SoftBodyState): void;
    destroy(): void;
    resize(): void;
    private createGooFilter;
    private traceClosedCurve;
}
