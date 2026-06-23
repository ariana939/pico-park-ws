const canvas = document.createElement("canvas");

canvas.width = 1000;
canvas.height = 600;

document.body.style.margin = "0";
document.body.appendChild(canvas);

const ctx = canvas.getContext("2d");

if (!ctx) {
  throw new Error("No se pudo obtener el contexto del canvas");
}

ctx.fillStyle = "red";
ctx.fillRect(100, 100, 100, 100);
