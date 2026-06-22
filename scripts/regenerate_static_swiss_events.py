#!/usr/bin/env python3
import json, math
from datetime import datetime, timezone, timedelta
from pathlib import Path
import swisseph as swe

swe.set_sid_mode(swe.SIDM_LAHIRI)
FLAGS = swe.FLG_SWIEPH | swe.FLG_SIDEREAL | swe.FLG_SPEED
START = datetime(1990,1,1,tzinfo=timezone.utc)
END = datetime(2032,12,31,23,59,59,tzinfo=timezone.utc)
SIGNS = ["Aries","Taurus","Gemini","Cancer","Leo","Virgo","Libra","Scorpio","Sagittarius","Capricorn","Aquarius","Pisces"]
PLANETS = {
    'sun': swe.SUN, 'moon': swe.MOON, 'mercury': swe.MERCURY, 'venus': swe.VENUS,
    'mars': swe.MARS, 'jupiter': swe.JUPITER, 'saturn': swe.SATURN, 'rahu': swe.MEAN_NODE
}
INGRESS_PLANETS = ['sun','mercury','venus','mars','jupiter','saturn','rahu']
STATION_PLANETS = ['mercury','venus','mars','jupiter','saturn']
MACRO_PAIRS = [
  ("jupiter", "venus"), ("jupiter", "mercury"), ("jupiter", "mars"), ("jupiter", "saturn"),
  ("jupiter", "rahu"), ("saturn", "rahu"), ("saturn", "venus"), ("saturn", "mercury"),
  ("mars", "saturn"), ("mars", "rahu"), ("venus", "rahu"), ("mercury", "rahu"), ("sun", "rahu")
]
ASPECTS = [
  ('conjunction',0,'amplification'),('sextile',60,'support'),('square',90,'pressure'),('trine',120,'support'),('opposition',180,'pressure')
]

def jd(dt): return swe.julday(dt.year, dt.month, dt.day, dt.hour + dt.minute/60 + dt.second/3600 + dt.microsecond/3.6e9)
def dt_from_jd(j):
    y,m,d,h = swe.revjul(j)
    hour=int(h); mn=int((h-hour)*60); sec=int(round((((h-hour)*60)-mn)*60))
    if sec>=60: sec-=60; mn+=1
    if mn>=60: mn-=60; hour+=1
    return datetime(y,m,d,tzinfo=timezone.utc)+timedelta(hours=hour, minutes=mn, seconds=sec)
def iso(dt): return dt.strftime('%Y-%m-%dT%H:%M:%SZ')
def ist_iso(dt): return (dt+timedelta(hours=5,minutes=30)).strftime('%Y-%m-%dT%H:%M:%S+05:30')
def norm(x): return x%360.0
def sign_idx(deg): return int(norm(deg)//30)
def sign(deg): return SIGNS[sign_idx(deg)]
def calc(planet, j):
    if planet == 'ketu':
        r = calc('rahu', j)
        return (norm(r[0]+180), -r[1])
    xx, ret = swe.calc_ut(j, PLANETS[planet], FLAGS)
    return norm(xx[0]), xx[3]
def angle_diff(a,b):
    d=abs(norm(a)-norm(b)); return min(d,360-d)
def aspect_orb(a,b,target): return abs(angle_diff(a,b)-target)
def directed_orb(a,b,target):
    direct=aspect_orb(a,b,target)
    mirror=direct if target in (0,180) else aspect_orb(a,b,360-target)
    return min(direct,mirror)
def days_till(exact, start=START): return (exact-start).total_seconds()/86400

def title(p): return p[:1].upper()+p[1:]
def aspect_tone(pair, aspect_name, aspect_type):
    joined='-'.join(pair); supportive=aspect_name in ('conjunction','trine','sextile')
    if 'jupiter' in pair and 'venus' in pair and supportive: return 'expansion'
    if 'saturn' in pair and 'venus' in pair and aspect_name in ('trine','sextile'): return 'expansion'
    if 'mars' in pair and 'saturn' in pair and aspect_name in ('trine','sextile'): return 'transition'
    if aspect_name in ('square','opposition'): return 'pressure'
    if 'rahu' in pair: return 'volatility'
    if aspect_type=='support': return 'expansion'
    return 'transition'
def result_env(tone):
    return {'expansion':'EXPANSION / RERATING','pressure':'PRESSURE / REVIEW','volatility':'AMPLIFICATION / VOLATILITY'}.get(tone,'ASPECT SHIFT')
def notes(pair, aspect_name, degree, sign_name):
    label=f"{title(pair[0])}-{title(pair[1])} {aspect_name}"
    if 'jupiter' in pair and 'venus' in pair:
        return f"{label}: expansion, liquidity, valuation/rerating and preference-for-quality themes can strengthen; natal Venus/Jupiter contacts decide which stocks benefit. Exact near {degree:.2f}° {sign_name}."
    if 'jupiter' in pair and 'rahu' in pair:
        return f"{label}: expansion plus amplification; can become leadership or speculative heat depending on natal response."
    if 'saturn' in pair and 'rahu' in pair:
        return f"{label}: fear/greed compression, unstable pressure, and churning."
    if 'saturn' in pair and 'venus' in pair and aspect_name in ('trine','sextile'):
        return f"{label}: disciplined expansion, valuation repair, selective support, and preference for durable quality."
    if 'mars' in pair and 'saturn' in pair:
        return f"{label}: force meets restraint; disciplined execution or friction depending on natal response."
    return f"{label}: macro aspect window; stock-specific natal contacts decide the behaviour."

def bisect_boundary(planet, j1, j2, start_sign):
    lo, hi = j1, j2
    for _ in range(60):
        mid=(lo+hi)/2
        if sign_idx(calc(planet, mid)[0]) == start_sign:
            lo=mid
        else:
            hi=mid
    return hi

def build_ingresses():
    events=[]
    step=0.25
    for planet in INGRESS_PLANETS:
        j0=jd(START); jend=jd(END)
        prev_j=j0; prev_sign=sign_idx(calc(planet, prev_j)[0])
        jcur=j0+step
        while jcur <= jend:
            s=sign_idx(calc(planet,jcur)[0])
            if s != prev_sign:
                exj=bisect_boundary(planet, prev_j, jcur, prev_sign)
                dt=dt_from_jd(exj); deg,speed=calc(planet,exj); to_s=sign_idx(deg); from_s=prev_sign
                events.append({
                    'kind':'ingress','label':f"{title(planet)} ingress {SIGNS[from_s]} → {SIGNS[to_s]}",'planet':planet,
                    'from':SIGNS[from_s], 'to':SIGNS[to_s], 'date':dt.strftime('%Y-%m-%d'), 'exactUtc':iso(dt), 'exactIst':ist_iso(dt),
                    'degree':round(to_s*30.0,6), 'sign':SIGNS[to_s],
                    'source':'Swiss Ephemeris exact sidereal Lahiri ingress (runtime-grade bisection)',
                    'zodiac':'sidereal','ayanamsa':'Lahiri'
                })
                prev_sign=s
            prev_j=jcur; jcur += step
    return sorted(events, key=lambda e:e['exactUtc'])

def build_stations():
    events=[]; step=0.25
    for planet in STATION_PLANETS:
        j0=jd(START); jend=jd(END)
        prev_j=j0; prev_sp=calc(planet,prev_j)[1]; prev_state=prev_sp<0
        jcur=j0+step
        while jcur <= jend:
            sp=calc(planet,jcur)[1]; state=sp<0
            if state != prev_state:
                lo,hi=prev_j,jcur
                for _ in range(60):
                    mid=(lo+hi)/2; msp=calc(planet,mid)[1]
                    if (msp<0)==prev_state: lo=mid
                    else: hi=mid
                exj=hi; dt=dt_from_jd(exj); deg,sp0=calc(planet,exj); after=calc(planet,exj+1/1440)[1]
                station='retrograde begins' if after<0 else 'direct begins'
                events.append({'kind':'station','label':f"{title(planet)} {station}",'planet':planet,'station':station,
                    'date':dt.strftime('%Y-%m-%d'),'exactUtc':iso(dt),'exactIst':ist_iso(dt),'degree':round(deg,6),'sign':sign(deg),'speedLongitude':0,
                    'source':'Swiss Ephemeris exact sidereal Lahiri station (speed zero-crossing bisection)','zodiac':'sidereal','ayanamsa':'Lahiri'})
                prev_state=state
            prev_j=jcur; jcur+=step
    return sorted(events,key=lambda e:e['exactUtc'])

def refine_min(pair, target, center_j):
    lo=center_j-0.75; hi=center_j+0.75
    for _ in range(80):
        m1=lo+(hi-lo)/3; m2=hi-(hi-lo)/3
        p11=calc(pair[0],m1)[0]; p12=calc(pair[1],m1)[0]
        p21=calc(pair[0],m2)[0]; p22=calc(pair[1],m2)[0]
        if directed_orb(p11,p12,target) < directed_orb(p21,p22,target): hi=m2
        else: lo=m1
    return (lo+hi)/2

def build_aspects():
    events=[]; step=0.25; j0=jd(START); jend=jd(END)
    for pair in MACRO_PAIRS:
      for aspect_name,target,atype in ASPECTS:
        prev2=None; prev1=None; vals=[]
        jcur=j0
        # Use rolling local minimum detection
        while jcur <= jend:
            orb=directed_orb(calc(pair[0],jcur)[0], calc(pair[1],jcur)[0], target)
            vals.append((jcur,orb))
            if len(vals)>=3:
                (ja,oa),(jb,ob),(jc,oc)=vals[-3],vals[-2],vals[-1]
                if ob <= oa and ob <= oc and ob < 2.0: # potential aspect exactness
                    exj=refine_min(pair,target,jb)
                    d1,s1=calc(pair[0],exj); d2,s2=calc(pair[1],exj)
                    exact_orb=directed_orb(d1,d2,target)
                    if exact_orb < 0.08:
                        dt=dt_from_jd(exj); tone=aspect_tone(pair,aspect_name,atype)
                        # avoid dupes within 2 days same pair/aspect
                        if not events or not any(e['planets']==list(pair) and e['aspect']==aspect_name and abs((datetime.fromisoformat(e['exactUtc'].replace('Z','+00:00'))-dt).total_seconds())<2*86400 for e in events[-10:]):
                            events.append({'kind':'macroAspect','label':f"{title(pair[0])}-{title(pair[1])} {aspect_name}",'name':f"{pair[0]}-{pair[1]} {aspect_name}",
                                'planets':list(pair),'aspect':aspect_name,'angle':target,'date':dt.strftime('%Y-%m-%d'),'exactUtc':iso(dt),'exactIst':ist_iso(dt),
                                'type':tone,'resultingEnvironment':result_env(tone),'notes':notes(pair,aspect_name,d1,sign(d1)),
                                'degree':round(d1,6),'sign':sign(d1),'orb':round(exact_orb,6),
                                'p1':{'planet':pair[0],'degree':round(d1,6),'sign':sign(d1)},'p2':{'planet':pair[1],'degree':round(d2,6),'sign':sign(d2)},
                                'source':'Swiss Ephemeris exact sidereal Lahiri macro aspect (runtime-grade minimization)','zodiac':'sidereal','ayanamsa':'Lahiri'})
            jcur+=step
    return sorted(events,key=lambda e:e['exactUtc'])

def main():
    p=Path('data/staticSwissEvents.json')
    old=json.load(open(p))
    data={
      'metadata':{
        **old.get('metadata',{}),
        'provider':'static-swiss-events',
        'library':'Swiss Ephemeris via pyswisseph',
        'version':getattr(swe,'version','unknown'),
        'range':{'start':'1990-01-01','end':'2032-12-31'},
        'zodiac':'sidereal','ayanamsa':'Lahiri','nodeType':'mean lunar node',
        'eventPrecision':'ingresses/stations/macro aspects exact from Swiss Ephemeris sidereal Lahiri using bisection/minimization; eclipses exact from Swiss Ephemeris table',
        'privateResearchPrototype':True,'noHardcodedEvents':True
      },
      'ingresses':build_ingresses(),
      'stations':build_stations(),
      'macroAspects':build_aspects(),
      'eclipses':old.get('eclipses',[])
    }
    tmp=p.with_suffix('.json.tmp')
    json.dump(data, open(tmp,'w'), separators=(',',':'))
    tmp.replace(p)
    print('done', {k:len(data[k]) for k in ['ingresses','stations','macroAspects','eclipses']})

if __name__=='__main__': main()
