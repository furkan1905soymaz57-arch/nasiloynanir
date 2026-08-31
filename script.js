const canvas = document.getElementById('c');
const ctx = canvas.getContext('2d');
let w=canvas.width=innerWidth;let h=canvas.height=innerHeight;
window.addEventListener('resize',()=>{w=canvas.width=innerWidth;h=canvas.height=innerHeight})

class P{constructor(){this.reset()}reset(){this.x=Math.random()*w;this.y=Math.random()*h;this.r=1+Math.random()*3;this.vx=(Math.random()-0.5)*0.6;this.vy=(Math.random()-0.5)*0.6;this.alpha=0.2+Math.random()*0.8}}
const ps=new Array(140).fill().map(()=>new P())
function draw(){ctx.clearRect(0,0,w,h);
  for(const p of ps){p.x+=p.vx;p.y+=p.vy;p.alpha+= (Math.random()-0.5)*0.02;
    if(p.x<-50||p.x>w+50||p.y<-50||p.y>h+50||p.alpha<=0){p.reset()}
    const grad=ctx.createRadialGradient(p.x,p.y,0,p.x,p.y,p.r*6);
    grad.addColorStop(0,'rgba(126,249,255,'+ (0.12*p.alpha) +')');
    grad.addColorStop(1,'rgba(126,249,255,0)');
    ctx.fillStyle=grad;ctx.beginPath();ctx.arc(p.x,p.y,p.r,0,Math.PI*2);ctx.fill()
  }
  requestAnimationFrame(draw)
}
draw()

// Subtle parallax on mouse
document.addEventListener('mousemove',e=>{
  const nx=(e.clientX/w-0.5)*20;const ny=(e.clientY/h-0.5)*20;
  document.querySelector('.plate').style.transform=`translate(${nx}px,${ny}px)`
})
