import type { Vec2 } from '../types';
export declare class DragBehavior {
    private readonly onStart;
    private readonly onMove;
    private readonly onEnd;
    private target;
    private pointerId;
    constructor(onStart: () => boolean, onMove: (point: Vec2) => void, onEnd: () => void);
    enable(target: HTMLElement): void;
    disable(): void;
    private readonly handleDown;
    private readonly handleMove;
    private readonly handleEnd;
}
