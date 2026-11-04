# VoiceLab (Aisha) TTS runner for GitHub Actions. Key only from env VOICELAB_API_KEY.
import os,json,glob,time,urllib.request,urllib.error,hashlib
K=os.environ.get('VOICELAB_API_KEY','');B='https://api.voicelab.uz/v1'
def req(m,path,body=None,raw=False):
    url=path if path.startswith('http') else B+path
    d=json.dumps(body).encode() if body is not None else None
    r=urllib.request.Request(url,data=d,method=m,headers={'Authorization':'Bearer '+K,'Content-Type':'application/json'})
    if body is not None: r.add_header('Idempotency-Key','sf-'+hashlib.sha1(d).hexdigest()[:24])
    try:
        with urllib.request.urlopen(r,timeout=120) as x: return x.status,x.headers,x.read()
    except urllib.error.HTTPError as e: return e.code,e.headers,e.read()
log=[]
def L(*a): s=' '.join(str(x) for x in a).replace(K,'***') if K else ' '.join(map(str,a)); print(s); log.append(s)
if not K: L('VOICELAB_API_KEY yoq')
else:
    for p in ['/voices','/tts/languages']:
        st,h,b=req('GET',p);L('GET',p,st)
        open('voicelab/'+p.strip('/').replace('/','_')+'.json','wb').write(b)
    for f in sorted(glob.glob('voicelab/queue/*.json')):
        n=os.path.basename(f)[:-5];j=json.load(open(f))
        body={'text':j['text'],'language':j.get('language','uz'),'voice_id':j['voice_id'],'speed':j.get('speed',1)}
        st,h,b=req('POST','/tts',body)
        if st==202:
            su=json.loads(b).get('status_url')
            for i in range(60):
                time.sleep(3);st2,h2,b2=req('GET',su)
                info=json.loads(b2) if st2==200 and b2[:1]==b'{' else {}
                au=info.get('audio_url') or info.get('download_url')
                if info.get('status') in ('succeeded','completed','done') and au:
                    st,h,b=req('GET',au);break
                if info.get('status') in ('failed','error'): L('fail',n,b2[:300]);break
        if st==200 and b[:4]==b'RIFF':
            open(f'voicelab/out/{n}.wav','wb').write(b);os.remove(f);L('ok',n,len(b))
        else: L('err',n,st,b[:400])
open('voicelab/status.txt','w').write('\n'.join(log)+'\n')
