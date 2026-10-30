async function generateTutorReply (message, history = []) {
  if (!process.env.GROQ_API_KEY)
    throw Object.assign(
      new Error(
        'Groq is not configured. Add GROQ_API_KEY to backend/.env to enable AI chat.'
      ),
      { status: 503 }
    )
  const base = (
    process.env.GROQ_BASE_URL || 'https://api.groq.com/openai/v1'
  ).replace(/\/$/, '')
  const response = await fetch(`${base}/chat/completions`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: process.env.GROQ_MODEL || 'llama-3.3-70b-versatile',
      messages: [
        {
          role: 'system',
          content:
            'You are SIGNWAY, a patient beginner-friendly Indian Sign Language learning companion. Explain ISL concepts carefully. Do not invent signs, glosses, or claim English word order is ISL grammar. If unsure, say so. Keep answers concise and useful.'
        },
        ...history
          .slice(-10)
          .map(m => ({
            role: m.role === 'assistant' ? 'assistant' : 'user',
            content: m.content
          })),
        { role: 'user', content: message }
      ],
      temperature: 0.4,
      max_tokens: 500
    })
  })
  const data = await response.json()
  if (!response.ok)
    throw Object.assign(
      new Error(data.error?.message || 'Groq request failed'),
      { status: 502 }
    )
  const reply = data.choices?.[0]?.message?.content?.trim()
  if (!reply)
    throw Object.assign(new Error('Groq returned an empty response'), {
      status: 502
    })
  return reply
}
module.exports = { generateTutorReply }
