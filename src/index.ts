import './main.css';
import { Scene, PerspectiveCamera, PlaneGeometry, MeshBasicMaterial, Mesh, WebGLRenderer, VideoTexture, LinearFilter, RGBFormat } from "three";

import { Halls, Hall, HallState } from "./common"
import { getTimestamp } from "./utils"
import * as masksHall from "./halls/masks"

import reflectionIcon from "./media/map/reflection.png"
import landingIcon from "./media/map/home.png"

import * as Stats from "stats.js"
let stats = new Stats();
stats.showPanel(0); // 0: fps, 1: ms, 2: mb, 3+: custom
stats.dom.style.left = "auto";
stats.dom.style.right = "0";
stats.dom.style.top = "50px";
// document.body.appendChild(stats.dom);

const halls: Halls = {
    renderer: new WebGLRenderer({antialias: true}),
    state: HallState.Init,
    lastState: HallState.None,
    currHallIdx: 0,
    lastHallIdx: -1,
    nextState: HallState.Init,
    nextHallIdx: 0,
    allHalls: [masksHall],
}

const loadingIndicator = document.getElementsByClassName("js-loading")[0];
const loadingIndicatorStatus = document.getElementsByClassName("js-loading-status")[0];
const loadingIndicatorDots = document.getElementsByClassName("js-loading-dots")[0];
let loadingState = getTimestamp();

function toggleLoadingIndicator(state: boolean) {
    if (state) {
        loadingIndicator.classList.remove("hidden");
    } else {
        loadingIndicator.classList.add("hidden");
    }
}

function canNavigate(state: HallState): boolean {
    return (state === HallState.InHall ||
        state === HallState.WaitingToEnterHall
        /* || state === HallState.Landing || */);
}


function createNavLi(text: string) {
    let li = document.createElement("li");
    let txt = document.createElement("p");
    txt.textContent = text;
    li.appendChild(txt);
    return li;
}
const hallLinks = halls.allHalls.map((hall, idx) => {
    let li = createNavLi(hall.name);
    function makeJumpToIdxOnClick(idx: number) {
        return (evt: MouseEvent) => {
            if ((halls.currHallIdx !== idx) &&
                (canNavigate(halls.state))) {
                halls.state = HallState.LeavingHall;
                halls.allHalls[halls.currHallIdx].teardown().then(() => {
                    halls.currHallIdx = idx;
                    console.log(`Now entering hall: ${halls.currHallIdx}`);
                    halls.state = HallState.StartedLoadingHall;
                });
                evt.preventDefault();
                evt.stopPropagation();
            }
        }
    }
    li.addEventListener("click", makeJumpToIdxOnClick(idx));
    return { li, decidingState: null, hallIdx: idx };
});
let ul = document.createElement("ul");

for (let i = 0; i < hallLinks.length; i++) {
    ul.appendChild(hallLinks[i].li);
}


const interstitials = {
    hallIntros: (() => {
        return halls.allHalls.map((hall, idx) => {
            let introId = halls.allHalls[idx].introId;
            if (introId) {
                return document.getElementById(introId);
            } else {
                return null;
            }
        });
    })(),
}

window.addEventListener("click", () => {
    if (halls.state === HallState.WaitingToEnterHall) {
        halls.state = HallState.InHall;
    }
});

function currHallHasIntro(): boolean {
    let introId = halls.allHalls[halls.currHallIdx].introId;
    return introId ? true : false;
}

function handleStateChange(lastState: HallState, lastIdx: number,
    state: HallState, idx: number) {
    if (lastState === state && idx === lastIdx) {
        return;
    }
    switch (state) {
        case HallState.Init:
        case HallState.StartedLoadingHall:
        case HallState.LoadingHall:
        case HallState.WaitingToEnterHall:
            {
                let hallIntros = interstitials.hallIntros;
                for (let i = 0; i < hallIntros.length; i++) {
                    if (hallIntros[i]) {
                        if (idx == i) {
                            hallIntros[i].classList.remove("hidden");
                        } else {
                            hallIntros[i].classList.add("hidden");
                        }
                    }
                }
                halls.renderer.domElement.classList.add("hidden");
            } break;
        case HallState.InHall:
        case HallState.StartedLeavingHall:
        case HallState.LeavingHall:
            {
                let hallIntros = interstitials.hallIntros;
                for (let i = 0; i < hallIntros.length; i++) {
                    if (hallIntros[i]) {
                        hallIntros[i].classList.add("hidden");
                    }
                }
                halls.renderer.domElement.classList.remove("hidden");
            } break;
    }

    switch (state) {
        case HallState.Init:
        case HallState.StartedLoadingHall:
        case HallState.LoadingHall:
        case HallState.WaitingToEnterHall:
            {
                toggleLoadingIndicator(true);
            } break;
        case HallState.InHall:
        case HallState.StartedLeavingHall:
        case HallState.LeavingHall:
            {
                toggleLoadingIndicator(false);
            } break;
    }

    if (state === HallState.InHall && lastState !== HallState.InHall) {
        halls.allHalls[halls.lastHallIdx].onEnter(halls.renderer);
    } else if (lastState === HallState.InHall && state !== HallState.InHall) {
        halls.allHalls[halls.lastHallIdx].onLeave();
    }

    switch (state) {
        case HallState.Init: console.log("Init"); break;
        case HallState.StartedLoadingHall: console.log("StartedLoadingHall"); break;
        case HallState.LoadingHall: console.log("LoadingHall"); break;
        case HallState.WaitingToEnterHall: console.log("WaitingToEnterHall"); break;
        case HallState.InHall: console.log("InHall"); break;
        case HallState.StartedLeavingHall: console.log("StartedLeavingHall"); break;
        case HallState.LeavingHall: console.log("LeavingHall"); break;
    }

    let inAHall =
        (state === HallState.StartedLoadingHall) ||
        (state === HallState.LoadingHall) ||
        (state === HallState.WaitingToEnterHall) ||
        (state === HallState.InHall) ||
        (state === HallState.StartedLeavingHall) ||
        (state === HallState.LeavingHall);
    for (let i = 0; i < hallLinks.length; i++) {
        if ((inAHall && !hallLinks[i].decidingState && hallLinks[i].hallIdx == idx) ||
            hallLinks[i].decidingState === state) {
            hallLinks[i].li.classList.add("active");
        } else {
            hallLinks[i].li.classList.remove("active");
        }
    }
}

function updateLoadingDisplay(isLoading: boolean) {
    if (isLoading) {
        const interval = 500;
        const times = 3;
        let elapsedMs = getTimestamp() - loadingState;
        let dotCount = Math.floor((elapsedMs % (interval * times)) / interval);
        loadingIndicatorStatus.textContent = "Loading";
        let dots = "";
        for (let i = 0; i <= dotCount; i++) {
            dots += ".";
        }
        loadingIndicatorDots.textContent = dots;
        document.body.style.cursor = "wait";
    } else {
        loadingIndicatorStatus.textContent = "Press to Enter";
        loadingIndicatorDots.textContent = "";
        document.body.style.cursor = "pointer";
    }
}

function handleHalls() {
    switch (halls.state) {
        case HallState.Init:
            {
                updateLoadingDisplay(true);
                let renderer = halls.renderer;
                renderer.setSize(document.documentElement.clientWidth, window.innerHeight);
                renderer.setClearColor("black");
                renderer.domElement.classList.add("main-view");
                document.body.appendChild(renderer.domElement);

                window.addEventListener("resize", () => {
                    renderer.setSize(document.documentElement.clientWidth, window.innerHeight);
                    if (halls.state == HallState.InHall) {
                        halls.allHalls[halls.currHallIdx].resize();
                    }
                });

                halls.state = HallState.StartedLoadingHall;
            }
            break;
        case HallState.StartedLoadingHall:
            {
                let hasIntro = currHallHasIntro();
                if (hasIntro) {

                    loadingState = getTimestamp();
                }

                halls.state = HallState.LoadingHall;
                console.log("SETUP");
                halls.allHalls[halls.currHallIdx].setup().then(() => {
                    if (hasIntro) {
                        updateLoadingDisplay(false);
                        halls.state = HallState.WaitingToEnterHall;
                    } else {
                        halls.state = HallState.InHall;
                    }
                });
            } break;
        case HallState.LoadingHall:
            {
                // Waiting for promise to finish
                updateLoadingDisplay(true);
            } break;
        case HallState.WaitingToEnterHall:
            {
                // Waiting for click event above
            } break;
        case HallState.InHall:
            {
                halls.allHalls[halls.currHallIdx].resize();
                halls.allHalls[halls.currHallIdx].render(halls.renderer);
                let progress = halls.allHalls[halls.currHallIdx].getProgressFrac();
                if (progress >= 0.99) {
                    halls.state = HallState.StartedLeavingHall;
                }
            } break;
        case HallState.StartedLeavingHall:
            halls.state = HallState.LeavingHall;
            {
                halls.allHalls[halls.currHallIdx].teardown().then(() => {
                    halls.currHallIdx = (halls.currHallIdx + 1) % halls.allHalls.length;
                    console.log(`Now entering hall: ${halls.currHallIdx}`);
                    halls.state = HallState.StartedLoadingHall;

                    // if (halls.currHallIdx === 0) {
                    //     halls.state = HallState.Reflecting;
                    //     setReflectionVisibility(true);
                    // }
                });
            } break;
        case HallState.LeavingHall:
            {
                // Waiting for promise to finish
            } break;
    }
    handleStateChange(halls.lastState, halls.lastHallIdx, halls.state, halls.currHallIdx);
    halls.lastState = halls.state;
    halls.lastHallIdx = halls.currHallIdx;
}

function renderLoop() {
    stats.begin();
    handleHalls();
    stats.end();
    requestAnimationFrame(renderLoop);
}

requestAnimationFrame(renderLoop);