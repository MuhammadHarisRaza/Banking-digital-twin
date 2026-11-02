"""Builds src/data/ubl-branches.json from UBL's published branch list.

Place names repeat across Pakistan, so each branch takes the same-named place nearest its UBL region.

Usage: python -I build-ubl-data.py <UBL Branch List.pdf> <Saturday annexure.pdf> <GeoNames PK.zip> <outline.json> <out.json>

Coordinates are approximate. The list gives addresses but no coordinates, so each branch is placed
at its city from GeoNames, then spread around that point so branches in one city stay clickable.
"""
import collections, csv, io, json, math, re, statistics, sys, unicodedata, zipfile
import fitz
from shapely.geometry import Point, shape

list_pdf, saturday_pdf, geonames_zip, outline_path, out_path = sys.argv[1:6]

PROVINCES = {
    "02": "Balochistan", "03": "Khyber Pakhtunkhwa", "04": "Punjab", "05": "Sindh",
    "06": "Azad Kashmir", "07": "Gilgit-Baltistan", "08": "Islamabad Capital Territory",
}
ALIASES = {
    "rahim yar khan": "rahimyar khan", "d.g khan": "dera ghazi khan", "d g khan": "dera ghazi khan",
    "dg khan": "dera ghazi khan", "d.i khan": "dera ismail khan", "di khan": "dera ismail khan",
    "d i khan": "dera ismail khan", "t.t singh": "toba tek singh", "tt singh": "toba tek singh",
    "m.b din": "mandi bahauddin", "mandi bahauddin": "mandi bahauddin", "swat": "saidu sharif",
    "muzaffarabad": "muzaffarabad", "nawabshah": "nawabshah", "shaheed benazirabad": "nawabshah",
    "tando muhammad khan": "tando muhammad khan", "kashmore": "kashmor", "umerkot": "umarkot",
    "khairpur": "khairpur", "lasbela": "uthal", "malakand": "batkhela", "dir": "dir",
    "sheikhupura": "sheikhupura", "nankana sahib": "nankana sahib", "mirpur azad kashmir": "new mirpur",
    "mirpur (ajk)": "new mirpur", "mirpur ajk": "new mirpur", "mirpur": "new mirpur",
    "mirpur (a.k)": "new mirpur", "dudyal": "dadyal", "butkhela": "batkhela", "mirpurkhas": "mirpur khas",
    "timergara": "timargara", "noshki": "nushki", "sakardu": "skardu", "rawlakot": "rawalakot",
    "samarbagh": "samar bagh", "deraallah yar": "dera allah yar", "sohbat pur": "sohbatpur",
    "chillas": "chilas", "chagi": "chagai", "upper chitral": "chitral", "bahwalpur": "bahawalpur",
    "chakswari": "chak swari", "samahni": "samahni",
}

# Places the gazetteer misses or spells differently: lat, lng, GeoNames province code.
MANUAL = {
    "dudyal": (33.40, 73.82, "06"), "butkhela": (34.6178, 71.9725, "03"), "samahni": (33.06, 74.02, "06"),
    "chakswari": (33.31, 73.96, "06"), "naushero feroze": (26.84, 68.12, "05"), "kharipur": (27.53, 68.76, "05"),
    "jaffarabad": (28.37, 68.35, "02"), "ferozewala": (31.63, 74.25, "04"),
}


def clean(text):
    return re.sub(r"\s+", " ", (text or "").replace("\n", " ")).strip()


def key(text):
    text = unicodedata.normalize("NFKD", clean(text)).encode("ascii", "ignore").decode().lower()
    return re.sub(r"\s+", " ", text).strip()


def titled(text):
    text = clean(text)
    return text.title() if text.isupper() else text


# --- branch rows
rows = []
for page in fitz.open(list_pdf):
    for table in page.find_tables().tables:
        for row in table.extract():
            if row and row[1] and re.fullmatch(r"\s*\d{3,4}\s*", row[1]):
                rows.append(row)
print("rows", len(rows))

# --- Saturday branches: S. NO, cluster, region, branch name, branch code, type
saturday = set()
for page in fitz.open(saturday_pdf):
    for table in page.find_tables().tables:
        for row in table.extract():
            if len(row) >= 5 and row[4] and re.fullmatch(r"\s*\d{3,4}\s*", row[4]):
                saturday.add(row[4].strip().zfill(4))
print("saturday codes", len(saturday))

# --- gazetteer: every place sharing a name is kept, most populated first
places = collections.defaultdict(list)
with zipfile.ZipFile(geonames_zip) as z:
    reader = csv.reader(io.TextIOWrapper(z.open("PK.txt"), encoding="utf-8"), delimiter="\t", quoting=csv.QUOTE_NONE)
    for r in reader:
        if r[6] not in ("P", "A"):
            continue
        record = (float(r[4]), float(r[5]), r[10], int(r[14] or 0) + (1 if r[6] == "P" else 0))
        for name in {r[1], r[2], *r[3].split(",")}:
            k = key(name)
            if k:
                places[k].append(record)
for records in places.values():
    records.sort(key=lambda p: -p[3])
print("gazetteer", len(places))


def lookup(*names):
    for name in names:
        k = key(name)
        for candidate in (ALIASES.get(k, k), k, re.sub(r"[.\-()]", " ", k).strip(), re.sub(r"\s+(city|cantt|town)$", "", k)):
            candidate = re.sub(r"\s+", " ", candidate)
            if candidate in places:
                return places[candidate]
    return []


def distance(a, b):
    return math.hypot((a[0] - b[0]) * 111, (a[1] - b[1]) * 96)


def district_name(text):
    return re.sub(r"\b(city|cantt\.?|district|business|gm pool|north|south|east|west|central)\b", " ", key(text)).replace("-", " ")


def candidates(r):
    city, district = r[6], r[7]
    if key(city) in MANUAL:
        return [(*MANUAL[key(city)], 0)]
    return lookup(city) or lookup(district_name(district)) or lookup(*clean(city).split(" ")[:1])


# First pass: the median of each region's most populated matches anchors that region.
by_region = collections.defaultdict(list)
for r in rows:
    found = candidates(r)
    if found:
        by_region[clean(r[8])].append(found[0])
anchors = {
    region: (statistics.median(p[0] for p in found), statistics.median(p[1] for p in found))
    for region, found in by_region.items()
}

branches, unmatched = [], collections.Counter()
for r in rows:
    _, code, category, name, _bom, _phone, city, district, region, cluster, area, address, atm, lockers = r[:14]
    code = code.strip().zfill(4)
    found = candidates(r)
    if not found:
        unmatched[clean(city)] += 1
        continue
    anchor = anchors[clean(region)]
    place = min(found, key=lambda p: distance(p, anchor))
    branches.append({
        "code": code, "category": clean(category), "name": clean(name), "city": titled(city),
        "district": clean(district), "region": clean(region), "cluster": clean(cluster), "area": clean(area),
        "address": titled(address), "atm": key(atm) == "yes", "lockers": key(lockers) == "yes",
        "saturday": code in saturday, "lat": place[0], "lng": place[1], "province": PROVINCES.get(place[2], ""),
    })

print("matched", len(branches), "unmatched", sum(unmatched.values()), unmatched.most_common(40))
print("category", collections.Counter(b["category"] for b in branches))
print("province", collections.Counter(b["province"] for b in branches))
print("region sample", collections.Counter(b["cluster"] for b in branches).most_common(14))
print("cities", len({b["city"] for b in branches}), collections.Counter(b["city"] for b in branches).most_common(12))
print("atm", sum(b["atm"] for b in branches), "lockers", sum(b["lockers"] for b in branches), "saturday", sum(b["saturday"] for b in branches))

# --- spread branches in a shared city with a sunflower pattern, keeping them on land
outline = shape(json.load(open(outline_path))["geometry"])
groups = collections.defaultdict(list)
for b in branches:
    groups[(b["lat"], b["lng"])].append(b)
for (lat, lng), group in groups.items():
    group.sort(key=lambda b: b["code"])
    if len(group) == 1:
        continue
    step = 0.009
    placed = 0
    i = 0
    while placed < len(group):
        radius = step * math.sqrt(i + 0.5)
        angle = i * 2.39996
        la = lat + radius * math.sin(angle)
        ln = lng + radius * math.cos(angle) / math.cos(math.radians(lat))
        i += 1
        if outline.contains(Point(ln, la)):
            group[placed]["lat"], group[placed]["lng"] = round(la, 4), round(ln, 4)
            placed += 1

json.dump(sorted(branches, key=lambda b: b["code"]), open(out_path, "w", encoding="utf-8"), ensure_ascii=False, separators=(",", ":"))
print("written", len(branches))
