import { baseUrl } from "@/common/urlUtil";
import { assert } from "decent-portal";

type SceneDef = {
    file: string;
    directions?: { [key: string]: string };
};

type WorldDef = {
    start: string;
    scenes: { [key: string]: SceneDef };
};

type SceneState = {
    chatHistory: any[];
    variables: any;
    location: string;
    consoleLines: any[]; // using any[] to avoid circular dependency or import issues, but it is TextConsoleLine[]
};

class WorldManager {
    _worldDef: WorldDef | null = null;
    _basePath: string = '';
    _sceneStates: { [key: string]: SceneState } = {};

    async loadWorld(url: string) {
        const fullUrl = baseUrl(url);
        const response = await fetch(fullUrl);
        if (!response.ok) throw Error(`Failed to load world from URL: ${url}`);
        this._worldDef = await response.json();

        // Assume the world file is in the root of the "world" folder, so encounters are relative to it.
        // However, url passed in is likely "encounters/world/world.json". 
        // We want to construct paths like "encounters/world/WestOfHouse.md".
        const lastSlash = url.lastIndexOf('/');
        this._basePath = lastSlash !== -1 ? url.substring(0, lastSlash + 1) : '';
    }

    getStartSceneLocation(): string {
        assert(this._worldDef !== null);
        return this._worldDef.start;
    }

    getEncounterPath(location: string): string {
        assert(this._worldDef !== null);
        const scene = this._worldDef.scenes[location];
        if (!scene) throw Error(`Scene not found for location: ${location}`);
        return `${this._basePath}${scene.scene}.md`;
    }

    getDestination(currentLocation: string, direction: string): string | null {
        assert(this._worldDef !== null);
        const scene = this._worldDef.scenes[currentLocation];
        if (!scene || !scene.directions) return null;
        return scene.directions[direction.toLowerCase()] || null;
    }

    getDirections(location: string): string[] {
        assert(this._worldDef !== null);
        const scene = this._worldDef.scenes[location];
        if (!scene || !scene.directions) return [];
        return Object.keys(scene.directions);
    }

    getDirectionsWithDestinations(location: string): { direction: string, destination: string }[] {
        assert(this._worldDef !== null);
        const scene = this._worldDef.scenes[location];
        if (!scene || !scene.directions) return [];
        return Object.entries(scene.directions).map(([dir, dest]) => ({ direction: dir, destination: dest }));
    }

    saveSceneState(location: string, state: SceneState) {
        this._sceneStates[location] = state;
    }

    loadSceneState(location: string): SceneState | null {
        return this._sceneStates[location] || null;
    }
}

export default new WorldManager();
