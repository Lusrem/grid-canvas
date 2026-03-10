// ======================
// 全局变量（无重复声明）
// ======================
const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
const GRID_SIZE = 2000;
let cellSize = 4;
let scale = 1;
let offsetX = 0;
let offsetY = 0;
let isSelecting = false;
let selectStart = { x: 0, y: 0 };
let selectEnd = { x: 0, y: 0 };
let currentColor = '#ff0000';

// 初始化画布
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

// ======================
// 基础功能：缩放、颜色选择
// ======================
document.getElementById('zoomIn').onclick = () => {
  scale = Math.min(scale * 1.2, 8);
  drawGrid();
};

document.getElementById('zoomOut').onclick = () => {
  scale = Math.max(scale / 1.2, 0.2);
  drawGrid();
};

document.getElementById('colorPicker').onchange = (e) => {
  currentColor = e.target.value;
};

// ======================
// 鼠标操作：框选涂色
// ======================
canvas.onmousedown = (e) => {
  isSelecting = true;
  selectStart = getGridPos(e.clientX, e.clientY);
  selectEnd = { ...selectStart };
  drawGrid();
};

canvas.onmousemove = (e) => {
  if (!isSelecting) return;
  selectEnd = getGridPos(e.clientX, e.clientY);
  drawGrid();
};

canvas.onmouseup = async () => {
  isSelecting = false;
  // 自动提交涂色（不用点确认，更流畅）
  await uploadGrid();
  drawGrid();
};

// 鼠标滚轮：缩放/平移
canvas.addEventListener('wheel', (e) => {
  e.preventDefault();
  const delta = e.deltaY > 0 ? -0.1 : 0.1;
  scale = Math.max(0.2, Math.min(8, scale + delta));
  drawGrid();
}, { passive: false });

// ======================
// 核心绘制：只渲染可见区域（性能拉满）
// ======================
async function drawGrid() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.save();
  ctx.scale(scale, scale);
  ctx.translate(offsetX, offsetY);

  // 计算可见网格范围
  const visibleLeft = Math.max(0, Math.floor(-offsetX / cellSize));
  const visibleRight = Math.min(GRID_SIZE, Math.ceil((-offsetX + canvas.width / scale) / cellSize));
  const visibleTop = Math.max(0, Math.floor(-offsetY / cellSize));
  const visibleBottom = Math.min(GRID_SIZE, Math.ceil((-offsetY + canvas.height / scale) / cellSize));

  // 画网格线
  ctx.strokeStyle = '#333';
  ctx.lineWidth = 0.3;
  for (let x = visibleLeft; x < visibleRight; x++) {
    ctx.beginPath();
    ctx.moveTo(x * cellSize, visibleTop * cellSize);
    ctx.lineTo(x * cellSize, visibleBottom * cellSize);
    ctx.stroke();
  }
  for (let y = visibleTop; y < visibleBottom; y++) {
    ctx.beginPath();
    ctx.moveTo(visibleLeft * cellSize, y * cellSize);
    ctx.lineTo(visibleRight * cellSize, y * cellSize);
    ctx.stroke();
  }

  // 加载数据库涂色
  try {
    const { data } = await window.supabase.from('grid').select('x,y,color');
    if (data) {
      data.forEach(p => {
        if (p.x >= visibleLeft && p.x < visibleRight && p.y >= visibleTop && p.y < visibleBottom) {
          ctx.fillStyle = p.color;
          ctx.fillRect(p.x * cellSize, p.y * cellSize, cellSize, cellSize);
        }
      });
    }
  } catch (err) { /* 静默失败，不影响渲染 */ }

  // 画选择框
  if (isSelecting) {
    const x1 = Math.min(selectStart.x, selectEnd.x);
    const y1 = Math.min(selectStart.y, selectEnd.y);
    const x2 = Math.max(selectStart.x, selectEnd.x);
    const y2 = Math.max(selectStart.y, selectEnd.y);
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 1;
    ctx.strokeRect(x1 * cellSize, y1 * cellSize, (x2 - x1) * cellSize, (y2 - y1) * cellSize);
  }

  ctx.restore();
}

// ======================
// 数据库连接：用 window.supabase，无重复声明
// ======================
const SupaClient = window.supabase.createClient(
  "https://osbmvtoficehfqkbnijj.supabase.co", //  替换成你的 Project URL
  "sb_publishable_An6Hom9T6AUhaaab1F6_yg_lBr3ClHW" //  替换成你的 Publishable key
);

// 上传涂色数据
async function uploadGrid() {
  const x1 = Math.max(0, Math.min(selectStart.x, selectEnd.x));
  const y1 = Math.max(0, Math.min(selectStart.y, selectEnd.y));
  const x2 = Math.min(GRID_SIZE, Math.max(selectStart.x, selectEnd.x));
  const y2 = Math.min(GRID_SIZE, Math.max(selectStart.y, selectEnd.y));

  if (x1 === x2 || y1 === y2) return;

  const cells = [];
  for (let x = x1; x < x2; x++) {
    for (let y = y1; y < y2; y++) {
      cells.push({ x, y, color: currentColor });
    }
  }

  try {
    await SupaClient.from('grid').upsert(cells);
  } catch (err) { }
}

// 转换鼠标坐标为网格坐标
function getGridPos(clientX, clientY) {
  const rect = canvas.getBoundingClientRect();
  const x = Math.max(0, Math.min(GRID_SIZE - 1, Math.floor((clientX - rect.left) / (cellSize * scale) - offsetX / cellSize)));
  const y = Math.max(0, Math.min(GRID_SIZE - 1, Math.floor((clientY - rect.top) / (cellSize * scale) - offsetY / cellSize)));
  return { x, y };
}

// 窗口大小自适应
window.onresize = () => {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  drawGrid();
};

// 初始化
drawGrid();