// 极简版：只画网格，不带任何数据库，彻底避免变量冲突
const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
const GRID_SIZE = 2000;
let cellSize = 4;
let scale = 1;
let currentColor = '#ff0000';

// 初始化画布
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

// 缩放按钮
document.getElementById('zoomIn').onclick = () => {
  scale = Math.min(scale * 1.2, 8);
  draw();
};
document.getElementById('zoomOut').onclick = () => {
  scale = Math.max(scale / 1.2, 0.2);
  draw();
};

// 颜色选择
document.getElementById('colorPicker').onchange = (e) => {
  currentColor = e.target.value;
};

// 画网格（只画前100x100，确保能看到）
function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.scale(scale, scale);
  
  ctx.strokeStyle = '#333';
  ctx.lineWidth = 0.3;
  for (let x = 0; x < 100; x++) {
    for (let y = 0; y < 100; y++) {
      ctx.strokeRect(x * cellSize, y * cellSize, cellSize, cellSize);
    }
  }
}

// 窗口自适应
window.onresize = () => {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  draw();
};

// 初始化
draw();
