# Original track for the Reaksiya reel (made at the owner's request). 100 BPM, A minor.
import numpy as np, scipy.signal as sg, scipy.io.wavfile as wf
sr=44100; BT=0.6; DUR=29.4; N=int((DUR+1.2)*sr); L=np.zeros(N); R=np.zeros(N); rng=np.random.default_rng(7)
def put(sig,t,g=1.0,pan=0.0):
    i=int(t*sr); n=min(len(sig),N-i)
    if n<=0 or i<0: return
    L[i:i+n]+=sig[:n]*g*(1-max(0,pan)); R[i:i+n]+=sig[:n]*g*(1+min(0,pan))
def tt(d): return np.arange(int(d*sr))/sr
def kick():
    t=tt(.4); f=46+120*np.exp(-t*32); return np.sin(2*np.pi*np.cumsum(f)/sr)*np.exp(-t*8)+.25*np.exp(-t*400)*rng.normal(size=len(t))
def bp(x,lo,hi): b,a=sg.butter(2,[lo/(sr/2),hi/(sr/2)],'band'); return sg.lfilter(b,a,x)
def hp(x,f): b,a=sg.butter(2,f/(sr/2),'high'); return sg.lfilter(b,a,x)
def lp(x,f): b,a=sg.butter(2,f/(sr/2),'low'); return sg.lfilter(b,a,x)
def clap():
    t=tt(.3); e=np.exp(-t*22)+.6*np.exp(-np.abs(t-.012)*300)+.5*np.exp(-np.abs(t-.024)*300); return bp(rng.normal(size=len(t)),900,4200)*e
def hat(d=60): t=tt(.12); return hp(rng.normal(size=len(t)),7500)*np.exp(-t*d)
def pluck(f,d=.5,br=6):
    t=tt(d); x=sum(np.sin(2*np.pi*f*n*t)/n*np.exp(-t*(5+n*2.2)) for n in range(1,br+1)); return x*np.minimum(1,t*400)
def bass(f,d=.26):
    t=tt(d); return (np.sin(2*np.pi*f*t)+.35*np.sin(4*np.pi*f*t)+.12*np.sin(6*np.pi*f*t))*np.minimum(1,t*200)*np.exp(-t*5)*np.minimum(1,(d-t)*60)
def boom(g=1.0):
    t=tt(1.6); f=38+70*np.exp(-t*9); return (np.sin(2*np.pi*np.cumsum(f)/sr)*np.exp(-t*2.6)+.4*lp(rng.normal(size=len(t)),900)*np.exp(-t*7))*g
def riser(d):
    t=tt(d); x=rng.normal(size=len(t)); out=np.zeros(len(t)); k=8; step=len(t)//k
    for i in range(k):
        seg=x[i*step:(i+1)*step if i<k-1 else len(t)]; out[i*step:i*step+len(seg)]=bp(seg,400+i*700,1500+i*1100)
    return out*(t/d)**2.2
def crash(): t=tt(1.6); return hp(rng.normal(size=len(t)),5000)*np.exp(-t*3.2)
A=lambda n: 440*2**(n/12)
CH=[[A(-12),A(-9),A(-5),A(0)],[A(-16),A(-12),A(-9),A(-4)],[A(-9),A(-5),A(-2),A(3)],[A(-14),A(-10),A(-7),A(-2)]]  # Am F C G
ROOT=[55.0,43.65,65.41,49.0]; PAT=[0,2,1,3,2,3,1,2,0,2,3,1,2,3,2,1]
K,C,H=kick(),clap(),hat()
# intro (beats 0-4): pad + hits + riser
put(boom(.5),0.07,.7); put(boom(1),2*BT,.95); put(C,2*BT,.5); put(riser(2*BT),2*BT,.22)
for b in range(4,49):
    t=b*BT; bar=(b//4)%4; ch=CH[bar]; build=39<=b<42; end=b>=44
    if not end:
        if not build: put(K,t,.9)
        if b>=12 and b%2==1 and not build: put(C,t,.34)
        for e in range(2): put(H,t+e*BT/2,.10 if e==0 else .16,(-.3 if e else .3))
        if not build: put(bass(ROOT[bar]),t+BT/2,.5); put(bass(ROOT[bar]),t+BT*.75,.32)
        for q in range(4):
            f=ch[PAT[((b%4)*4+q)%16]]*(2 if b>=20 and q%2==0 else 1)
            p=pluck(f); put(p,t+q*BT/4,.11,(.5 if q%2 else -.5)); put(p,t+q*BT/4+.225,.045,(-.5 if q%2 else .5))
        if b>=12 and b%4 in (0,2): put(pluck(ch[3]*2,.9,4),t,.10)
        if build:
            n=[2,4,8][b-39]
            for q in range(n): put(C,t+q*BT/n,.16+.05*(b-39))
put(riser(3*BT),39*BT,.28); put(crash(),42*BT,.22); put(boom(1),42*BT,.8)
# ending chord at beat 44
put(boom(.8),44*BT,.7); put(crash(),44*BT,.14)
for i,f in enumerate(CH[0]+[A(3),A(7)]): put(pluck(f,2.8,5)*np.exp(-tt(2.8)*.6),44*BT+i*.03,.12,(.4 if i%2 else -.4))
for b in (45.5,46,46.5,47): put(pluck(A(12),.6,3),b*BT,.05)
# pad with sidechain
t=np.arange(N)/sr; pad=np.zeros(N)
for bar in range(13):
    a,z=int(bar*4*BT*sr),min(N,int((bar+1)*4*BT*sr)); ts=t[a:z]-t[a]; ch=CH[bar%4] if bar<11 else CH[0]
    seg=sum(np.sin(2*np.pi*f*ts)+.4*np.sin(2*np.pi*f*2.005*ts) for f in ch[:3]); pad[a:z]+=seg*np.minimum(1,ts*4)*np.minimum(1,(4*BT-ts)*6)
duck=1-.55*np.exp(-((t%BT))*7)*((t>=4*BT)&(t<44*BT)); pad=lp(pad,1800)*duck*.028
L+=pad; R+=pad
m=np.stack([L,R],1); fade=np.clip((DUR-t)/.5,0,1)[:,None]; m=np.tanh(m*1.5)*fade; m/=np.abs(m).max()*1.06
wf.write('/tmp/rk/music.wav',sr,(m*32767).astype(np.int16)); print('ok',len(m)/sr)
