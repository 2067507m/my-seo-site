require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const Groq = require('groq-sdk');

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
const CONTENT_DIR = 'content';
const LOG_FILE = 'agent-log.txt';

if (!fs.existsSync(CONTENT_DIR)) fs.mkdirSync(CONTENT_DIR, { recursive: true });

function log(msg) {
  const time = new Date().toLocaleString('en-PK');
  const line = `[${time}] ${msg}`;
  console.log(line);
  fs.appendFileSync(LOG_FILE, line + '\n');
}

function makeSlug(text) {
  return text.toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim();
}

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
    model: 'openai/gpt-oss-20b',
    temperature: 0.7,
    max_tokens: 1500,
  });

  return completion.choices[0]?.message?.content || '';
}

async function main() {
  log('═══════════════════════════════════');
  log('🤖 Auto-Pilot Agent Started');
  log('═══════════════════════════════════');

  // 1. Read keywords
  const keywords = fs.readFileSync('keywords.txt', 'utf-8')
    .split('\n')
    .map(k => k.trim())
    .filter(k => k.length > 0);

  // 2. Find pending keywords (not yet generated)
  const pending = keywords.filter(k => {
    const slug = makeSlug(k);
    return !fs.existsSync(path.join(CONTENT_DIR, `${slug}.md`));
  });

  log(`📋 Total keywords: ${keywords.length}`);
  log(`✅ Already done: ${keywords.length - pending.length}`);
  log(`⏳ Pending: ${pending.length}`);

  if (pending.length === 0) {
    log('🎉 All keywords already generated!');
    return;
  }

  // 3. Generate only 10 per run (to avoid rate limits)
  const toGenerate = pending.slice(0, 10);
  log(`\n🚀 Generating ${toGenerate.length} new pages today...\n`);

  let success = 0, failed = 0;

  for (let i = 0; i < toGenerate.length; i++) {
    const keyword = toGenerate[i];
    const slug = makeSlug(keyword);
    const filename = path.join(CONTENT_DIR, `${slug}.md`);

    try {
      log(`⏳ [${i + 1}/${toGenerate.length}] ${keyword}`);
      const content = await generateContent(keyword);
      const frontmatter = `---\ntitle: "${keyword}"\nslug: "${slug}"\ndate: "${new Date().toISOString().split('T')[0]}"\n---\n\n`;
      fs.writeFileSync(filename, frontmatter + content, 'utf-8');
      log(`✅ Saved: ${slug}.md`);
      success++;
      await new Promise(r => setTimeout(r, 3000));
    } catch (err) {
      log(`❌ Failed: ${keyword} — ${err.message}`);
      failed++;
      await new Promise(r => setTimeout(r, 10000));
    }
  }

  log(`\n📊 Generation Summary:`);
  log(`   ✅ Success: ${success}`);
  log(`   ❌ Failed: ${failed}`);

  // 4. Build site
  log(`\n🔨 Building site...`);
  try {
    execSync('node build-site.js', { stdio: 'inherit' });
    log('✅ Build complete');
  } catch (err) {
    log(`❌ Build failed: ${err.message}`);
    return;
  }

  // 5. Deploy to Vercel
  log(`\n🚀 Deploying to Vercel...`);
  try {
    execSync('vercel --prod --yes', { stdio: 'inherit' });
    log('✅ Deploy complete');
    log(`🌐 Live: https://myseosite.vercel.app`);
  } catch (err) {
    log(`❌ Deploy failed: ${err.message}`);
    return;
  }

  log('\n═══════════════════════════════════');
  log('🎉 Agent Run Complete!');
  log('═══════════════════════════════════\n');
}

main().catch(err => {
  log(`💥 Fatal error: ${err.message}`);
  process.exit(1);
});