import re
from typing import Dict, Any

# Stupid-simple fallback parser so you can test without AI
ADD_RE   = re.compile(r"^(add|put in)\s+(an?\s+)?(808|kick|snare|hi\s*hat|hihat|clap|bass|piano|pad)$", re.I)
REMOVE_RE= re.compile(r"^(remove|delete)\s+(the\s+)?(808|kick|snare|hi\s*hat|hihat|clap|bass|piano|pad)$", re.I)
MUTE_RE  = re.compile(r"^mute\s+(the\s+)?(808|kick|snare|hi\s*hat|hihat|clap|bass|piano|pad)$", re.I)
UNMUTE_RE= re.compile(r"^unmute\s+(the\s+)?(808|kick|snare|hi\s*hat|hihat|clap|bass|piano|pad)$", re.I)
TEMPO_ABS= re.compile(r"^set\s+tempo\s+to\s+(\d{2,3})$", re.I)
TEMPO_DEL= re.compile(r"^(increase|decrease)\s+tempo\s+by\s+(\d{1,2})$", re.I)
KEY_RE   = re.compile(r"^set\s+key\s+to\s+(C|G|A\s*minor|E\s*minor)$", re.I)
SWING_RE = re.compile(r"^swing\s+(5[0-9]|6[0-5])%$", re.I)

def parse_command(text: str) -> Dict[str, Any]:
    t = text.strip()
    if m := ADD_RE.match(t):
        return {"type":"add","instrument":m.group(3).replace(" ","")}
    if m := REMOVE_RE.match(t):
        return {"type":"remove","instrument":m.group(3).replace(" ","")}
    if m := MUTE_RE.match(t):
        return {"type":"mute","instrument":m.group(2).replace(" ","")}
    if m := UNMUTE_RE.match(t):
        return {"type":"unmute","instrument":m.group(2).replace(" ","")}
    if m := TEMPO_ABS.match(t):
        return {"type":"tempo:set","bpm":int(m.group(1))}
    if m := TEMPO_DEL.match(t):
        sign = 1 if m.group(1).lower()=="increase" else -1
        return {"type":"tempo:delta","delta":sign*int(m.group(2))}
    if m := KEY_RE.match(t):
        return {"type":"key:set","key":m.group(1).replace("  "," ").title()}
    if m := SWING_RE.match(t):
        return {"type":"swing:set","percent":int(m.group(1))}
    return {"type":"unknown","raw":t}
