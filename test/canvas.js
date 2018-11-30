
/**
 * canvas chart
 * author:jeff zhong
 */
window.requestAnimationFrame = window.requestAnimationFrame || window.webkitRequestAnimationFrame || window.mozRequestAnimationFrame || window.oRequestAnimationFrame || window.msRequestAnimationFrame || function(callback) {
  return window.setTimeout(callback, 1000 / 60); };

function roundRect(ctx, x, y, width, height, radius) {
  ctx.beginPath();
  if (width > 0) {
    ctx.moveTo(x + radius, y);
  } else {
    ctx.moveTo(x - radius, y);
  }

  ctx.arcTo(x + width, y, x + width, y + height, radius);
  ctx.arcTo(x + width, y + height, x, y + height, radius);
  ctx.arcTo(x, y + height, x, y, radius);

  if (width > 0) {
    ctx.arcTo(x, y, x + radius, y, radius);
  } else {
    ctx.arcTo(x, y, x - radius, y, radius);
  }
}

function calculateNum(arr, isMin) {
  if (!arr || !arr.length) {
    return { num: 0, step: 0, min: 0, max: 0 };
  }
  var high = Math.max.apply(this, arr),
    low = Math.min.apply(this, arr),
    num = 0,
    max = 0,
    min = 0,
    pow, sum, step, absLow, i, j, k = 0;
  outer:
    for (i = 0; i < 10; i++) {
      pow = Math.pow(10, i);
      for (j = 1; j <= 10; j++) {
        sum = pow * j;
        if (sum > high) {
          max = sum;
          break;
        }
      }
      if (!max) continue;
      if (i < 2||j>4) break;
      for (k = 0; k < 10; k++) {
        if (max - pow / 10 * (k + 1) <= high) {
          max -= pow / 10 * k;
          break outer;
        }
      }
    }
  num = j;
  if(num<4){
    if(max%4==0){num=4;}
    if(max%3==0){num=3;}
  }

  step = Math.round(max / num * 100) / 100;

  if (low < 0) {
    absLow = Math.abs(low);
    num++;
    min += step;
    while (min < absLow) {
      num++;
      min += step;
    }
    min = -min;
  }

  if (isMin) {
    var l = num,
      m = 0;
    for (var i = 1; i < l; i++) {
      var n = min + i * step;
      if (low < n) {
        break; }
      m = n;
      num--;
    }
    min = m;
  }

  return {
    num: num,
    step: step,
    min: min,
    max: max
  }
}
/**
 * 图表基类
 */
class Chart {
  constructor(container) {
    this.container = container;
    this.canvas = document.createElement('canvas');
    this.ctx = this.canvas.getContext('2d');
    this.W = 1000;
    this.H = 600;
    this.padding = 120;
    this.paddingTop = 50;
    this.title = '';
    this.legend = [];
    this.series = [];
    this.xAxis = {
      show: true
    };
    this.yAxis = [];
    this.animateArr = [];
    this.info = {};
    this.drawing = false;
  }
  init(opt) {
    Object.assign(this, opt);
    if (!this.container) return;
    //通过缩小一倍，解决字体模糊问题
    this.W *= 2;
    this.H *= 2;
    this.canvas.width = this.W;
    this.canvas.height = this.H;
    this.canvas.style.width = this.W / 2 + 'px';
    this.canvas.style.height = this.H / 2 + 'px';
    this.container.style.position = 'relative';
    this.tip = document.createElement('div');
    this.tip.style.cssText = 'display: none; position: absolute; opacity: 0.5; background: #000; color: #fff; border-radius: 5px; padding: 5px; font-size: 8px; z-index: 99;';
    this.container.appendChild(this.canvas);
    this.container.appendChild(this.tip);
    this.create();
    this.bindEvent();
  }
  showInfo(pos, title, arr) {
    var box = this.canvas.getBoundingClientRect(),
      con = this.container.getBoundingClientRect(),
      html = '',
      txt = '';
    html += '<p>' + title + '</p>';
    arr.forEach(obj => {
      txt = this.yAxis.formatter ? this.yAxis.formatter.replace('{value}', obj.num) : obj.num;
      html += '<p>' + obj.name + ': ' + txt + '</p>';
    })
    this.tip.innerHTML = html;
    this.tip.style.left = (pos.x + (box.left - con.left) + 15) + 'px';
    this.tip.style.top = (pos.y + (box.top - con.top) + 15) + 'px';
    this.tip.style.display = 'block';
  }
}
/**
 * 柱状图
 */
class Bar extends Chart {
  constructor(container) {
    super(container);
  }
  bindEvent() {
    var that = this,
      canvas = this.canvas,
      ctx = this.ctx,
      xl = this.xAxis.data.length,
      xs = (that.W - 2 * that.padding) / xl,
      index = 0;

    if (!this.series.length) return;
    this.canvas.addEventListener('mousemove', function(e) {
      var isLegend = false;
      var box = canvas.getBoundingClientRect(),
        pos = {
          x: e.clientX - box.left,
          y: e.clientY - box.top
        };
      // 分组标签
      for (var i = 0, item, len = that.legend.length; i < len; i++) {
        item = that.legend[i];
        roundRect(ctx, item.x, item.y, item.w, item.h, item.r);
        // 因为缩小了一倍，所以坐标要*2
        if (ctx.isPointInPath(pos.x * 2, pos.y * 2)) {
          canvas.style.cursor = 'pointer';
          isLegend = true;
          break;
        }
        canvas.style.cursor = 'default';
      }

      if (isLegend) return;
      // 鼠标位置在图表中时
      if (pos.y * 2 > that.padding + that.paddingTop && pos.y * 2 < that.H - that.padding && pos.x * 2 > that.padding && pos.x * 2 < that.W - that.padding) {
        canvas.style.cursor = 'pointer';
        for (var i = 0; i < xl; i++) {
          if (pos.x * 2 > that.padding + i * xs) {
            index = i;
          }
        }

        that.clearGrid(index);

        // 获取处于当前位置的信息
        var arr = [];
        for (var j = 0, item, l = that.animateArr.length; j < l; j++) {
          item = that.animateArr[j];
          if (item.hide) continue;
          arr.push({ name: item.name, num: item.data[index].num })
        }
        that.showInfo(pos, that.xAxis.data[index], arr);
      } else {
        that.tip.style.display = 'none';
        that.clearGrid();
      }
    }, false);

    this.canvas.addEventListener('mousedown', function(e) {
      e.preventDefault();
      var box = canvas.getBoundingClientRect(),
        pos = {
          x: e.clientX - box.left,
          y: e.clientY - box.top
        };
      for (var i = 0, item, len = that.legend.length; i < len; i++) {
        item = that.legend[i];
        roundRect(ctx, item.x, item.y, item.w, item.h, item.r);
        // 因为缩小了一倍，所以坐标要*2
        if (ctx.isPointInPath(pos.x * 2, pos.y * 2)) {
          that.series[i].hide = !that.series[i].hide;
          that.create();
          break;
        }
      }

    }, false);
  }
  clearGrid(index) {
    var that = this,
      ctx = this.ctx,
      xl = this.xAxis.data.length,
      xs = (this.W - 2 * this.padding) / xl,
      h = this.H - 2 * this.padding - this.paddingTop;

    ctx.clearRect(0, 0, that.W, that.H);
    // 画坐标系
    this.drawAxis();
    // 画标签
    this.drawTag();
    // 画y轴刻度
    this.drawY();

    ctx.save();
    ctx.translate(that.padding, that.H - that.padding);
    // 选中组
    if (typeof index == 'number') {
      ctx.fillStyle = 'hsla(0,0%,70%,0.5)';
      ctx.fillRect(xs * index, -h, xs, h - 1);
    }

    for (var i = 0, item, il = that.animateArr.length; i < il; i++) {
      item = that.animateArr[i];
      if (item.hide) continue;
      ctx.strokeStyle = item.color;
      ctx.lineWidth = item.data[0].w;

      for (var j = 0, obj, jl = item.data.length; j < jl; j++) {
        obj = item.data[j];
        ctx.beginPath();
        ctx.moveTo(obj.x + obj.w / 2, -obj.h);
        ctx.lineTo(obj.x + obj.w / 2, -1);
        ctx.stroke();
        // ctx.fillRect(obj.x,-obj.h,obj.w,obj.h-1);
      }
    }
    ctx.restore();
  }
  animate() {
    var that = this,
      ctx = this.ctx,
      obj, h = 0,
      isStop = true;

    (function run() {
      ctx.clearRect(0, that.padding + that.paddingTop - 5, that.W, that.H - 2 * that.padding - that.paddingTop + 4);
      that.drawY();
      ctx.save();
      ctx.translate(that.padding, that.H - that.padding);
      isStop = true;
      for (var i = 0, item; i < that.animateArr.length; i++) {
        item = that.animateArr[i];
        if (item.hide) continue;
        ctx.strokeStyle = item.color;
        ctx.lineWidth = item.data[0].w;
        item.isStop = true;
        for (var j = 0, jl = item.data.length; j < jl; j++) {
          obj = item.data[j];
          if (obj.p > obj.h) {
            h = obj.y - 8;
            if (h < obj.h) {
              obj.y = obj.p = obj.h;
            }
          } else {
            h = obj.y + 8;
            if (h > obj.h) {
              obj.y = obj.p = obj.h;
            }
          }
          if (obj.p != obj.h) {
            obj.y = h;
            item.isStop = false;
          }

          ctx.beginPath();
          ctx.moveTo(obj.x + obj.w / 2, -obj.y);
          ctx.lineTo(obj.x + obj.w / 2, -1);
          ctx.stroke();
        }
        if (!item.isStop) { isStop = false; }
      }
      ctx.restore();
      if (isStop) return;
      requestAnimationFrame(run);
    }())
  }
  create() {
    // 画坐标系
    this.drawAxis();
    // 组织数据
    this.initData();
    // 画标签
    this.drawTag();
    // 画y轴刻度
    this.drawY();
    // 执行动画
    this.animate();
  }
  initData() {
    var that = this,
      xl = this.xAxis.data.length,
      xs = (this.W - 2 * this.padding) / xl,
      ydis = this.H - this.padding * 2 - this.paddingTop,
      item, obj, arr = [],
      sp = 0,
      sl = 0,
      min = 0,
      max = 0,
      w = 0,
      h = 0,
      index = 0;

    if (!this.series.length) return;
    for (var i = 0; i < this.series.length; i++) {
      item = this.series[i];
      if (!item.data || !item.data.length) {
        this.series.splice(i--, 1);
        continue;
      }
      // 赋予没有颜色的项
      if (!item.color) {
        var hsl = i % 2 ? 180 + 30 * (i - 1) : 30 * i / 2;
        item.color = 'hsla(' + hsl + ',70%,60%,1)';
      }
      item.name = item.name || 'unnamed';

      if (item.hide) continue;
      sl++;
      arr = arr.concat(item.data.slice(0, xl));
    }
    // 计算数据在Y轴刻度
    this.info = calculateNum(arr);
    min = this.info.min;
    max = this.info.max;

    for (var i = 0; i < this.series.length; i++) {
      item = this.series[i];
      sp = Math.max(Math.pow(10 - sl, 2) / 3 - 4, 5);
      w = (xs - sp * (sl + 1)) / sl;

      if (!this.animateArr[i]) {
        obj = Object.assign({}, {
          i: index,
          isStop: true,
          create: true,
          hide: !!item.hide,
          name: item.name,
          color: item.color,
          data: []
        });

        item.data.slice(0, xl).forEach((d, j) => {
          h = Math.floor((d - min) / (max - min) * ydis + 2);
          obj.data.push({
            num: d,
            h: h,
            p: 0,
            w: Math.round(w),
            x: Math.round(xs * j + w * index + sp * (index + 1)),
            y: 0,
            vy: Math.max(300, Math.floor(h * 2)) / 100
          });
        });
        this.animateArr.push(obj);

      } else { //更新
        if (that.animateArr[i].hide && !item.hide) {
          that.animateArr[i].create = true;
        } else {
          that.animateArr[i].create = false;
        }
        that.animateArr[i].hide = item.hide;
        that.animateArr[i].i = index;
        item.data.slice(0, xl).forEach((d, j) => {
          if (that.animateArr[i].create) {
            that.animateArr[i].data[j].y = 0;
            that.animateArr[i].data[j].p = 0;
          }
          h = Math.floor((d - min) / (max - min) * ydis + 2);
          that.animateArr[i].data[j].w = Math.round(w);
          that.animateArr[i].data[j].x = xs * j + w * index + sp * (index + 1);
          that.animateArr[i].data[j].h = h;
          that.animateArr[i].data[j].vy = Math.max(300, Math.floor(h * 2)) / 100;
        });
      }
      if (!item.hide) { index++; }
    }
  }
  drawAxis() {
    var that = this,
      ctx = this.ctx,
      W = this.W,
      H = this.H,
      padding = this.padding,
      paddingTop = this.paddingTop,
      xl = 0,
      xs = 0; //x轴单位数，每个单位长度

    ctx.fillStyle = 'hsla(0,0%,30%,1)';
    ctx.strokeStyle = 'hsla(0,0%,20%,1)';
    ctx.lineWidth = 1;
    ctx.textAlign = 'center';
    ctx.textBaseLine = 'middle';
    ctx.font = '24px arial';

    ctx.clearRect(0, 0, W, H);
    if (this.title) {
      ctx.save();
      ctx.textAlign = 'left';
      ctx.font = 'bold 40px arial';
      ctx.fillText(this.title, padding - 50, 70);
      ctx.restore();
    }
    if (this.yAxis && this.yAxis.name) {
      ctx.fillText(this.yAxis.name, padding, padding + paddingTop - 30);
    }

    // x轴
    ctx.save();
    ctx.beginPath();
    ctx.translate(padding, H - padding);
    ctx.moveTo(0, 0);
    ctx.lineTo(W - 2 * padding, 0);
    ctx.stroke();
    // x轴刻度
    if (this.xAxis && (xl = this.xAxis.data.length) && this.xAxis.show) {
      xs = (W - 2 * padding) / (xl);
      this.xAxis.data.forEach((txt, i) => {
        var x = xs * (i + 1);
        ctx.moveTo(x, 0);
        ctx.lineTo(x, 10);
        ctx.stroke();
        ctx.fillText(txt, x - xs / 2, 40);
      });
    }
    ctx.restore();

    // y轴
    ctx.save();
    ctx.beginPath();
    ctx.strokeStyle = 'hsl(220,100%,50%)';
    ctx.translate(padding, H - padding);
    ctx.moveTo(0, 0);
    ctx.lineTo(0, 2 * padding + paddingTop - H);
    ctx.stroke();
    ctx.restore();
  }

  drawTag() {
    var tw = 0,
      item, ctx = this.ctx;
    for (var i = 0; i < this.series.length; i++) {
      item = this.series[i];
      // 画分组标签
      ctx.save();
      ctx.translate(this.padding + this.W / 4, this.paddingTop + 40);
      this.legend.push({
        hide: !!item.hide,
        name: item.name,
        color: item.color,
        x: this.padding + this.W / 4 + i * 90 + tw,
        y: this.paddingTop + 40,
        w: 60,
        h: 30,
        r: 5
      });
      ctx.textAlign = 'left';
      ctx.fillStyle = item.color;
      ctx.strokeStyle = item.color;
      roundRect(ctx, i * 90 + tw, 0, 60, 30, 5);
      ctx.globalAlpha = item.hide ? 0.3 : 1;
      ctx.fill();
      ctx.fillText(item.name, i * 90 + tw + 70, 26);
      tw += ctx.measureText(item.name).width; //计算字符长度
      ctx.restore();
    }
  }

  drawY() {
    var padding = this.padding,
      xdis = this.W - padding * 2,
      ydis = this.H - padding * 2 - this.paddingTop,
      yl = this.info.num,
      ys = ydis / yl,
      ctx = this.ctx;

    // y轴
    ctx.save();
    ctx.beginPath();
    ctx.strokeStyle = 'hsl(220,100%,50%)';
    ctx.translate(padding, this.H - padding);
    ctx.moveTo(0, 0);
    ctx.lineTo(0, 2 * padding + this.paddingTop - this.H);
    ctx.stroke();
    ctx.restore();

    //画Y轴刻度
    ctx.save();
    ctx.fillStyle = 'hsl(200,100%,60%)';
    ctx.translate(padding, this.H - padding);
    for (var i = 0; i <= yl; i++) {
      ctx.beginPath();
      ctx.strokeStyle = 'hsl(220,100%,50%)';
      ctx.moveTo(-10, -Math.floor(ys * i));
      ctx.lineTo(0, -Math.floor(ys * i));
      ctx.stroke();

      if (i > 0) {
        ctx.beginPath();
        ctx.strokeStyle = 'hsla(0,0%,80%,1)';
        ctx.moveTo(0, -Math.floor(ys * i));
        ctx.lineTo(xdis, -Math.floor(ys * i));
        ctx.stroke();
      }

      ctx.textAlign = 'right';
      var dim = Math.floor(this.info.step * i + this.info.min),
        txt = this.yAxis.formatter ? this.yAxis.formatter.replace('{value}', dim) : dim;
      ctx.fillText(txt, -20, -ys * i + 10);
    }
    ctx.restore();
    //画数据
  }
}


