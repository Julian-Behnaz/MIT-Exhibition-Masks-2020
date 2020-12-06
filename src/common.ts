import { WebGLRenderer } from "three";

export interface Hall {
    name: string,
    introId: string | null,
    setup(): Promise<void>,
    onEnter(renderer: WebGLRenderer): void,
    onLeave(): void,
    render(renderer: WebGLRenderer): void,
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
}