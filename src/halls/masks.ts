import { Vector3, Group, Scene, PerspectiveCamera, PlaneGeometry,AudioListener, MeshBasicMaterial, Mesh, WebGLRenderer, VideoTexture, FogExp2, LinearFilter, RGBFormat, AudioLoader } from "three";
import { normalizeWheel,lerp, lerpTo } from "../utils"
import { Halls, Hall, HallState } from "../common"
import { waypointMakeState, waypointReset, waypointMoveToMouse, waypointTryStartMove, waypointUpdate, WaypointState, WaypointMovingState } from "../waypoint"
import { Loader, loader, load3dModel } from "../modelLoader"

import video1src from "../media/Mask03-3.webm";
import video2src from "../media/Mask02.webm";
import video3src from "../media/Mask04.webm";
import video4src from "../media/Mask05-2.webm";
import video5src from "../media/Mask01.webm";
import waypointSrc from "../models/waypointwhite.glb";
import sound from "../media/MaskHallSound.webm";

interface MasksHall extends Hall {
    state: {
        videoSrcs: string[],
        planeData: { pos: [number, number, number], rot: [number, number, number] }[],
        vids: HTMLVideoElement[],
        scene: Scene,
        camera: PerspectiveCamera,
        waypointState: WaypointState,
        waypoint: Group | null,
        progressFrac: number,
        loadedOnce: boolean,
        mousePos: Vector3,
        cameraTargetRotY: number,
    }
}

const moveSpeed = 0.05;
const hallwayFloorY = -0.5;
const hallwayLength = 7.5;

const thisHall: MasksHall = {
    name: "Hall of Eyes",
    introId: "js-eyes-hall",
    state: {
        videoSrcs: [],
        planeData: [],
        vids: [],
        scene: new Scene(),
        camera: new PerspectiveCamera(55, window.innerWidth / window.innerHeight, 0.1, 1000),
        waypointState: waypointMakeState(hallwayFloorY),
        waypoint: null,
        progressFrac: 0,
        loadedOnce: false,
        mousePos: new Vector3(),
        cameraTargetRotY: 0,
    },
    setup: async function (): Promise<void> {
        function postLoad () {
            console.log("Postload - masks");
            thisHall.state.progressFrac= 0;
            thisHall.state.camera.position.set(0, 0, 0);
            waypointReset(thisHall.state.waypointState);
        }
        return new Promise<void>((resolve) => {
            if (!thisHall.state.loadedOnce) {
                let state = thisHall.state;
                // state.videoSrcs = [
                //     video1src,
                //     video2src,
                //     video3src,
                //     video4src,
                //     video5src,
                //     video6src,
                // ];
                state.videoSrcs = [
                    video1src,
                    video2src,
                    video3src,
                    video4src,
                    video5src,
                    sound,
                ];
                state.planeData = [
                    {pos: [-1,0,3-5-0.5], rot:  [0,45,0]},
                    {pos: [1,0,4-5-0.5], rot:  [0,-30,0]},
                    {pos: [-1,0,3-8], rot:  [0,35,0]},
                    {pos: [1,0,5-8-1], rot:  [0,-15,0]},
                    {pos: [0,0,3-10-1], rot: [0,0,0]},
                    {pos: [15,0,3-10], rot: [0,0,0]},
                ];
                
                async function addWaypoint(loader: Loader, waypointSrc: string): Promise<void> {
                    return new Promise<void>((resolve, reject) => {
                        // TODO: Get 3d model loading to work!!!
                        // load3dModel(loader, waypointSrc).then((model) => {
                        //     state.scene.add(model);
                        //     state.waypoint = model;
                        //     resolve();
                        // });
                        resolve(); 
                    });
                }


                var enableFog= true;
                if(enableFog){
                state. scene.fog= new FogExp2 (0x000000,0.1);
                }

                
                async function addPlanes() : Promise<void> {
                    return new Promise<void>((resolve, reject) => {
                        Promise.all(state.videoSrcs.map(makeVideo)).then((videos) => {
                            state.vids = videos;
                    
                            let planes = state.vids.map(makePlane);
                            for (let i = 0; i < planes.length; i++) {
                                let pos = state.planeData[i].pos;
                                let rot = state.planeData[i].rot;
                                planes[i].position.set(pos[0],pos[1], pos[2]);
                                planes[i].rotation.set(0,rot[1]*2*Math.PI/360,0);
                                state.scene.add( planes[i] );
                            }
                            resolve();
                        })
                    });
                }

                Promise.all([addWaypoint(loader, waypointSrc), addPlanes()]).then(() => {
                    // plane.rotation.set(Math.PI/3,Math.PI/3,Math.PI/3);
                    thisHall.state.loadedOnce = true;
                    postLoad();
                    resolve();
                });
            } else {
                // Already loaded
                postLoad();
                resolve();
            }
        });
    },
    onEnter: function (renderer: WebGLRenderer) {
        renderer.setClearColor("black");
        thisHall.state.vids.forEach(vid => {
            vid.muted = false;
            vid.play();
        });
        registerEventListeners();
    },
    onLeave: function () {
        thisHall.state.vids.forEach(vid => {
            vid.muted = true;
        });
        removeEventListeners();
    },
    render: function (renderer) {
        let state = thisHall.state;


      
        // state.camera.position.set(0, 0, state.progressFrac * -hallwayLength);


        let targetCamZ = state.progressFrac * -hallwayLength;
        state.camera.position.set(0, 0, lerp(moveSpeed, state.camera.position.z, targetCamZ));
        state.camera.rotation.set(0, lerpTo(state.camera.rotation.y, state.cameraTargetRotY, moveSpeed, 0.001), 0);
        


        if (state.waypoint) {
            // Should technically use the renderer dimensions instead of window
            let clickCount = 3; // leave the hall in this many clicks
            waypointMoveToMouse({ x: state.mousePos.x,
                                  y: state.mousePos.y
                                },
                                  state.waypointState,
                                  state.camera, hallwayLength / clickCount, /* out */ state.waypoint.position);
        }

        state.progressFrac = waypointUpdate(state.waypointState, state.progressFrac);
        renderer.render(state.scene, state.camera);
    },
    resize: function () {
        thisHall.state.camera.aspect = window.innerWidth / window.innerHeight;
        thisHall.state.camera.updateProjectionMatrix();
        
    },
    teardown: async function () : Promise<void> {
        return new Promise<void>((resolve) => {
            resolve();
        });
    },
    getProgressFrac: function (): number {
        return thisHall.state.progressFrac;
    },
}
export = thisHall;

interface WindowListeners {
    [key: string]: EventListenerOrEventListenerObject,
}

const windowEventListeners: WindowListeners = {
    wheel: (scrollEvt: WheelEvent) => {
        let evt = normalizeWheel(scrollEvt);
        let state = thisHall.state;
        if (thisHall.state.waypointState.state === WaypointMovingState.Idle) {
            state.progressFrac -= evt.pixelY * 0.0001 * hallwayLength;
            state.progressFrac = Math.max(0, Math.min(1, state.progressFrac));
        }
    },
    mousemove: (evt: MouseEvent) => {
        let frac = (evt.clientX - window.innerWidth / 2) / (window.innerWidth / 2); // [-1..1]
        let state = thisHall.state;
        state.cameraTargetRotY= -frac * 0.6;
        state.mousePos = new Vector3((evt.clientX / window.innerWidth) * 2 - 1, -(evt.clientY / window.innerHeight) * 2 + 1);
    },
    click: (evt: MouseEvent) => {
        let state = thisHall.state;
        state.mousePos = new Vector3((evt.clientX / window.innerWidth) * 2 - 1, -(evt.clientY / window.innerHeight) * 2 + 1);
        waypointTryStartMove(state.waypointState,
                             state.progressFrac,
                             state.waypoint.position.z/(-hallwayLength));
    }
}

function registerEventListeners() {
    for (let listener in windowEventListeners) {
        if (windowEventListeners.hasOwnProperty(listener)) {
            window.addEventListener(listener, windowEventListeners[listener]);
        }
    }
}

function removeEventListeners() {
    for (let listener in windowEventListeners) {
        if (windowEventListeners.hasOwnProperty(listener)) {
            window.removeEventListener(listener, windowEventListeners[listener]);
        }
    }
}


async function makeVideo(webmSource: string): Promise<HTMLVideoElement> {
    let video = document.createElement("video");
    let isSupported = video.canPlayType("video/webm");

    return new Promise<HTMLVideoElement>((resolve, reject) => {
        if (isSupported) {
            video.src = webmSource;
            video.width = 640;
            video.height = 480;
            video.loop = true;
        
            video.preload = 'auto';
            video.muted = true;
    
            function onCanPlay () {
                console.log(webmSource);
                resolve(video);
                video.removeEventListener("canplay", onCanPlay);
            }

            video.addEventListener("canplay", onCanPlay);
        } else {
            reject("Your browser doesn't support webm videos.");
        }
    });
}

function makeVideoTex(video: HTMLVideoElement) {
    let texture = new VideoTexture( video );
    texture.minFilter = LinearFilter;
    texture.magFilter = LinearFilter;
    texture.format = RGBFormat;
    return texture;
}

function makeMaterial(video: HTMLVideoElement) {
    return new MeshBasicMaterial( {map: makeVideoTex(video)} );
}

function makePlane(video: HTMLVideoElement) {
    let geometry = new PlaneGeometry( 1.77777, 1, 1 );
    let material = makeMaterial(video);
    let plane = new Mesh( geometry, material );
    return plane;
}










