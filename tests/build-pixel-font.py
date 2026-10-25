"""Build the original 5x7 Arcade Pixel font using only the standard library."""
import struct as s
from pathlib import Path

patterns = {
'A':'01110/10001/10001/11111/10001/10001/10001',
'B':'11110/10001/10001/11110/10001/10001/11110',
'C':'01111/10000/10000/10000/10000/10000/01111',
'D':'11110/10001/10001/10001/10001/10001/11110',
'E':'11111/10000/10000/11110/10000/10000/11111',
'F':'11111/10000/10000/11110/10000/10000/10000',
'G':'01111/10000/10000/10111/10001/10001/01111',
'H':'10001/10001/10001/11111/10001/10001/10001',
'I':'111/010/010/010/010/010/111',
'J':'00111/00010/00010/00010/10010/10010/01100',
'K':'10001/10010/10100/11000/10100/10010/10001',
'L':'10000/10000/10000/10000/10000/10000/11111',
'M':'10001/11011/10101/10101/10001/10001/10001',
'N':'10001/11001/11001/10101/10011/10011/10001',
'O':'01110/10001/10001/10001/10001/10001/01110',
'P':'11110/10001/10001/11110/10000/10000/10000',
'Q':'01110/10001/10001/10001/10101/10010/01101',
'R':'11110/10001/10001/11110/10100/10010/10001',
'S':'01111/10000/10000/01110/00001/00001/11110',
'T':'11111/00100/00100/00100/00100/00100/00100',
'U':'10001/10001/10001/10001/10001/10001/01110',
'V':'10001/10001/10001/10001/10001/01010/00100',
'W':'10001/10001/10001/10101/10101/11011/10001',
'X':'10001/10001/01010/00100/01010/10001/10001',
'Y':'10001/10001/01010/00100/00100/00100/00100',
'Z':'11111/00001/00010/00100/01000/10000/11111',
'0':'01110/10011/10101/10101/11001/10001/01110',
'1':'010/110/010/010/010/010/111',
'2':'01110/10001/00001/00010/00100/01000/11111',
'3':'11110/00001/00001/01110/00001/00001/11110',
'4':'00010/00110/01010/10010/11111/00010/00010',
'5':'11111/10000/10000/11110/00001/00001/11110',
'6':'01110/10000/10000/11110/10001/10001/01110',
'7':'11111/00001/00010/00100/01000/01000/01000',
'8':'01110/10001/10001/01110/10001/10001/01110',
'9':'01110/10001/10001/01111/00001/00001/01110',
'!':'1/1/1/1/1/0/1','?':'01110/10001/00001/00010/00100/00000/00100',
'.':'0/0/0/0/0/0/1',',':'00/00/00/00/00/01/10',
':':'0/0/1/0/1/0/0',';':'00/00/01/00/01/01/10',
'-':'000/000/000/111/000/000/000','+':'000/000/010/111/010/000/000',
'/':'00001/00001/00010/00100/01000/10000/10000',
"'":'1/1/0/0/0/0/0','(':'01/10/10/10/10/10/01',')':'10/01/01/01/01/01/10',
'%':'11001/11010/00010/00100/01000/01011/10011',
'=':'000/000/111/000/111/000/000','>':'100/010/001/000/001/010/100',
'<':'001/010/100/000/100/010/001','|':'1/1/1/1/1/1/1',
'[':'11/10/10/10/10/10/11',']':'11/01/01/01/01/01/11',
'*':'00000/10101/01110/11111/01110/10101/00000',
' ': '000/000/000/000/000/000/000',
}
u16=lambda *v:s.pack('>'+'H'*len(v),*v)
i16=lambda *v:s.pack('>'+'h'*len(v),*v)
u32=lambda *v:s.pack('>'+'I'*len(v),*v)
pad=lambda b:b+b'\0'*((-len(b))%4)
chars=['\0']+list(patterns)
glyphs=[];metrics=[];offsets=[0]
for ch in chars:
    rows=patterns.get(ch,patterns['?']).split('/')
    points=[];ends=[]
    for y,row in enumerate(rows):
        for x,v in enumerate(row):
            if v=='1':
                left=x*100;bottom=(6-y)*100
                points += [(left,bottom),(left,bottom+100),(left+100,bottom+100),(left+100,bottom)]
                ends.append(len(points)-1)
    width=max(map(len,rows))*100
    if points:
        data=i16(len(ends),0,0,width,700)+u16(*ends)+u16(0)+bytes([1]*len(points))
        for axis in [0,1]:
            prev=0
            for p in points:
                data+=i16(p[axis]-prev);prev=p[axis]
    else:data=i16(0,0,0,0,0)
    data=pad(data);glyphs.append(data);offsets.append(offsets[-1]+len(data));metrics.append(u16(width+100,0))
mapping={ord(ch):i for i,ch in enumerate(chars) if i}
for c in 'abcdefghijklmnopqrstuvwxyz':mapping[ord(c)]=mapping[ord(c.upper())]
for accented,plain in {'à':'A','è':'E','é':'E','ì':'I','ò':'O','ù':'U','À':'A','È':'E','É':'E','Ì':'I','Ò':'O','Ù':'U','’':"'",'‘':"'",'—':'-','–':'-','·':'.','→':'>','↗':'>','×':'X','★':'*','Ⅱ':'H','♪':'*'}.items():mapping[ord(accented)]=mapping[ord(plain)]
codes=sorted(mapping)+[65535];count=len(codes);power=2**(count.bit_length()-1)
cmap=u16(4,16+count*8,0,count*2,power*2,power.bit_length()-1,count*2-power*2)
cmap+=u16(*codes)+u16(0)+u16(*codes)+u16(*[((mapping.get(c,0)-c)&65535) for c in codes])+u16(*([0]*count))
names=[(1,'Arcade Pixel'),(2,'Regular'),(4,'Arcade Pixel'),(6,'ArcadePixel'),(0,'Original font created for Wild Bunch. CC0.')]
records=b'';strings=b''
for nid,value in names:
    b=value.encode('utf-16-be');records+=u16(3,1,0x409,nid,len(b),len(strings));strings+=b
tables={
 'head':u32(0x10000,0x10000,0,0x5f0f3cf5)+u16(3,1000)+bytes(16)+i16(0,0,600,700)+u16(0,8)+i16(2,1,0),
 'hhea':u32(0x10000)+i16(850,-150,100)+u16(600)+i16(0,0,600,1,0,0)+bytes(8)+i16(0)+u16(len(chars)),
 'maxp':u32(0x10000)+u16(len(chars),200,50,0,0,2,0,0,0,0,0,0,0,0),
 'hmtx':b''.join(metrics),'loca':u32(*offsets),'glyf':b''.join(glyphs),
 'cmap':u16(0,1,3,1)+u32(12)+cmap,
 'name':u16(0,len(names),6+len(records))+records+strings,
 'post':u32(0x30000,0)+i16(-100,50)+u32(0,0,0,0,0),
 'OS/2':u16(0)+i16(600)+u16(400,5,0)+i16(650,600,0,75,650,600,0,350,50,250,0)+bytes(10)+u32(1,0,0,0)+b'WB  '+u16(64,min(mapping),max(mapping))+i16(850,-150,100)+u16(850,150),
}
checksum=lambda b:sum(s.unpack('>'+'I'*(len(pad(b))//4),pad(b)))&0xffffffff
n=len(tables);p=2**(n.bit_length()-1)
header=u32(0x10000)+u16(n,p*16,p.bit_length()-1,n*16-p*16)
directory=b'';body=b'';head_offset=0
for tag,data in sorted(tables.items()):
    offset=12+16*n+len(body)
    if tag=='head':head_offset=offset
    directory+=tag.encode()+u32(checksum(data),offset,len(data));body+=pad(data)
result=bytearray(header+directory+body)
result[head_offset+8:head_offset+12]=u32((0xb1b0afba-checksum(result))&0xffffffff)
dest=Path(__file__).resolve().parent.parent/'assets'/'arcade-pixel.ttf'
dest.write_bytes(result)
print(f'Built {dest}: {len(result)} bytes')
