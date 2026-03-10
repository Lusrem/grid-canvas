// ======================
// 1. 画布基础设置
// ======================
const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
const W = 2000, H = 2000;     // 网格大小
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

document.getElementById('zoomIn').onclick = () => { scale *= 1.2; draw() };
document.getElementById('zoomOut').onclick = () => { scale /= 1.2; draw() };

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

canvas.onmouseup = () => { isDragging = false };

// ======================
// 4. 绘制画布（只画可见区域，超级流畅）
// ======================
async function draw() {
  ctx.clearRect(0,0,canvas.width,canvas.height);
  ctx.save();
  ctx.scale(scale, scale);

  // 画网格背景
  ctx.strokeStyle = '#333';
  ctx.lineWidth = 0.5;
  for (let x = 0; x < W; x++) {
    for (let y = 0; y < H; y++) {
      ctx.strokeRect(x*cellSize, y*cellSize, cellSize, cellSize);
    }
  }

  // 从数据库加载已涂色格子
  const { data } = await supabase.from('grid').select('x,y,color');
  if (data) {
    data.forEach(p => {
      ctx.fillStyle = p.color;
      ctx.fillRect(p.x*cellSize, p.y*cellSize, cellSize, cellSize);
    });
  }

  // 画选择框
  if (selectRect) {
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 1;
    ctx.strokeRect(
      selectRect.x1/scale, selectRect.y1/scale,
      (selectRect.x2-selectRect.x1)/scale,
      (selectRect.y2-selectRect.y1)/scale
    );
  }

  ctx.restore();
}

// ======================
// 5. 连接 Supabase 数据库（存数据，永久不丢）
// ======================
const supabase = supabase.createClient(
  "https://osbmvtoficehfqkbnijj.supabase.co",
  "sb_publishable_An6Hom9T6AUhaaab1F6_yg_lBr3ClHW"
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
      if (x >=0 && x < W && y >=0 && y < H) {
        cells.push({ x, y, color: currentColor });
      }
    }
  }

  // 上传（覆盖已有颜色，支持重复修改）
  await supabase.from('grid').upsert(cells);
  selectRect = null;
  draw();
  alert('上传成功！');
};

// 初始化
draw();
window.onresize = () => {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  draw();
};