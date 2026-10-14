"""Export native-size originals and smaller derivatives; never enlarge a source."""
from pathlib import Path
from PIL import Image
import json, subprocess, re
import imageio_ffmpeg

root=Path(__file__).resolve().parents[1]
out=root/'public/backgrounds/quality-v4'
out.mkdir(parents=True,exist_ok=True)
generated=Path('/Users/ponhareeshn/.codex/generated_images/01a0f787-0b2e-7d61-be5c-73c501726293')
sources={
 'landing-stillness':generated/'exec-d147496d-cfb2-4fdb-8825-6e96059c71e8.png',
 'timer-stillness':generated/'exec-380a6016-2106-4cf1-aad6-f4946d545c07.png',
}
for name in ['illustrated-forest.v2.webp','illustrated-study-desk.v2.webp','illustrated-lavender-lake.v2.webp','illustrated-sand-nook.webp','illustrated-rose-terrace.webp','illustrated-charcoal-library.webp']:
 sources[Path(name).stem]=root/'public/backgrounds'/name
ff=imageio_ffmpeg.get_ffmpeg_exe()
clips=['ocean-landing-hd','river-still','stream-still','lake-still','fire-still','waterfall-still','rain-still']
for scene in clips:
 source=root/f'public/backgrounds/video/{scene}.mp4'
 poster=out/f'{scene}-source.jpg'
 subprocess.run([ff,'-hide_banner','-loglevel','error','-y','-i',str(source),'-frames:v','1','-q:v','2',str(poster)],check=True)
 sources[scene]=poster
manifest={}
for name,source in sources.items():
 im=Image.open(source).convert('RGB')
 widths=sorted(set([w for w in [640,1280,1920,2400] if w<im.width]+[im.width]))
 for width in widths:
  resized=im if width==im.width else im.resize((width,round(im.height*width/im.width)),Image.Resampling.LANCZOS)
  resized.save(out/f'{name}-{width}.webp',quality=90,method=6)
  resized.save(out/f'{name}-{width}.jpg',quality=92,optimize=True,progressive=True)
 manifest[name]={'width':im.width,'height':im.height,'widths':widths,'source':str(source)}
for poster in out.glob('*-source.jpg'):poster.unlink()
(out/'manifest.json').write_text(json.dumps(manifest,indent=2)+'\n')
print('Exported native-size responsive images:',len(manifest))

videoout=root/'public/backgrounds/video/quality-v4'
videoout.mkdir(parents=True,exist_ok=True)
for scene in clips:
 source=root/f'public/backgrounds/video/{scene}.mp4'
 info=subprocess.run([ff,'-i',str(source)],capture_output=True,text=True).stderr
 assert '1920x1080' in info, f'{scene}: refusing to upscale video'
 # Overlap the final second with the first, then begin at the end of that first
 # second. This removes the hard end/start seam without reversing natural motion.
 duration=re.search(r'Duration: (\d+):(\d+):(\d+\.\d+)',info)
 h,m,s=map(float,duration.groups()); end=h*3600+m*60+s
 filters=f'[0:v]fps=24,split=3[a][b][c];[a]trim=start=1:end={end-1},setpts=PTS-STARTPTS[main];[b]trim=start={end-1}:end={end},setpts=PTS-STARTPTS[tail];[c]trim=start=0:end=1,setpts=PTS-STARTPTS[head];[tail][head]blend=all_expr=A*(1-T)+B*T[seam];[main][seam]concat=n=2:v=1:a=0,format=yuv420p[v]'
 common=[ff,'-hide_banner','-loglevel','error','-y','-i',str(source),'-filter_complex',filters,'-map','[v]','-an']
 subprocess.run(common+['-c:v','libx264','-preset','fast','-crf','20','-movflags','+faststart',str(videoout/f'{scene}.mp4')],check=True)
 subprocess.run([ff,'-hide_banner','-loglevel','error','-y','-i',str(videoout/f'{scene}.mp4'),'-an','-c:v','libvpx-vp9','-b:v','0','-crf','28','-deadline','good','-cpu-used','4',str(videoout/f'{scene}.webm')],check=True)
 print('Encoded 1080p loop:',scene,flush=True)
