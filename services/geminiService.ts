import { GoogleGenAI } from "@google/genai";

export const generateWallpaper = async (prompt: string): Promise<string> => {
  // Ensure API key is selected
  // Cast window to any to access aistudio properties without conflicting with global types
  const win = window as any;
  if (win.aistudio && win.aistudio.hasSelectedApiKey && win.aistudio.openSelectKey) {
     const hasKey = await win.aistudio.hasSelectedApiKey();
     if (!hasKey) {
       await win.aistudio.openSelectKey();
     }
  }

  // Create client (key is injected via process.env.API_KEY after selection or if env is set)
  // We use the image-preview model for high quality wallpapers
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const modelId = 'gemini-3-pro-image-preview';

  try {
    const response = await ai.models.generateContent({
      model: modelId,
      contents: {
        parts: [{ text: prompt }]
      },
      config: {
        imageConfig: {
            aspectRatio: "16:9", // Generate a wide base image, we will crop parts of it
            imageSize: "2K"
        }
      }
    });

    // Extract image
    if (response.candidates && response.candidates.length > 0) {
       const parts = response.candidates[0].content.parts;
       for (const part of parts) {
           if (part.inlineData && part.inlineData.data) {
               return `data:image/png;base64,${part.inlineData.data}`;
           }
       }
    }
    
    throw new Error("No image data found in response");

  } catch (error) {
    console.error("Gemini Image Gen Error:", error);
    throw error;
  }
};