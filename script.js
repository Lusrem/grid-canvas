document.addEventListener('DOMContentLoaded', () => {
  // 1. 初始化画布（绝对稳定）
  const canvas = document.getElementById('canvas');
  const ctx = canvas.getContext('2d');
  const GRID_SIZE = 2000;
  let cellSize = 4;
  let scale = 1;
  let currentColor = '#ff0000';
  let isSelecting = false;
  let selectStart = { x: 0, y: 0 };
  let selectEnd = { x: 0, y: 0 };
  let tempCells = []; // 临时存涂色，先不存数据库

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

  // 3. 鼠标交互：框选涂色（纯前端，先不连数据库）
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

  canvas.onmouseup = () => {
    isSelecting = false;
    drawGrid();
  };

  // 确认涂色（先存到临时数组，页面刷新会消失，先测试交互）
  document.getElementById('confirm').onclick = () => {
    const x1 = Math.max(0, Math.min(selectStart.x, selectEnd.x));
    const y1 = Math.max(0, Math.min(selectStart.y, selectEnd.y));
    const x2 = Math.min(GRID_SIZE, Math.max(selectStart.x, selectEnd.x));
    const y2 = Math.min(GRID_SIZE, Math.max(selectStart.y, selectEnd.y));

    if (x1 === x2 || y1 === y2) {
      alert('请先框选要涂色的区域！');
      return;
    }

    // 把涂色区域存到临时数组
    for (let x = x1; x < x2; x++) {
      for (let y = y1; y < y2; y++) {
        tempCells.push({ x, y, color: currentColor });
      }
    }
    drawGrid();
    alert('临时涂色成功！刷新页面会消失，下一步我们连数据库永久保存');
  };

  // 滚轮缩放
  canvas.addEventListener('wheel', (e) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -0.1 : 0.1;
    scale = Math.max(0.2, Math.min(8, scale + delta));
    drawGrid();
  }, { passive: false });

  // 4. 核心绘制：网格 + 临时涂色 + 选择框
  function drawGrid() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.save();
    ctx.scale(scale, scale);

    // 可见区域计算
    const visibleWidth = canvas.width / scale;
    const visibleHeight = canvas.height / scale;
    const startX = Math.max(0, Math.floor(0 / cellSize));
    const endX = Math.min(GRID_SIZE, Math.ceil(visibleWidth / cellSize));
    const startY = Math.max(0, Math.floor(0 / cellSize));
    const endY = Math.min(GRID_SIZE, Math.ceil(visibleHeight / cellSize));

    // 画网格线
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

    // 画临时涂色区域（页面刷新前都在）
    tempCells.forEach(p => {
      if (p.x >= startX && p.x < endX && p.y >= startY && p.y < endY) {
        ctx.fillStyle = p.color;
        ctx.fillRect(p.x * cellSize, p.y * cellSize, cellSize, cellSize);
      }
    });

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

  // 5. 鼠标坐标 → 网格坐标 转换
  function getGridPos(clientX, clientY) {
    const rect = canvas.getBoundingClientRect();
    const x = Math.max(0, Math.min(GRID_SIZE - 1, Math.floor((clientX - rect.left) / (cellSize * scale))));
    const y = Math.max(0, Math.min(GRID_SIZE - 1, Math.floor((clientY - rect.top) / (cellSize * scale))));
    return { x, y };
  }

  // 6. 窗口自适应
  window.onresize = () => {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    drawGrid();
  };

  // 初始化
  drawGrid();
});
