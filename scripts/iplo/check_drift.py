"""Per-segment boundary drift check: whisper word starts/ends vs RMS voice onsets.
Flags segments whose first-word start or last-word end is off from actual voice energy."""
import json, subprocess, array, math, sys

def load_raw(path):
    raw = subprocess.run(['ffmpeg','-v','error','-i',path,'-ar','16000','-ac','1','-f','s16le','-'],
                         capture_output=True).stdout
    a=array.array('h'); a.frombytes(raw); return a

def rms(a, t, w=0.02, sr=16000):
    i=int(t*sr); n=int(w*sr); seg=a[i:i+n]
    return math.sqrt(sum(x*x for x in seg)/len(seg)) if len(seg) else 0

def scan_onset(a, t0, t1, thresh=40, sr=16000, sustain=0.05):
    t=t0
    while t<t1:
        if rms(a,t)>thresh and rms(a,t+sustain)>thresh:
            return t
        t+=0.02
    return None

def scan_off(a, t0, t1, thresh=40, sr=16000):
    # last time voice is active in [t0,t1]
    t=t1; last=None
    while t>t0:
        if rms(a,t)>thresh:
            last=t; break
        t-=0.02
    return last

def main(day):
    d=json.load(open(f'scripts/iplo/day{day}-segments.json'))
    a=load_raw(f'public/audio/iplo/day-{day}.mp3')
    for seg in d['segments']:
        ws=seg.get('words') or []
        if not ws: continue
        start=seg['start']; end=seg['end']
        if seg['t']=='prompt': continue  # prompts have no karaoke words
        first=ws[0]; last=ws[-1]
        # first voice onset in [first.start-0.7, first.start+0.7]
        o=scan_onset(a, first['start']-0.7, first['start']+0.7)
        if o is None:
            print(f"@{round(start,2)} {seg['t']}: NO VOICE near first word '{first['w']}' @{round(first['start'],2)}")
            continue
        if abs(o-first['start'])>0.3:
            print(f"@{round(start,2)} {seg['t']} START_DRIFT {round(o-first['start'],2)}s: first '{first['w']}' whisper {round(first['start'],2)} vs voice {round(o,2)}")
        # last word end
        off=scan_off(a, last['end']-1.2, last['end']+1.2)
        if off is not None and abs(off-last['end'])>0.5:
            print(f"@{round(start,2)} {seg['t']} END_DRIFT {round(off-last['end'],2)}s: last '{last['w']}' whisper_end {round(last['end'],2)} vs voice_end {round(off,2)}")

if __name__=='__main__':
    main(int(sys.argv[1]))
