const $ = id => document.getElementById(id);
const canvas = $('c'), ctx = canvas.getContext('2d'), levels = window.SnakeLevels;
const N = 25, C = canvas.width / N;
const same = (a, b) => a && b && a.x === b.x && a.y === b.y;
let level, index, snake, dir, queue, walls, apple, key, door, bullets;
let eaten, score, base, hasKey, elapsed = 0, lastShot = 0, state = 'menu', savedState;

function start(i, points = 0) {
  index = i; 
  level = levels[i]; 
  base = score = points; 
  eaten = elapsed = 0;
  snake = [{x: 3, y: 3}, {x: 2, y: 3}, {x: 1, y: 3}];
  dir = [1, 0]; 
  queue = []; 
  bullets = []; 
  walls = [];
  apple = key = door = null; 
  hasKey = false; 
  lastShot = -Infinity;
  if (!level.wrap) 
    for (let k = 0; k < N; k++)
    walls.push({x: k, y: 0}, {x: k, y: N - 1}, {x: 0, y: k}, {x: N - 1, y: k});
  walls.push(...(level.walls || []));
  if (level.key) {
     door = {x: N - 1, y: N - 2};
      key = spawn(); 
    }
  apple = spawn();
  $('level-menu').hidden = true; 
  $('game').hidden = false;
  savedState = null; 
  setState('playing');
}

// Chọn ô trống để thức ăn không trùng rắn, tường hoặc chìa khóa.
function spawn() {
  const free = [], 
  occupied = [...snake, ...walls, apple, key, door];
  for (let y = 0; y < N; y++) 
    for (let x = 0; x < N; x++)
    if (!occupied.some(p => same(p, {x, y}))) 
        free.push({x, y, shield: level.shield || 0});
  return free[Math.floor(Math.random() * free.length)];
}

function setState(next) {
  state = next;
  $('ov').hidden = next === 'playing';
  $('pause-game').disabled = !['playing', 'pause'].includes(next);
  $('pause-game').textContent = next === 'pause' ? 'Tiếp tục · P' : 'Tạm dừng · P';
  $('ot').textContent = {pause: 'Tạm dừng', dead: 'Bạn đã thua', next: 'Hoàn thành màn!', win: 'Bạn đã thắng!'}[next] || '';
  $('op').textContent = `Điểm: ${score}`;
  $('ob').textContent = {pause: 'Tiếp tục', dead: 'Chơi lại', next: 'Màn tiếp theo', win: 'Chọn màn'}[next] || '';
  draw();
  (next === 'playing' ? canvas : $('ob')).focus();
}

function menu() {
  savedState = state; state = 'menu';
  $('game').hidden = true; $('level-menu').hidden = false;
  $('resume-game').hidden = false;
  $('resume-game').textContent = ['playing', 'pause'].includes(savedState) ? 'Tiếp tục lượt đang chơi' : 'Xem kết quả';
  $('level-list').children[index].focus();
}

function act() {
  if (state === 'dead') 
    start(index, base);
  else if (state === 'next')
     start(index + 1, score);
  else if (state === 'win') 
    menu();
  else if (state === 'pause') 
    setState('playing');
}
function pause() {
  if (state === 'playing') 
    setState('pause');
  else if (state === 'pause') 
    setState('playing');
}
function complete() { 
    setState(index === levels.length - 1 ? 'win' : 'next'); 
}

function step() {
  if (queue.length) 
    dir = queue.shift();
  let head = {x: snake[0].x + dir[0], y: snake[0].y + dir[1]};
  if (level.wrap) 
    head = {x: (head.x + N) % N, y: (head.y + N) % N};
  if (same(head, door)) 
    return hasKey && eaten >= level.need ? complete() : setState('dead');
  const eat = same(head, apple) && !apple.shield;
  const body = eat ? snake : snake.slice(0, -1);
  if (head.x < 0 || head.x >= N || head.y < 0 || head.y >= N ||
      [...walls, ...body].some(p => same(p, head))) return setState('dead');
  snake.unshift(head);
  if (!eat) 
    snake.pop();
  if (same(head, key)) {
     key = null; hasKey = true; score += 20; 
    }
  if (eat) {
    eaten++; score += 10; apple = null;
    if (eaten >= level.need && !level.key) 
        return complete();
    if (eaten < level.need) 
        apple = spawn();
  }
}

function shoot() {
  if (state !== 'playing' || !level.shield || performance.now() - lastShot < 300) 
    return;
  lastShot = performance.now();
  bullets.push({...snake[0], dx: dir[0], dy: dir[1]});
}
function moveBullets() {
  bullets = bullets.filter(b => {
    b.x += b.dx; b.y += b.dy;
    if (b.x < 0 || b.x >= N || b.y < 0 || b.y >= N || walls.some(p => same(p, b))) 
        return false;
    if (same(b, apple) && apple.shield) { 
        apple.shield--; return false; 
    }
    return true;
  });
}

function cell(p, color, pad = 1) {
  if (!p) 
    return;
  ctx.fillStyle = color; 
  ctx.fillRect(p.x * C + pad, p.y * C + pad, C - pad * 2, C - pad * 2);
}
function draw() {
  ctx.fillStyle = '#fff'; 
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  walls.forEach(p => cell(p, '#666'));
  cell(door, hasKey && eaten >= level.need ? '#09c' : '#222');
  cell(key, '#e5b000'); 
  cell(apple, apple?.shield ? '#09c' : '#e33');
  if (apple?.shield) 
    cell(apple, '#e33', 6);
  snake.forEach((p, i) => cell(p, i ? '#5b5' : '#173'));
  bullets.forEach(p => cell(p, '#09c', 8));
  $('lvl').textContent = `Màn ${index + 1}: ${level.name}`;
  $('obj').textContent = `Táo: ${eaten}/${level.need}` + (level.key ? ` · Chìa khóa: ${hasKey ? 'Có' : 'Chưa có'}` : '');
  $('sc').textContent = `Điểm: ${score}`;
  $('rule').textContent = level.description;
}

function turn(next) {
  if (state !== 'playing') 
    return;
  const previous = queue.length ? queue[queue.length - 1] : dir;
  if (queue.length < 2 && next[0] * previous[0] + next[1] * previous[1] === 0) 
    queue.push(next);
}
const keys = {ArrowUp: [0, -1], w: [0, -1], ArrowDown: [0, 1], s: [0, 1],
  ArrowLeft: [-1, 0], a: [-1, 0], ArrowRight: [1, 0], d: [1, 0]};
document.addEventListener('keydown', e => {
  if (state === 'menu') 
    return;
  const k = e.key.length === 1 ? e.key.toLowerCase() : e.key;
  if (e.target.tagName === 'BUTTON' && (k === 'Enter' || k === ' ')) 
    return;
  if (keys[k]) {
     e.preventDefault(); turn(keys[k]); 
    }
  else if (k === ' ' || k === 'Enter') {
     e.preventDefault(); 
     if (state !== 'playing')
         act(); 
        else if (k === ' ')
             shoot(); 
            }
  else if (k === 'p' && !e.repeat) 
    pause();
});
document.addEventListener('visibilitychange', () => { if (document.hidden && state === 'playing') 
    pause(); 
});
let touch;
canvas.addEventListener('touchstart', e => { touch = e.touches[0]; }, {passive: true});
canvas.addEventListener('touchcancel', () => { touch = null; });
canvas.addEventListener('touchend', e => {
  if (!touch)
     return;
  const dx = e.changedTouches[0].clientX - touch.clientX, dy = e.changedTouches[0].clientY - touch.clientY;
  touch = null;
  if (Math.max(Math.abs(dx), Math.abs(dy)) < 20)
     shoot();
  else 
    turn(Math.abs(dx) > Math.abs(dy) ? [Math.sign(dx), 0] : [0, Math.sign(dy)]);
});
$('choose-level').onclick = menu; 
$('pause-game').onclick = pause; 
$('ob').onclick = act;
$('resume-game').onclick = () => {
  $('level-menu').hidden = true; 
  $('game').hidden = false; 
  setState(savedState);
};
levels.forEach((item, i) => {
  const button = document.createElement('button');
  button.textContent = `Màn ${i + 1}: ${item.name}`;
  button.onclick = () => start(i); $('level-list').appendChild(button);
});
setInterval(() => {
  if (state !== 'playing') 
    return;
  moveBullets(); 
  elapsed += 40;
  if (elapsed >= level.tick) { 
    elapsed -= level.tick; step(); 
}
  draw();
}, 40);
