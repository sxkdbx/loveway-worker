// 图形验证码：原 PHP 版本用 GD 绘制 60x30 的 PNG，
// Workers 没有 GD，这里用 SVG 绘制同样布局：白底、4 位数字、噪点、干扰线。

function randInt(min: number, max: number): number {
  return Math.floor(min + Math.random() * (max - min + 1));
}

export function generateCode(): string {
  return String(randInt(1000, 9999));
}

export function renderCaptchaSVG(code: string): string {
  // 100 个噪点（黑/绿），对应原 imagecolorallocate + imagesetpixel
  let pixels = '';
  for (let i = 0; i < 100; i++) {
    const x = randInt(0, 59);
    const y = randInt(0, 29);
    const fill = Math.random() < 0.5 ? '#000000' : '#00ff00';
    pixels += `<rect x="${x}" y="${y}" width="1" height="1" fill="${fill}"/>`;
  }

  // 几条干扰线
  let lines = '';
  for (let i = 0; i < 3; i++) {
    lines +=
      `<line x1="${randInt(0, 20)}" y1="${randInt(0, 30)}" ` +
      `x2="${randInt(40, 60)}" y2="${randInt(0, 30)}" ` +
      `stroke="${Math.random() < 0.5 ? '#000000' : '#00ff00'}" stroke-width="1" opacity="0.6"/>`;
  }

  // 4 个数字，逐个轻微旋转、上下偏移
  let chars = '';
  const xs = [9, 21, 33, 45];
  for (let i = 0; i < 4; i++) {
    const y = randInt(18, 23);
    const rotate = randInt(-15, 15);
    chars +=
      `<text x="${xs[i]}" y="${y}" font-family="monospace" font-size="16" ` +
      `font-weight="bold" fill="#000000" transform="rotate(${rotate} ${xs[i]} ${y})">${code[i]}</text>`;
  }

  return (
    `<svg xmlns="http://www.w3.org/2000/svg" width="60" height="30" viewBox="0 0 60 30">` +
    `<rect width="60" height="30" fill="#ffffff"/>${lines}${pixels}${chars}</svg>`
  );
}
