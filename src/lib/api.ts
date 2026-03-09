import { Memory } from './storage';

export const callDeepSeek = async (
  apiKey: string,
  memories: Memory[],
  userMessage: string,
  chatHistory: {role: 'user' | 'assistant', content: string}[]
) => {
  const memoryText = memories.length > 0 
    ? memories.map((m, i) => `${i + 1}. [Dibuat: ${m.createdAt}]${m.targetDate ? ` [Target: ${m.targetDate}]` : ''} ${m.content}`).join('\n')
    : "Belum ada memori.";

  const currentDate = new Date().toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

  const systemPrompt = `Anda adalah asisten chatbot memori yang ketat. Anda memiliki akses ke Bank Memori berikut:
<memory_bank>
${memoryText}
</memory_bank>

Hari ini adalah: ${currentDate}

Tugas Anda:
1. Jika pesan pengguna berisi informasi baru, tugas, atau fakta tentang mereka, ekstrak sebagai memori baru ke dalam array "new_memories".
2. Setiap memori baru harus berupa objek dengan properti:
   - "content": Isi dari memori atau tugas tersebut.
   - "targetDate": (Opsional) Jika memori adalah tugas atau pengingat untuk waktu tertentu (misal: "besok", "minggu depan", "tanggal 10"), hitung dan tuliskan tanggal targetnya dalam format "DD MMMM YYYY" berdasarkan hari ini (${currentDate}). Jika tidak ada waktu spesifik, biarkan null.
3. Jika pengguna mengajukan pertanyaan, jawab pertanyaan tersebut dengan KETAT DAN HANYA menggunakan informasi di Bank Memori.
4. Jika jawaban tidak ada di Bank Memori, Anda HARUS menjawab "Saya tidak tahu berdasarkan memori yang saya miliki." JANGAN gunakan pengetahuan dari luar.
5. Selalu balas dalam bahasa Indonesia.

Anda HARUS merespons dalam format JSON yang valid dengan tepat dua field:
{
  "new_memories": [
    {
      "content": "fakta atau tugas",
      "targetDate": "10 Maret 2026" // atau null jika tidak ada
    }
  ], // Array objek. Kosong jika tidak ada fakta baru.
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
    return JSON.parse(content) as { 
      new_memories: { content: string, targetDate?: string | null }[], 
      response: string 
    };
  } catch (e) {
    console.error("Gagal mem-parsing JSON dari DeepSeek", content);
    throw new Error("Format respons tidak valid dari API");
  }
};
