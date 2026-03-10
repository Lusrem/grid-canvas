document.addEventListener('DOMContentLoaded', () => {
  // 1. 核心变量（新增平移偏移量）
  const canvas = document.getElementById('canvas');
  const ctx = canvas.getContext('2d');
  const GRID_SIZE = 2000;
  let cellSize = 4;
  let scale = 1;
  let currentColor = '#ff0000';
  let isDrawing = false; // 鼠标/手指按下状态
  let panOffsetX = 0;    // 画布平移X
  let panOffsetY = 0;    // 画布平移Y
  let lastGridPos = null;// 上一个划过的格子（避免重复选中）
  let selectedPath = []; // 路径式选中的格子列表
  let gridCells = [];    // 数据库永久涂色

  // 初始化画布（适配窗口大小）
  function initCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  }
  initCanvas();

  // 2. 基础功能：缩放 + 平移按钮
  document.getElementById('zoomIn').onclick = () => {
    scale = Math.min(scale * 1.2, 8);
    drawGrid();
  };
  document.getElementById('zoomOut').onclick = () => {
    scale = Math.max(scale / 1.2, 0.2);
    drawGrid();
  };

  // 上下左右平移按钮（每次移动20px）
  const panStep = 20;
  document.getElementById('moveUp').onclick = () => {
    panOffsetY += panStep / scale;
    drawGrid();
  };
  document.getElementById('moveDown').onclick = () => {
    panOffsetY -= panStep / scale;
    drawGrid();
  };
  document.getElementById('moveLeft').onclick = () => {
    panOffsetX += panStep / scale;
    drawGrid();
  };
  document.getElementById('moveRight').onclick = () => {
    panOffsetX -= panStep / scale;
    drawGrid();
  };

  // 颜色选择
  document.getElementById('colorPicker').onchange = (e) => {
    currentColor = e.target.value;
  };

  // 3. 核心交互：路径式选中（鼠标+移动端触摸）
  // --- PC端鼠标事件 ---
  canvas.onmousedown = (e) => {
    if (e.button !== 0) return; // 只响应左键
    startDrawing(e.clientX, e.clientY);
  };
  canvas.onmousemove = (e) => {
    if (!isDrawing) return;
    updatePath(e.clientX, e.clientY);
  };
  canvas.onmouseup = stopDrawing;
  canvas.onmouseleave = stopDrawing;

  // --- 移动端触摸事件 ---
  canvas.ontouchstart = (e) => {
    e.preventDefault(); // 禁用默认滚动
    const touch = e.touches[0];
    startDrawing(touch.clientX, touch.clientY);
  };
  canvas.ontouchmove = (e) => {
    e.preventDefault();
    if (!isDrawing) return;
    const touch = e.touches[0];
    updatePath(touch.clientX, touch.clientY);
  };
  canvas.ontouchend = stopDrawing;
  canvas.ontouchcancel = stopDrawing;

  // 开始绘制（鼠标/触摸按下）
  function startDrawing(clientX, clientY) {
    isDrawing = true;
    selectedPath = []; // 清空历史路径
    lastGridPos = null;
    // 记录第一个格子
    const gridPos = getGridPos(clientX, clientY);
    addToPath(gridPos);
    drawGrid();
  }

  // 更新路径（鼠标/触摸移动）
  function updatePath(clientX, clientY) {
    const gridPos = getGridPos(clientX, clientY);
    // 只有移动到新格子才添加（避免重复）
    if (!lastGridPos || gridPos.x !== lastGridPos.x || gridPos.y !== lastGridPos.y) {
      addToPath(gridPos);
      lastGridPos = gridPos;
      drawGrid();
    }
  }

  // 停止绘制（鼠标/触摸松开）
  function stopDrawing() {
    if (!isDrawing) return;
    isDrawing = false;
    lastGridPos = null;
    // 自动上传路径涂色
    uploadPathToDB();
    drawGrid();
  }

  // 添加格子到路径（去重）
  function addToPath(gridPos) {
    // 检查是否已在路径中，避免重复
    const isExist = selectedPath.some(p => p.x === gridPos.x && p.y === gridPos.y);
    if (!isExist) {
      selectedPath.push(gridPos);
    }
  }

  // 确认涂色按钮（手动触发）
  document.getElementById('confirm').onclick = async () => {
    if (selectedPath.length === 0) {
      alert('请先划过要涂色的格子！');
      return;
    }
    await uploadPathToDB();
    alert(`成功涂色 ${selectedPath.length} 个格子！`);
    selectedPath = [];
    drawGrid();
  };

  // 4. 画布平移：鼠标右键/滚轮平移（PC端）
  let isPanning = false;
  let panStartX = 0;
  let panStartY = 0;

  canvas.oncontextmenu = (e) => e.preventDefault(); // 禁用右键菜单
  canvas.onmousedown = (e) => {
    if (e.button === 2) { // 右键平移
      isPanning = true;
      panStartX = e.clientX;
      panStartY = e.clientY;
    } else if (e.button === 0) { // 左键绘制
      startDrawing(e.clientX, e.clientY);
    }
  };
  canvas.onmousemove = (e) => {
    if (isPanning) {
      // 计算平移偏移
      panOffsetX += (e.clientX - panStartX) / scale;
      panOffsetY += (e.clientY - panStartY) / scale;
      panStartX = e.clientX;
      panStartY = e.clientY;
      drawGrid();
    } else if (isDrawing) {
      updatePath(e.clientX, e.clientY);
    }
  };
  canvas.onmouseup = (e) => {
    if (e.button === 2) {
      isPanning = false;
    } else if (e.button === 0) {
      stopDrawing();
    }
  };

  // 滚轮缩放（中心缩放）
  canvas.addEventListener('wheel', (e) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    // 以鼠标位置为中心缩放
    const mouseX = e.clientX;
    const mouseY = e.clientY;
    const gridX = (mouseX / scale) - panOffsetX;
    const gridY = (mouseY / scale) - panOffsetY;
    
    scale = Math.max(0.2, Math.min(8, scale * delta));
    
    // 调整平移，保持鼠标位置不变
    panOffsetX = (mouseX / scale) - gridX;
    panOffsetY = (mouseY / scale) - gridY;
    
    drawGrid();
  }, { passive: false });

  // 5. 核心绘制：路径高亮 + 平移画布 + 白色背景
  function drawGrid() {
    // 白色背景清空
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.save();
    // 缩放 + 平移画布
    ctx.scale(scale, scale);
    ctx.translate(panOffsetX, panOffsetY);

    // 计算可见区域（适配平移）
    const visibleLeft = Math.max(0, Math.floor(-panOffsetX / cellSize));
    const visibleRight = Math.min(GRID_SIZE, Math.ceil((-panOffsetX + canvas.width / scale) / cellSize));
    const visibleTop = Math.max(0, Math.floor(-panOffsetY / cellSize));
    const visibleBottom = Math.min(GRID_SIZE, Math.ceil((-panOffsetY + canvas.height / scale) / cellSize));

    // 画深灰色网格线（适配白色背景）
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

    // 画数据库永久涂色
    gridCells.forEach(p => {
      if (p.x >= visibleLeft && p.x < visibleRight && p.y >= visibleTop && p.y < visibleBottom) {
        ctx.fillStyle = p.color;
        ctx.fillRect(p.x * cellSize, p.y * cellSize, cellSize, cellSize);
      }
    });

    // 路径式选中提示：半透明高亮 + 白色边框
    selectedPath.forEach(p => {
      if (p.x >= visibleLeft && p.x < visibleRight && p.y >= visibleTop && p.y < visibleBottom) {
        // 半透明底色（当前选的颜色）
        ctx.fillStyle = `${currentColor}40`;
        ctx.fillRect(p.x * cellSize, p.y * cellSize, cellSize, cellSize);
        // 白色边框，更醒目
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 0.5;
        ctx.strokeRect(p.x * cellSize, p.y * cellSize, cellSize, cellSize);
      }
    });

    ctx.restore();
  }

  // 6. 数据库连接（已填你的密钥）
  const supabaseClient = window.supabase.createClient(
    "https://osbmvtoficehfqkbnijj.supabase.co",
    "sb_publishable_An6Hom9T6AUhaaab1F6_yg_lBr3ClHW"
  );

  // 加载数据库涂色数据
  async function loadGridCells() {
    try {
      const { data } = await supabaseClient.from('grid').select('x,y,color');
      gridCells = data || [];
    } catch (err) {
      console.log('数据库加载中:', err);
      gridCells = [];
    }
  }

  // 上传路径到数据库
  async function uploadPathToDB() {
    if (selectedPath.length === 0) return;
    // 转换路径为数据库格式
    const cellsToUpload = selectedPath.map(p => ({
      x: p.x,
      y: p.y,
      color: currentColor
    }));
    try {
      await supabaseClient.from('grid').upsert(cellsToUpload);
      // 重新加载数据
      await loadGridCells();
    } catch (err) {
      alert('上传失败：' + err.message);
    }
  }

  // 转换鼠标/触摸坐标 → 网格坐标（适配平移）
  function getGridPos(clientX, clientY) {
    const rect = canvas.getBoundingClientRect();
    const x = Math.max(0, Math.min(GRID_SIZE - 1, 
      Math.floor((clientX - rect.left) / scale - panOffsetX) / cellSize
    ));
    const y = Math.max(0, Math.min(GRID_SIZE - 1, 
      Math.floor((clientY - rect.top) / scale - panOffsetY) / cellSize
    ));
    return { x: Math.floor(x), y: Math.floor(y) };
  }

  // 窗口自适应
  window.onresize = () => {
    initCanvas();
    drawGrid();
  };

  // 初始化
  loadGridCells().then(drawGrid);
});
