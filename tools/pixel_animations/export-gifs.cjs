// Renders every scene in pixels.js to docs/images/animations/<slug>.gif.
// Usage: node tools/pixel_animations/export-gifs.cjs [python] [preview-dir]
const fs=require('node:fs');
const os=require('node:os');
const path=require('node:path');
const vm=require('node:vm');
const {execFileSync}=require('node:child_process');
const here=__dirname;
const root=path.resolve(here,'..','..');
const data=JSON.parse(fs.readFileSync(path.join(here,'scene-data.json'),'utf8'));
const pixels=Buffer.alloc(300*200*3);
const context={fillStyle:'#000000',fillRect(x,y,w,h){
  const c=this.fillStyle.slice(1);const r=parseInt(c.slice(0,2),16),g=parseInt(c.slice(2,4),16),b=parseInt(c.slice(4,6),16);
  for(let j=Math.max(0,y);j<Math.min(200,y+h);j++)for(let i=Math.max(0,x);i<Math.min(300,x+w);i++){const n=(j*300+i)*3;pixels[n]=r;pixels[n+1]=g;pixels[n+2]=b;}
}};
const scope={Math,console};vm.createContext(scope);
vm.runInContext(fs.readFileSync(path.join(here,'pixels.js'),'utf8'),scope);
const render=scope.PenPixels.createRenderer(context,data);
const colors=Object.values(scope.PenPixels.palette).map(c=>c.slice(1)).join(',');
const preview=process.argv[3]||'';
const temporary=fs.mkdtempSync(path.join(os.tmpdir(),'penpixels-export-'));
try{
  scope.PenPixels.scenes.forEach((scene,index)=>{
    const raw=path.join(temporary,`${scene.slug}.rgb`);const fd=fs.openSync(raw,'w');
    for(let i=0;i<240;i++){render(index,i/20);fs.writeSync(fd,pixels);}
    fs.closeSync(fd);
    const target=path.join(root,'docs','images','animations',`${scene.slug}.gif`);
    console.log(execFileSync(process.argv[2]||'python3',[path.join(here,'encode-gif.py'),raw,target,colors,preview],{encoding:'utf8'}).trim());
  });
}finally{
  fs.rmSync(temporary,{recursive:true,force:true});
}
