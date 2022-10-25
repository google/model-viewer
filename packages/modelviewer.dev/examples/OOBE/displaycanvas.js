class DisplayCanvas {
  constructor(scene, clock) {
    this.canvas = document.createElement('canvas');
    this.ctx = this.canvas.getContext('2d');
    this.canvas.height = 384;
    this.canvas.width = this.canvas.height;
    this.ctx.fillStyle = '#000';
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    this.date = new Date();
    this.initialDate = new Date('August 19, 1975 10:09:36');
    this.secondColor = '#50cd9d';
    this.hourColor = '#abffdf';
    this.clock = clock;
    this.clock.start();
  }

  SHOW_COMPLICATION(canvas, ctx) {
    var image = document.getElementById("complicationImage");

    ctx.shadowColor = "#00000000";
    ctx.globalCompositeOperation = "source-over";
    ctx.drawImage(image, 0,0);
    ctx.globalCompositeOperation = "multiply";
    ctx.fillStyle = this.hourColor;
    ctx.fillRect(179, 229, 26, 26);
    ctx.globalCompositeOperation = "source-over";
  }

  SHOW_CENTER_DIAL(canvas, ctx) {
    ctx.beginPath();
    ctx.arc(canvas.width / 2, canvas.height / 2, 2, 0, Math.PI * 2);
    ctx.lineWidth = 3.5;
    ctx.shadowColor = "#00000000";
    ctx.fillStyle = '#353535';
    ctx.strokeStyle = this.secondColor;
    ctx.stroke();
  }

  SHOW_SECONDS_SHADOW(canvas, ctx, date, handLength) {
    var sec = date.getSeconds();
    var ms = date.getMilliseconds();
    var angle = ((Math.PI * 2) * ((sec / 60) + (ms / 60000))) - ((Math.PI * 2) / 4);
    ctx.lineWidth = 2;              // HAND WIDTH.

    ctx.beginPath();
    // START FROM CENTER OF THE CLOCK.
    ctx.moveTo(canvas.width / 2, canvas.height / 2);
    // DRAW THE LENGTH.
    ctx.lineTo((canvas.width / 2 + Math.cos(angle) * handLength),
        canvas.height / 2 + Math.sin(angle) * handLength);

    ctx.strokeStyle = '#000000';        // COLOR OF THE HAND.

    ctx.lineCap = "round";
    ctx.shadowColor = 'black';
    ctx.shadowBlur = 4;

    ctx.stroke();
  }

  SHOW_SECONDS(canvas, ctx, date, handLength) {
    var sec = date.getSeconds();
    var ms = date.getMilliseconds();
    var angle = ((Math.PI * 2) * ((sec / 60) + (ms / 60000))) - ((Math.PI * 2) / 4);
    ctx.lineWidth = 2;              // HAND WIDTH.

    ctx.beginPath();
    // START FROM CENTER OF THE CLOCK.
    ctx.moveTo(canvas.width / 2, canvas.height / 2);
    // DRAW THE LENGTH.
    ctx.lineTo((canvas.width / 2 + Math.cos(angle) * handLength),
        canvas.height / 2 + Math.sin(angle) * handLength);

    ctx.shadowColor = "#00000000";
    ctx.strokeStyle = this.secondColor;        // COLOR OF THE HAND.
    ctx.stroke();
  }

  SHOW_MINUTES_SHADOW(canvas, ctx, date, handLength) {

    var min = date.getMinutes();
    var sec = date.getSeconds();
    var ms = date.getMilliseconds();
    var angle = ((Math.PI * 2) * ((min / 60) + (sec / 3600) + (ms / 3600000))) - ((Math.PI * 2) / 4);
    ctx.lineWidth = 7;              // HAND WIDTH.

    ctx.beginPath();
    ctx.moveTo(canvas.width / 2, canvas.height / 2);  // START FROM CENTER.
    // DRAW THE LENGTH.
    ctx.lineTo((canvas.width / 2 + Math.cos(angle) * handLength),
        canvas.height / 2 + Math.sin(angle) * handLength);

    ctx.strokeStyle = '#000000';        // COLOR OF THE HAND.

    ctx.lineCap = "round";
    ctx.shadowColor = 'black';
    ctx.shadowBlur = 4;

    ctx.stroke();
  }

  SHOW_MINUTES(canvas, ctx, date, handLength) {

    var min = date.getMinutes();
    var sec = date.getSeconds();
    var ms = date.getMilliseconds();
    var angle = ((Math.PI * 2) * ((min / 60) + (sec / 3600) + (ms / 3600000))) - ((Math.PI * 2) / 4);
    ctx.lineWidth = 7;              // HAND WIDTH.

    ctx.beginPath();
    ctx.moveTo(canvas.width / 2, canvas.height / 2);  // START FROM CENTER.
    // DRAW THE LENGTH.
    ctx.lineTo((canvas.width / 2 + Math.cos(angle) * handLength),
        canvas.height / 2 + Math.sin(angle) * handLength);

    ctx.shadowColor = "#00000000";
    ctx.lineCap = "round";
    ctx.strokeStyle = '#fff';  // COLOR OF THE HAND.
    ctx.stroke();
  }

  SHOW_HOURS_SHADOW(canvas, ctx, date, handLength) {

    var hour = date.getHours();
    var min = date.getMinutes();
    var sec = date.getSeconds();
    var angle = ((Math.PI * 2) * ((hour * 5 + (min / 60) * 5 + (sec / 3600) * 5) / 60)) - ((Math.PI * 2) / 4);
    ctx.lineWidth = 30;              // HAND WIDTH.

    ctx.beginPath();
    ctx.moveTo(canvas.width / 2, canvas.height / 2);     // START FROM CENTER.
    // DRAW THE LENGTH.
    ctx.lineTo((canvas.width / 2 + Math.cos(angle) * handLength),
        canvas.height / 2 + Math.sin(angle) * handLength);

    ctx.strokeStyle = '#000000';        // COLOR OF THE HAND.

    ctx.lineCap = "round";
    ctx.shadowColor = 'black';
    ctx.shadowBlur = 4;

    ctx.stroke();
   }

  SHOW_HOURS(canvas, ctx, date, handLength) {

    var hour = date.getHours();
    var min = date.getMinutes();
    var sec = date.getSeconds();
    var angle = ((Math.PI * 2) * ((hour * 5 + (min / 60) * 5 + (sec / 3600) * 5) / 60)) - ((Math.PI * 2) / 4);
    ctx.lineWidth = 30;              // HAND WIDTH.

    ctx.beginPath();
    ctx.moveTo(canvas.width / 2, canvas.height / 2);     // START FROM CENTER.
    // DRAW THE LENGTH.
    ctx.lineTo((canvas.width / 2 + Math.cos(angle) * handLength),
        canvas.height / 2 + Math.sin(angle) * handLength);

    ctx.shadowColor = "#00000000";
    ctx.lineCap = "round";
    ctx.strokeStyle = this.hourColor;   // COLOR OF THE HAND.
    ctx.stroke();
   }

  update() {
    // DEFINE CANVAS AND ITS CONTEXT.
    this.date.setTime(this.initialDate.getTime() + (this.clock.elapsedTime*1000));
    var angle;
    var secHandLength = 174;
    var minHandLength = 171;
    var hourHandLength = 100;

    this.SHOW_COMPLICATION(this.canvas, this.ctx);
    this.SHOW_SECONDS_SHADOW(this.canvas, this.ctx, this.date, secHandLength);
    this.SHOW_MINUTES_SHADOW(this.canvas, this.ctx, this.initialDate, minHandLength);
    this.SHOW_HOURS_SHADOW(this.canvas, this.ctx, this.initialDate, hourHandLength);
    this.SHOW_HOURS(this.canvas, this.ctx, this.initialDate, hourHandLength);
    this.SHOW_MINUTES(this.canvas, this.ctx, this.initialDate, minHandLength);
    this.SHOW_SECONDS(this.canvas, this.ctx, this.date, secHandLength);
    this.SHOW_CENTER_DIAL(this.canvas, this.ctx);
  }
}

export { DisplayCanvas };