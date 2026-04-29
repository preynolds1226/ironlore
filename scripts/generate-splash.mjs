import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const repoRoot = path.resolve(__dirname, '..');
const iconPath = path.join(repoRoot, 'assets', 'images', 'icon.png');
const outPath = path.join(repoRoot, 'assets', 'images', 'ironlore-splash.png');

const BG = '#0a0a0f';
const size = 2048;

function svgGlow({ size, inner = 0.10, outer = 0.42, color = '#ffb000' }) {
  // A soft radial glow behind the icon. No text.
  return Buffer.from(
    `<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <radialGradient id="g" cx="50%" cy="50%" r="60%">
          <stop offset="0%" stop-color="${color}" stop-opacity="${inner}"/>
          <stop offset="55%" stop-color="${color}" stop-opacity="${outer}"/>
          <stop offset="100%" stop-color="${color}" stop-opacity="0"/>
        </radialGradient>
      </defs>
      <rect width="100%" height="100%" fill="url(#g)"/>
    </svg>`
  );
}

async function main() {
  // Make icon smaller than full canvas for safe cropping on all aspect ratios.
  const iconTarget = Math.round(size * 0.42);

  const iconPng = await sharp(iconPath)
    .resize(iconTarget, iconTarget, { fit: 'contain' })
    .png()
    .toBuffer();

  const glow = await sharp(svgGlow({ size, inner: 0.10, outer: 0.18, color: '#ffb000' }))
    .blur(12)
    .png()
    .toBuffer();

  const vignette = await sharp({
    create: { width: size, height: size, channels: 4, background: BG },
  })
    .composite([{ input: glow, blend: 'screen' }])
    .png()
    .toBuffer();

  await sharp(vignette)
    .composite([
      {
        input: iconPng,
        left: Math.round((size - iconTarget) / 2),
        top: Math.round((size - iconTarget) / 2),
      },
    ])
    .png({ compressionLevel: 9 })
    .toFile(outPath);

  // eslint-disable-next-line no-console
  console.log(`Wrote splash: ${outPath}`);
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error(err);
  process.exitCode = 1;
});

