import { Vector3,
     Group,
     Scene,
     PerspectiveCamera,
     PlaneGeometry,
     MeshBasicMaterial,
     Mesh,
     WebGLRenderer,
     VideoTexture,
     FogExp2,
     LinearFilter,
     RGBFormat,
     BufferGeometry,
     InstancedBufferGeometry,
     InstancedBufferAttribute,
     InstancedMesh,
     BufferAttribute,
     ShaderMaterial,
     Matrix4,
     DynamicDrawUsage,
     TextureLoader,
     Uniform
  
     } from "three";
import { normalizeWheel,lerp,lerpTo } from "../utils"
import { Halls, Hall, HallState } from "../common"
import { waypointMakeState, waypointReset, waypointMoveToMouse, waypointTryStartMove, waypointUpdate, WaypointState, WaypointMovingState } from "../waypoint"

import video1src from "../media/Mask03-3.webm";
import video2src from "../media/Mask02.webm";
import video3src from "../media/Mask04.webm";
import video4src from "../media/Mask05-2.webm";
import video5src from "../media/Mask01.webm";
import largeVideoSrc from "../media/test2.webm";
import sound from "../media/MaskHallSound.webm";

import fontTexture from '../media/Lora_sdf.png';
import fontVertSrc from "../fontShaders/vert.vs";
import fontFragSrc from "../fontShaders/frag.fs";
import fontAtlasLayout from "../media/Lora_layout";

import markovSource from "../media/TEXT.txt";
import waypointTexture from "../media/waypoint.png";

interface MarkovAnalyses {
    [ngramLength: number]: MarkovAnalysis
}

interface MasksHall extends Hall {
    state: {
        videoSrcs: string[],
        planeData: { pos: [number, number, number], rot: [number, number, number] }[],
        vids: HTMLVideoElement[],
        sound: HTMLVideoElement[]
        largeVideo: HTMLVideoElement[]
        scene: Scene,
        camera: PerspectiveCamera,
        waypointState: WaypointState,
        waypoint: Mesh | Group | null,
        progressFrac: number,
        loadedOnce: boolean,
        mousePos: Vector3,
        cameraTargetRotY: number,
        markovState: MarkovState[],
        ngramAnalyses: MarkovAnalyses
    }
}

const moveSpeed = 0.05;
const hallwayFloorY = -0.5;
const hallwayLength = 17.5;
const textHallwayLength = 6.5;
const hallwayWidth = 5;
const hallwayHeight = 1.8;
const hallTextOffset = -1.0;
const initialNGramLen = 5;
const maxCharsTowards = 360;
const maxCharsAway = 105;

const thisHall: MasksHall = {
    name: "Hall of Eyes",
    introId: "js-eyes-hall",
    state: {
        videoSrcs: [],
        planeData: [],
        vids: [],
        largeVideo: [],
        sound: [],
        scene: new Scene(),
        camera: new PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000),
        waypointState: waypointMakeState(hallwayFloorY),
        waypoint: null,
        progressFrac: 0,
        loadedOnce: false,
        mousePos: new Vector3(),
        cameraTargetRotY: 0,
        markovState: [],
        ngramAnalyses: ngramifyGroup(markovSource, initialNGramLen)
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
                state.videoSrcs = [
                    video1src,
                    video2src,
                    video3src,
                    video4src,
                    video5src,
                ];
                state.planeData = [
                    {pos: [-1,0,-12.5], rot:  [0,45,0]},
                    {pos: [1,0,-11.5], rot:  [0,-30,0]},
                    {pos: [-1,0,-15], rot:  [0,35,0]},
                    {pos: [1,0,-14], rot:  [0,-15,0]},
                    {pos: [0,0,-18], rot: [0,0,0]},
                ];
                
                async function addWaypoint(waypointTex: string): Promise<void> {
                    return new Promise<void>((resolve, reject) => {
                        const texture = new TextureLoader().load( waypointTex );
                        let geometry = new PlaneGeometry( 0.4, 0.4, 0.4 );
                        geometry.rotateX(-Math.PI/2);
                        const material = new MeshBasicMaterial({map: texture});
                        let plane = new Mesh( geometry, material );
                        state.scene.add(plane);
                        state.waypoint = plane;
                        resolve(); 
                    });
                }


                var enableFog= true;
                if(enableFog){
                state. scene.fog= new FogExp2 (0x000000,0.2);
                }

                
                async function addBgAudio() : Promise<void> {
                    return new Promise<void>((resolve, reject) => {
                        makeSound(sound).then((sound) => {
                            state.sound.push(sound);
                            resolve();
                        });
                    });
                }
                
                async function addLargeVideo() : Promise<void> {
                    return new Promise<void>((resolve, reject) => {
                        makeVideoWithSize(largeVideoSrc, 4096, 512).then((video) => {
                            const plane = makeCurvedScreen(video);
                            // const plane = makeVideoPlane(video);
                            // plane.position.set(0,hallwayFloorY, -12.5);
                            plane.position.set(0,1, -12.5);
                            state.scene.add(plane);
                            thisHall.state.largeVideo.push(video);
                            resolve();
                        });
                    });
                }

                async function addPlanes() : Promise<void> {
                    return new Promise<void>((resolve, reject) => {
                        Promise.all(state.videoSrcs.map(makeVideo)).then((videos) => {
                            state.vids = videos;
                    
                            let planes = state.vids.map(makeVideoPlane);
                            for (let i = 0; i < planes.length; i++) {
                                let pos = state.planeData[i].pos;
                                let rot = state.planeData[i].rot;
                                planes[i].position.set(pos[0],pos[1], pos[2]);
                                planes[i].rotation.set(0,rot[1]*2*Math.PI/360,0);
                                state.scene.add( planes[i] );
                            }
                            resolve();
                        });
                    });
                }


            

            const txtMat = makeTextMaterial();
            // for (let i = 0; i < 20; i++) {
            //     const txt = generateMarkovText(thisHall.state.ngramAnalysis, 500);
            //     const ms: MarkovState = {
            //         nextUpdateTs: window.performance.now() + 1000,
            //         targetText: txt,
            //         currLen: 0,
            //         text: makeTextChars(txtMat, 500)
            //     };
            //     updateText(ms.text, ms.targetText);
            //     thisHall.state.markovState.push(ms);
            //     state.scene.add(ms.text.mesh);
            //     ms.text.mesh.position.y = hallwayFloorY + i*0.2;
            //     ms.text.mesh.position.z = hallTextOffset;
            //     ms.text.mesh.position.x = -hallwayWidth/2;
            //     ms.text.mesh.scale.x = 0.2;
            //     ms.text.mesh.scale.y = 0.2;
            //     ms.text.mesh.scale.z = 0.2;
            //     ms.text.mesh.rotateY(Math.PI*0.5);
            // }
            // for (let i = 0; i < 20; i++) {
            //     const txt = generateMarkovText(thisHall.state.ngramAnalysis, 500);
            //     const ms: MarkovState = {
            //         nextUpdateTs: window.performance.now() + 1000,
            //         targetText: txt,
            //         currLen: 0,
            //         text: makeTextChars(txtMat, 500)
            //     };
            //     updateText(ms.text, ms.targetText);
            //     thisHall.state.markovState.push(ms);
            //     state.scene.add(ms.text.mesh);
            //     ms.text.mesh.position.y = hallwayFloorY + i*0.2;
            //     ms.text.mesh.position.z = -textHallwayLength;
            //     ms.text.mesh.position.x = hallwayWidth/2;
            //     ms.text.mesh.scale.x = 0.2;
            //     ms.text.mesh.scale.y = 0.2;
            //     ms.text.mesh.scale.z = 0.2;
            //     ms.text.mesh.rotateY(-Math.PI*0.5);
            // }
            
            const textsPerSide = 50;
            for (let i = 0; i < textsPerSide; i++) {
                const txt = generateMarkovText(thisHall.state.ngramAnalyses[initialNGramLen], maxCharsAway);
                const ms: MarkovState = {
                    nextUpdateTs: window.performance.now() + 1000,//pickFloat01()* 5000,
                    targetText: txt,
                    currLen: (txt.length * pickFloat01())|0,
                    text: makeTextChars(txtMat, maxCharsAway),
                    textSide: -1,
                    currNgramLength: initialNGramLen
                };
                updateText(ms.text, ms.targetText);
                thisHall.state.markovState.push(ms);
                state.scene.add(ms.text.mesh);
                ms.text.mesh.position.y = hallwayFloorY + (i/textsPerSide)*hallwayHeight;
                ms.text.mesh.position.z = hallTextOffset;
                ms.text.mesh.position.x = ms.textSide * hallwayWidth/2 * pickFloat01();
                ms.text.mesh.scale.x = 0.2;
                ms.text.mesh.scale.y = 0.2;
                ms.text.mesh.scale.z = 0.2;
                ms.text.mesh.rotateY(Math.PI*0.5);
            }
            for (let i = 0; i < textsPerSide; i++) {
                const txt = generateMarkovText(thisHall.state.ngramAnalyses[initialNGramLen], maxCharsTowards);
                const ms: MarkovState = {
                    nextUpdateTs: window.performance.now() + 1000,//pickFloat01()* 5000,
                    targetText: txt,
                    currLen: (txt.length * pickFloat01())|0,
                    text: makeTextChars(txtMat, maxCharsTowards),
                    textSide: 1,
                    currNgramLength: initialNGramLen
                };
                updateText(ms.text, ms.targetText);
                thisHall.state.markovState.push(ms);
                state.scene.add(ms.text.mesh);
                ms.text.mesh.position.y = hallwayFloorY + (i/textsPerSide)*hallwayHeight;
                ms.text.mesh.position.z = -textHallwayLength;
                ms.text.mesh.position.x = ms.textSide * hallwayWidth/2 * pickFloat01();
                ms.text.mesh.scale.x = 0.2;
                ms.text.mesh.scale.y = 0.2;
                ms.text.mesh.scale.z = 0.2;
                ms.text.mesh.rotateY(-Math.PI*0.5);
            }

                Promise.all([addWaypoint(waypointTexture), addPlanes(), addBgAudio(), addLargeVideo()]).then(() => {
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
        thisHall.state.sound.forEach(sound => {
            sound.muted = false;
            sound.play()
        });
        thisHall.state.largeVideo.forEach(vid => {
            vid.muted = false;
            vid.play()
        });
        registerEventListeners();
    },
    onLeave: function () {
        thisHall.state.vids.forEach(vid => {
            vid.muted = true;
        });
        thisHall.state.sound.forEach(sound => {
            sound.muted = true;
        });
        thisHall.state.largeVideo.forEach(vid => {
            vid.muted = true;
        });
        removeEventListeners();
    },
    render: function (renderer) {
        let state = thisHall.state;

        const markovState = thisHall.state.markovState;
        const currTs = window.performance.now();
        for (let i = 0; i < markovState.length; i++) {
            const ms = markovState[i];

            if (currTs > ms.nextUpdateTs) {
                ms.nextUpdateTs = currTs + 100;
                ms.currLen++;
                if (ms.currLen > ms.targetText.length) {
                    ms.currNgramLength--;
                    if (ms.currNgramLength <= 1) {
                        ms.currNgramLength = initialNGramLen;
                    }
                    ms.targetText = generateMarkovText(thisHall.state.ngramAnalyses[ms.currNgramLength], ms.text.maxCount);
                    updateText(ms.text, ms.targetText);
                    ms.currLen = 0;

                    ms.text.mesh.position.y = hallwayFloorY + pickFloat01()*hallwayHeight;
                    if (ms.textSide > 0) {
                        ms.text.mesh.position.z = -textHallwayLength;
                    } else {
                        ms.text.mesh.position.z = hallTextOffset;
                    }
                    ms.text.mesh.position.x = ms.textSide * hallwayWidth/2 * pickFloat01();

                }
                ms.text.mesh.count = ms.currLen;
            }
        }

        
        // currLen
      
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
            state.progressFrac -= evt.pixelY * 0.00001 * hallwayLength;
            state.progressFrac = Math.max(0, Math.min(1, state.progressFrac));
        }
    },
    mousemove: (evt: MouseEvent) => {
        let frac = (evt.clientX - window.innerWidth / 2) / (window.innerWidth / 2); // [-1..1]
        let state = thisHall.state;
        state.cameraTargetRotY= -frac * 0.9; //0.6;
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


async function makeSound(webmSource: string): Promise<HTMLVideoElement> {
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

async function makeVideo(webmSource: string): Promise<HTMLVideoElement> {
    return makeVideoWithSize(webmSource, 640, 480);
}

async function makeVideoWithSize(webmSource: string, width: number, height: number): Promise<HTMLVideoElement> {
    let video = document.createElement("video");
    let isSupported = video.canPlayType("video/webm");

    return new Promise<HTMLVideoElement>((resolve, reject) => {
        if (isSupported) {
            video.src = webmSource;
            video.width = width;
            video.height = height;
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

function makeVideoMaterial(video: HTMLVideoElement) {
    return new MeshBasicMaterial( {map: makeVideoTex(video)} );
}

function makeVideoPlane(video: HTMLVideoElement) {
    let geometry = new PlaneGeometry( 1.77777, 1, 1 );
    let material = makeVideoMaterial(video);
    let plane = new Mesh( geometry, material );
    return plane;
}

function makeCurvedScreen(video: HTMLVideoElement) {
    let material = makeVideoMaterial(video);
    const geometry = new BufferGeometry();

    const cx = 0;
    const cy = 0;
    const r = 6;//2.75;
    const numSegments = 20;
    const numTris = (numSegments-1)*2;
    const verts = new Float32Array(numSegments*2*3);
    const uvs = new Float32Array(numSegments*2*2);
    const indices = new Uint16Array(numTris*3);
    const arcAngle = 3/2 * Math.PI;//  2 * 3.1415926;
    const width = (r * arcAngle);
    const height = 512/4096 * width;
    { 
        const theta = arcAngle / numSegments;
        const c = Math.cos(theta);//precalculate the sine and cosine
        const s = Math.sin(theta);
        let t;
    
        // let x = 0;
        // let y = r;

        const correctiveAngle = (2 * Math.PI-arcAngle)/2;
        let x = - r * Math.sin(correctiveAngle);
        let y = r * Math.cos(correctiveAngle);
        
        for(let segIdx = 0; segIdx < numSegments; segIdx++) {
            verts[(segIdx*2+0)*3+0] = x + cx;
            verts[(segIdx*2+0)*3+1] = 0;
            verts[(segIdx*2+0)*3+2] = y + cy;

            verts[(segIdx*2+1)*3+0] = x + cx;
            verts[(segIdx*2+1)*3+1] = height;
            verts[(segIdx*2+1)*3+2] = y + cy;

            uvs[(segIdx*2)*2 + 0] = segIdx/(numSegments-1);
            uvs[(segIdx*2)*2 + 1] = 0;

            uvs[(segIdx*2+1)*2 + 0] = segIdx/(numSegments-1);
            uvs[(segIdx*2+1)*2 + 1] = 1;

            //apply the rotation matrix
            t = x;
            x = c * x - s * y;
            y = s * t + c * y;
        }

        for(let segIdx = 0; segIdx < numSegments-1; segIdx++) {
            indices[segIdx*6+0] = 0 + 2 * segIdx;
            indices[segIdx*6+1] = 3 + 2 * segIdx;
            indices[segIdx*6+2] = 1 + 2 * segIdx;

            indices[segIdx*6+3] = 0 + 2 * segIdx;
            indices[segIdx*6+4] = 2 + 2 * segIdx;
            indices[segIdx*6+5] = 3 + 2 * segIdx;
        }
    }
    
    geometry.setAttribute( 'position', new BufferAttribute( verts, 3 ) );
    geometry.setAttribute( 'uv', new BufferAttribute( uvs, 2 ) );
    geometry.setIndex(new BufferAttribute(indices, 1));
    const mesh = new Mesh( geometry, material );
    return mesh;
}

interface AtlasInfo {
    advance: number
    planeBounds: {
        left: number
        bottom: number
        right: number
        top: number
    }
    atlasBounds: {
        left: number
        bottom: number
        right: number
        top: number
    }
}

interface AtlasInfos {
    [char: string]: AtlasInfo
}

interface DynamicText {
    _tempMatrix: Matrix4
    maxCount: number
    atlasRegions: Float32Array
    atlasRegionsAttribute: InstancedBufferAttribute
    mesh: InstancedMesh,
    atlasInfos: AtlasInfos
}

function makeTextMaterial (): ShaderMaterial {
    const texture = new TextureLoader().load( fontTexture );
    // texture.generateMipmaps = false;
    texture.premultiplyAlpha = true;

    const material = new ShaderMaterial( {
        transparent: true,
        // depthTest: true,

        // depthWrite: false,
        // blending: AdditiveBlending,
        
        //  depthFunc: NeverDepth,
        //  depthFunc: AlwaysDepth,
        //  depthFunc: LessDepth,
        //  depthFunc: LessEqualDepth,
        //  depthFunc: EqualDepth,
        //  depthFunc: GreaterEqualDepth,
        //  depthFunc: GreaterDepth,
        //  depthFunc: NotEqualDepth,
        
        // side: DoubleSide,
        uniforms: {
            fontTexture: new Uniform(texture),
        },
        vertexShader: fontVertSrc,
        fragmentShader: fontFragSrc
    } );
    material.extensions.derivatives = true;

    return material;
}

function makeTextChars(material: ShaderMaterial, maxCount: number): DynamicText {
    const geometry = new InstancedBufferGeometry();
    const vertices = new Float32Array( [
        -1.0, -1.0,
         1.0, -1.0,
         1.0,  1.0,
    
         1.0,  1.0,
        -1.0,  1.0,
        -1.0, -1.0,
    ] );
    geometry.setAttribute( 'position', new BufferAttribute( vertices, 2/* components per vertex */ ) );

    const glyphInfos = fontAtlasLayout.glyphs;
    const charAtlasInfo: AtlasInfos = {};
    for (let i = 0; i < glyphInfos.length; i++) {
        let info: Partial<AtlasInfo> = {}; 
        if (glyphInfos[i].atlasBounds) {
            info.atlasBounds = glyphInfos[i].atlasBounds;
        } else {
            info.atlasBounds = {
                left: 0,
                right: 0,
                top: 0,
                bottom: 0,
            };
        }
        if (glyphInfos[i].planeBounds) {
            info.planeBounds = glyphInfos[i].planeBounds;
        } else {
            info.planeBounds = {
                left: 0,
                right: 0,
                top: 0,
                bottom: 0,
            };
        }
        info.advance = glyphInfos[i].advance;
        charAtlasInfo[String.fromCharCode(glyphInfos[i].unicode)] = <AtlasInfo>info;
    }


    const atlasRegions = new Float32Array(maxCount*4);

    const mesh = new InstancedMesh(geometry,material,maxCount);
    mesh.instanceMatrix.setUsage( DynamicDrawUsage );


    const res: DynamicText = {
        _tempMatrix:  new Matrix4(),
        atlasRegions: atlasRegions,
        atlasRegionsAttribute: new InstancedBufferAttribute(atlasRegions, 4),
        maxCount: maxCount,
        mesh: mesh,
        atlasInfos: charAtlasInfo
    };

    geometry.setAttribute( 'atlasRegion', res.atlasRegionsAttribute );
    return res;
}

function updateText(text: DynamicText, targetString: string) {
    const charAtlasInfo = text.atlasInfos;
    const mesh = text.mesh;
    const atlasRegions = text.atlasRegions;
    let currX = 0;
    const matrix = text._tempMatrix;
    for (let i = 0; i < targetString.length; i++) {
        const info = charAtlasInfo[targetString[i]];
        const planeBounds = info.planeBounds;
        const hDiv2 = (planeBounds.top - planeBounds.bottom)/2;
        const wDiv2 = (planeBounds.right - planeBounds.left)/2;
        const dX = planeBounds.left + wDiv2 + currX;
        const dY = planeBounds.bottom + hDiv2;
        const dZ = 0;
        //This matrix is both a translation and scale matrix:
        matrix.set( wDiv2, 0,     0, dX,
                    0,     hDiv2, 0, dY,
                    0,     0,     1, dZ,
                    0,     0,     0, 1 );
        currX += info.advance;
        mesh.setMatrixAt( i, matrix );
    }
    mesh.instanceMatrix.needsUpdate = true;
    for (let i = 0; i < targetString.length; i++) {
        const atlasBounds = charAtlasInfo[targetString[i]].atlasBounds;
        atlasRegions[i*4+0] = atlasBounds.left;
        atlasRegions[i*4+1] = atlasBounds.bottom;
        atlasRegions[i*4+2] = atlasBounds.right;
        atlasRegions[i*4+3] = atlasBounds.top;
    }
    text.atlasRegionsAttribute.needsUpdate = true;
    // mesh.count = targetString.length;
}

interface MarkovState {
    nextUpdateTs: number
    targetText: string
    currLen: number
    text: DynamicText
    textSide: number
    currNgramLength: number
}

type MarkovAnalysis = {
    freqs: Map<string, string[]>
    beginnings: string[]
    ngramLength: number
}

function ngramifyGroup(srcText: string, maxNgramLength: number): MarkovAnalyses {
    const res: MarkovAnalyses = {};
    for (let i = 1; i <= maxNgramLength; i++) {
        res[i] = ngramify(srcText, i);
    }
    return res;
}

function ngramify(srcText: string, ngramLength: number): MarkovAnalysis {
    const textLines = srcText.split('\n');
    const res: MarkovAnalysis = {
        freqs: new Map(),
        beginnings: [],
        ngramLength
    };
    const beginnings = res.beginnings;
    const frequencies = res.freqs;

    for (var j = 0; j < textLines.length; j++) {
        var txt = textLines[j];
        for (var i = 0; i <= txt.length - ngramLength; i++) {
          var gram = txt.substring(i, i + ngramLength);
    
          if (i == 0) {
            beginnings.push(gram);// string 
          }
    
          let continuations = frequencies.get(gram);
          if (!continuations) {
            continuations = [];
            frequencies.set(gram, continuations);
          }
          continuations.push(txt.charAt(i + ngramLength));
        }
    }
    return res;
}

type PRNGState = Uint32Array

const PRNG_STATE: PRNGState = Uint32Array.of(421563);

// function xorshift64(state: PRNGState): number {
// 	let x = state.a|0;
// 	x ^= x << 13;
// 	x ^= x >> 7;
//     x ^= x << 17;
//     state.a = x;
// 	return state.a;
// }

function xorshift32(state: PRNGState): number {
    let x = state[0];
	x ^= (x << 13);
	x ^= (x >>> 17);
	x ^= (x << 5);
	return state[0] = (x >>> 0);
}

/* in range 0 to 1, inclusive */
function pickFloat01(): number {
    const n = xorshift32(PRNG_STATE);
    const res = n/(0xFFFFFFFF);
    return res;
}

function pickFromArray(strings: string[]) {
    const n = xorshift32(PRNG_STATE);// & (0x7FFFFFFF);
    return strings[n % strings.length];
}

function generateMarkovText(analysis: MarkovAnalysis, maxLength: number): string {
    let res = "";
    let currentGram = pickFromArray(analysis.beginnings);
    res = currentGram;

    for (var i = 0; i < ((maxLength/analysis.ngramLength)|0); i++) {
        const possibilities = analysis.freqs.get(currentGram);
        if (!possibilities) {
            break;
        }
        const nextGram = pickFromArray(possibilities);
        res += nextGram;
        currentGram = res.substring(res.length - analysis.ngramLength, res.length);
    }

    return res;
}