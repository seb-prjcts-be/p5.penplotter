(function(global){
  'use strict';
  const C={black:'#000000',cyan:'#00ffff',pink:'#ff00ff',white:'#ffffff'};
  const glyphs={
    A:'010101111101101',B:'110101110101110',C:'011100100100011',D:'110101101101110',
    E:'111100110100111',F:'111100110100100',G:'011100101101011',H:'101101111101101',
    I:'111010010010111',J:'001001001101010',K:'101101110101101',L:'100100100100111',
    M:'101111111101101',N:'101111111111101',O:'010101101101010',P:'110101110100100',
    Q:'010101101111011',R:'110101110101101',S:'011100010001110',T:'111010010010010',
    U:'101101101101111',V:'101101101101010',W:'101101111111101',X:'101101010101101',
    Y:'101101010010010',Z:'111001010100111',
    0:'111101101101111',1:'010110010010111',2:'110001010100111',3:'110001010001110',
    4:'101101111001001',5:'111100110001110',6:'011100111101111',7:'111001010010010',
    8:'111101111101111',9:'111101111001110',
    '.':'000000000000010',':':'000010000010000','/':'001001010100100','-':'000000111000000',
    '>':'100010001010100','<':'001010100010001','(':'001010010010001',')':'100010010010100',
    '{':'011010110010011','}':'110010011010110','[':'110100100100110',']':'011001001001011',
    '=':'000111000111000',';':'000010000010100','%':'101001010100101','+':'000010111010000',
    ',':'000000000010100','"':'101101000000000',"'":'010010000000000','_':'000000000000111',
    '*':'000101010101000','!':'010010010000010','?':'110001010000010','#':'101111101111101'
  };
  const scenes=[
    {slug:'first-circle',name:'YOUR FIRST CIRCLE'},
    {slug:'plot-prefix',name:'LINE() OR PLOT.LINE()'},
    {slug:'no-loop',name:'ONE PICTURE, ONE PLOT'}
  ];
  const clamp=(v)=>Math.max(0,Math.min(1,v));
  const span=(t,a,b)=>clamp((t-a)/(b-a));

  function createRenderer(ctx,data){
    function box(x,y,w,h,color){ctx.fillStyle=color;ctx.fillRect(Math.round(x),Math.round(y),Math.round(w),Math.round(h));}
    function text(s,x,y,color=C.white,size=1){
      s=String(s).toUpperCase();
      for(let i=0;i<s.length;i++){const bits=glyphs[s[i]];if(!bits)continue;
        for(let j=0;j<15;j++)if(bits[j]==='1')box(x+(i*4+j%3)*size,y+Math.floor(j/3)*size,size,size,color);}
    }
    function line(x0,y0,x1,y1,color,dashed=false){
      x0=Math.round(x0);y0=Math.round(y0);x1=Math.round(x1);y1=Math.round(y1);
      const dx=Math.abs(x1-x0),sx=x0<x1?1:-1,dy=-Math.abs(y1-y0),sy=y0<y1?1:-1;let error=dx+dy,n=0;
      for(;;){if(!dashed||n++%5<2)box(x0,y0,1,1,color);if(x0===x1&&y0===y1)break;
        const e=error*2;if(e>=dy){error+=dy;x0+=sx;}if(e<=dx){error+=dx;y0+=sy;}}
    }
    function outline(x,y,w,h,color){line(x,y,x+w,y,color);line(x+w,y,x+w,y+h,color);line(x+w,y+h,x,y+h,color);line(x,y+h,x,y,color);}
    function polyline(points,color,progress=1){
      const n=points.length-1;let remaining=progress*n,head=points[0];
      for(let i=1;i<=n;i++){
        if(remaining<=0)break;
        const part=Math.min(1,remaining);
        head=[points[i-1][0]+(points[i][0]-points[i-1][0])*part,points[i-1][1]+(points[i][1]-points[i-1][1])*part];
        line(points[i-1][0],points[i-1][1],head[0],head[1],color);remaining--;
      }
      return head;
    }
    function circlePoints(cx,cy,r,steps=48){
      const out=[];for(let i=0;i<=steps;i++){const a=i/steps*Math.PI*2;out.push([cx+r*Math.cos(a),cy+r*Math.sin(a)]);}
      return out;
    }
    function cursor(x,y,pressed){
      const rows=['1000000','1100000','1210000','1221000','1222100','1222210','1221100','1001200','0000120'];
      rows.forEach((row,j)=>{for(let i=0;i<row.length;i++){if(row[i]==='1')box(x+i,y+j,1,1,pressed?C.pink:C.white);if(row[i]==='2')box(x+i,y+j,1,1,C.black);}});
    }
    function header(scene){
      text('P5.PENPLOTTER',12,10,C.cyan);
      text(String(scene+1).padStart(2,'0')+' / '+scenes[scene].name,12,23,C.white);
      line(12,35,287,35,C.cyan);
    }
    function captions(a,b){text(a,12,174,C.pink);text(b,12,189,C.white);}

    // The iDraw bed seen from above, as in Setup: rails run away from you,
    // origin bottom left. Machine X runs up the rails, Y to the right.
    function bed(left,bottom,s,paper){
      const w=data.bed.height*s,h=data.bed.width*s,top=bottom-h;
      line(left-4,top-3,left-4,bottom+3,C.cyan);line(left+w+4,top-3,left+w+4,bottom+3,C.cyan);
      box(left+paper.y*s,bottom-(paper.x+paper.width)*s,paper.height*s,paper.width*s,C.white);
      return {map:(p)=>[left+p[1]*s,bottom-p[0]*s],left,bottom,top,w,h};
    }
    function gantry(b,head){
      line(b.left-6,head[1],b.left+b.w+6,head[1],C.cyan);
      line(b.left-6,head[1]+1,b.left+b.w+6,head[1]+1,C.cyan);
      box(head[0]-2,head[1]-2,5,5,C.pink);
    }

    function firstCircle(t){
      const d=data.circle;
      const code=['CREATECANVAS(400, 400)','CREATEPLOT({ PAPER: "A2",','  PAPERX: 0, PAPERY: 0,','  WIDTH: 100 })','NOLOOP()','PLOT.CIRCLE(200, 200, 300)','PLOT.SHOWBED()','PLOT.GO()'];
      const typed=Math.floor(span(t,0.5,2.2)*code.length+0.001);
      code.forEach((s,i)=>{if(i<typed)text(s,14,44+i*9,i===5||i===7?C.pink:C.white);});
      // p5 canvas 400 x 400 at 0.11 px per pixel
      const cx=138,cy=44,cs=44;outline(cx,cy,cs,cs,C.cyan);box(cx+1,cy+1,cs-1,cs-1,C.white);
      if(t>2.2)polyline(circlePoints(cx+cs/2,cy+cs/2,150*cs/400,40),C.black,span(t,2.2,2.6));
      text('CANVAS',cx+4,cy+cs+4,C.cyan);
      let status='';
      if(t>2.6&&t<3.6)status='READY TO PLOT. CLICK THE DRAWING.';
      if(t>=3.6&&t<4.6)status='CHOOSE THE PLOTTER, THEN CONNECT.';
      if(t>=4.6&&t<10.4)status='PLOTTING... CLICK THE DRAWING TO STOP.';
      if(t>=10.4)status='PLOT COMPLETE. ABOUT '+d.seconds+' S ON THE IDRAW.';
      text(status,14,118,C.pink);
      if(t>=3.6&&t<4.6){
        outline(14,126,120,30,C.white);text('SERIAL PORT',18,130,C.white);
        box(18,139,112,7,C.cyan);text('PLOTTER (USB)',20,140,C.black);
        const pressed=t>4.3;box(94,148,36,7,pressed?C.pink:C.white);text('CONNECT',98,149,C.black);
      }
      if(t>3.1&&t<3.6)cursor(cx+30,cy+30,t>3.4);
      if(t>=3.6&&t<4.6)cursor(116,150,t>4.3);
      // the bed, physically placed
      const b=bed(192,162,0.2,data.paper);
      const path=d.paths_mm[0];
      const home=[0,0];
      let head=b.map(home);
      const draw=span(t,5.2,9.6),go=span(t,4.6,5.2),back=span(t,9.6,10.4);
      const start=b.map(path[0]);
      if(t>=4.6){
        const travelEnd=[head[0]+(start[0]-head[0])*go,head[1]+(start[1]-head[1])*go];
        if(t<5.2){line(head[0],head[1],travelEnd[0],travelEnd[1],C.pink,true);head=travelEnd;}
        else {
          head=polyline(path.map(b.map),C.black,draw);
          if(t>=9.6){const h=b.map(home);head=[start[0]+(h[0]-start[0])*back,start[1]+(h[1]-start[1])*back];line(start[0],start[1],head[0],head[1],C.pink,true);}
        }
      }
      gantry(b,head);
      text('0,0',b.left+2,b.bottom+4,C.cyan);
      text('A2',b.left+b.w-10,b.top+3,C.black);
      captions('PLOT.CIRCLE(200, 200, 300) > '+d.diameterMm+' MM ON A2','CLICK THE DRAWING TO PLOT. CLICK AGAIN TO STOP.');
    }

    function plotPrefix(t){
      const d=data.line;
      line(150,42,150,166,C.cyan);
      const cols=[{x:12,title:'LINE()',sub:'SCREEN ONLY',rec:'RECORDED: NOTHING',pen:false},
                  {x:158,title:'PLOT.LINE()',sub:'SCREEN AND PAPER',rec:'RECORDED: 1 PATH, '+d.lengthMm+' MM',pen:true}];
      for(const c of cols){
        text(c.title,c.x,42,c.pen?C.pink:C.white,2);
        text(c.sub,c.x,56,C.cyan);
        // screen: the 400 x 400 canvas
        outline(c.x,66,40,40,C.cyan);box(c.x+1,67,39,39,C.white);
        polyline([[c.x+8,86],[c.x+32,86]],C.black,span(t,1,2));
        text('SCREEN',c.x,110,C.cyan);
        // paper: A2, the same drawing area scaled
        const px=c.x+62,py=66,pw=56,ph=40;
        box(px,py,pw,ph,C.white);text('PAPER',px,110,C.cyan);
        if(c.pen){
          const a=[px+8,py+20],z=[px+48,py+20];
          const p=span(t,3,8);
          const head=p>0?polyline([a,z],C.black,p):a;
          if(p<1&&t>2.5)box(head[0]-2,head[1]-2,5,5,C.pink);
        } else if(t>3){text('EMPTY',px+18,py+17,C.black);}
        text(c.rec,c.x,124,c.pen?C.pink:C.white);
      }
      text('LINE(80, 200, 320, 200)',12,142,C.white);
      text('PLOT.LINE(80, 200, 320, 200)',158,142,C.white);
      captions('ONLY A CALL WITH PLOT. IN FRONT REACHES THE PAPER.','SAME ARGUMENTS AS P5: X1, Y1, X2, Y2 IN PIXELS.');
    }

    function noLoop(t){
      const L=data.loop,O=data.once;
      line(150,42,150,166,C.cyan);
      const frames=Math.max(1,Math.round(span(t,1,10)*L.frames));
      const cols=[{x:12,title:'DRAW() LOOPS',n:frames},{x:158,title:'NOLOOP()',n:1}];
      for(const c of cols){
        const loop=c.n>1||c.x===12;
        text(c.title,c.x,42,loop?C.white:C.pink,2);
        text('FRAME '+c.n,c.x,56,C.cyan);
        // screen: background(255) clears it every frame
        outline(c.x,66,48,48,C.cyan);box(c.x+1,67,47,47,C.white);
        const s=48/400,last=L.circles[c.n-1];
        polyline(circlePoints(c.x+last[0]*s,66+last[1]*s,last[2]/2*s,16),C.black);
        text('SCREEN',c.x,118,C.cyan);
        // recording: every plot.circle() call stays in it
        const rx=c.x+66;
        outline(rx,66,48,48,C.cyan);box(rx+1,67,47,47,C.white);
        for(let i=0;i<c.n;i++){const k=L.circles[i];polyline(circlePoints(rx+k[0]*s,66+k[1]*s,k[2]/2*s,12),loop?C.pink:C.black);}
        text('RECORDING',rx,118,C.cyan);
        const minutes=Math.round(L.seconds*c.n/L.frames/60);
        const time=c.n===1?'ABOUT '+O.seconds+' S TO PLOT':'ABOUT '+minutes+' MIN TO PLOT';
        text('RECORDED: '+c.n+(c.n===1?' CIRCLE':' CIRCLES'),c.x,132,loop?C.pink:C.white);
        text(c.n===1||t>3?time:'',c.x,142,C.white);
      }
      text('PLOT.CIRCLE(RANDOM...)',12,154,C.cyan);
      captions('BACKGROUND() CLEARS THE SCREEN, NOT THE RECORDING.','DRAW() RUNS 60 TIMES A SECOND. NOLOOP() STOPS IT.');
    }

    function render(scene,seconds){
      const t=seconds%12;
      box(0,0,300,200,C.black);
      header(scene);
      [firstCircle,plotPrefix,noLoop][scene](t);
    }
    return render;
  }
  global.PenPixels={glyphs,palette:C,scenes,createRenderer,duration:12};
})(typeof window!=='undefined'?window:globalThis);
