import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '..');

const COLORS = {
  bg: '#0a0a0f',
  panel: '#12121a',
  panel2: '#1a1a26',
  border: '#2a2a3a',
  text: '#e8e8f0',
  muted: '#888899',
  gold: '#c9a84c',
  green: '#4cc97a',
  red: '#ef4444',
};

function argValue(args, name, fallback) {
  const idx = args.indexOf(name);
  if (idx === -1) return fallback;
  const v = args[idx + 1];
  if (!v || v.startsWith('--')) return fallback;
  return v;
}

function clamp01(n) {
  if (Number.isNaN(n)) return 0;
  return Math.max(0, Math.min(1, n));
}

function escapeXml(s) {
  return String(s)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;');
}

function svgCard({ w, h, payload, logoDataUri }) {
  const pad = 64;
  const cardX = pad;
  const cardY = pad;
  const cardW = w - pad * 2;
  const cardH = h - pad * 2;

  const title = payload.title ?? 'QUEST LOG';
  const playerName = payload.playerName ?? 'Warrior';
  const className = payload.className ?? 'Warrior';
  const classIcon = payload.classIcon ?? '⚔️';
  const dateLabel = payload.dateLabel ?? '';
  const footer = payload.footer ?? 'IronLore';

  const stats = Array.isArray(payload.stats) ? payload.stats.slice(0, 4) : [];
  const quests = Array.isArray(payload.quests) ? payload.quests.slice(0, 5) : [];

  const headerY = cardY + 44;
  const logoSize = 92;

  const statsY = headerY + 120;
  const statBoxH = 110;
  const statGap = 14;
  const statBoxW = Math.floor((cardW - statGap * 3) / 4);

  const questsY = statsY + statBoxH + 36;
  const questRowH = 94;
  const questGap = 12;

  const questRows = quests.map((q, i) => {
    const y = questsY + i * (questRowH + questGap);
    const pct = clamp01(Number(q.pct ?? 0));
    const barW = Math.floor(cardW - 52 - 200);
    const barH = 10;
    const barX = cardX + 28;
    const barY = y + 58;
    const fillW = Math.floor(barW * pct);
    const reward = q.reward ?? '';
    const detail = q.detail ?? '';

    return `
      <g>
        <rect x="${cardX + 18}" y="${y}" rx="18" ry="18" width="${cardW - 36}" height="${questRowH}" fill="${COLORS.panel2}" stroke="${COLORS.border}" />
        <text x="${cardX + 34}" y="${y + 34}" fill="${COLORS.text}" font-size="26" font-weight="800">${escapeXml(q.name ?? 'Quest')}</text>
        <text x="${cardX + 34}" y="${y + 56}" fill="${COLORS.muted}" font-size="18" font-weight="600">${escapeXml(detail)}</text>

        <rect x="${barX}" y="${barY}" rx="${barH / 2}" ry="${barH / 2}" width="${barW}" height="${barH}" fill="rgba(255,255,255,0.08)" />
        <rect x="${barX}" y="${barY}" rx="${barH / 2}" ry="${barH / 2}" width="${fillW}" height="${barH}" fill="${COLORS.gold}" />

        <text x="${cardX + cardW - 34}" y="${y + 46}" fill="${COLORS.gold}" font-size="20" font-weight="800" text-anchor="end">${escapeXml(reward)}</text>
      </g>
    `;
  }).join('\n');

  const statBoxes = stats.map((s, i) => {
    const x = cardX + i * (statBoxW + statGap);
    const y = statsY;
    return `
      <g>
        <rect x="${x}" y="${y}" rx="16" ry="16" width="${statBoxW}" height="${statBoxH}" fill="${COLORS.panel2}" stroke="${COLORS.border}" />
        <text x="${x + 18}" y="${y + 40}" fill="${COLORS.muted}" font-size="16" font-weight="700" letter-spacing="2">${escapeXml((s.label ?? '').toUpperCase())}</text>
        <text x="${x + 18}" y="${y + 82}" fill="${COLORS.text}" font-size="34" font-weight="900">${escapeXml(s.value ?? '')}</text>
      </g>
    `;
  }).join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
  <svg width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <radialGradient id="glow" cx="50%" cy="30%" r="60%">
        <stop offset="0%" stop-color="${COLORS.gold}" stop-opacity="0.20"/>
        <stop offset="60%" stop-color="${COLORS.gold}" stop-opacity="0.06"/>
        <stop offset="100%" stop-color="${COLORS.gold}" stop-opacity="0"/>
      </radialGradient>
      <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
        <feDropShadow dx="0" dy="18" stdDeviation="18" flood-color="#000000" flood-opacity="0.55"/>
      </filter>
    </defs>

    <rect width="100%" height="100%" fill="${COLORS.bg}" />
    <rect width="100%" height="100%" fill="url(#glow)" />

    <rect x="${cardX}" y="${cardY}" rx="34" ry="34" width="${cardW}" height="${cardH}" fill="${COLORS.panel}" stroke="${COLORS.border}" filter="url(#shadow)"/>

    <!-- Header -->
    ${logoDataUri ? `<image href="${logoDataUri}" x="${cardX + 28}" y="${headerY}" width="${logoSize}" height="${logoSize}" />` : ''}
    <text x="${cardX + 28 + logoSize + 18}" y="${headerY + 36}" fill="${COLORS.gold}" font-size="28" font-weight="900" letter-spacing="4">${escapeXml(title)}</text>
    <text x="${cardX + 28 + logoSize + 18}" y="${headerY + 68}" fill="${COLORS.text}" font-size="26" font-weight="800">${escapeXml(classIcon)} ${escapeXml(playerName)} • ${escapeXml(className)}</text>
    ${dateLabel ? `<text x="${cardX + cardW - 28}" y="${headerY + 36}" fill="${COLORS.muted}" font-size="16" font-weight="700" text-anchor="end" letter-spacing="2">${escapeXml(dateLabel)}</text>` : ''}

    <!-- Stats -->
    ${statBoxes}

    <!-- Quests -->
    <text x="${cardX + 24}" y="${questsY - 12}" fill="${COLORS.muted}" font-size="16" font-weight="800" letter-spacing="3">TODAY</text>
    ${questRows}

    <!-- Footer -->
    <text x="${cardX + 24}" y="${cardY + cardH - 26}" fill="${COLORS.muted}" font-size="14" font-weight="700">${escapeXml(footer)}</text>
  </svg>`;
}

async function main() {
  const args = process.argv.slice(2);
  const inputPath = argValue(args, '--input', path.join(repoRoot, 'scripts', 'quest-card.example.json'));
  const outPath = argValue(args, '--out', path.join(repoRoot, 'assets', 'share', 'quest-card.png'));
  const size = argValue(args, '--size', '1080x1350');
  const logoPath = argValue(args, '--logo', path.join(repoRoot, 'assets', 'images', 'icon.png'));

  const [wStr, hStr] = size.split('x');
  const w = Math.max(256, parseInt(wStr, 10) || 1080);
  const h = Math.max(256, parseInt(hStr, 10) || 1350);

  const payloadRaw = await fs.readFile(inputPath, 'utf8');
  const payload = JSON.parse(payloadRaw);

  let logoDataUri = null;
  try {
    const logoBuf = await sharp(logoPath).resize(256, 256, { fit: 'contain' }).png().toBuffer();
    logoDataUri = `data:image/png;base64,${logoBuf.toString('base64')}`;
  } catch {
    // Optional: logo is nice-to-have
    logoDataUri = null;
  }

  const svg = svgCard({ w, h, payload, logoDataUri });
  await fs.mkdir(path.dirname(outPath), { recursive: true });

  await sharp(Buffer.from(svg))
    .png({ compressionLevel: 9 })
    .toFile(outPath);

  // eslint-disable-next-line no-console
  console.log(`Wrote quest card: ${outPath}`);
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error(err);
  process.exitCode = 1;
});

