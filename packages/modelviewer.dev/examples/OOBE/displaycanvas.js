class DisplayCanvas {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = this.canvas.getContext('2d');
    this.canvas.height = 384;
    this.canvas.width = this.canvas.height;
    this.ctx.fillStyle = '#000';
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    this.date = new Date();
    this.initialDate = new Date('August 19, 1975 10:09:36');
    this.secondColor = '#50cd9d';
    this.hourColor = '#abffdf';
    this.startTime = performance.now();
    this.image = document.getElementById('complicationImage');
  }

  showComplication() {
    const {ctx} = this;
    ctx.shadowColor = '#00000000';
    ctx.globalCompositeOperation = 'source-over';
    ctx.drawImage(this.image, 0, 0);
    ctx.globalCompositeOperation = 'multiply';
    ctx.fillStyle = this.hourColor;
    ctx.fillRect(179, 229, 26, 26);
    ctx.globalCompositeOperation = 'source-over';
  }

  showCenterDial() {
    const {ctx, canvas} = this;
    ctx.beginPath();
    ctx.arc(canvas.width / 2, canvas.height / 2, 2, 0, Math.PI * 2);
    ctx.lineWidth = 3.5;
    ctx.shadowColor = '#00000000';
    ctx.fillStyle = '#353535';
    ctx.strokeStyle = this.secondColor;
    ctx.stroke();
  }

  hourAngle() {
    const {date} = this;
    const hour = date.getHours();
    const min = date.getMinutes();
    const sec = date.getSeconds();
    return 2 * Math.PI * (hour - 3 + min / 60 + sec / 3600) / 12;
  }

  minuteAngle() {
    const {date} = this;
    const min = date.getMinutes();
    const sec = date.getSeconds();
    const ms = date.getMilliseconds();
    return 2 * Math.PI * (min - 15 + sec / 60 + ms / 60000) / 60;
  }

  secondAngle() {
    const {date} = this;
    const sec = date.getSeconds();
    const ms = date.getMilliseconds();
    return 2 * Math.PI * (sec - 15 + ms / 1000) / 60;
  }

  drawHand(length, width, angle, color) {
    const {ctx, canvas} = this;
    ctx.lineWidth = width;
    ctx.beginPath();
    ctx.moveTo(canvas.width / 2, canvas.height / 2);  // START FROM CENTER.
    // DRAW THE LENGTH.
    ctx.lineTo(
        (canvas.width / 2 + Math.cos(angle) * length),
        canvas.height / 2 + Math.sin(angle) * length);

    if (color) {
      ctx.strokeStyle = color;
      ctx.lineCap = 'round';
      ctx.shadowColor = '#00000000';
    } else {  // shadow
      ctx.strokeStyle = '#000000';
      ctx.lineCap = 'round';
      ctx.shadowColor = 'black';
      ctx.shadowBlur = 4;
    }
    ctx.stroke();
  }

  update() {
    this.date.setTime(
        this.initialDate.getTime() + performance.now() - this.startTime);
    const secHandLength = 174;
    const minHandLength = 171;
    const hourHandLength = 100;
    const secHandWidth = 2;
    const minHandWidth = 7;
    const hourHandWidth = 30;

    this.showComplication();
    this.drawHand(secHandLength, secHandWidth, this.secondAngle());
    this.drawHand(minHandLength, minHandWidth, this.minuteAngle());
    this.drawHand(hourHandLength, hourHandWidth, this.hourAngle());
    this.drawHand(
        secHandLength, secHandWidth, this.secondAngle(), this.secondColor);
    this.drawHand(minHandLength, minHandWidth, this.minuteAngle(), '#fff');
    this.drawHand(
        hourHandLength, hourHandWidth, this.hourAngle(), this.hourColor);
    this.showCenterDial();
  }
}

export {DisplayCanvas};