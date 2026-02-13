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

export type ItemDef = { [verb: string]: string };
type ItemsDef = { items: { [name: string]: ItemDef } };

class WorldManager {
    _worldDef: WorldDef | null = null;
    _itemsDef: ItemsDef | null = null;
    _basePath: string = '';
    _sceneStates: { [key: string]: SceneState } = {};

    async loadWorld(url: string) {
        const fullUrl = baseUrl(url);
        const response = await fetch(fullUrl);
        if (!response.ok) throw Error(`Failed to load world from URL: ${url}`);
        this._worldDef = await response.json();

        // Base path should point to the directory containing scene .md files.
        // If world.json is at encounters/world/genesis/world.json, 
        // scenes are at encounters/world/*.md, so we go up one directory.
        const lastSlash = url.lastIndexOf('/');
        const parentPath = lastSlash !== -1 ? url.substring(0, lastSlash) : '';
        const secondSlash = parentPath.lastIndexOf('/');
        this._basePath = secondSlash !== -1 ? parentPath.substring(0, secondSlash + 1) : '';
    }

    async loadItems(url: string) {
        const fullUrl = baseUrl(url);
        const response = await fetch(fullUrl);
        if (!response.ok) throw Error(`Failed to load items from URL: ${url}`);
        this._itemsDef = await response.json();
    }

    getItemVerbs(itemName: string): ItemDef | null {
        if (!this._itemsDef) return null;
        return this._itemsDef.items[itemName.toLowerCase()] || null;
    }

    getAllItemNames(): string[] {
        if (!this._itemsDef) return [];
        return Object.keys(this._itemsDef.items);
    }

    getStartSceneLocation(): string {
        assert(this._worldDef !== null);
        return this._worldDef.start;
    }

    getAllScenes(): { [key: string]: SceneDef } {
        assert(this._worldDef !== null);
        return this._worldDef.scenes;
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

    clearAllSceneStates() {
        this._sceneStates = {};
    }
}

export default new WorldManager();
