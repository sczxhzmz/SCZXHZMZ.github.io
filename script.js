// 获取DOM元素
const canvas = document.getElementById('game-board');
const ctx = canvas.getContext('2d');
const scoreElement = document.getElementById('score');
const highScoreElement = document.getElementById('high-score');
const startBtn = document.getElementById('start-btn');
const pauseBtn = document.getElementById('pause-btn');
// 触摸控制元素
const upBtn = document.getElementById('up');
const downBtn = document.getElementById('down');
const leftBtn = document.getElementById('left');
const rightBtn = document.getElementById('right');

// 游戏设置
const GRID_SIZE = 20;
const GRID_COUNT = canvas.width / GRID_SIZE;
let snake = [];
let food = {};
let specialFood = null;
let obstacles = [];
let direction = 'right';
let nextDirection = 'right';
let score = 0;
let highScore = localStorage.getItem('snakeHighScore') || 0;
let gameLoopId = null;
let isPaused = false;
let isGameOver = true;
let gameSpeed = 100; // 初始游戏速度（毫秒）
let gameMode = 'classic'; // 游戏模式：classic 或 challenge
const MIN_SPEED = 60; // 最小游戏速度（毫秒）
const SPEED_INCREASE = 2; // 每次加速的毫秒数
const SPECIAL_FOOD_INTERVAL = 15; // 特殊食物出现间隔（秒）
const SPECIAL_FOOD_DURATION = 8; // 特殊食物持续时间（秒）

// 特效变量
let eatEffect = null; // 吃到食物时的特效
let specialFoodTimer = 0;
let specialFoodVisibleTime = 0;

// 食物颜色选项 - 简化赛博风格
const FOOD_COLORS = [
    { fill: '#00e6cc', stroke: '#00cccc' }, // 霓虹青
    { fill: '#9900ff', stroke: '#7700cc' }, // 霓虹紫
    { fill: '#0088ff', stroke: '#0066cc' }, // 霓虹蓝
    { fill: '#ff0055', stroke: '#cc0044' }  // 霓虹粉
];

// 食物特效变量
let foodGlowEffect = 0;
let foodGlowDirection = 1;
let specialFoodPulse = 0;
let specialFoodPulseDirection = 1;

// 更新最高分显示
highScoreElement.textContent = highScore;

// 初始化贪吃蛇
function initSnake() {
    const initialLength = 5;
    snake = [];
    for (let i = initialLength - 1; i >= 0; i--) {
        snake.push({
            x: i,
            y: 0
        });
    }
}

// 初始化障碍物（挑战模式）
function initObstacles() {
    obstacles = [];
    
    if (gameMode === 'challenge') {
        // 随机生成10-15个障碍物
        const obstacleCount = 10 + Math.floor(Math.random() * 6);
        
        for (let i = 0; i < obstacleCount; i++) {
            let newObstacle;
            do {
                newObstacle = {
                    x: Math.floor(Math.random() * GRID_COUNT),
                    y: Math.floor(Math.random() * GRID_COUNT)
                };
            } while (
                // 确保障碍物不与蛇重叠
                snake.some(segment => segment.x === newObstacle.x && segment.y === newObstacle.y) ||
                // 确保障碍物不与食物重叠
                (food.x === newObstacle.x && food.y === newObstacle.y) ||
                // 确保障碍物不互相重叠
                obstacles.some(obstacle => obstacle.x === newObstacle.x && obstacle.y === newObstacle.y)
            );
            obstacles.push(newObstacle);
        }
    }
}

// 生成食物
function generateFood() {
    let newFood;
    do {
        newFood = {
            x: Math.floor(Math.random() * GRID_COUNT),
            y: Math.floor(Math.random() * GRID_COUNT),
            color: FOOD_COLORS[Math.floor(Math.random() * FOOD_COLORS.length)]
        };
    } while (
        // 确保障物不与蛇重叠
        snake.some(segment => segment.x === newFood.x && segment.y === newFood.y) ||
        // 确保障物不与障碍物重叠（挑战模式）
        (gameMode === 'challenge' && obstacles.some(obstacle => obstacle.x === newFood.x && obstacle.y === newFood.y)) ||
        // 确保障物不与特殊食物重叠
        (specialFood && specialFood.x === newFood.x && specialFood.y === newFood.y)
    );
    food = newFood;
    foodGlowEffect = 0;
    foodGlowDirection = 1;
}

// 生成特殊食物
function generateSpecialFood() {
    if (specialFood !== null) return; // 如果已有特殊食物，则不生成新的
    
    let newSpecialFood;
    do {
        newSpecialFood = {
            x: Math.floor(Math.random() * GRID_COUNT),
            y: Math.floor(Math.random() * GRID_COUNT),
            type: Math.random() > 0.5 ? 'bonus' : 'slowdown' // bonus: 额外分数, slowdown: 减慢速度
        };
    } while (
        // 确保特殊食物不与蛇重叠
        snake.some(segment => segment.x === newSpecialFood.x && segment.y === newSpecialFood.y) ||
        // 确保特殊食物不与普通食物重叠
        (food.x === newSpecialFood.x && food.y === newSpecialFood.y) ||
        // 确保特殊食物不与障碍物重叠（挑战模式）
        (gameMode === 'challenge' && obstacles.some(obstacle => obstacle.x === newSpecialFood.x && obstacle.y === newSpecialFood.y))
    );
    
    specialFood = newSpecialFood;
    specialFoodVisibleTime = 0;
    specialFoodPulse = 0;
    specialFoodPulseDirection = 1;
}

// 显示临时消息 - 赛博朋克风格
function showTemporaryMessage(message, duration) {
    // 检查是否已存在消息元素
    let messageElement = document.getElementById('game-message');
    if (!messageElement) {
        // 创建消息元素
        messageElement = document.createElement('div');
        messageElement.id = 'game-message';
        messageElement.style.position = 'fixed';
        messageElement.style.top = '50%';
        messageElement.style.left = '50%';
        messageElement.style.transform = 'translate(-50%, -50%)';
        messageElement.style.backgroundColor = 'rgba(10, 10, 20, 0.9)';
        messageElement.style.color = '#00ffcc';
        messageElement.style.padding = '15px 30px';
        messageElement.style.borderRadius = '5px';
        messageElement.style.fontSize = '18px';
        messageElement.style.fontFamily = 'Orbitron, Arial';
        messageElement.style.border = '1px solid #00ffcc';
        messageElement.style.boxShadow = '0 0 15px rgba(0, 255, 204, 0.5)';
        messageElement.style.zIndex = '1000';
        messageElement.style.opacity = '0';
        messageElement.style.transition = 'opacity 0.3s ease';
        messageElement.style.letterSpacing = '1px';
        document.body.appendChild(messageElement);
    }
    
    // 设置消息内容
    messageElement.textContent = message;
    
    // 显示消息
    setTimeout(() => {
        messageElement.style.opacity = '1';
    }, 10);
    
    // 隐藏消息
    setTimeout(() => {
        messageElement.style.opacity = '0';
        setTimeout(() => {
            if (messageElement.parentNode) {
                messageElement.parentNode.removeChild(messageElement);
            }
        }, 300);
    }, duration);
}

// 创建吃到食物的特效
function createEatEffect(x, y, color) {
    eatEffect = {
        x: x,
        y: y,
        color: color,
        alpha: 1,
        size: GRID_SIZE / 2
    };
}

// 绘制游戏
function draw() {
    // 清空画布
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // 绘制网格 - 灰色系
    ctx.strokeStyle = 'rgba(128, 128, 128, 0.05)';
    for (let i = 0; i <= GRID_COUNT; i++) {
        // 水平线
        ctx.beginPath();
        ctx.moveTo(0, i * GRID_SIZE);
        ctx.lineTo(canvas.width, i * GRID_SIZE);
        ctx.stroke();

        // 垂直线
        ctx.beginPath();
        ctx.moveTo(i * GRID_SIZE, 0);
        ctx.lineTo(i * GRID_SIZE, canvas.height);
        ctx.stroke();
    }

    // 绘制网格线 - 灰色系
    ctx.strokeStyle = 'rgba(128, 128, 128, 0.05)';
    ctx.lineWidth = 1;
    for (let i = 0; i <= GRID_COUNT; i++) {
        // 水平线
        ctx.beginPath();
        ctx.moveTo(0, i * GRID_SIZE);
        ctx.lineTo(canvas.width, i * GRID_SIZE);
        ctx.stroke();

        // 垂直线
        ctx.beginPath();
        ctx.moveTo(i * GRID_SIZE, 0);
        ctx.lineTo(i * GRID_SIZE, canvas.height);
        ctx.stroke();
    }

    // 绘制贪吃蛇 - 简化赛博风格
    snake.forEach((segment, index) => {
        if (index === 0) {
            // 绘制蛇头
            ctx.fillStyle = '#9900ff';
            ctx.beginPath();
            ctx.roundRect(segment.x * GRID_SIZE, segment.y * GRID_SIZE, GRID_SIZE, GRID_SIZE, 6);
            ctx.fill();
            ctx.strokeStyle = '#6600cc';
            ctx.lineWidth = 2;
            ctx.stroke();

            // 添加霓虹发光效果
            ctx.shadowColor = '#9900ff';
            ctx.shadowBlur = 8;
            ctx.fill();
            ctx.shadowBlur = 0;

            // 添加眼睛 - 简化赛博风格
            const eyeSize = GRID_SIZE / 6;
            const eyeOffset = GRID_SIZE / 3;
            
            ctx.fillStyle = '#00e6cc';
            if (direction === 'right' || direction === 'left') {
                ctx.beginPath();
                ctx.arc(segment.x * GRID_SIZE + eyeOffset, segment.y * GRID_SIZE + eyeOffset, eyeSize, 0, Math.PI * 2);
                ctx.arc(segment.x * GRID_SIZE + eyeOffset, segment.y * GRID_SIZE + GRID_SIZE - eyeOffset, eyeSize, 0, Math.PI * 2);
                ctx.fill();
            } else {
                ctx.beginPath();
                ctx.arc(segment.x * GRID_SIZE + eyeOffset, segment.y * GRID_SIZE + eyeOffset, eyeSize, 0, Math.PI * 2);
                ctx.arc(segment.x * GRID_SIZE + GRID_SIZE - eyeOffset, segment.y * GRID_SIZE + eyeOffset, eyeSize, 0, Math.PI * 2);
                ctx.fill();
            }

            // 霓虹眼球
            ctx.fillStyle = '#0a0a15';
            if (direction === 'right') {
                ctx.beginPath();
                ctx.arc(segment.x * GRID_SIZE + eyeOffset + eyeSize/2, segment.y * GRID_SIZE + eyeOffset, eyeSize/2, 0, Math.PI * 2);
                ctx.arc(segment.x * GRID_SIZE + eyeOffset + eyeSize/2, segment.y * GRID_SIZE + GRID_SIZE - eyeOffset, eyeSize/2, 0, Math.PI * 2);
                ctx.fill();
            } else if (direction === 'left') {
                ctx.beginPath();
                ctx.arc(segment.x * GRID_SIZE + eyeOffset - eyeSize/2, segment.y * GRID_SIZE + eyeOffset, eyeSize/2, 0, Math.PI * 2);
                ctx.arc(segment.x * GRID_SIZE + eyeOffset - eyeSize/2, segment.y * GRID_SIZE + GRID_SIZE - eyeOffset, eyeSize/2, 0, Math.PI * 2);
                ctx.fill();
            } else if (direction === 'up') {
                ctx.beginPath();
                ctx.arc(segment.x * GRID_SIZE + eyeOffset, segment.y * GRID_SIZE + eyeOffset - eyeSize/2, eyeSize/2, 0, Math.PI * 2);
                ctx.arc(segment.x * GRID_SIZE + GRID_SIZE - eyeOffset, segment.y * GRID_SIZE + eyeOffset - eyeSize/2, eyeSize/2, 0, Math.PI * 2);
                ctx.fill();
            } else if (direction === 'down') {
                ctx.beginPath();
                ctx.arc(segment.x * GRID_SIZE + eyeOffset, segment.y * GRID_SIZE + eyeOffset + eyeSize/2, eyeSize/2, 0, Math.PI * 2);
                ctx.arc(segment.x * GRID_SIZE + GRID_SIZE - eyeOffset, segment.y * GRID_SIZE + eyeOffset + eyeSize/2, eyeSize/2, 0, Math.PI * 2);
                ctx.fill();
            }
        } else {
            // 绘制蛇身，使用赛博朋克渐变色彩
            const gradient = ctx.createLinearGradient(
                segment.x * GRID_SIZE, 
                segment.y * GRID_SIZE, 
                segment.x * GRID_SIZE + GRID_SIZE, 
                segment.y * GRID_SIZE + GRID_SIZE
            );
            
            // 简化的赛博渐变效果
            const colorIndex = index % 2;
            if (colorIndex === 0) {
                gradient.addColorStop(0, '#00e6cc');
                gradient.addColorStop(1, '#0088ff');
            } else {
                gradient.addColorStop(0, '#0088ff');
                gradient.addColorStop(1, '#9900ff');
            }
            
            ctx.fillStyle = gradient;
            ctx.beginPath();
            ctx.roundRect(segment.x * GRID_SIZE, segment.y * GRID_SIZE, GRID_SIZE, GRID_SIZE, 4);
            ctx.fill();
            ctx.strokeStyle = '#0a0a15';
            ctx.lineWidth = 1;
            ctx.stroke();
        }
    });

    // 更新食物发光效果
    foodGlowEffect += foodGlowDirection * 0.02;
    if (foodGlowEffect > 1) {
        foodGlowEffect = 1;
        foodGlowDirection = -1;
    } else if (foodGlowEffect < 0) {
        foodGlowEffect = 0;
        foodGlowDirection = 1;
    }

    // 绘制食物发光效果
    ctx.shadowColor = food.color.fill;
    ctx.shadowBlur = 10 * foodGlowEffect;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;

    // 绘制食物 - 使用圆形水果样式
    ctx.fillStyle = food.color.fill;
    ctx.beginPath();
    ctx.arc(food.x * GRID_SIZE + GRID_SIZE/2, food.y * GRID_SIZE + GRID_SIZE/2, GRID_SIZE/2 - 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = food.color.stroke;
    ctx.lineWidth = 2;
    ctx.stroke();

    // 清除阴影效果，避免影响其他元素
    ctx.shadowBlur = 0;

    // 添加食物的光泽效果
    ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
    ctx.beginPath();
    ctx.arc(food.x * GRID_SIZE + GRID_SIZE/3, food.y * GRID_SIZE + GRID_SIZE/3, GRID_SIZE/5, 0, Math.PI * 2);
    ctx.fill();

    // 绘制吃到食物的特效
    if (eatEffect) {
        // 更新特效
        eatEffect.alpha -= 0.05;
        eatEffect.size += 0.5;
        
        if (eatEffect.alpha <= 0) {
            eatEffect = null;
        } else {
            // 绘制特效
            ctx.globalAlpha = eatEffect.alpha;
            ctx.fillStyle = eatEffect.color;
            ctx.beginPath();
            ctx.arc(eatEffect.x, eatEffect.y, eatEffect.size, 0, Math.PI * 2);
            ctx.fill();
            
            // 重置透明度
            ctx.globalAlpha = 1;
        }
    }

    // 绘制障碍物（挑战模式）- 黄色赛博风格
    if (gameMode === 'challenge') {
        obstacles.forEach(obstacle => {
            // 创建霓虹边框效果
            ctx.strokeStyle = '#ffcc00';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.roundRect(obstacle.x * GRID_SIZE, obstacle.y * GRID_SIZE, GRID_SIZE, GRID_SIZE, 4);
            ctx.stroke();
            
            // 障碍物内部填充
            ctx.fillStyle = 'rgba(255, 204, 0, 0.1)';
            ctx.fill();
        });
    }

    // 绘制特殊食物
    if (specialFood) {
        // 更新特殊食物脉冲效果
        specialFoodPulse += specialFoodPulseDirection * 0.05;
        if (specialFoodPulse > 1) {
            specialFoodPulse = 1;
            specialFoodPulseDirection = -1;
        } else if (specialFoodPulse < 0.5) {
            specialFoodPulse = 0.5;
            specialFoodPulseDirection = 1;
        }

        // 设置特殊食物样式
        ctx.shadowColor = specialFood.type === 'bonus' ? '#ffcc00' : '#00e6cc';
        ctx.shadowBlur = 12 * specialFoodPulse;
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = 0;

        // 绘制特殊食物
        ctx.fillStyle = specialFood.type === 'bonus' ? '#ffcc00' : '#00e6cc';
        ctx.beginPath();
        ctx.arc(specialFood.x * GRID_SIZE + GRID_SIZE/2, specialFood.y * GRID_SIZE + GRID_SIZE/2, GRID_SIZE/2 - 1, 0, Math.PI * 2);
        ctx.fill();
        
        // 添加特殊标记
        ctx.fillStyle = 'black';
        ctx.font = '12px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(
            specialFood.type === 'bonus' ? '+' : 'S',
            specialFood.x * GRID_SIZE + GRID_SIZE/2,
            specialFood.y * GRID_SIZE + GRID_SIZE/2
        );

        // 清除阴影效果
        ctx.shadowBlur = 0;

        // 如果特殊食物即将消失，添加闪烁效果
        if (specialFoodVisibleTime > SPECIAL_FOOD_DURATION - 2) {
            const blinkRate = Math.sin(Date.now() * 0.01) > 0;
            if (blinkRate) {
                ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
                ctx.fillRect(
                    specialFood.x * GRID_SIZE,
                    specialFood.y * GRID_SIZE,
                    GRID_SIZE,
                    GRID_SIZE
                );
            }
        }
    }

    // 如果游戏结束，显示游戏结束文字 - 简化赛博风格
    if (isGameOver) {
        ctx.fillStyle = 'rgba(10, 10, 20, 0.8)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = '#9900ff';
        ctx.strokeStyle = '#6600cc';
        ctx.lineWidth = 1;
        ctx.font = 'bold 28px Orbitron, Arial';
        ctx.textAlign = 'center';
        ctx.strokeText('SYSTEM FAILURE', canvas.width / 2, canvas.height / 2 - 20);
        ctx.fillText('SYSTEM FAILURE', canvas.width / 2, canvas.height / 2 - 20);
        ctx.fillStyle = '#00e6cc';
        ctx.font = '16px Orbitron, Arial';
        ctx.strokeStyle = '#00e6cc';
        ctx.strokeText('REBOOT SYSTEM TO CONTINUE', canvas.width / 2, canvas.height / 2 + 20);
        ctx.fillText('REBOOT SYSTEM TO CONTINUE', canvas.width / 2, canvas.height / 2 + 20);
    }

    // 如果暂停，显示暂停文字 - 简化赛博风格
    if (isPaused && !isGameOver) {
        ctx.fillStyle = 'rgba(10, 10, 20, 0.7)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = '#00e6cc';
        ctx.strokeStyle = '#00cccc';
        ctx.lineWidth = 1;
        ctx.font = 'bold 28px Orbitron, Arial';
        ctx.textAlign = 'center';
        ctx.strokeText('SYSTEM PAUSED', canvas.width / 2, canvas.height / 2);
        ctx.fillText('SYSTEM PAUSED', canvas.width / 2, canvas.height / 2);
    }
}

// 更新游戏状态
function update() {
    if (isPaused || isGameOver) return;

    // 更新方向
    direction = nextDirection;

    // 获取蛇头
    const head = {
        x: snake[0].x,
        y: snake[0].y
    };

    // 根据方向移动蛇头
    switch (direction) {
        case 'up':
            head.y--;
            break;
        case 'down':
            head.y++;
            break;
        case 'left':
            head.x--;
            break;
        case 'right':
            head.x++;
            break;
    }

    // 检测是否撞墙
    if (head.x < 0 || head.x >= GRID_COUNT || head.y < 0 || head.y >= GRID_COUNT) {
        gameOver();
        return;
    }

    // 检测是否撞到自己
    if (snake.some(segment => segment.x === head.x && segment.y === head.y)) {
        gameOver();
        return;
    }

    // 检测是否撞到障碍物（挑战模式）
    if (gameMode === 'challenge' && obstacles.some(obstacle => obstacle.x === head.x && obstacle.y === head.y)) {
        gameOver();
        return;
    }

    // 将新头部添加到蛇身
    snake.unshift(head);

    // 检测是否吃到食物
    if (head.x === food.x && head.y === food.y) {
        // 创建吃到食物的特效
        createEatEffect(
            food.x * GRID_SIZE + GRID_SIZE/2,
            food.y * GRID_SIZE + GRID_SIZE/2,
            food.color.fill
        );

        // 增加分数
        score += 10;
        scoreElement.textContent = score;

        // 更新最高分
        if (score > highScore) {
            highScore = score;
            highScoreElement.textContent = highScore;
            localStorage.setItem('snakeHighScore', highScore);
        }

        // 每获得100分增加一次游戏难度
        if (score % 100 === 0 && gameSpeed > MIN_SPEED) {
            // 清除当前的游戏循环
            clearInterval(gameLoopId);
            // 增加游戏速度
            gameSpeed = Math.max(gameSpeed - SPEED_INCREASE, MIN_SPEED);
            // 以新速度重新启动游戏循环
            gameLoopId = setInterval(gameLoop, gameSpeed);
        }

        // 生成新食物
        generateFood();
    } else if (specialFood && head.x === specialFood.x && head.y === specialFood.y) {
        // 吃到特殊食物
        createEatEffect(
            specialFood.x * GRID_SIZE + GRID_SIZE/2,
            specialFood.y * GRID_SIZE + GRID_SIZE/2,
            specialFood.type === 'bonus' ? '#FFEB3B' : '#03A9F4'
        );

        // 根据特殊食物类型执行不同效果
        if (specialFood.type === 'bonus') {
            // 额外分数
            score += 50;
            scoreElement.textContent = score;
            
            // 更新最高分
            if (score > highScore) {
                highScore = score;
                highScoreElement.textContent = highScore;
                localStorage.setItem('snakeHighScore', highScore);
            }
        } else if (specialFood.type === 'slowdown') {
            // 减慢游戏速度
            const oldSpeed = gameSpeed;
            gameSpeed = Math.min(gameSpeed + 10, 150); // 最多减慢到150ms
            
            // 显示速度减慢提示
            showTemporaryMessage('速度减慢!', 2000);
        }

        // 清除特殊食物
        specialFood = null;
        specialFoodTimer = 0;
        
        // 移除尾部（特殊食物不增加长度）
        snake.pop();
    } else {
        // 如果没吃到食物，移除尾部
        snake.pop();
    }

    // 更新特殊食物计时
    specialFoodTimer += gameSpeed / 1000; // 转换为秒
    
    if (specialFood) {
        // 如果有特殊食物，更新其可见时间
        specialFoodVisibleTime += gameSpeed / 1000;
        
        // 如果特殊食物持续时间超过限制，移除它
        if (specialFoodVisibleTime >= SPECIAL_FOOD_DURATION) {
            specialFood = null;
            specialFoodTimer = 0;
        }
    } else if (specialFoodTimer >= SPECIAL_FOOD_INTERVAL) {
        // 如果到了生成特殊食物的时间，生成一个
        generateSpecialFood();
        specialFoodTimer = 0;
    }
}

// 游戏循环
function gameLoop() {
    update();
    draw();
}

// 游戏结束
function gameOver() {
    isGameOver = true;
    clearInterval(gameLoopId);
    startBtn.disabled = false;
    pauseBtn.disabled = true;
}

// 开始游戏
function startGame() {
    if (!isGameOver && !isPaused) return;

    if (isGameOver) {
        // 重置游戏
        initSnake();
        generateFood();
        initObstacles(); // 初始化障碍物（挑战模式）
        score = 0;
        scoreElement.textContent = score;
        direction = 'right';
        nextDirection = 'right';
        isGameOver = false;
        gameSpeed = 100; // 重置游戏速度
        specialFood = null;
        specialFoodTimer = 0;
        specialFoodVisibleTime = 0;
    }

    isPaused = false;
    gameLoopId = setInterval(gameLoop, gameSpeed);
    startBtn.disabled = true;
    pauseBtn.disabled = false;
}

// 暂停游戏
function pauseGame() {
    if (isGameOver) return;

    if (isPaused) {
        // 恢复游戏
        isPaused = false;
        gameLoopId = setInterval(gameLoop, gameSpeed);
        pauseBtn.textContent = '暂停';
    } else {
        // 暂停游戏
        isPaused = true;
        clearInterval(gameLoopId);
        pauseBtn.textContent = '继续';
    }
}

// 键盘控制
function handleKeyDown(e) {
    // 防止游戏结束或暂停时改变方向
    if (isGameOver || isPaused) return;

    switch (e.key) {
        case 'ArrowUp':
            if (direction !== 'down') {
                nextDirection = 'up';
            }
            break;
        case 'ArrowDown':
            if (direction !== 'up') {
                nextDirection = 'down';
            }
            break;
        case 'ArrowLeft':
            if (direction !== 'right') {
                nextDirection = 'left';
            }
            break;
        case 'ArrowRight':
            if (direction !== 'left') {
                nextDirection = 'right';
            }
            break;
        case ' ': // 空格键暂停/继续
            pauseGame();
            break;
    }
}

// 触摸控制 - 为移动设备添加
function createTouchControls() {
    const container = document.querySelector('.container');
    const controlsDiv = document.createElement('div');
    controlsDiv.className = 'direction-controls';

    const upBtn = document.createElement('button');
    upBtn.id = 'up-btn';
    upBtn.className = 'direction-btn';
    upBtn.textContent = '↑';
    upBtn.addEventListener('click', () => {
        if (direction !== 'down') nextDirection = 'up';
    });

    const leftBtn = document.createElement('button');
    leftBtn.id = 'left-btn';
    leftBtn.className = 'direction-btn';
    leftBtn.textContent = '←';
    leftBtn.addEventListener('click', () => {
        if (direction !== 'right') nextDirection = 'left';
    });

    const rightBtn = document.createElement('button');
    rightBtn.id = 'right-btn';
    rightBtn.className = 'direction-btn';
    rightBtn.textContent = '→';
    rightBtn.addEventListener('click', () => {
        if (direction !== 'left') nextDirection = 'right';
    });

    const downBtn = document.createElement('button');
    downBtn.id = 'down-btn';
    downBtn.className = 'direction-btn';
    downBtn.textContent = '↓';
    downBtn.addEventListener('click', () => {
        if (direction !== 'up') nextDirection = 'down';
    });

    controlsDiv.appendChild(upBtn);
    controlsDiv.appendChild(leftBtn);
    controlsDiv.appendChild(rightBtn);
    controlsDiv.appendChild(downBtn);
    container.appendChild(controlsDiv);
}

// 事件监听
startBtn.addEventListener('click', startGame);
pauseBtn.addEventListener('click', pauseGame);
window.addEventListener('keydown', handleKeyDown);

// 触摸控制处理函数
function handleTouchMove(newDirection) {
    // 防止游戏结束或暂停时改变方向
    if (isGameOver || isPaused) return;

    if (
        (newDirection === 'up' && direction !== 'down') ||
        (newDirection === 'down' && direction !== 'up') ||
        (newDirection === 'left' && direction !== 'right') ||
        (newDirection === 'right' && direction !== 'left')
    ) {
        nextDirection = newDirection;
    }
}

// 添加触摸控制事件监听
upBtn.addEventListener('touchstart', () => handleTouchMove('up'));
upBtn.addEventListener('mousedown', () => handleTouchMove('up'));

downBtn.addEventListener('touchstart', () => handleTouchMove('down'));
downBtn.addEventListener('mousedown', () => handleTouchMove('down'));

leftBtn.addEventListener('touchstart', () => handleTouchMove('left'));
leftBtn.addEventListener('mousedown', () => handleTouchMove('left'));

rightBtn.addEventListener('touchstart', () => handleTouchMove('right'));
rightBtn.addEventListener('mousedown', () => handleTouchMove('right'));

// 已在上方定义触摸控制元素

// 游戏模式切换
const classicModeBtn = document.getElementById('classic-mode-btn');
const challengeModeBtn = document.getElementById('challenge-mode-btn');

classicModeBtn.addEventListener('click', () => {
    if (isGameOver) {
        gameMode = 'classic';
        classicModeBtn.classList.add('active');
        challengeModeBtn.classList.remove('active');
        
        // 清除障碍物并重新初始化游戏
        obstacles = [];
        initSnake();
        generateFood();
        draw();
    }
});

challengeModeBtn.addEventListener('click', () => {
    if (isGameOver) {
        gameMode = 'challenge';
        challengeModeBtn.classList.add('active');
        classicModeBtn.classList.remove('active');
        
        // 初始化障碍物
        initSnake();
        generateFood();
        initObstacles();
        draw();
    }
});

// 创建触摸控制
createTouchControls();

// 初始化游戏
initSnake();
generateFood();
draw();

// 禁用暂停按钮
pauseBtn.disabled = true;