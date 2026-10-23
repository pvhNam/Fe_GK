// 1. Thông tin các màn chơi (index 0 đến 5 tương ứng màn 1 đến 6).
const levels = [
  {name: 'Cổ điển', need: 15,
    description: 'Ăn 15 táo. Rắn có thể đi xuyên qua mép bàn.'},
  {name: 'Giải đố mê cung', need: 8,
    description: 'Ăn 8 táo bên ngoài để mở cửa bên trái mê cung, sau đó vào ăn Táo Vàng.'},
  {name: 'Tấn công Táo', need: 10,
    description: 'Nhấn Space phá giáp táo rồi ăn. Cần 10 quả để qua màn.'},
  {name: 'Vượt chướng ngại vật', need: 10,
    description: 'Ăn 10 táo và tránh vật tím. Số vật tăng khi ăn 4, 7, 9 quả.'},
  {name: 'Thoát khỏi khu rừng', need: 8,
    description: 'Ăn 8 táo để xuất hiện chìa khóa vàng. Lấy khóa rồi tới cửa ở góc dưới bên phải.'},
  // MÀN 6: mỗi quả táo làm đổi ngược phím trái/phải một lần.
  {name: 'Đảo trái phải', need: 10,
    description: 'Ăn mỗi quả táo sẽ đổi trái/phải: bình thường → đảo ngược → bình thường. Khi đảo, ←/A đi phải và →/D đi trái; lên/xuống giữ nguyên. Ăn 10 táo để thắng.'}
];
const canvas = document.getElementById('c');
const ctx = canvas.getContext('2d');
const N = 25, C = 24;
const directions = [[1, 0], [-1, 0], [0, 1], [0, -1]];
let level, index, snake, dir, queue, walls, obstacles, bullets;
let apple, gold, key, gate, door, hasKey;
let score, base, eaten, elapsed, obstacleTime, lastShot, savedState;
let reverseControls;
let state = 'menu';

function get(id) {
  return document.getElementById(id);
}
function same(a, b) {
  return a != null && b != null && a.x === b.x && a.y === b.y;
}
function contains(list, point) {
  for (let i = 0; i < list.length; i++) {
    if (same(list[i], point)) 
      return true;
  }
  return false;
}
function insideMaze(p) {
  return p.x > 7 && p.x < 19 && p.y > 7 && p.y < 19;
}
function wall(x, y, width, height) {
  for (let row = y; row < y + height; row++) {
    for (let col = x; col < x + width; col++) 
      walls.push({x: col, y: row});
  }
}
function removeWall(point) {
  for (let i = walls.length - 1; i >= 0; i--) {
    if (same(walls[i], point)) 
      walls.splice(i, 1);
  }
}

// 2. Bắt đầu và tạo bản đồ
function start(i, points = 0) {
  if (!levels[i]) return;
  index = i; 
  level = levels[i]; 
  score = points; 
  base = points;
  eaten = 0; 
  elapsed = 0; 
  obstacleTime = 0; 
  reverseControls = false;
  lastShot = -Infinity;
  hasKey = false; 
  savedState = null;
  snake = []; 
  walls = []; 
  obstacles = []; 
  bullets = []; 
  queue = [];
  apple = null; 
  gold = null; 
  key = null; 
  gate = null; 
  door = null;
  dir = [1, 0];
  let x = 3, y = 3;
  if (index === 4) {
     x = 12; y = 12; 
    }
  for (let j = 0; j < 3; j++) 
    snake.push({x: x - j, y: y});
  if (index !== 0) {
    wall(0, 0, 25, 1); 
    wall(0, 24, 25, 1);
    wall(0, 1, 1, 23); 
    wall(24, 1, 1, 23);
  }
  if (index === 1) {
    wall(7, 7, 13, 1); 
    wall(7, 19, 13, 1);
    wall(7, 8, 1, 11); 
    wall(19, 8, 1, 11);
    wall(11, 8, 1, 8); 
    wall(15, 11, 1, 8);
    gate = {x: 7, y: 12}; 
    removeWall(gate);
  }
  if (index === 4) {
    wall(6, 1, 1, 8); 
    wall(6, 12, 1, 9);
    wall(18, 4, 1, 9); 
    wall(18, 16, 1, 8);
    wall(10, 5, 9, 1); 
    wall(6, 17, 9, 1);
    wall(10, 9, 1, 3); 
    wall(14, 13, 1, 5);
    wall(1, 13, 3, 1); 
    wall(21, 9, 3, 1);
    door = {x: 24, y: 23}; 
    removeWall(door);
  }
  apple = spawn('apple');
  if (index === 3) 
    addObstacles();
  get('level-menu').hidden = true;
  get('game').hidden = false;
  setState('playing');
}

// Chọn ô trống để vật phẩm không trùng rắn hoặc tường.
function spawn(type) {
  let free = [];
  for (let y = 0; y < N; y++) {
    for (let x = 0; x < N; x++) {
      let p = {x: x, y: y, shield: 0};
      if (index === 2) 
        p.shield = 1;
      if (contains(walls, p) || contains(snake, p) || contains(obstacles, p)) 
        continue;
      if (same(p, apple) || same(p, gold) || same(p, key) || same(p, gate) || same(p, door)) 
        continue;
      if (type === 'apple' && index === 1 && insideMaze(p)) 
        continue;
      if (type === 'gold' && !insideMaze(p)) 
        continue;
      if (type === 'obstacle' && Math.abs(x - snake[0].x) + Math.abs(y - snake[0].y) <= 4) 
        continue;
      free.push(p);
    }
  }
  return free[Math.floor(Math.random() * free.length)];
}

// 3. Di chuyển, ăn táo và kiểm tra va chạm
function step() {
  if (queue.length > 0) 
    dir = queue.shift();
  let head = {x: snake[0].x + dir[0], y: snake[0].y + dir[1]};
  if (index === 0) {
    head.x = (head.x + N) % N;
    head.y = (head.y + N) % N;
  }
  if (same(head, door)) {
    if (hasKey) complete();
    else setState('dead');
    return;
  }
  let eat = same(head, apple) && apple.shield === 0;
  let body = snake.slice();
  if (!eat) body.pop(); // Đuôi sẽ rời ô hiện tại nếu rắn không ăn táo.
  if (head.x < 0 || head.x >= N || head.y < 0 || head.y >= N ||
      contains(walls, head) || contains(body, head) || contains(obstacles, head) || same(head, gate)) {
    setState('dead'); 
    return;
  }
  snake.unshift(head);
  if (!eat) 
    snake.pop();
  if (same(head, gold)) { 
    gold = null; 
    score += 50; 
    complete(); 
    return; 
  }
  if (same(head, key)) {
    key = null; 
    hasKey = true; 
    score += 20; 
  }
  if (eat) {
    eaten++; 
    score += 10; 
    // MÀN 6: chỉ đổi cách bấm phím, không tự quay đầu rắn.
    if (index === 5) reverseControls = !reverseControls;
    apple = null;
    if (eaten < level.need) 
      apple = spawn('apple');
    else if (index === 1) { 
      gate = null; 
      gold = spawn('gold'); 
    }
    else if (index === 4) 
      key = spawn('key');
    else { 
      complete(); 
      return; 
    }
    if (index === 3) 
      addObstacles();
  }
}
function turn(next) {
  if (state !== 'playing' || queue.length >= 2) 
    return;
  // MÀN 6: đảo phần trái/phải, còn lên/xuống không đổi.
  if (index === 5 && reverseControls) next = [-next[0], next[1]];
  let previous = dir;
  if (queue.length > 0) 
    previous = queue[queue.length - 1];
  // Chỉ cho rẽ vuông góc để rắn không quay ngược vào thân.
  if (next[0] * previous[0] + next[1] * previous[1] === 0) 
    queue.push(next);
}

// 4. Màn 3: bắn phá giáp táo
function shoot() {
  if (state !== 'playing' || index !== 2 || performance.now() - lastShot < 300) 
    return;
  lastShot = performance.now();
  bullets.push({x: snake[0].x, y: snake[0].y, dx: dir[0], dy: dir[1]});
}
function moveBullets() {
  for (let i = bullets.length - 1; i >= 0; i--) {
    let b = bullets[i]; 
    b.x += b.dx; 
    b.y += b.dy;
    if (b.x < 0 || b.x >= N || b.y < 0 || b.y >= N || contains(walls, b)) {
      bullets.splice(i, 1);
    } else if (same(b, apple) && apple.shield > 0) {
      apple.shield--; 
      bullets.splice(i, 1);
    }
  }
}

// 5. Màn 4: chướng ngại vật di chuyển
function addObstacles() {
  let count = 1;
  if (eaten >= 9) 
    count = 4;
  else if (eaten >= 7) 
    count = 3;
  else if (eaten >= 4) 
    count = 2;
  while (obstacles.length < count) {
    let p = spawn('obstacle');
    if (!p) 
      return;
    let d = directions[Math.floor(Math.random() * 4)];
    obstacles.push({x: p.x, y: p.y, dir: d});
  }
}
function moveObstacles() {
  for (let i = 0; i < obstacles.length; i++) {
    let o = obstacles[i];
    if (Math.random() < 0.15) 
      o.dir = directions[Math.floor(Math.random() * 4)];
    let choices = [o.dir, directions[0], directions[1], directions[2], directions[3]];
    for (let j = 0; j < choices.length; j++) {
      let d = choices[j], next = {x: o.x + d[0], y: o.y + d[1]};
      let body = snake.slice(1);
      if (contains(walls, next) || contains(body, next) || contains(obstacles, next) || same(next, apple)) 
        continue;
      o.x = next.x; o.y = next.y; o.dir = d;
      if (same(o, snake[0])) { 
        setState('dead'); 
        return; }
      break;
    }
  }
}

// 6. Vẽ bàn chơi và thông tin
function cell(p, color, pad = 1) {
  if (!p) 
    return;
  ctx.fillStyle = color;
  ctx.fillRect(p.x * C + pad, p.y * C + pad, C - pad * 2, C - pad * 2);
}
function draw() {
  let background = '#fff', wallColor = '#666';
  if (index === 4) { 
    background = '#edf5e8'; 
    wallColor = '#496b39'; 
  }
  ctx.fillStyle = background; 
  ctx.fillRect(0, 0, 600, 600);
  for (let i = 0; i < walls.length; i++) 
    cell(walls[i], wallColor);
  cell(gate, '#222'); 
  cell(door, '#222');
  if (hasKey) 
    cell(door, '#09c');
    cell(key, '#e5b000'); 
    cell(gold, '#e5b000');
  if (apple && apple.shield > 0) { 
    cell(apple, '#09c'); 
    cell(apple, '#e33', 6); }
  else 
    cell(apple, '#e33');
  for (let i = 0; i < obstacles.length; i++) 
    cell(obstacles[i], '#934fc4');
  for (let i = 0; i < snake.length; i++) 
    cell(snake[i], '#5b5');
  cell(snake[0], '#173');
  for (let i = 0; i < bullets.length; i++) 
    cell(bullets[i], '#09c', 8);
  let goal = 'Táo: ' + eaten + '/' + level.need;
  if (index === 1) {
    if (gate) 
      goal += ' · Cửa mê cung đang khóa';
    else goal += ' · Tìm Táo Vàng';
  }
  if (index === 4) {
    if (eaten < level.need) 
      goal += ' · Chìa khóa chưa xuất hiện';
    else if (!hasKey) 
      goal += ' · Tìm chìa khóa vàng';
    else goal += ' · Tìm cửa xanh';
  }
  if (index === 3) 
    goal += ' · Chướng ngại: ' + obstacles.length;
  if (index === 5) {
    if (reverseControls) goal += ' · ĐẢO: ←/A đi phải, →/D đi trái';
    else goal += ' · Trái/phải: BÌNH THƯỜNG';
  }
  get('lvl').textContent = 'Màn ' + (index + 1) + ': ' + level.name;
  get('obj').textContent = goal;
  get('sc').textContent = 'Điểm: ' + score;
  get('rule').textContent = level.description;
}

// 7. Tạm dừng, chơi lại, qua màn và trở về trang chủ
function setState(next) {
  state = next;
  get('ov').hidden = next === 'playing';
  get('pause-game').disabled = next !== 'playing' && next !== 'pause';
  get('pause-game').textContent = 'Tạm dừng · P';
  get('op').textContent = 'Điểm: ' + score;
  if (next === 'playing') { 
    draw(); 
    canvas.focus(); 
    return; 
  }
  if (next === 'pause') {
    get('pause-game').textContent = 'Tiếp tục · P';
    get('ot').textContent = 'Tạm dừng'; 
    get('ob').textContent = 'Tiếp tục';
  } else if (next === 'dead') {
    get('ot').textContent = 'Bạn đã thua'; 
    get('ob').textContent = 'Chơi lại';
  } else if (next === 'next') {
    get('ot').textContent = 'Hoàn thành màn!'; 
    get('ob').textContent = 'Màn tiếp theo';
  } else if (next === 'win') {
    get('ot').textContent = 'Chúc mừng!'; 
    get('ob').textContent = 'Chọn màn';
    get('op').textContent = 'Bạn đã hoàn thành cả ' + levels.length + ' màn chơi. Điểm: ' + score;
  }
  draw(); 
  get('ob').focus();
}
function complete() {
  if (index === levels.length - 1) 
    setState('win');
  else 
    setState('next');
}
function pause() {
  if (state === 'playing') 
    setState('pause');
  else if (state === 'pause') 
    setState('playing');
}
function menu() {
  savedState = state; 
  state = 'menu';
  get('game').hidden = true; 
  get('level-menu').hidden = false;
  get('resume-game').hidden = false;
  get('resume-game').textContent = 'Xem kết quả';
  if (savedState === 'playing' || savedState === 'pause') 
    get('resume-game').textContent = 'Tiếp tục lượt đang chơi';
    get('level-list').children[index].focus();
}
function act() {
  if (state === 'dead') 
    start(index, base);
  else if (state === 'next') 
    start(index + 1, score);
  else if (state === 'pause') 
    setState('playing');
  else if (state === 'win') 
    menu();
}
function resume() {
  get('level-menu').hidden = true; 
  get('game').hidden = false;
  setState(savedState);
}

// 8. Các nút bấm và bàn phím
get('choose-level').onclick = menu;
get('pause-game').onclick = pause;
get('ob').onclick = act;
get('resume-game').onclick = resume;
for (let i = 0; i < levels.length; i++) {
  let button = document.createElement('button');
  button.textContent = 'Màn ' + (i + 1) + ': ' + levels[i].name;
  button.onclick = function () { start(i); };
  get('level-list').appendChild(button);
}
document.addEventListener('keydown', function (e) {
  if (state === 'menu') 
    return;
  let k = e.key.toLowerCase();
  if (e.target.tagName === 'BUTTON' && (k === 'enter' || k === ' ')) 
    return;
  if (k === 'arrowup' || k === 'w') { e.preventDefault(); turn([0, -1]); }
  else if (k === 'arrowdown' || k === 's') { 
    e.preventDefault(); turn([0, 1]); 
  }
  else if (k === 'arrowleft' || k === 'a') { 
    e.preventDefault(); turn([-1, 0]); 
  }
  else if (k === 'arrowright' || k === 'd') { 
    e.preventDefault(); turn([1, 0]); 
  }
  else if (k === ' ' || k === 'enter') {
    e.preventDefault();
    if (state !== 'playing') 
      act();
    else if (k === ' ') 
      shoot();
  } else if (k === 'p' && !e.repeat) 
    pause();
});
document.addEventListener('visibilitychange', function () {
  if (document.hidden && state === 'playing') 
    pause();
});
setInterval(function () {
  if (state !== 'playing') 
    return;
  moveBullets(); 
  elapsed += 40; 
  obstacleTime += 40;
  if (index === 3 && obstacleTime >= 240) { 
    obstacleTime = 0; 
    moveObstacles(); 
  }
  if (state === 'playing' && elapsed >= 160) { 
    elapsed -= 160; step(); 
  }
  draw();
}, 40);
