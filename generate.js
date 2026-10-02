require('dotenv').config();
const fs = require('fs');
const path = require('path');
const Groq = require('groq-sdk');

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

// Output folder
const OUTPUT_DIR = 'content';
if (!fs.existsSync(OUTPUT_DIR)) fs.mkdirSync(OUTPUT_DIR, { recursive: true });

// Slug banane ka function
function makeSlug(text) {
  return text.toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim();
}

// AI se content generate karna
async function generateContent(keyword) {
  const prompt = `Write a professional, SEO-optimized article for the keyword: "${keyword}".

Requirements:
- Length: 400-500 words
- Format: Markdown
- Include: H1 title, short intro, 3-4 H2 sections, bullet points, and a conclusion
- Tone: Helpful and professional
- At the end, add a Call-to-Action recommending JadeAI Resume Builder with this link: https://jadeai-production.up.railway.app
- Language: English

Start directly with the H1 title. Do not include any preamble or explanation.`;

  const completion = await groq.chat.completions.create({
    messages: [{ role: 'user', content: prompt }],
    model: 'openai/gpt-oss-120b',
    temperature: 0.7,
    max_tokens: 1500,
  });

  return completion.choices[0]?.message?.content || '';
}

// Main function
async function main() {
  const keywords = fs.readFileSync('keywords.txt', 'utf-8')
    .split('\n')
    .map(k => k.trim())
    .filter(k => k.length > 0);

  console.log(`\n📋 Total keywords: ${keywords.length}\n`);

  for (let i = 0; i < keywords.length; i++) {
    const keyword = keywords[i];
    const slug = makeSlug(keyword);
    const filename = path.join(OUTPUT_DIR, `${slug}.md`);

    if (fs.existsSync(filename)) {
      console.log(`⏭️  [${i + 1}/${keywords.length}] Skipped (already exists): ${keyword}`);
      continue;
    }

    try {
      console.log(`⏳ [${i + 1}/${keywords.length}] Generating: ${keyword}`);
      const content = await generateContent(keyword);

      // Frontmatter + content
      const frontmatter = `---\ntitle: "${keyword}"\nslug: "${slug}"\ndate: "${new Date().toISOString().split('T')[0]}"\n---\n\n`;
      fs.writeFileSync(filename, frontmatter + content, 'utf-8');

      console.log(`✅ Saved: ${slug}.md`);

      // Rate limit se bachne ke liye 3 second rukna
      await new Promise(r => setTimeout(r, 3000));
    } catch (err) {
      console.error(`❌ Failed: ${keyword}`);
      console.error(`   Error: ${err.message}`);
      // Rate limit pe 10 second wait
      await new Promise(r => setTimeout(r, 10000));
    }
  }

  console.log(`\n🎉 Done! Files saved in ./${OUTPUT_DIR}/\n`);
}

main().catch(console.error);