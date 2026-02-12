// LLM-based scene art generator
// Generates ASCII art from scene descriptions using the in-browser LLM
// Caches results per location key so art is only generated once

import { baseUrl } from "@/common/urlUtil";
import WorldManager from "@/encounters/WorldManager";
import { loadEncounter } from "@/encounters/encounterUtil";
import ActionType from "@/encounters/v0/types/ActionType";
import { saveChatConfiguration, restoreChatConfiguration, setSystemMessage, clearChatHistory, generate } from "@/llm/llmUtil";

const artCache: Map<string, string[]> = new Map();

const ART_SYSTEM_PROMPT = `You are an ASCII art generator. You create scene art using standard characters (letters, numbers, punctuation, symbols).
Rules:
- Output EXACTLY 8 lines of art, each EXACTLY 52 characters wide
- Create a clear visual picture of the scene described
- Use standard ASCII art techniques (e.g. \\/| for shapes, #@% for density, .,: for texture)
- Focus on the main elements: horizon, buildings, trees, objects
- NO text labels (e.g. don't write "HOUSE"), only visual art
- Output ONLY the 8 lines of art, nothing else`;

function _noOp(_status: string, _pct: number) { }

export async function generateSceneArt(locationKey: string, sceneDescription: string): Promise<string[]> {
    // Return cached art if available
    const cached = artCache.get(locationKey);
    if (cached) return cached;

    // Try to load pre-generated art from cache file
    try {
        const url = baseUrl(`encounters/world/cache/${locationKey}.art`);
        const response = await fetch(url);
        if (response.ok) {
            const text = await response.text();
            const lines = text.split('\n');
            if (lines.length > 0) {
                artCache.set(locationKey, lines);
                return lines;
            }
        }
    } catch (e) {
        // Ignore network errors, fallback to generation
    }

    try {
        // Save current LLM state
        saveChatConfiguration();

        // Configure for art generation
        setSystemMessage(ART_SYSTEM_PROMPT);
        clearChatHistory();

        const prompt = `Create ASCII art for: ${sceneDescription}`;
        console.log('[DEBUG] Scene art: calling LLM with prompt:', prompt);
        const response = await generate(prompt, _noOp);
        console.log('[DEBUG] Scene art: LLM call completed');

        // Restore original LLM state
        restoreChatConfiguration();

        // Parse the response into lines, pad/trim to exactly 52 chars
        const lines = response.split('\n')
            .filter(line => line.trim().length > 0)
            .slice(0, 8)
            .map(line => {
                // Keep printable ASCII characters (32-126)
                // eslint-disable-next-line no-control-regex
                const cleaned = line.replace(/[^\x20-\x7E]/g, '');
                if (cleaned.length >= 52) return cleaned.substring(0, 52);
                return cleaned.padEnd(52, ' ');
            });

        // Pad to 8 lines if needed
        while (lines.length < 8) {
            lines.push('                                                    ');
        }

        artCache.set(locationKey, lines);
        return lines;
    } catch (e) {
        // On failure, restore config and return a simple fallback
        try { restoreChatConfiguration(); } catch (_) { }
        console.warn('Failed to generate scene art:', e);
        const fallback = [
            '                                                    ',
            '                                                    ',
            '                                                    ',
            '                                                    ',
            '                                                    ',
            '                                                    ',
            '                                                    ',
            '                                                    ',
        ];
        artCache.set(locationKey, fallback);
        return fallback;
    }
}

export async function generateAllSceneArt(onProgress: (current: number, total: number, name: string) => void): Promise<{ [key: string]: string[] }> {
    const scenes = WorldManager.getAllScenes();
    const total = Object.keys(scenes).length;
    let current = 0;
    const results: { [key: string]: string[] } = {};

    for (const key of Object.keys(scenes)) {
        current++;
        onProgress(current, total, key);

        try {
            const path = WorldManager.getEncounterPath(key);
            const encounter = await loadEncounter(path);

            const parts: string[] = [encounter.title];
            for (const action of encounter.startActions) {
                if (action.actionType === ActionType.NARRATION_MESSAGE) {
                    parts.push(action.messages.nextMessage());
                }
            }
            const description = parts.join(' ');

            const art = await generateSceneArt(key, description);
            results[key] = art;
        } catch (e) {
            console.error(`Failed to generate art for ${key}:`, e);
            results[key] = [];
        }
    }
    return results;
}
