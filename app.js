// ===== 全局状态 =====
let scale = 1;
let offsetX = 0;
let offsetY = 0;
let currentImages = [];
let currentIndex = 0;

// 拖拽状态
let isDragging = false;
let dragStartX = 0;
let dragStartY = 0;

// 触摸缩放状态
let lastTouchDistance = 0;
let isPinching = false;

// 滑动切换状态
let swipeStartX = 0;
let swipeStartY = 0;
let isSwiping = false;

// 双击检测
let lastTapTime = 0;

// ===== 初始化 =====
document.addEventListener('DOMContentLoaded', () => {
    renderNavbar();
    renderMenu('delta-exclusive');
    setupSearch();
    setupViewer();
    setupTouchGestures();
});

// ===== 渲染导航栏 =====
function renderNavbar() {
    const navbar = document.getElementById('navbar');
    navbar.innerHTML = '';
    for (const key in MENU_DATA) {
        const cat = MENU_DATA[key];
        const btn = document.createElement('button');
        btn.textContent = `${cat.icon} ${cat.name}`;
        btn.dataset.category = key;
        btn.onclick = () => {
            document.querySelectorAll('.navbar button').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            renderMenu(key);
        };
        navbar.appendChild(btn);
    }
    // 默认激活第一个有内容的分类
    const firstActive = Object.keys(MENU_DATA).find(key => MENU_DATA[key].items.length > 0);
    if (firstActive) {
        const activeBtn = document.querySelector(`[data-category="${firstActive}"]`);
        if (activeBtn) activeBtn.classList.add('active');
    }
}

// ===== 渲染菜单 =====
function renderMenu(category) {
    const section = document.getElementById('menuSection');
    section.innerHTML = '';
    const items = MENU_DATA[category]?.items || [];
    items.forEach(item => {
        const card = document.createElement('div');
        card.className = 'card';
        card.dataset.id = item.id;
        card.innerHTML = `
      <div class="card-image">
        <img src="${item.img}" alt="${item.name}" loading="lazy">
        <div class="card-tags">
          ${item.tags.map(tag => `<span class="tag">${tag}</span>`).join('')}
        </div>
      </div>
      <div class="card-content">
        <h3>${item.name}</h3>
        <p>${item.desc}</p>
      </div>
    `;
        card.onclick = () => openViewer(item.img, items, items.indexOf(item));
        section.appendChild(card);
    });
}

// ===== 搜索功能 =====
function setupSearch() {
    const input = document.getElementById('searchInput');
    input.oninput = (e) => {
        const keyword = e.target.value.toLowerCase().trim();
        document.querySelectorAll('.card').forEach(card => {
            const title = card.querySelector('h3').innerText.toLowerCase();
            const desc = card.querySelector('p').innerText.toLowerCase();
            const tags = Array.from(card.querySelectorAll('.tag')).map(t => t.innerText.toLowerCase()).join(' ');
            const isMatch = !keyword || title.includes(keyword) || desc.includes(keyword) || tags.includes(keyword);
            card.style.display = isMatch ? 'block' : 'none';
        });
    };
}

// ===== 图片查看器 =====
const viewer = document.getElementById('imageViewer');
const img = document.getElementById('viewerImg');

/* 打开查看器 */
function openViewer(imgPath, items, index) {
    if (!img || !viewer) {
        console.error('DOM 元素缺失！请确认 HTML 中有 #viewerImg 和 #imageViewer');
        return;
    }
    currentImages = items.map(item => item.img);
    currentIndex = index || 0;

    img.src = imgPath;
    scale = 1;
    offsetX = 0;
    offsetY = 0;
    applyTransform();
    viewer.classList.add('active');
    updateViewerButtons();

    // 阻止背景滚动
    document.body.style.overflow = 'hidden';
}

/* 更新上一张/下一张按钮状态 */
function updateViewerButtons() {
    const prevBtn = document.getElementById('prevBtn');
    const nextBtn = document.getElementById('nextBtn');
    if (prevBtn) prevBtn.style.visibility = currentIndex <= 0 ? 'hidden' : 'visible';
    if (nextBtn) nextBtn.style.visibility = currentIndex >= currentImages.length - 1 ? 'hidden' : 'visible';
}

/* 切换图片 */
function changeImage(delta) {
    const newIndex = currentIndex + delta;
    if (newIndex < 0 || newIndex >= currentImages.length) return;
    currentIndex = newIndex;
    img.src = currentImages[currentIndex];
    scale = 1;
    offsetX = 0;
    offsetY = 0;
    applyTransform();
    updateViewerButtons();
}

/* 关闭 */
function closeViewerHandler() {
    viewer.classList.remove('active');
    scale = 1;
    offsetX = 0;
    offsetY = 0;
    document.body.style.overflow = '';
}
document.getElementById('closeViewer').onclick = closeViewerHandler;

/* 放大/缩小按钮 */
document.getElementById('zoomIn').onclick = () => {
    scale = Math.min(scale * 1.3, 5);
    applyTransform();
};

document.getElementById('zoomOut').onclick = () => {
    scale = Math.max(scale / 1.3, 0.5);
    if (scale <= 1) {
        offsetX = 0;
        offsetY = 0;
    }
    applyTransform();
};

document.getElementById('prevBtn').onclick = () => changeImage(-1);
document.getElementById('nextBtn').onclick = () => changeImage(1);

/* 滚轮缩放 */
viewer.addEventListener('wheel', e => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    scale = Math.max(0.5, Math.min(scale * delta, 5));
    applyTransform();
}, { passive: false });

/* 鼠标拖拽 */
img.onmousedown = function (e) {
    if (e.button !== 0) return;
    if (scale <= 1) return;
    isDragging = true;
    dragStartX = e.clientX - offsetX;
    dragStartY = e.clientY - offsetY;
    img.style.cursor = 'grabbing';
    e.preventDefault();
};

img.onmousemove = function (e) {
    if (!isDragging) return;
    offsetX = e.clientX - dragStartX;
    offsetY = e.clientY - dragStartY;
    applyTransform();
};

img.onmouseup = function () {
    isDragging = false;
    img.style.cursor = scale > 1 ? 'grab' : 'default';
};

img.onmouseleave = function () {
    isDragging = false;
    img.style.cursor = scale > 1 ? 'grab' : 'default';
};

/* 应用变换 */
function applyTransform() {
    img.style.transform = `translate(${offsetX}px, ${offsetY}px) scale(${scale})`;
}

// ===== 手机端触摸手势（完整重写，解决双指放大和移动问题）=====
function setupTouchGestures() {
    // 计算两指间距
    function getTouchDistance(touches) {
        return Math.hypot(
            touches[0].clientX - touches[1].clientX,
            touches[0].clientY - touches[1].clientY
        );
    }

    // 计算两指中心点
    function getTouchCenter(touches) {
        return {
            x: (touches[0].clientX + touches[1].clientX) / 2,
            y: (touches[0].clientY + touches[1].clientY) / 2
        };
    }

    viewer.addEventListener('touchstart', function (e) {
        if (e.touches.length === 1) {
            const touch = e.touches[0];
            swipeStartX = touch.clientX;
            swipeStartY = touch.clientY;

            // 如果已放大，进入拖拽模式
            if (scale > 1) {
                isDragging = true;
                dragStartX = touch.clientX - offsetX;
                dragStartY = touch.clientY - offsetY;
            } else {
                // 未放大，准备滑动切换
                isSwiping = true;
            }
        } else if (e.touches.length === 2) {
            // 双指开始缩放
            isPinching = true;
            isDragging = false;
            isSwiping = false;
            lastTouchDistance = getTouchDistance(e.touches);
        }
    }, { passive: true });

    viewer.addEventListener('touchmove', function (e) {
        if (e.touches.length === 1) {
            if (isDragging && scale > 1) {
                // 单指拖拽已放大的图片
                e.preventDefault();
                offsetX = e.touches[0].clientX - dragStartX;
                offsetY = e.touches[0].clientY - dragStartY;
                applyTransform();
            } else if (isSwiping && scale <= 1) {
                // 检测是否为水平滑动（用于切换图片）
                const diffX = e.touches[0].clientX - swipeStartX;
                const diffY = e.touches[0].clientY - swipeStartY;
                // 如果水平滑动距离明显大于垂直，则认为是滑动切换
                if (Math.abs(diffX) > Math.abs(diffY) && Math.abs(diffX) > 10) {
                    e.preventDefault();
                }
            }
        } else if (e.touches.length === 2 && isPinching) {
            // 双指缩放 —— 核心逻辑
            e.preventDefault();
            const distance = getTouchDistance(e.touches);
            const delta = distance / lastTouchDistance;
            scale = Math.max(0.5, Math.min(scale * delta, 5));
            applyTransform();
            lastTouchDistance = distance;
        }
    }, { passive: false });

    viewer.addEventListener('touchend', function (e) {
        if (e.touches.length === 0) {
            // 所有手指离开
            if (isSwiping && scale <= 1) {
                // 判断是否为滑动切换
                const diffX = e.changedTouches[0].clientX - swipeStartX;
                if (Math.abs(diffX) > 50) {
                    if (diffX > 0) {
                        changeImage(-1);  // 右滑 → 上一张
                    } else {
                        changeImage(1);   // 左滑 → 下一张
                    }
                }
            }
            // 重置所有状态
            isDragging = false;
            isSwiping = false;
            isPinching = false;
        } else if (e.touches.length === 1 && isPinching) {
            // 从双指变为单指（有一个手指抬起）
            isPinching = false;
            // 如果当前已放大，继续拖拽模式
            if (scale > 1) {
                isDragging = true;
                dragStartX = e.touches[0].clientX - offsetX;
                dragStartY = e.touches[0].clientY - offsetY;
            }
        }
    }, { passive: true });

    // ===== 双击放大/还原 =====
    img.addEventListener('touchend', function (e) {
        const now = Date.now();
        if (now - lastTapTime < 350) {
            // 双击
            e.preventDefault();
            if (scale > 1) {
                // 还原
                scale = 1;
                offsetX = 0;
                offsetY = 0;
            } else {
                // 放大到2倍
                scale = 2;
                // 让双击位置居中
                const touch = e.changedTouches[0];
                const rect = img.getBoundingClientRect();
                const imgCenterX = rect.left + rect.width / 2;
                const imgCenterY = rect.top + rect.height / 2;
                offsetX = (imgCenterX - touch.clientX) * (scale - 1);
                offsetY = (imgCenterY - touch.clientY) * (scale - 1);
            }
            applyTransform();
        }
        lastTapTime = now;
    }, { passive: false });
}

// ===== 粒子背景 =====
const canvas = document.getElementById('particles');
const ctx = canvas.getContext('2d');
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

const particles = [];
for (let i = 0; i < 80; i++) {
    particles.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        r: Math.random() * 2 + 1,
        d: Math.random() * 1,
        color: `rgba(${Math.floor(Math.random() * 100)}, ${Math.floor(Math.random() * 255)}, ${Math.floor(Math.random() * 255)}, 0.5)`
    });
}

function drawParticles() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    particles.forEach(p => {
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = p.color;
        ctx.fill();
    });
    moveParticles();
}

function moveParticles() {
    particles.forEach(p => {
        p.y += Math.pow(p.d, 2) + 0.2;
        if (p.y > canvas.height) {
            particles.splice(particles.indexOf(p), 1);
            particles.push({
                x: Math.random() * canvas.width,
                y: 0,
                r: p.r,
                d: p.d,
                color: p.color
            });
        }
    });
}

setInterval(drawParticles, 33);
window.addEventListener('resize', () => {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
});
