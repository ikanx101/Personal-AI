export const callDeepSeek = async (
  apiKey: string,
  memories: string[],
  userMessage: string,
  chatHistory: {role: 'user' | 'assistant', content: string}[]
) => {
  const memoryText = memories.length > 0 
    ? memories.map((m, i) => `${i + 1}. ${m}`).join('\n')
    : "Belum ada memori.";

  const systemPrompt = `Anda adalah asisten chatbot memori yang ketat. Anda memiliki akses ke Bank Memori berikut:
<memory_bank>
${memoryText}
</memory_bank>

Tugas Anda:
1. Jika pesan pengguna berisi informasi baru atau fakta tentang mereka, ekstrak sebagai fakta singkat ke dalam array "new_memories".
2. Jika pengguna mengajukan pertanyaan, jawab pertanyaan tersebut dengan KETAT DAN HANYA menggunakan informasi di Bank Memori.
3. Jika jawaban tidak ada di Bank Memori, Anda HARUS menjawab "Saya tidak tahu berdasarkan memori yang saya miliki." JANGAN gunakan pengetahuan dari luar.
4. Selalu balas dalam bahasa Indonesia.

Anda HARUS merespons dalam format JSON yang valid dengan tepat dua field:
{
  "new_memories": ["fakta 1", "fakta 2"], // Array string. Kosong jika tidak ada fakta baru.
  "response": "Balasan Anda untuk pengguna."
}`;

  const messages = [
    { role: 'system', content: systemPrompt },
    ...chatHistory.map(m => ({ role: m.role, content: m.content })),
    { role: 'user', content: userMessage }
  ];

  const response = await fetch('https://api.deepseek.com/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: 'deepseek-chat',
      messages: messages,
      response_format: { type: 'json_object' },
      temperature: 0.1
    })
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error?.message || 'Gagal menghubungi DeepSeek API');
  }

  const data = await response.json();
  const content = data.choices[0].message.content;
  
  try {
    return JSON.parse(content) as { new_memories: string[], response: string };
  } catch (e) {
    console.error("Gagal mem-parsing JSON dari DeepSeek", content);
    throw new Error("Format respons tidak valid dari API");
  }
};
