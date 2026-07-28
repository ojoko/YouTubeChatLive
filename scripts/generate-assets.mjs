import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const sharp = require('sharp');
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const iconSvg = await fs.readFile(path.join(root, 'assets', 'komeflow-icon.svg'));

await fs.mkdir(path.join(root, 'icons'), { recursive: true });
await fs.mkdir(path.join(root, 'store-assets'), { recursive: true });

for (const size of [16, 32, 48, 128]) {
  await sharp(iconSvg)
    .resize(size, size)
    .png({ compressionLevel: 9 })
    .toFile(path.join(root, 'icons', `icon${size}.png`));
}
await sharp(iconSvg)
  .resize(128, 128)
  .png({ compressionLevel: 9 })
  .toFile(path.join(root, 'store-assets', 'store-icon-128.png'));

const escapeXml = (value) => String(value)
  .replaceAll('&', '&amp;')
  .replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;');

function promoSvg(width, height, compact = false) {
  const logoSize = compact ? 124 : 210;
  const logoX = compact ? 32 : 92;
  const logoY = (height - logoSize) / 2;
  const titleX = logoX + logoSize + (compact ? 24 : 58);
  const titleY = compact ? 116 : 238;
  return `
  <svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">
    <defs>
      <linearGradient id="back" x1="0" y1="0" x2="${width}" y2="${height}">
        <stop stop-color="#0F131D"/><stop offset=".58" stop-color="#121B29"/><stop offset="1" stop-color="#241C48"/>
      </linearGradient>
      <radialGradient id="orb"><stop stop-color="#00F0FF" stop-opacity=".35"/><stop offset="1" stop-color="#00F0FF" stop-opacity="0"/></radialGradient>
    </defs>
    <rect width="100%" height="100%" fill="url(#back)"/>
    <circle cx="${width * .82}" cy="${height * .1}" r="${height * .8}" fill="url(#orb)"/>
    <image href="data:image/svg+xml;base64,${iconSvg.toString('base64')}" x="${logoX}" y="${logoY}" width="${logoSize}" height="${logoSize}"/>
    <text x="${titleX}" y="${titleY}" fill="#F7FAFF" font-family="Segoe UI, Arial, sans-serif" font-size="${compact ? 48 : 92}" font-weight="800">KomeFlow</text>
    <text x="${titleX}" y="${titleY + (compact ? 42 : 76)}" fill="#9FB0BE" font-family="Segoe UI, Arial, sans-serif" font-size="${compact ? 19 : 34}">Live comments, in sync.</text>
    <path d="M${titleX} ${titleY + (compact ? 62 : 112)}h${compact ? 198 : 390}" stroke="#00F0FF" stroke-width="${compact ? 3 : 5}" stroke-linecap="round"/>
  </svg>`;
}

await sharp(Buffer.from(promoSvg(440, 280, true)))
  .png({ compressionLevel: 9 })
  .toFile(path.join(root, 'store-assets', 'small-promo-440x280.png'));
await sharp(Buffer.from(promoSvg(1400, 560, false)))
  .png({ compressionLevel: 9 })
  .toFile(path.join(root, 'store-assets', 'marquee-1400x560.png'));

function screenshotSvg(mode = 'flow') {
  const fixed = mode === 'dvr';
  const title = fixed ? 'Rewind. Comments follow.' : 'Live comments, your way.';
  const subtitle = fixed
    ? 'Local DVR sync replays comments at the moment they appeared.'
    : 'Flowing or fixed overlays, tuned exactly the way you like.';
  const commentRows = fixed
    ? [
        ['00:42', 'That moment was amazing!', '#FFFFFF'],
        ['00:47', 'ㅋㅋㅋㅋㅋㅋ', '#00F0FF'],
        ['00:52', 'ここ好き！', '#FFD700']
      ]
    : [
        ['● LIVE', 'Amazing stream!', '#FFFFFF'],
        ['', '太棒了！', '#00F0FF'],
        ['', 'ナイス！', '#FFD700'],
        ['', '대박!', '#FFFFFF']
      ];
  const comments = commentRows.map((row, index) => {
    const y = 246 + index * 82;
    return `
      <g>
        <rect x="${fixed ? 96 : 150 + index * 48}" y="${y - 42}" width="${fixed ? 590 : 470}" height="58" rx="29" fill="#0A0E16" fill-opacity=".56"/>
        <text x="${fixed ? 118 : 172 + index * 48}" y="${y - 5}" fill="${row[2]}" font-family="Segoe UI, Arial, sans-serif" font-size="29" font-weight="700">${escapeXml(row[1])}</text>
        ${row[0] ? `<text x="96" y="${y + 42}" fill="#96A7B4" font-family="Segoe UI, Arial, sans-serif" font-size="16">${escapeXml(row[0])}</text>` : ''}
      </g>`;
  }).join('');
  return `
  <svg xmlns="http://www.w3.org/2000/svg" width="1280" height="800">
    <defs>
      <linearGradient id="page" x1="0" y1="0" x2="1280" y2="800"><stop stop-color="#0A0D14"/><stop offset="1" stop-color="#17142D"/></linearGradient>
      <linearGradient id="video" x1="60" y1="130" x2="920" y2="680"><stop stop-color="#213B52"/><stop offset=".48" stop-color="#182437"/><stop offset="1" stop-color="#322754"/></linearGradient>
      <radialGradient id="light"><stop stop-color="#00F0FF" stop-opacity=".2"/><stop offset="1" stop-color="#00F0FF" stop-opacity="0"/></radialGradient>
    </defs>
    <rect width="1280" height="800" fill="url(#page)"/>
    <circle cx="1060" cy="50" r="430" fill="url(#light)"/>
    <image href="data:image/svg+xml;base64,${iconSvg.toString('base64')}" x="48" y="34" width="58" height="58"/>
    <text x="122" y="73" fill="#F7FAFF" font-family="Segoe UI, Arial, sans-serif" font-size="29" font-weight="800">KomeFlow</text>
    <text x="48" y="128" fill="#F7FAFF" font-family="Segoe UI, Arial, sans-serif" font-size="42" font-weight="800">${title}</text>
    <text x="48" y="166" fill="#91A3B0" font-family="Segoe UI, Arial, sans-serif" font-size="19">${subtitle}</text>
    <rect x="48" y="198" width="864" height="520" rx="18" fill="url(#video)" stroke="#34465B"/>
    <circle cx="760" cy="300" r="250" fill="url(#light)"/>
    <path d="M48 666h864" stroke="#64778A" stroke-opacity=".65"/>
    <path d="M72 688h770" stroke="#47586A" stroke-width="5" stroke-linecap="round"/>
    <path d="M72 688h${fixed ? 390 : 730}" stroke="#00F0FF" stroke-width="5" stroke-linecap="round"/>
    <circle cx="${fixed ? 390 : 730}" cy="688" r="9" fill="#00F0FF"/>
    ${comments}
    <rect x="940" y="198" width="292" height="520" rx="18" fill="#101621" stroke="#2D3A49"/>
    <text x="968" y="240" fill="#F7FAFF" font-family="Segoe UI, Arial, sans-serif" font-size="22" font-weight="800">KomeFlow settings</text>
    ${[
      ['Display mode', fixed ? 'Flow' : 'Flow'],
      ['Comments', '20'],
      ['Font size', '42 px'],
      ['Display area', '100%'],
      ['DVR sync', fixed ? 'ON' : 'OFF']
    ].map((row, i) => `
      <text x="968" y="${292 + i * 72}" fill="#8596A3" font-family="Segoe UI, Arial, sans-serif" font-size="15">${row[0]}</text>
      <rect x="968" y="${306 + i * 72}" width="236" height="32" rx="8" fill="#192231"/>
      <text x="982" y="${328 + i * 72}" fill="#E8EEF4" font-family="Segoe UI, Arial, sans-serif" font-size="15">${row[1]}</text>
    `).join('')}
    <text x="48" y="766" fill="#667886" font-family="Segoe UI, Arial, sans-serif" font-size="15">Independent extension. Not affiliated with YouTube or Google LLC.</text>
  </svg>`;
}

await sharp(Buffer.from(screenshotSvg('flow')))
  .png({ compressionLevel: 9 })
  .toFile(path.join(root, 'store-assets', 'screenshot-flow-1280x800.png'));
await sharp(Buffer.from(screenshotSvg('dvr')))
  .png({ compressionLevel: 9 })
  .toFile(path.join(root, 'store-assets', 'screenshot-dvr-1280x800.png'));

console.log('KomeFlow icon and store assets generated.');
