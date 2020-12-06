import { getTimestamp, lerp, easeInOutCubic } from "./utils"
import { Raycaster, Vector2, Vector3, Plane, Camera } from "three";

export enum WaypointMovingState {
    Idle,
    Moving
}

export interface WaypointState {
    state: WaypointMovingState,
    startMsTs: number,
    startFrac: number,
    endFrac: number,
    //
    raycaster: Raycaster,
    lastMouseNorm: Vector2,
    groundPlane: Plane,
}

export function waypointMakeState(floorY: number) : WaypointState {
    return {
        state: WaypointMovingState.Idle,
        startMsTs: 0,
        startFrac: 0,
        endFrac: 0,
        raycaster: new Raycaster(),
        lastMouseNorm: new Vector2(0,0),
        groundPlane: new Plane(new Vector3(0,1,0), -floorY),
    };
}

export function waypointReset(waypoint: WaypointState) {
    waypoint.state = WaypointMovingState.Idle;
}

export function waypointUpdate(waypoint: WaypointState, currProgress: number) : number {
    switch (waypoint.state) {
        case WaypointMovingState.Moving:
            let progress = (getTimestamp() - waypoint.startMsTs)/1500;
            currProgress = lerp(easeInOutCubic(progress), waypoint.startFrac, waypoint.endFrac);

            if (progress >= 1) {
                waypoint.state = WaypointMovingState.Idle;
            }
            break;
        case WaypointMovingState.Idle:
            break;
    }
    return currProgress;
}

export function waypointMoveToMouse(mouseNDC : { x: number, y: number }, waypoint: WaypointState, camera: Camera, maxZ: number, outWaypointPos: Vector3, mouseMinY:number = -0.1) {
    if (waypoint.state === WaypointMovingState.Idle) {
        document.body.style.cursor = "pointer";
    } else {
        document.body.style.cursor = "";
    }
    waypoint.lastMouseNorm.set(mouseNDC.x, Math.min(mouseNDC.y, mouseMinY));
    waypoint.raycaster.setFromCamera(waypoint.lastMouseNorm, camera);
    waypoint.raycaster.ray.intersectPlane(waypoint.groundPlane, /* out */ outWaypointPos);

    // Limit the maximum movement you can take at once so you can't leave a hall with one click
    let signedDist = outWaypointPos.z - camera.position.z;
    let moveCap = maxZ;// * 0.9; // The 0.9 is interfering with my maxZ Calulations :) Better to pass in appropiately scaled maxZ /Memo
    if (Math.abs(signedDist) > moveCap) {
        outWaypointPos.z -= camera.position.z;
        outWaypointPos.x *= Math.sign(signedDist) * moveCap / outWaypointPos.z; // scale x accordingly
        outWaypointPos.z = camera.position.z + Math.sign(signedDist) * moveCap;
    }
}

export function waypointTryStartMove(waypoint: WaypointState, currProgress: number, targetProgress: number) {
    if (waypoint.state === WaypointMovingState.Idle) {
        waypoint.state = WaypointMovingState.Moving;
        waypoint.startMsTs = getTimestamp();
        waypoint.startFrac = currProgress;
        waypoint.endFrac = targetProgress;
    }
}