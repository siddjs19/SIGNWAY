const { GoogleGenAI } = require('@google/genai');

if (!process.env.GEMINI_API_KEY) {
  throw new Error('GEMINI_API_KEY is missing from .env');
}

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY
});

async function generateTutorReply(message, history = []) {
  const contents = [
    ...history.map((item) => ({
      role: item.sender === 'assistant' ? 'model' : 'user',
      parts: [{ text: item.content }]
    })),
    {
      role: 'user',
      parts: [{ text: message }]
    }
  ];

  const response = await ai.models.generateContent({
    model: process.env.GEMINI_MODEL || 'gemini-flash-latest',
    contents,
    config: {
      systemInstruction: `
You are the AI conversation tutor for SignBridge AI.

Your purpose is to help users learn Indian Sign Language (ISL).

Rules:
1. Be friendly, patient, and encouraging.
2. Use simple English unless the user requests another supported language.
3. Help users practise everyday conversations.
4. Explain sign-language concepts clearly.
5. Never claim that a text explanation is an exact visual demonstration of an ISL sign.
6. If you are uncertain about a particular ISL sign, say so rather than inventing an answer.
7. Give short, practical answers suitable for beginners.
      `,
      maxOutputTokens: 500
    }
  });

  const reply = response.text?.trim();

  if (!reply) {
    throw new Error('Gemini returned an empty response');
  }

  return reply;
}

module.exports = { generateTutorReply };