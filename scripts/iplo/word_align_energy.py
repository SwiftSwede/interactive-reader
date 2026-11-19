"""Word-level energy alignment (conservative). For each non-prompt segment:
walk words sequentially; a word's start snaps to the first sustained RMS rise
at/after max(previous word end, segment voice start) IF exactly one unambiguous
rise exists within +-0.5s of the current start and a dip separates it from the
previous word. Never moves a word more than 0.5s. Words without clear evidence
stay untouched. This replaces uniform segment shifts, which silently desynced
mid-line words (Kyle QA rounds 3-4).
Usage: word_align_energy.py <day> [--apply]"""
import json, subprocess, array, math, sys

SR=16000
def load(path):
    raw=subprocess.run(['ffmpeg','-v','error','-i',path,'-ar','16000','-ac','1','-f','s16le','-'],capture_output=True).stdout
    a=array.array('h'); a.frombytes(raw); return a
def rms(a,t):
    i=int(t*SR); s=a[i:i+160]
    return math.sqrt(sum(x*x for x in s)/160) if len(s) else 0

def rises(a, t0, t1, thresh=450):
    """all sustained rise onsets in [t0,t1]"""
    out=[]; t=t0
    while t<t1:
        if rms(a,t)<thresh*0.4 and rms(a,t+0.04)>thresh and rms(a,t+0.09)>thresh:
            out.append(round(t+0.04,2)); t+=0.25
        else: t+=0.04
    return out

def main(day, apply):
    a=load(f'public/audio/iplo/day-{day}.mp3')
    p=f'scripts/iplo/day{day}-segments.json'
    d=json.load(open(p))
    segs=sorted(d['segments'], key=lambda s:s['start'])
    adj=0; skipped=0
    for i,s in enumerate(segs):
        if s['t']=='prompt' or not s.get('words'): continue
        ws=s['words']
        prev_end = segs[i-1]['words'][-1]['end'] if i>0 and segs[i-1].get('words') else (segs[i-1]['end'] if i>0 else 0)
        cursor=max(ws[0]['start']-0.05, prev_end+0.02)
        changed=False
        for k,w in enumerate(ws):
            win_lo=cursor; win_hi=w['start']+0.5
            if win_hi<=win_lo: 
                cursor=w['end']; continue
            nxt = ws[k+1]['start'] if k+1<len(ws) else w['end']+5
            prv_end = ws[k-1]['end'] if k>0 else win_lo
            rs=[r for r in rises(a, max(win_lo,prv_end-0.02), max(win_hi, win_lo+0.1)) if abs(r-w['start'])<=0.5]
            if len(rs)==1 and rs[0]>win_lo-0.01:
                delta=rs[0]-w['start']
                new_start=w['start']+delta
                ordered = (new_start >= prv_end - 0.02) and (new_start <= nxt - 0.05)
                if abs(delta)>0.12 and abs(delta)<=0.5 and ordered:
                    w['start']=round(w['start']+delta,2)
                    w['end']=round(max(w['end']+delta, w['start']+0.08),2)
                    changed=True; adj+=1
                cursor=w['end']
            else:
                skipped+=1
                cursor=max(cursor, w['end'])
        if changed:
            if s['t']=='english':
                s['start']=ws[0]['start']; s['end']=ws[-1]['end']
    if apply:
        d['segments']=sorted(segs, key=lambda s:s['start'])
        json.dump(d,open(p,'w'),ensure_ascii=False,indent=1)
    print(f'words adjusted {adj}, skipped (ambiguous) {skipped}')

if __name__=='__main__':
    main(int(sys.argv[1]), '--apply' in sys.argv)
