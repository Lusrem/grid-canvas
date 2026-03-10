// ======================
// 全局变量（只声明一次，彻底避免重复）
// ======================
const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
const W = 2000;
const H = 2000;
let cellSize = 4;
let scale = 1;
let offsetX = 0;
let offsetY = 0;
let isDragging = false;
let startX = 0;
let startY = 0;
let selectRect = null;
let currentColor = '#ff0000';

// 初始化画布尺寸
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

// ======================
// 1. 基础功能：颜色选择、缩放
// ======================
document.getElementById('zoomIn').onclick = () => {
  scale = Math.min(scale * 1.2, 10);
  draw();
};

document.getElementById('zoomOut').onclick = () => {
  scale = Math.max(scale / 1.2, 0.1);
  draw();
};

document.getElementById('colorPicker').onchange = (e) => {
  currentColor = e.target.value;
};

// ======================
// 2. 鼠标操作：多选、拖拽平移
// ======================
canvas.onmousedown = (e) => {
  // 左键：多选，右键：拖拽平移（可选）
  if (e.button === 0) {
    isDragging = true;
    startX = e.clientX;
    startY = e.clientY;
    selectRect = { x1: startX, y1: startY, x2: startX, y2: startY };
  }
};

canvas.onmousemove = (e) => {
  if (!isDragging) return;
  selectRect.x2 = e.clientX;
  selectRect.y2 = e.clientY;
  draw();
};

canvas.onmouseup = (e) => {
  if (e.button === 0) isDragging = false;
};

// 滚轮缩放+平移
canvas.addEventListener('wheel', (e) => {
  e.preventDefault();
  if (e.ctrlKey) {
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    scale = Math.max(0.1, Math.min(10, scale * delta));
  } else {
    offsetX -= e.deltaX / scale;
    offsetY -= e.deltaY / scale;
  }
  draw();
}, { passive: false });

// ======================
// 3. 核心绘制：只画可见区域（性能拉满）
// ======================
async function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.save();
  ctx.scale(scale, scale);
  ctx.translate(offsetX, offsetY);

  // 计算可见区域的网格范围
  const startX = Math.max(0, Math.floor(-offsetX / cellSize));
  const endX = Math.min(W, Math.ceil((-offsetX + canvas.width / scale) / cellSize));
  const startY = Math.max(0, Math.floor(-offsetY / cellSize));
  const endY = Math.min(H, Math.ceil((-offsetY + canvas.height / scale) / cellSize));

  // 画网格
  ctx.strokeStyle = '#333';
  ctx.lineWidth = 0.5;
  for (let x = startX; x < endX; x++) {
    ctx.beginPath();
    ctx.moveTo(x * cellSize, startY * cellSize);
    ctx.lineTo(x * cellSize, endY * cellSize);
    ctx.stroke();
  }
  for (let y = startY; y < endY; y++) {
    ctx.beginPath();
    ctx.moveTo(startX * cellSize, y * cellSize);
    ctx.lineTo(endX * cellSize, y * cellSize);
    ctx.stroke();
  }

  // 加载数据库涂色
  try {
    const { data } = await supabase.from('grid').select('x,y,color');
    if (data) {
      data.forEach(p => {
        if (p.x >= startX && p.x < endX && p.y >= startY && p.y < endY) {
          ctx.fillStyle = p.color;
          ctx.fillRect(p.x * cellSize, p.y * cellSize, cellSize, cellSize);
        }
      });
    }
  } catch (err) {
    console.log('数据库加载中...');
  }

  // 画选择框
  if (selectRect && isDragging) {
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 1;
    ctx.strokeRect(
      selectRect.x1,
      selectRect.y1,
      selectRect.x2 - selectRect.x1,
      selectRect.y2 - selectRect.y1
    );
  }

  ctx.restore();
}

// ======================
// 4. 数据库连接（替换成你的密钥！）
// ======================
const supabase = window.supabase.createClient(
  "https://osbmvtoficehfqkbnijj.supabase.co", // 你的 Project URL
  "sb_publishable_An6Hom9T6AUhaaab1F6_yg_lBr3ClHW" // 你的 Publishable key
);

// 确认涂色
document.getElementById('confirm').onclick = async () => {
  if (!selectRect || (selectRect.x1 === selectRect.x2 && selectRect.y1 === selectRect.y2)) {
    return alert('请先框选要涂色的区域！');
  }

  // 转换为网格坐标
  const x1 = Math.max(0, Math.floor(selectRect.x1 / cellSize - offsetX));
  const y1 = Math.max(0, Math.floor(selectRect.y1 / cellSize - offsetY));
  const x2 = Math.min(W, Math.ceil(selectRect.x2 / cellSize - offsetX));
  const y2 = Math.min(H, Math.ceil(selectRect.y2 / cellSize - offsetY));

  const cells = [];
  for (let x = x1; x < x2; x++) {
    for (let y = y1; y < y2; y++) {
      cells.push({ x, y, color: currentColor });
    }
  }

  try {
    await supabase.from('grid').upsert(cells);
    selectRect = null;
    draw();
    alert('涂色成功！');
  } catch (err) {
    alert('上传失败：' + err.message);
  }
};

// 窗口大小自适应
window.onresize = () => {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  draw();
};

// 初始化
draw();