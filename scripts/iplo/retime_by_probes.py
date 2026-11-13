"""Re-time every non-prompt segment's words with a fresh tight slice probe.
Energy-based redistribution fails when a neighbor's speech bleeds into the
segment's window (prompt tails). Slice probes give true text AND timings; the
segment's token sequence is matched as a subsequence inside the probe tokens
so neighbor speech never contaminates placement.
Usage: retime_by_probes.py <day> [--apply]
Without --apply it writes a report only."""
import json, re, subprocess, sys, os, unicodedata, tempfile

def norm(w):
    w=unicodedata.normalize('NFD', w.lower())
    w=''.join(c for c in w if unicodedata.category(c)!='Mn')
    return re.sub(r"[^a-z0-9ñ]+",'',w)

def probe_words(path, lang):
    out=f'{tempfile.gettempdir()}/probe_{os.getpid()}'
    r=subprocess.run(['whisper',path,'--model','large-v3-turbo','--language',lang,
                      '--word_timestamps','True','--output_format','json','--output_dir',out],
                     capture_output=True, text=True)
    d=json.load(open(f'{out}/{os.path.basename(path)[:-4]}.json'))
    words=[]
    for s in d['segments']:
        for w in s.get('words',[]):
            t=norm(w['word'])
            if t: words.append({'t':t,'start':w['start'],'end':w['end']})
    return words

def best_match(seg_tokens, probe_tokens):
    best=None
    for start in range(len(probe_tokens)):
        si=0; matches=[]; pt=start
        while si<len(seg_tokens) and pt<len(probe_tokens) and pt<start+len(seg_tokens)+6:
            if seg_tokens[si]==probe_tokens[pt]:
                matches.append((si,pt)); si+=1; pt+=1
            elif si>0 and pt+1<len(probe_tokens) and seg_tokens[si]==probe_tokens[pt+1]:
                pt+=1  # extra probe token (neighbor or hallucination)
            elif si>0 and si+1<len(seg_tokens) and seg_tokens[si+1]==probe_tokens[pt]:
                si+=1  # missed probe token
            else:
                pt+=1
        score=len(matches)
        if score and (best is None or score>best[0]):
            best=(score,start,dict(matches))
    return best

def main(day, apply):
    p=f'scripts/iplo/day{day}-segments.json'
    d=json.load(open(p))
    segs=sorted(d['segments'], key=lambda s:s['start'])
    audio=f'public/audio/iplo/day-{day}.mp3'
    tmp=tempfile.mkdtemp()
    moved=kept=failed=0
    for i,seg in enumerate(segs):
        if seg['t']=='prompt': continue
        ws=seg.get('words') or []
        if not ws: continue
        prev_end=segs[i-1]['end'] if i>0 else 0
        next_start=segs[i+1]['start'] if i+1<len(segs) else seg['end']+2
        t0=max(seg['start']-1.2, prev_end-0.2, 0)
        t1=min(seg['end']+1.5, next_start+1.0)
        if t1-t0>30: t1=t0+30
        lang='en' if seg['t']=='english' else 'es'
        sl=f'{tmp}/s{i}.wav'
        subprocess.run(['ffmpeg','-y','-v','error','-i',audio,'-ss',str(round(t0,2)),'-t',str(round(t1-t0,2)),
                        '-ar','16000','-ac','1',sl],check=True)
        try:
            pw=probe_words(sl,lang)
        except Exception as e:
            print(f'@{round(seg["start"],2)} PROBE_FAIL {e}'); failed+=1; continue
        pw=[w for w in pw if t0-0.05<=w['start']+t0<=t1]  # probe times are slice-relative
        for w in pw: w['start']+=t0; w['end']+=t0
        seg_tokens=[norm(w['w']) for w in ws]
        probe_tokens=[w['t'] for w in pw]
        m=best_match(seg_tokens, probe_tokens)
        if not m or m[0]<0.6*len(seg_tokens):
            print(f'@{round(seg["start"],2)} NO_MATCH score {0 if not m else m[0]}/{len(seg_tokens)}')
            kept+=1; continue
        _,_,pairs=m
        new=[dict(w) for w in ws]
        for si,pi in pairs.items():
            new[si]['start']=round(pw[pi]['start'],2)
            new[si]['end']=round(pw[pi]['end'],2)
        # fill unmatched words by interpolation between matched neighbors
        matched_idx=sorted(pairs.keys())
        if matched_idx and matched_idx[0]>0:
            first=new[matched_idx[0]]
            for k in range(0,matched_idx[0]):
                new[k]['start']=first['start']; new[k]['end']=first['start']
        if matched_idx and matched_idx[-1]<len(new)-1:
            last=new[matched_idx[-1]]
            for k in range(matched_idx[-1]+1,len(new)):
                new[k]['start']=last['end']; new[k]['end']=last['end']
        changed=any(abs(new[k]['start']-ws[k]['start'])>0.05 for k in range(len(ws)))
        seg['words']=new
        if seg['t']=='english':
            seg['start']=new[0]['start']; seg['end']=new[-1]['end']
        if changed: moved+=1
        else: kept+=1
    if apply:
        d['segments'].sort(key=lambda s:s['start'])
        json.dump(d,open(p,'w'),ensure_ascii=False,indent=1)
    print(f'moved {moved} kept {kept} failed {failed}')

if __name__=='__main__':
    day=int(sys.argv[1]); apply='--apply' in sys.argv
    main(day, apply)
