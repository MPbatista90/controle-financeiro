const { createCanvas } = require('canvas');
const fs = require('fs');
const path = require('path');

const sizes = [72, 96, 128, 144, 152, 192, 384, 512];
const faviconSizes = [16, 32];
const outDir = path.join(__dirname, '..', 'icons');

if (!fs.existsSync(outDir)) {
  fs.mkdirSync(outDir, { recursive: true });
}

function drawMotorcycle(ctx, w, h) {
  const s = w / 512;
  ctx.save();
  ctx.translate(w * 0.5, h * 0.55);
  ctx.scale(s, s);

  // Body
  ctx.fillStyle = 'rgba(255,255,255,0.95)';
  ctx.beginPath();
  ctx.ellipse(0, 0, 180, 70, 0, 0, Math.PI * 2);
  ctx.fill();

  // Wheels
  ctx.strokeStyle = 'rgba(255,255,255,0.9)';
  ctx.lineWidth = 8;
  ctx.beginPath();
  ctx.arc(-160, 0, 55, 0, Math.PI * 2);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(160, 0, 55, 0, Math.PI * 2);
  ctx.stroke();

  ctx.fillStyle = 'rgba(255,255,255,0.9)';
  ctx.beginPath();
  ctx.arc(-160, 0, 15, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(160, 0, 15, 0, Math.PI * 2);
  ctx.fill();

  // Handlebar
  ctx.strokeStyle = 'rgba(255,255,255,0.9)';
  ctx.lineWidth = 8;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(-80, -40);
  ctx.quadraticCurveTo(-100, -80, -60, -90);
  ctx.stroke();

  // Seat
  ctx.fillStyle = 'rgba(255,255,255,0.9)';
  ctx.beginPath();
  ctx.ellipse(-20, -25, 40, 12, 0, 0, Math.PI * 2);
  ctx.fill();

  // Exhaust
  ctx.fillStyle = 'rgba(255,255,255,0.8)';
  roundRect(ctx, 100, 10, 60, 12, 6);
  ctx.fill();

  ctx.restore();

  // Fuel drop
  ctx.save();
  ctx.translate(w * 0.74, h * 0.23);
  ctx.scale(s, s);
  ctx.fillStyle = 'rgba(255,255,255,0.9)';
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.quadraticCurveTo(-20, 20, -20, 40);
  ctx.arc(0, 40, 20, Math.PI, 0);
  ctx.quadraticCurveTo(20, 20, 0, 0);
  ctx.fill();
  ctx.restore();
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

async function generateIcons() {
  console.log('Generating icons...');

  for (const size of sizes) {
    const canvas = createCanvas(size, size);
    const ctx = canvas.getContext('2d');

    // Background
    const gradient = ctx.createLinearGradient(0, 0, size, size);
    gradient.addColorStop(0, '#1a6dff');
    gradient.addColorStop(1, '#0d47a1');
    ctx.fillStyle = gradient;

    const radius = size * 0.15;
    ctx.beginPath();
    ctx.moveTo(radius, 0);
    ctx.lineTo(size - radius, 0);
    ctx.quadraticCurveTo(size, 0, size, radius);
    ctx.lineTo(size, size - radius);
    ctx.quadraticCurveTo(size, size, size - radius, size);
    ctx.lineTo(radius, size);
    ctx.quadraticCurveTo(0, size, 0, size - radius);
    ctx.lineTo(0, radius);
    ctx.quadraticCurveTo(0, 0, radius, 0);
    ctx.closePath();
    ctx.fill();

    drawMotorcycle(ctx, size, size);

    const buffer = canvas.toBuffer('image/png');
    const filePath = path.join(outDir, `icon-${size}.png`);
    fs.writeFileSync(filePath, buffer);
    console.log(`✓ icon-${size}.png (${size}x${size})`);
  }

  // Favicons
  for (const size of faviconSizes) {
    const canvas = createCanvas(size, size);
    const ctx = canvas.getContext('2d');

    const gradient = ctx.createLinearGradient(0, 0, size, size);
    gradient.addColorStop(0, '#1a6dff');
    gradient.addColorStop(1, '#0d47a1');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, size, size);

    // Simple motorcycle silhouette for small sizes
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(size * 0.5, size * 0.55, size * 0.15, 0, Math.PI * 2);
    ctx.fill();

    const buffer = canvas.toBuffer('image/png');
    const filePath = path.join(outDir, `favicon-${size}.png`);
    fs.writeFileSync(filePath, buffer);
    console.log(`✓ favicon-${size}.png (${size}x${size})`);
  }

  // Copy favicon-32.png as favicon.ico
  const favicon32 = fs.readFileSync(path.join(outDir, 'favicon-32.png'));
  fs.writeFileSync(path.join(outDir, '..', 'favicon.ico'), favicon32);
  console.log('✓ favicon.ico');

  console.log('\nAll icons generated successfully!');
}

generateIcons().catch(console.error);
