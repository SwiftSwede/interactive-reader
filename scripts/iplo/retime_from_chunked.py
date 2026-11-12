"""Re-time segment words from a chunked whisper run (fresh context per chunk =
reliable timestamps). Keeps current segment text (including hand fixes); only
swaps word timings where the chunked tokens match the segment's tokens.
Usage: retime_from_chunked.py <day> <chunked-words.json>"""
import json, re, sys, unicodedata

def norm(w):
    w=unicodedata.normalize('NFD', w.lower())
    w=''.join(c for c in w if unicodedata.category(c)!='Mn')
    return re.sub(r"[^a-z0-9\u00f1]+",'',w)

def toks(words):
    out=[]
    for w in words:
        t=norm(w['word'] if isinstance(w,dict) else w)
        if t: out.append(t)
    return out

def main(day, cpath):
    d=json.load(open(f'scripts/iplo/day{day}-segments.json'))
    cw=json.load(open(cpath))['words']
    # clean chunked words: strip punct, sort
    cw=[{'t':t,'start':w['start'],'end':w['end']} for w in cw if (t:=norm(w['word']))]
    cw.sort(key=lambda w: w['start'])
    replaced=kept=0
    for seg in d['segments']:
        old=seg.get('words') or []
        if not old or seg['t']=='prompt': continue
        want=toks([w['w'] for w in old])
        lo=old[0]['start']-1.5; hi=old[-1]['end']+1.5
        cand=[w for w in cw if lo<=w['start']<=hi]
        cand_toks=[w['t'] for w in cand]
        # greedy sequential match of want against cand_toks
        wi=ci=0; match=[]
        while wi<len(want) and ci<len(cand_toks):
            if want[wi]==cand_toks[ci]:
                match.append((wi,ci)); wi+=1; ci+=1
            else:
                ci+=1
        if len(match)<0.7*len(want):
            kept+=1
            continue
        # adopt timings: for matched words use cand; for unmatched keep old timing
        new=[]
        mi=dict(match)
        oi=dict((a,b) for a,b in match)
        cand_at={ci:i for i,ci in enumerate([c for c,_ in enumerate(cand)])}
        for k,w in enumerate(old):
            if k in oi:
                c=cand[oi[k]]
                new.append({'w':w['w'],'start':round(c['start'],2),'end':round(max(c['end'],c['start']+0.08),2)})
            else:
                new.append(dict(w))
        if new:
            seg['words']=new
            if seg['t']!='narration' or len(seg.get('lines',[]))>0:
                # keep narration caption end rules: only adjust ends for english
                pass
            if seg['t']=='english':
                seg['start']=new[0]['start']; seg['end']=new[-1]['end']
            replaced+=1
    d['segments'].sort(key=lambda s:s['start'])
    json.dump(d,open(f'scripts/iplo/day{day}-segments.json','w'),ensure_ascii=False,indent=1)
    print(f'retimed {replaced}, kept {kept}')

if __name__=='__main__':
    main(int(sys.argv[1]), sys.argv[2])
