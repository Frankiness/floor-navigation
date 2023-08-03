import {type GLTF, GLTFLoader} from "three/examples/jsm/loaders/GLTFLoader";

const gltf_loader = new GLTFLoader();

export const useGLTFLoader = async (url: string): Promise<GLTF> => {
	return await gltf_loader.loadAsync(url);
};
