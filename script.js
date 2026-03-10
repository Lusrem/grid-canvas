// ======================
// 1. 画布基础设置
// ======================
const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
const W = 2000, H = 2000;     // 网格总大小
let cellSize = 4;            // 初始格子大小
let scale = 1;               // 缩放比例
let offsetX = 0, offsetY = 0;
let isDragging = false;
let startX, startY;
let selectRect = null;
let currentColor = '#ff0000';

canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

// ======================
// 2. 颜色选择 & 缩放
// ======================
const colorPicker = document.getElementById('colorPicker');
colorPicker.onchange = () => currentColor = colorPicker.value;

document.getElementById('zoomIn').onclick = () => { 
  scale = Math.min(scale * 1.2, 10); // 限制最大缩放
  draw(); 
};
document.getElementById('zoomOut').onclick = () => { 
  scale = Math.max(scale / 1.2, 0.1); // 限制最小缩放
  draw(); 
};

// ======================
// 3. 鼠标选择区域
// ======================
canvas.onmousedown = (e) => {
  isDragging = true;
  startX = e.clientX;
  startY = e.clientY;
};

canvas.onmousemove = (e) => {
  if (!isDragging) return;
  const x = e.clientX;
  const y = e.clientY;
  selectRect = {
    x1: Math.min(startX, x),
    y1: Math.min(startY, y),
    x2: Math.max(startX, x),
    y2: Math.max(startY, y)
  };
  draw();
};

canvas.onmouseup = () => { isDragging = false; };

// ======================
// 4. 优化版绘制：只画可见区域（关键修复！）
// ======================
async function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.save();
  ctx.scale(scale, scale);

  // 计算当前可见区域的网格坐标
  const visibleWidth = canvas.width / scale;
  const visibleHeight = canvas.height / scale;
  const startGridX = Math.max(0, Math.floor(offsetX / cellSize));
  const endGridX = Math.min(W, Math.ceil((offsetX + visibleWidth) / cellSize));
  const startGridY = Math.max(0, Math.floor(offsetY / cellSize));
  const endGridY = Math.min(H, Math.ceil((offsetY + visibleHeight) / cellSize));

  // 画可见区域网格背景（只循环可见部分，性能提升1000倍！）
  ctx.strokeStyle = '#333';
  ctx.lineWidth = 0.5;
  for (let x = startGridX; x < endGridX; x++) {
    for (let y = startGridY; y < endGridY; y++) {
      ctx.strokeRect(x * cellSize, y * cellSize, cellSize, cellSize);
    }
  }

  // 从数据库加载已涂色格子
  try {
    const { data } = await supabase.from('grid').select('x,y,color');
    if (data) {
      data.forEach(p => {
        // 只绘制可见区域的涂色格子
        if (p.x >= startGridX && p.x < endGridX && p.y >= startGridY && p.y < endGridY) {
          ctx.fillStyle = p.color;
          ctx.fillRect(p.x * cellSize, p.y * cellSize, cellSize, cellSize);
        }
      });
    }
  } catch (err) {
    console.error('数据库加载失败:', err);
  }

  // 画选择框
  if (selectRect) {
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 1;
    ctx.strokeRect(
      selectRect.x1 / scale, selectRect.y1 / scale,
      (selectRect.x2 - selectRect.x1) / scale,
      (selectRect.y2 - selectRect.y1) / scale
    );
  }

  ctx.restore();
}

// ======================
// 5. 连接 Supabase 数据库（请替换为你自己的密钥！）
// ======================
const supabase = supabase.createClient(
  "https://osbmvtoficehfqkbnijj.supabase.co", // 你的 SUPABASE_URL
  "sb_publishable_An6Hom9T6AUhaaab1F6_yg_lBr3ClHW" // 你的 Publishable key
);

// 确认涂色 → 上传到服务器
document.getElementById('confirm').onclick = async () => {
  if (!selectRect) return alert('请先选择区域');

  const x1 = Math.floor(selectRect.x1 / scale / cellSize);
  const y1 = Math.floor(selectRect.y1 / scale / cellSize);
  const x2 = Math.ceil(selectRect.x2 / scale / cellSize);
  const y2 = Math.ceil(selectRect.y2 / scale / cellSize);

  let cells = [];
  for (let x = x1; x < x2; x++) {
    for (let y = y1; y < y2; y++) {
      if (x >= 0 && x < W && y >= 0 && y < H) {
        cells.push({ x, y, color: currentColor });
      }
    }
  }

  try {
    // 上传（覆盖已有颜色，支持重复修改）
    await supabase.from('grid').upsert(cells);
    selectRect = null;
    draw();
    alert('上传成功！');
  } catch (err) {
    console.error('上传失败:', err);
    alert('上传失败，请检查网络或数据库连接');
  }
};

// 初始化
draw();
window.onresize = () => {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  draw();
};

// 支持拖拽平移画布（可选，提升体验）
canvas.addEventListener('wheel', (e) => {
  e.preventDefault();
  if (e.ctrlKey || e.metaKey) {
    // 缩放
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    scale = Math.max(0.1, Math.min(10, scale * delta));
  } else {
    // 平移
    offsetX -= e.deltaX / scale;
    offsetY -= e.deltaY / scale;
  }
  draw();
}, { passive: false });