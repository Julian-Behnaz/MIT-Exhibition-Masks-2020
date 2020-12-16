import { WebGLRenderer } from "three";

export interface Hall {
    name: string,
    introId: string | null,
    setup(renderMode: RenderMode): Promise<void>,
    onEnter(renderer: WebGLRenderer): void,
    onLeave(): void,
    render(renderer: WebGLRenderer): void,
    renderPNG(renderer: WebGLRenderer): void,
    teardown(): Promise<void>,
    resize(): void,
    getProgressFrac(): number,
}

export enum HallState {
    None,
    Init,
    StartedLoadingHall,
    LoadingHall,
    WaitingToEnterHall,
    InHall,
    StartedLeavingHall,
    LeavingHall
}

export interface Halls {
    renderer: WebGLRenderer,
    state: HallState
    currHallIdx: number
    lastState: HallState,
    lastHallIdx: number,
    nextState: HallState,
    nextHallIdx: number,
    allHalls: Hall[],
    renderMode: RenderMode
}

export enum RenderModeKind {
    Interactive,
    SavePNG,
    None,
}

interface RenderModeInteractive {
    type: RenderModeKind.Interactive
}

interface RenderModeNone {
    type: RenderModeKind.None
}

interface RenderModeSavePNG {
    type: RenderModeKind.SavePNG
    seed: number
    page: number
}

export type RenderMode = RenderModeSavePNG | RenderModeInteractive | RenderModeNone;