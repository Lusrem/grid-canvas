// 等待页面完全加载后再执行，彻底避免找不到 canvas
document.addEventListener('DOMContentLoaded', () => {
  // 1. 初始化画布（绝对能拿到 canvas，不会是 null）
  const canvas = document.getElementById('canvas');
  if (!canvas) {
    alert('Canvas 元素未找到！');
    return;
  }
  const ctx = canvas.getContext('2d');
  const GRID_SIZE = 2000;
  let cellSize = 4;
  let scale = 1;
  let currentColor = '#ff0000';

  // 初始化画布尺寸
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;

  // 2. 基础功能：缩放、颜色选择
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

  // 3. 核心绘制：只画可见区域（性能拉满，绝对不卡）
  function drawGrid() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.save();
    ctx.scale(scale, scale);

    // 只画屏幕内的网格，避免循环400万次
    const visibleWidth = canvas.width / scale;
    const visibleHeight = canvas.height / scale;
    const startX = Math.max(0, Math.floor(0 / cellSize));
    const endX = Math.min(GRID_SIZE, Math.ceil(visibleWidth / cellSize));
    const startY = Math.max(0, Math.floor(0 / cellSize));
    const endY = Math.min(GRID_SIZE, Math.ceil(visibleHeight / cellSize));

    ctx.strokeStyle = '#333';
    ctx.lineWidth = 0.3;
    for (let x = startX; x < endX; x++) {
      ctx.beginPath();
      ctx.moveTo(x * cellSize, 0);
      ctx.lineTo(x * cellSize, visibleHeight);
      ctx.stroke();
    }
    for (let y = startY; y < endY; y++) {
      ctx.beginPath();
      ctx.moveTo(0, y * cellSize);
      ctx.lineTo(visibleWidth, y * cellSize);
      ctx.stroke();
    }

    ctx.restore();
  }

  // 4. 窗口自适应
  window.onresize = () => {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    drawGrid();
  };

  // 5. 初始化绘制
  drawGrid();
});
