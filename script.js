const upload = document.getElementById("upload");
const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");
const complexityInput = document.getElementById("complexity");

let img = new Image();  // 用來儲存圖片
let edges = [];
let resolution = 9; // 9x9 格數
let complexity = 50; // 初始複雜度

// 上傳圖片並處理
upload.addEventListener("change", handleFileUpload);
complexityInput.addEventListener("input", handleComplexityChange);

// 處理圖片上傳
function handleFileUpload(event) {
  const file = event.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = (e) => {
    img.src = e.target.result;  // 讀取圖片並觸發載入
  };
  reader.readAsDataURL(file);
}

// 當複雜度變化時，重新處理圖片
function handleComplexityChange(event) {
  complexity = event.target.value;  // 更新複雜度
  if (img.src) {
    processImage(img);  // 重新處理圖片
  }
}

// 處理圖片，縮放並計算邊緣
function processImage(image) {
  const smallCanvas = document.createElement("canvas");
  smallCanvas.width = resolution;
  smallCanvas.height = resolution;
  const smallCtx = smallCanvas.getContext("2d");

  smallCtx.clearRect(0, 0, smallCanvas.width, smallCanvas.height);  // 清空畫布
  smallCtx.drawImage(image, 0, 0, resolution, resolution);  // 縮放並繪製圖片

  const imageData = smallCtx.getImageData(0, 0, resolution, resolution);
  const grayData = getGrayScaleData(imageData);

  // 根據複雜度選擇邊緣檢測方法
  edges = (complexity <= 50) 
    ? detectSimpleEdges(grayData, complexity) 
    : detectGradientEdges(grayData, complexity);

  // 將邊緣點分段，並根據複雜度決定是否連接
  edges = segmentEdges(edges);

  renderEdges();  // 渲染邊緣
}

// 將圖像數據轉換為灰階數據
function getGrayScaleData(imageData) {
  const { data } = imageData;
  const grayData = [];
  for (let i = 0; i < data.length; i += 4) {
    const gray = (data[i] + data[i + 1] + data[i + 2]) / 3; // 灰階值
    grayData.push(gray);
  }
  return grayData;
}

// 低複雜度的邊緣檢測（簡單的相鄰像素差異）
function detectSimpleEdges(grayData, threshold) {
  const detectedEdges = [];
  for (let y = 0; y < resolution; y++) {
    for (let x = 0; x < resolution; x++) {
      const current = grayData[y * resolution + x];
      const right = x < resolution - 1 ? grayData[y * resolution + (x + 1)] : current;
      const bottom = y < resolution - 1 ? grayData[(y + 1) * resolution + x] : current;

      const gradient = Math.sqrt(
        Math.pow(current - right, 2) + Math.pow(current - bottom, 2)
      );

      if (gradient > threshold) {
        detectedEdges.push({ x, y });
      }
    }
  }
  return detectedEdges;
}

// 高複雜度的邊緣檢測（基於梯度檢測）
function detectGradientEdges(grayData, threshold) {
  const detectedEdges = [];
  for (let y = 0; y < resolution; y++) {
    for (let x = 0; x < resolution; x++) {
      const current = grayData[y * resolution + x];
      const left = x > 0 ? grayData[y * resolution + (x - 1)] : current;
      const right = x < resolution - 1 ? grayData[y * resolution + (x + 1)] : current;
      const top = y > 0 ? grayData[(y - 1) * resolution + x] : current;
      const bottom = y < resolution - 1 ? grayData[(y + 1) * resolution + x] : current;

      const gradientX = right - left;
      const gradientY = bottom - top;
      const gradient = Math.sqrt(gradientX * gradientX + gradientY * gradientY);  // 梯度計算

      if (gradient > threshold) {
        detectedEdges.push({ x, y });
      }
    }
  }
  return detectedEdges;
}

// 將邊緣點分段，並根據複雜度進行調整
function segmentEdges(edges) {
  const segments = [];
  let currentSegment = [];

  for (let i = 0; i < edges.length; i++) {
    const point = edges[i];
    currentSegment.push(point);

    // 如果遇到大範圍的變化，則將此段分開
    if (i > 0 && Math.abs(edges[i - 1].x - point.x) > 1) {
      segments.push(currentSegment);
      currentSegment = [];
    }
  }

  if (currentSegment.length > 0) {
    segments.push(currentSegment); // 加入最後一段
  }

  // 根據複雜度進行調整：高複雜度保留更多細節，低複雜度則簡化為較長的段
  if (complexity < 50) {
    return segments.slice(0, 2); // 複雜度低，將線段數量縮小
  }
  return segments;
}

// 渲染圖片和邊緣
function renderEdges() {
  ctx.clearRect(0, 0, canvas.width, canvas.height); // 清空畫布
  const cellSize = canvas.width / resolution;

  // 繪製固定的 9x9 點
  for (let y = 0; y < resolution; y++) {
    for (let x = 0; x < resolution; x++) {
      ctx.beginPath();
      ctx.arc(
        x * cellSize + cellSize / 2,
        y * cellSize + cellSize / 2,
        3, // 圓點大小
        0,
        Math.PI * 2
      );
      ctx.fillStyle = "black"; // 點的顏色
      ctx.fill();
    }
  }

  // 渲染每一段線條
  edges.forEach((segment) => {
    drawLineSegment(segment);
  });
}

// 繪製單一線段
function drawLineSegment(segment) {
  if (segment.length < 2) return;

  ctx.beginPath();
  segment.forEach((point, index) => {
    const { x, y } = point;
    const posX = x * (canvas.width / resolution) + (canvas.width / resolution) / 2;
    const posY = y * (canvas.height / resolution) + (canvas.height / resolution) / 2;

    if (index === 0) {
      ctx.moveTo(posX, posY);
    } else {
      ctx.lineTo(posX, posY);
    }
  });

  ctx.strokeStyle = "red"; // 線條顏色
  ctx.lineWidth = 2;
  ctx.stroke();
}
