"""Redistribute word timings inside each segment using RMS voice regions.
Whisper word_timestamps are biased ~0.5s (both directions) when a segment starts
after silence; the physical voice regions are the truth. Words are placed
proportionally to their whisper durations inside the voice regions, one region
per sentence when the counts match, else one region for all words.
Usage: retime_by_energy.py <day>"""
import json, re, subprocess, array, math, sys

SR=16000

def load(path):
    raw=subprocess.run(['ffmpeg','-v','error','-i',path,'-ar','16000','-ac','1','-f','s16le','-'],
                       capture_output=True).stdout
    a=array.array('h'); a.frombytes(raw); return a

def rms_at(a,t):
    i=int(t*SR); s=a[i:i+320]
    return math.sqrt(sum(x*x for x in s)/320) if len(s) else 0

def voice_regions(a,t0,t1,thresh=300,gap=0.12,minlen=0.08):
    regions=[]; cur=None
    t=t0
    while t<t1:
        r=rms_at(a,t)
        if r>thresh:
            if cur is None: cur=[t,t]
            else: cur[1]=t
        else:
            if cur and t-cur[1]>gap:
                if cur[1]-cur[0]>=minlen: regions.append(cur)
                cur=None
        t+=0.02
    if cur and cur[1]-cur[0]>=minlen: regions.append(cur)
    return regions

def sentences(text):
    return [x for x in re.split(r'(?<=[.?!]) +', (text or '').strip()) if x]

def main(day):
    a=load(f'public/audio/iplo/day-{day}.mp3')
    p=f'scripts/iplo/day{day}-segments.json'
    d=json.load(open(p))
    segs=sorted(d['segments'], key=lambda s:s['start'])
    moved=0
    for i,seg in enumerate(segs):
        if seg['t']=='prompt': continue
        ws=seg.get('words') or []
        if not ws: continue
        prev_end=segs[i-1]['end'] if i>0 else 0
        t0=max(seg['start']-0.6, prev_end+0.02)
        t1=seg['end']+1.2
        regs=voice_regions(a,t0,t1)
        if not regs:
            continue
        # sentence grouping
        texts = seg.get('lines') or ([seg.get('text')] if seg.get('text') else [])
        sents=[]
        for tx in texts: sents.extend(sentences(tx))
        if len(regs)==1 or len(sents)!=len(regs):
            groups=[regs[0] if len(regs)==1 else None]
            if len(regs)>1:
                # fallback: one group spanning all regions
                groups=[[regs[0][0], regs[-1][1]]]
            assign=[list(range(len(ws)))]
        else:
            # split words across sentences by punctuation-free position:
            # use expected counts as hint, else equal split by whisper span gaps
            assign=[[k for k in range(len(ws))]]
        # simple robust placement: if >=1 region, distribute words over
        # the matched regions with proportional whisper durations.
        # sentence-aware path when counts match:
        if len(regs)==len(sents) and len(sents)>1:
            # split word list by matching sentence word counts (strip punctuation)
            counts=[len(re.findall(r"[A-Za-z']+", s)) for s in sents]
            if sum(counts)==len(ws):
                assign=[]; k=0
                for c in counts:
                    assign.append(list(range(k,k+c))); k+=c
        # place
        new=[]; 
        for gi,grp in enumerate(assign):
            reg=regs[min(gi,len(regs)-1)] if len(assign)==1 else regs[gi]
            total=sum(max(ws[k]['end']-ws[k]['start'],0.08) for k in grp)
            t=reg[0]
            for k in grp:
                dur=max(ws[k]['end']-ws[k]['start'],0.08)
                new.append({'w':ws[k]['w'],'start':round(t,2),'end':round(t+dur,2)})
                t+=dur
        if len(new)!=len(ws):
            continue
        changed = any(abs(new[k]['start']-ws[k]['start'])>0.01 for k in range(len(ws)))
        seg['words']=new
        if changed:
            moved+=1
            if seg['t']=='english':
                seg['start']=new[0]['start']; seg['end']=new[-1]['end']
    json.dump(d,open(p,'w'),ensure_ascii=False,indent=1)
    print('segments moved:', moved)

if __name__=='__main__':
    main(int(sys.argv[1]))
