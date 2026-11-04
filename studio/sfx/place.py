# usage: python place.py cues.json out.wav DUR   cues: [[id, time_s, {"align":"peak"|"start","weight":w,"dur":..,"apex":..,"pitch":..}]]
import json,sys,subprocess,os,soundfile as sf,numpy as np
cues=json.load(open(sys.argv[1]));DUR=float(sys.argv[3]);SR=48000
mix=np.zeros((int(DUR*SR)+SR,2))
os.makedirs('takes',exist_ok=True)
for i,(sid,t,o) in enumerate(cues):
    fn=f'takes/{i:02d}.wav';cmd=['earshot','sfx','render',sid,'-o',fn,'--json']
    for k in ('dur','apex','pitch'):
        if k in o: cmd+=['--'+k,str(o[k])]
    r=json.loads(subprocess.run(cmd,capture_output=True,text=True).stdout)
    x,sr=sf.read(fn);x=x if x.ndim==2 else np.stack([x,x],1)
    if o.get('align','peak')=='peak':
        pk=int(np.argmax(np.abs(x).max(1)));st=int(t*SR)-pk
    else: st=int(t*SR)
    x=x*o.get('weight',1.0)
    a=max(st,0);b=min(st+len(x),len(mix));mix[a:b]+=x[a-st:b-st]
    print(f'{sid:28s} t={t:6.2f} start={st/SR:6.2f}')
mix=mix[:int(DUR*SR)];mix/=max(1e-9,np.abs(mix).max())/0.89
sf.write(sys.argv[2],mix,SR,subtype='PCM_24')
