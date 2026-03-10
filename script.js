document.addEventListener('DOMContentLoaded', () => {
  // 1. 初始化画布
  const canvas = document.getElementById('canvas');
  const ctx = canvas.getContext('2d');
  const GRID_SIZE = 2000;
  let cellSize = 4;
  let scale = 1;
  let currentColor = '#ff0000';
  let isSelecting = false;
  let selectStart = { x: 0, y: 0 };
  let selectEnd = { x: 0, y: 0 };
  // 存数据库里的永久涂色
  let gridCells = [];
  // 存当前鼠标划过的临时选中区域（视觉提示用）
  let tempSelectedCells = [];

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

  // 3. 核心交互：鼠标按下+划动经过的区域自动选中
  canvas.onmousedown = (e) => {
    if (e.button !== 0) return; // 只响应左键
    isSelecting = true;
    selectStart = getGridPos(e.clientX, e.clientY);
    selectEnd = { ...selectStart };
    tempSelectedCells = []; // 清空临时选中
    drawGrid();
  };

  canvas.onmousemove = (e) => {
    if (!isSelecting) return;
    selectEnd = getGridPos(e.clientX, e.clientY);
    
    // 实时计算当前划过的网格区域（视觉提示用）
    const x1 = Math.min(selectStart.x, selectEnd.x);
    const y1 = Math.min(selectStart.y, selectEnd.y);
    const x2 = Math.max(selectStart.x, selectEnd.x);
    const y2 = Math.max(selectStart.y, selectEnd.y);
    
    tempSelectedCells = [];
    for (let x = x1; x <= x2; x++) {
      for (let y = y1; y <= y2; y++) {
        if (x >= 0 && x < GRID_SIZE && y >= 0 && y < GRID_SIZE) {
          tempSelectedCells.push({ x, y });
        }
      }
    }
    drawGrid();
  };

  canvas.onmouseup = async () => {
    if (!isSelecting) return;
    isSelecting = false;
    
    // 把临时选中的区域，合并到永久数组并上传数据库
    const x1 = Math.min(selectStart.x, selectEnd.x);
    const y1 = Math.min(selectStart.y, selectEnd.y);
    const x2 = Math.max(selectStart.x, selectEnd.x);
    const y2 = Math.max(selectStart.y, selectEnd.y);

    if (x1 === x2 || y1 === y2) return;

    // 生成涂色数据
    const cellsToUpload = [];
    for (let x = x1; x <= x2; x++) {
      for (let y = y1; y <= y2; y++) {
        if (x >= 0 && x < GRID_SIZE && y >= 0 && y < GRID_SIZE) {
          cellsToUpload.push({ x, y, color: currentColor });
        }
      }
    }

    // 上传到数据库
    await uploadGrid(cellsToUpload);
    // 重新加载数据
    await loadGridCells();
    drawGrid();
  };

  // 确认涂色（手动触发，兼容习惯）
  document.getElementById('confirm').onclick = async () => {
    if (tempSelectedCells.length === 0) {
      alert('请先框选要涂色的区域！');
      return;
    }
    await uploadGrid(tempSelectedCells.map(p => ({ x: p.x, y: p.y, color: currentColor })));
    await loadGridCells();
    drawGrid();
    alert('涂色成功！数据已永久保存');
  };

  // 滚轮缩放
  canvas.addEventListener('wheel', (e) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -0.1 : 0.1;
    scale = Math.max(0.2, Math.min(8, scale + delta));
    drawGrid();
  }, { passive: false });

  // 4. 核心绘制：白色背景 + 网格 + 永久涂色 + 选中提示
  function drawGrid() {
    // 🔴 白色背景清空
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.save();
    ctx.scale(scale, scale);

    // 计算可见区域
    const visibleWidth = canvas.width / scale;
    const visibleHeight = canvas.height / scale;
    const startX = Math.max(0, Math.floor(0 / cellSize));
    const endX = Math.min(GRID_SIZE, Math.ceil(visibleWidth / cellSize));
    const startY = Math.max(0, Math.floor(0 / cellSize));
    const endY = Math.min(GRID_SIZE, Math.ceil(visibleHeight / cellSize));

    // 画白色背景网格（深灰色网格线，适配白色背景）
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

    // 画数据库里的永久涂色
    gridCells.forEach(p => {
      if (p.x >= startX && p.x < endX && p.y >= startY && p.y < endY) {
        ctx.fillStyle = p.color;
        ctx.fillRect(p.x * cellSize, p.y * cellSize, cellSize, cellSize);
      }
    });

    // 🔴 视觉提示：画当前选中的临时区域（半透明白色框，视觉区别）
    tempSelectedCells.forEach(p => {
      if (p.x >= startX && p.x < endX && p.y >= startY && p.y < endY) {
        ctx.fillStyle = `${currentColor}40`; // 半透明
        ctx.fillRect(p.x * cellSize, p.y * cellSize, cellSize, cellSize);
        // 加个白色边框，更明显
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 0.5;
        ctx.strokeRect(p.x * cellSize, p.y * cellSize, cellSize, cellSize);
      }
    });

    ctx.restore();
  }

  // 5. 数据库连接（🔴 替换成你的新密钥！）
  const supabaseClient = window.supabase.createClient(
    "https://osbmvtoficehfqkbnijj.supabase.co", // 你的 Project URL（不用改）
    "sb_publishable_An6Hom9T6AUhaaab1F6_yg_lBr3ClHW" // 🔴 你的新密钥（已替换！）
  );

  // 加载数据库里的涂色数据
  async function loadGridCells() {
    try {
      const { data } = await supabaseClient.from('grid').select('x,y,color');
      gridCells = data || [];
    } catch (err) {
      console.log('数据库加载中...');
      gridCells = [];
    }
  }

  // 上传涂色数据到数据库
  async function uploadGrid(cells) {
    if (cells.length === 0) return;
    try {
      await supabaseClient.from('grid').upsert(cells);
    } catch (err) {
      alert('上传失败：' + err.message);
    }
  }

  // 6. 鼠标坐标 → 网格坐标 转换
  function getGridPos(clientX, clientY) {
    const rect = canvas.getBoundingClientRect();
    const x = Math.max(0, Math.min(GRID_SIZE - 1, Math.floor((clientX - rect.left) / (cellSize * scale))));
    const y = Math.max(0, Math.min(GRID_SIZE - 1, Math.floor((clientY - rect.top) / (cellSize * scale))));
    return { x, y };
  }

  // 7. 窗口自适应
  window.onresize = () => {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    drawGrid();
  };

  // 初始化：加载数据 + 绘制
  loadGridCells().then(drawGrid);
});

