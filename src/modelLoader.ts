import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
import { Group } from "three";

// DRACO compressed model loader
const draco = new DRACOLoader()
// TODO(JULIAN): Figure out why loading locally doesn't work!
//draco.setDecoderPath('./draco/gltf/');
draco.setDecoderPath('/draco/');
draco.preload();
export const loader = new GLTFLoader();
loader.setDRACOLoader(draco);

export async function load3dModel(loader: GLTFLoader, modelName: string): Promise<Group> {
    return new Promise<Group>((resolve, reject) => {
        loader.load(modelName, function (file) {
            resolve(file.scene);
        }, undefined /* progress */, function (error) {
            reject(error);
        });
    });
}

export type Loader = GLTFLoader;