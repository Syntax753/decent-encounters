import { pipeline, env } from '@huggingface/transformers';

// Skip local model checks since we are running in browser context
env.allowLocalModels = false;
env.useBrowserCache = true;

// Use a lightweight embedding model
// const MODEL_ID = 'Xenova/all-MiniLM-L6-v2';
const MODEL_ID = 'Xenova/bge-small-en-v1.5';

let extractorPipeline: any = null;
let isInitializing = false;

/**
 * Initializes the feature extraction pipeline.
 * We lazily load it only when an encounter needs it.
 */
export async function initEmbeddings(onProgress?: (status: string, percentComplete: number) => void) {
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
    if (onProgress) onProgress(`Resolving Huggingface Transformers: ${MODEL_ID}...`, 0);

    try {
        extractorPipeline = await pipeline('feature-extraction', MODEL_ID, {
            progress_callback: (x: any) => {
                if (x.status === 'progress' && x.total) {
                    const percent = x.loaded / x.total;
                    if (onProgress) {
                        onProgress(`Loading Embedder: ${x.name || 'model'}...`, percent);
                    }
                } else if (onProgress && x.status === 'initiate') {
                    onProgress(`Initiating chunk: ${x.name || 'model'}...`, 0);
                }
            }
        });
        console.log(`Transformers initialized successfully.`);
        if (onProgress) onProgress(`Transformers initialized successfully.`, 1.0);
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

    // BGE models perform best with a specific prompt prefix for retrieval
    // Use this prefix only for the query/input sentence you are searching with
    const instruction = "represent this sentence for finding relevant matches: ";
    const input = `${instruction}${text}`;

    const output = await extractorPipeline(input, {
        pooling: 'mean',
        normalize: true
    });

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
