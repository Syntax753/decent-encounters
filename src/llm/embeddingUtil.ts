import { pipeline, env } from '@huggingface/transformers';

// Skip local model checks since we are running in browser context
env.allowLocalModels = false;
env.useBrowserCache = true;

// Use a lightweight embedding model
const MODEL_ID = 'Xenova/all-MiniLM-L6-v2';

let extractorPipeline: any = null;
let isInitializing = false;

/**
 * Initializes the feature extraction pipeline.
 * We lazily load it only when an encounter needs it.
 */
export async function initEmbeddings() {
    if (extractorPipeline) return;
    if (isInitializing) {
        // Wait until initialized if already in progress
        return new Promise((resolve) => {
            const interval = setInterval(() => {
                if (extractorPipeline) {
                    clearInterval(interval);
                    resolve(true);
                }
            }, 100);
        });
    }

    isInitializing = true;
    console.log(`Initializing Huggingface Transformers: ${MODEL_ID}`);

    try {
        extractorPipeline = await pipeline('feature-extraction', MODEL_ID, {
            progress_callback: (x: any) => {
                // We could bubble this up to the UI if we wanted a loading bar
                console.log(`Transformers Model Load Progress: ${Math.round((x.loaded / x.total) * 100)}%`);
            }
        });
        console.log(`Transformers initialized successfully.`);
    } catch (err) {
        console.error("Failed to initialize Transformers embedding model:", err);
    } finally {
        isInitializing = false;
    }
}

/**
 * Generates a vector embedding for a given text string.
 */
export async function getEmbedding(text: string): Promise<number[]> {
    if (!extractorPipeline) await initEmbeddings();
    if (!extractorPipeline) throw new Error("Embedding pipeline not initialized.");

    const output = await extractorPipeline(text, { pooling: 'mean', normalize: true });
    // output.data is a Float32Array
    return Array.from(output.data);
}

/**
 * Calculates the cosine similarity between two vectors.
 * Since output is normalized (L2=1), dot product = cosine similarity.
 */
export function cosineSimilarity(vecA: number[], vecB: number[]): number {
    if (vecA.length !== vecB.length) {
        throw new Error("Vectors must be of the same length to compute similarity.");
    }

    let dotProduct = 0;
    for (let i = 0; i < vecA.length; i++) {
        dotProduct += vecA[i] * vecB[i];
    }

    // Assuming normalize:true in pipeline, so vectors are unit vectors
    return dotProduct;
}
