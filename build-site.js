const fs = require('fs');
const path = require('path');
const { marked } = require('marked');

const CONTENT_DIR = 'content';
const PUBLIC_DIR = 'public';

if (!fs.existsSync(PUBLIC_DIR)) fs.mkdirSync(PUBLIC_DIR, { recursive: true });

const files = fs.readdirSync(CONTENT_DIR).filter(f => f.endsWith('.md'));

function template(title, content) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${title}</title>
<meta name="description" content="${title}">
<meta name="google-site-verification" content="YHOsIiobCTY16LrK9faxRmRjZZMVnytu6xXXKeIF8Ro" />
<!-- Google AdSense -->
<script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-7986945248563713"
     crossorigin="anonymous"></script>
<!-- Google tag (gtag.js) -->
<script async src="https://www.googletagmanager.com/gtag/js?id=G-8T49T54167"></script>
<!-- Google tag (gtag.js) -->
<script async src="https://www.googletagmanager.com/gtag/js?id=G-8T49TS4167"></script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());

  gtag('config', 'G-8T49TS4167');
</script>
<link rel="stylesheet" href="/style.css">
</head>
<body>
<header><a href="/">AI Resume Resources</a></header>
<main>${content}</main>
<footer>© ${new Date().getFullYear()} JadeAI</footer>
</body>
</html>`;
}

const pages = [];

files.forEach(file => {
  const raw = fs.readFileSync(path.join(CONTENT_DIR, file), 'utf-8');
  const match = raw.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  let title = file.replace('.md', '');
  let content = raw;
  if (match) {
    const fm = match[1];
    content = match[2];
    const tm = fm.match(/title:\s*"([^"]+)"/);
    if (tm) title = tm[1];
  }
  const html = marked.parse(content);
  const slug = file.replace('.md', '');
  fs.writeFileSync(path.join(PUBLIC_DIR, `${slug}.html`), template(title, html));
  pages.push({ slug, title });
});

const indexHtml = `<h1>AI Resume Resources</h1>
<p>Browse all our resume guides and samples:</p>
<ul>${pages.map(p => `<li><a href="/${p.slug}.html">${p.title}</a></li>`).join('')}</ul>`;
fs.writeFileSync(path.join(PUBLIC_DIR, 'index.html'), template('AI Resume Resources', indexHtml));

const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${pages.map(p => `<url><loc>https://myseosite.vercel.app/${p.slug}.html</loc></url>`).join('')}
</urlset>`;
fs.writeFileSync(path.join(PUBLIC_DIR, 'sitemap.xml'), sitemap);

const adsTxt = `google.com, pub-7986945248563713, DIRECT, f08c47fec0942fa0
`;
fs.writeFileSync(path.join(PUBLIC_DIR, 'ads.txt'), adsTxt);

const css = `body{font-family:system-ui;max-width:800px;margin:0 auto;padding:20px;line-height:1.7;color:#222}
h1{color:#10b981}h2{color:#059669;margin-top:30px}
a{color:#10b981;text-decoration:none}a:hover{text-decoration:underline}
header{border-bottom:2px solid #10b981;padding-bottom:12px;margin-bottom:25px;font-weight:600}
footer{border-top:1px solid #ddd;margin-top:50px;padding-top:15px;color:#666;text-align:center;font-size:14px}
ul{line-height:2}`;
fs.writeFileSync(path.join(PUBLIC_DIR, 'style.css'), css);

console.log(`\n✅ Generated ${pages.length} pages + index + sitemap + ads.txt\n`);