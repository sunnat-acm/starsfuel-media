import numpy as np
from PIL import Image, ImageDraw, ImageFilter
W,H=1400,800
rng=np.random.default_rng(7)
def grad(top,bot):
    t=np.linspace(0,1,H)[:,None,None]
    a=np.array(top)[None,None,:];b=np.array(bot)[None,None,:]
    return (a*(1-t)+b*t).repeat(W,1)
def glow(arr,cx,cy,r,col,strength=1.0):
    y,x=np.ogrid[:H,:W];d=np.sqrt((x-cx)**2+(y-cy)**2)/r
    g=np.exp(-d*d)*strength
    arr+=g[:,:,None]*np.array(col)[None,None,:]
def bokeh(img,n,cols,rmin,rmax,area=(0,0,W,H),alpha=(40,120),blur=6):
    lay=Image.new('RGBA',(W,H),(0,0,0,0));d=ImageDraw.Draw(lay)
    for i in range(n):
        r=rng.uniform(rmin,rmax);x=rng.uniform(area[0],area[2]);y=rng.uniform(area[1],area[3])
        c=cols[rng.integers(len(cols))];a=int(rng.uniform(*alpha))
        d.ellipse((x-r,y-r,x+r,y+r),fill=c+(a,),outline=c+(min(255,a+60),),width=max(1,int(r/10)))
    lay=lay.filter(ImageFilter.GaussianBlur(blur))
    img.alpha_composite(lay)
def finish(arr,name,extra=None,blur=0):
    img=Image.fromarray(np.clip(arr,0,255).astype('uint8')).convert('RGBA')
    if extra:extra(img)
    if blur:img=img.filter(ImageFilter.GaussianBlur(blur))
    a=np.asarray(img.convert('RGB')).astype(float)
    a+=rng.normal(0,5,a.shape)  # grain
    y,x=np.ogrid[:H,:W];v=1-0.45*(((x-W/2)/(W/2))**2+((y-H/2)/(H/2))**2)  # vignette
    a*=np.clip(v,0.35,1)[:,:,None]
    Image.fromarray(np.clip(a,0,255).astype('uint8')).save(f'bg/{name}.jpg',quality=92)
def sil(d,cx,base,s,col=(8,8,14,255)):
    d.ellipse((cx-30*s,base-250*s,cx+30*s,base-178*s),fill=col)
    d.rectangle((cx-13*s,base-190*s,cx+13*s,base-150*s),fill=col)
    d.chord((cx-120*s,base-165*s,cx+120*s,base+150*s),180,360,fill=col)
    d.rectangle((cx-120*s,base-8*s,cx+120*s,base+80*s),fill=col)
    d.ellipse((cx-16*s,base-120*s,cx+16*s,base-100*s),fill=(255,230,200,255))
# 1 night room
a=grad((10,12,40),(4,4,12));glow(a,1050,250,380,(60,90,200),.8);glow(a,250,650,300,(255,150,60),.5)
def ex(img):
    d=ImageDraw.Draw(img);d.rectangle((820,90,1300,470),fill=(20,30,80,255))
    bokeh(img,90,[(255,200,120),(120,170,255),(255,120,180)],3,12,(830,100,1290,460),(120,220),2)
    d=ImageDraw.Draw(img);d.rectangle((1055,90,1065,470),fill=(6,6,16,255));d.rectangle((820,275,1300,283),fill=(6,6,16,255))
finish(a,'night',ex,blur=3)
# 2 cafe
a=grad((70,40,20),(25,12,6));glow(a,1000,200,500,(255,190,110),1.0);glow(a,300,300,300,(255,140,60),.5)
def ex(img):
    bokeh(img,70,[(255,200,130),(255,170,90),(255,230,180)],18,60,(0,0,W,560),(50,140),10)
    d=ImageDraw.Draw(img);d.rectangle((0,600,W,H),fill=(60,32,16,255))
    d.ellipse((180,520,330,560),fill=(230,220,205,255));d.rectangle((195,440,315,545),fill=(240,235,225,255));d.ellipse((195,425,315,455),fill=(90,50,25,255))
finish(a,'cafe',ex,blur=14)
# 3 office
a=grad((200,215,230),(120,135,150));glow(a,900,250,500,(255,255,255),.6)
def ex(img):
    d=ImageDraw.Draw(img)
    for y in range(60,520,28):d.rectangle((600,y,1350,y+14),fill=(245,248,252,255))
    d.rectangle((560,40,600,540),fill=(150,160,170,255))
    d.rectangle((120,330,520,560),fill=(40,45,55,255));d.rectangle((140,350,500,540),fill=(90,140,210,255))
    d.rectangle((0,600,W,H),fill=(170,150,130,255))
finish(a,'office',ex,blur=12)
# 4 street night
a=grad((12,8,30),(30,10,30));glow(a,300,300,350,(255,60,160),.5);glow(a,1100,350,400,(40,180,255),.5);glow(a,700,150,200,(255,170,60),.7)
def ex(img):
    bokeh(img,110,[(255,80,170),(60,200,255),(255,180,80),(255,255,255)],10,45,(0,0,W,650),(60,170),8)
    d=ImageDraw.Draw(img)
    for i in range(14):
        y=rng.uniform(560,700);d.line((0,y,W,y+rng.uniform(-20,20)),fill=(255,60,60,120) if i%2 else (255,240,200,120),width=4)
finish(a,'street',ex,blur=10)
# 5 gaming
a=grad((10,6,25),(5,3,10));glow(a,700,350,400,(130,60,255),.6);glow(a,300,600,300,(0,255,160),.35);glow(a,1150,600,300,(255,40,120),.35)
def ex(img):
    d=ImageDraw.Draw(img);d.rectangle((420,160,980,480),fill=(25,25,45,255));d.rectangle((435,175,965,465),fill=(60,40,120,255))
    bokeh(img,60,[(140,80,255),(0,255,170),(255,60,140)],8,30,(0,0,W,H),(60,150),6)
finish(a,'gaming',ex,blur=8)
# 6 sunrise rooftop
a=grad((40,30,90),(255,150,90));glow(a,700,620,420,(255,210,140),1.3);glow(a,700,620,150,(255,250,220),1.0)
def ex(img):
    d=ImageDraw.Draw(img);x=0
    while x<W:
        w=rng.uniform(40,110);h=rng.uniform(60,260);d.rectangle((x,700-h,x+w,H),fill=(40,25,45,255));x+=w+rng.uniform(0,12)
    d.rectangle((0,700,W,H),fill=(30,18,34,255))
    pass
    bokeh(img,40,[(255,230,170)],2,5,(0,0,W,500),(80,200),1)
finish(a,'sunrise',ex,blur=2)
print('ok')
