"""Builds the map assets from the geoBoundaries ADM1 file and AWS Terrarium elevation tiles.

Usage: python build-map-assets.py <adm1.geojson> <tile-cache-dir> <src/assets/geo output dir>

Writes:
  pakistan-provinces.json  simplified province polygons
  pakistan-outline.json    dissolved national outline
  pakistan-terrain.webp    hillshade clipped to the outline, in Web Mercator
  terrain-bounds.json      lat/lng corners for the Leaflet image overlay
"""
import io, json, math, os, sys, urllib.request
import numpy as np
from PIL import Image, ImageDraw, ImageFilter
from shapely.geometry import mapping, shape
from shapely.ops import unary_union

src, cache, out = sys.argv[1:4]
Z = 7
TILE = 256
os.makedirs(cache, exist_ok=True)

gj = json.load(open(src, encoding="utf-8"))
provinces = []
for f in gj["features"]:
    g = shape(f["geometry"]).simplify(0.008, preserve_topology=True).buffer(0)
    provinces.append({"type": "Feature", "properties": {"name": f["properties"]["shapeName"]},
                      "geometry": json.loads(json.dumps(mapping(g)))})
outline = unary_union([shape(p["geometry"]).buffer(0.01) for p in provinces]).buffer(-0.01)
if outline.geom_type == "MultiPolygon":
    outline = max(outline.geoms, key=lambda g: g.area)
outline = outline.simplify(0.01)


def rounded(o):
    if isinstance(o, (list, tuple)):
        return [round(o[0], 3), round(o[1], 3)] if len(o) == 2 and isinstance(o[0], float) else [rounded(x) for x in o]
    return o


for p in provinces:
    p["geometry"]["coordinates"] = rounded(p["geometry"]["coordinates"])
json.dump({"type": "FeatureCollection", "features": provinces},
          open(f"{out}/pakistan-provinces.json", "w"), separators=(",", ":"))
json.dump({"type": "Feature", "properties": {}, "geometry": {"type": "Polygon", "coordinates": rounded(mapping(outline)["coordinates"])}},
          open(f"{out}/pakistan-outline.json", "w"), separators=(",", ":"))


def tx(lon): return (lon + 180) / 360 * 2 ** Z
def ty(lat):
    r = math.radians(lat)
    return (1 - math.asinh(math.tan(r)) / math.pi) / 2 * 2 ** Z
def lat_of(y): return math.degrees(math.atan(math.sinh(math.pi * (1 - 2 * y / 2 ** Z))))
def lon_of(x): return x / 2 ** Z * 360 - 180


minx, miny, maxx, maxy = outline.bounds
x0, x1 = int(tx(minx)), int(tx(maxx))
y0, y1 = int(ty(maxy)), int(ty(miny))
w, h = (x1 - x0 + 1) * TILE, (y1 - y0 + 1) * TILE
elev = np.zeros((h, w), dtype=np.float32)
for ty_i in range(y0, y1 + 1):
    for tx_i in range(x0, x1 + 1):
        path = f"{cache}/{Z}_{tx_i}_{ty_i}.png"
        if not os.path.exists(path):
            url = f"https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{Z}/{tx_i}/{ty_i}.png"
            urllib.request.urlretrieve(url, path)
        a = np.asarray(Image.open(path).convert("RGB"), dtype=np.float32)
        e = a[..., 0] * 256 + a[..., 1] + a[..., 2] / 256 - 32768
        elev[(ty_i - y0) * TILE:(ty_i - y0 + 1) * TILE, (tx_i - x0) * TILE:(tx_i - x0 + 1) * TILE] = e

# Hillshade from the north-west, exaggerated so the Indus plain still carries texture.
elev = np.maximum(elev, 0)
cell = 40075016 * math.cos(math.radians(30)) / (2 ** Z * TILE)
gy, gx = np.gradient(elev * 2.6, cell)
slope = np.arctan(np.hypot(gx, gy))
aspect = np.arctan2(-gx, gy)
az, alt = math.radians(315), math.radians(42)
shade = np.sin(alt) * np.cos(slope) + np.cos(alt) * np.sin(slope) * np.cos(az - aspect)
shade = np.clip(shade, 0, 1)
relief = np.clip(np.log1p(elev) / np.log1p(6500), 0, 1)

# Deep navy ramp: lit slopes rise toward slate, plains stay close to the page tone.
low = np.array([13, 29, 46], dtype=np.float32)
high = np.array([58, 80, 104], dtype=np.float32)
t = np.clip((shade - 0.42) * 1.55 + relief * 0.22, 0, 1)[..., None]
rgb = low + (high - low) * t

S = 2
mask = Image.new("L", (w * S, h * S), 0)
ring = [((tx(a) - x0) * TILE * S, (ty(b) - y0) * TILE * S) for a, b in outline.exterior.coords]
ImageDraw.Draw(mask).polygon(ring, fill=255)
mask = mask.resize((w, h), Image.LANCZOS).filter(ImageFilter.GaussianBlur(0.4))
img = Image.fromarray(rgb.astype(np.uint8), "RGB")
img.putalpha(mask)
img.save(f"{out}/pakistan-terrain.webp", quality=78, method=6)
json.dump({"south": lat_of(y1 + 1), "west": lon_of(x0), "north": lat_of(y0), "east": lon_of(x1 + 1)},
          open(f"{out}/terrain-bounds.json", "w"))
print("terrain", w, h, os.path.getsize(f"{out}/pakistan-terrain.webp"))
print("provinces KB", os.path.getsize(f"{out}/pakistan-provinces.json") // 1024)
