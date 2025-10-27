
import { GoogleGenAI, Type } from "@google/genai";
import type { TextBlock } from "../types";

const API_KEY = process.env.API_KEY;
if (!API_KEY) {
  // This is a fallback for development. In the target environment, API_KEY is expected to be set.
  console.warn("API_KEY environment variable not set.");
}

const ai = new GoogleGenAI({ apiKey: API_KEY });

function base64ToGenerativePart(base64: string, mimeType: string) {
    return {
        inlineData: {
            data: base64.split(',')[1],
            mimeType
        }
    };
}


export async function extractTextFromImage(imageDataUrl: string): Promise<TextBlock[]> {
    const imagePart = base64ToGenerativePart(imageDataUrl, 'image/jpeg');

    const prompt = `
        Analyze the provided image of a document page. 
        Extract all text blocks.
        For each text block, provide the text content and its bounding box coordinates (x, y, width, height) in pixels.
        The origin (0,0) is the top-left corner of the image.
    `;

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: {
                parts: [
                    { text: prompt },
                    imagePart,
                ]
            },
            config: {
                responseMimeType: 'application/json',
                responseSchema: {
                    type: Type.ARRAY,
                    items: {
                        type: Type.OBJECT,
                        properties: {
                            text: { type: Type.STRING },
                            boundingBox: {
                                type: Type.OBJECT,
                                properties: {
                                    x: { type: Type.NUMBER },
                                    y: { type: Type.NUMBER },
                                    width: { type: Type.NUMBER },
                                    height: { type: Type.NUMBER }
                                },
                                required: ['x', 'y', 'width', 'height']
                            }
                        },
                        required: ['text', 'boundingBox']
                    }
                }
            }
        });
        
        const jsonText = response.text.trim();
        const parsedResult = JSON.parse(jsonText);

        if (!Array.isArray(parsedResult)) {
            throw new Error("AI response is not a valid array.");
        }

        return parsedResult as TextBlock[];

    } catch (error) {
        console.error('Error calling Gemini API:', error);
        throw new Error('Failed to extract text from image using Gemini AI.');
    }
}
