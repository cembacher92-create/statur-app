import { GoogleGenAI } from "@google/genai";

export async function generateLogo() {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) return null;
    
    const ai = new GoogleGenAI({ apiKey });
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: {
        parts: [
          {
            text: "A minimalist, modern logo for a fitness app named 'STATUR'. The design shows a clear, light blue outline of a human head in profile, looking to the right. Inside the head outline is a stylized, powerful muscle symbol (a flexed biceps). The line work is clean, thin, and professional (line-art style), suitable for a white app background. The logo radiates intelligence, focus, and physical strength. High quality, vector style, isolated on white background.",
          },
        ],
      },
    });

    if (response.candidates && response.candidates[0].content.parts) {
      for (const part of response.candidates[0].content.parts) {
        if (part.inlineData) {
          return `data:image/png;base64,${part.inlineData.data}`;
        }
      }
    }
  } catch (error) {
    console.error("Logo generation failed:", error);
  }
  return null;
}
