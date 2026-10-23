#!/usr/bin/env python3
"""
X-ray Client for LG webOS TV - Icon Generator
Generates square PNG icons (80x80 and 130x130) with modern X-ray lightning branding.
"""

import os
import zlib
import struct
import math

ROOT_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
APP_DIR = os.path.join(ROOT_DIR, 'app')

def create_png(width, height, draw_func, filename):
    raw_data = bytearray()
    for y in range(height):
        raw_data.append(0)  # filter byte (None)
        for x in range(width):
            r, g, b, a = draw_func(x, y, width, height)
            raw_data.extend([r, g, b, a])
    
    def chunk(tag, data):
        return struct.pack('>I', len(data)) + tag + data + struct.pack('>I', zlib.crc32(tag + data) & 0xffffffff)

    png = b'\x89PNG\r\n\x1a\n'
    ihdr_data = struct.pack('>IIBBBBB', width, height, 8, 6, 0, 0, 0)
    png += chunk(b'IHDR', ihdr_data)
    compressed = zlib.compress(bytes(raw_data), 9)
    png += chunk(b'IDAT', compressed)
    png += chunk(b'IEND', b'')
    
    with open(filename, 'wb') as f:
        f.write(png)
    print(f"Created {filename} ({len(png)} bytes)")

def xray_icon_drawer(x, y, w, h):
    nx = (x / (w - 1)) * 2 - 1
    ny = (y / (h - 1)) * 2 - 1
    
    # Rounded squircle
    r_sq = (nx**4 + ny**4)**0.25
    if r_sq > 0.96:
        return 0, 0, 0, 0
    
    # Modern dark background with electric blue/violet gradient
    bg_r = int(12 + 10 * (1 - ny) + 5 * nx)
    bg_g = int(16 + 12 * (1 - ny) + 8 * nx)
    bg_b = int(28 + 25 * (1 - ny) + 15 * nx)
    
    # Border highlight
    if r_sq > 0.88:
        t = (r_sq - 0.88) / 0.08
        bg_r = int(bg_r * (1 - t) + 40 * t)
        bg_g = int(bg_g * (1 - t) + 60 * t)
        bg_b = int(bg_b * (1 - t) + 100 * t)
    
    # Stylized X-ray lightning pulse
    poly = [
        (0.12, -0.62),
        (-0.35, 0.02),
        (-0.02, 0.02),
        (-0.16, 0.65),
        (0.38, -0.04),
        (0.05, -0.04)
    ]
    
    inside = False
    n = len(poly)
    p1x, p1y = poly[0]
    for i in range(n + 1):
        p2x, p2y = poly[i % n]
        if ny > min(p1y, p2y):
            if ny <= max(p1y, p2y):
                if nx <= max(p1x, p2x):
                    if p1y != p2y:
                        xinters = (ny - p1y) * (p2x - p1x) / (p2y - p1y) + p1x
                    if p1x == p2x or nx <= xinters:
                        inside = not inside
        p1x, p1y = p2x, p2y
        
    if inside:
        # Gradient on lightning: Cyan #00f0ff to Indigo #6366f1
        t_grad = (ny + 0.6) / 1.2
        t_grad = max(0.0, min(1.0, t_grad))
        lr = int(0 * (1 - t_grad) + 99 * t_grad)
        lg = int(240 * (1 - t_grad) + 102 * t_grad)
        lb = int(255 * (1 - t_grad) + 241 * t_grad)
        return lr, lg, lb, 255

    # Glowing aura around logo
    cdist = math.sqrt((nx - 0.02)**2 + (ny - 0.02)**2)
    if cdist < 0.6:
        glow = (1.0 - (cdist / 0.6)) * 0.35
        bg_r = min(255, int(bg_r + 0 * glow))
        bg_g = min(255, int(bg_g + 200 * glow))
        bg_b = min(255, int(bg_b + 255 * glow))
        
    return bg_r, bg_g, bg_b, 255

if __name__ == "__main__":
    icon_80 = os.path.join(APP_DIR, "icon.png")
    icon_130 = os.path.join(APP_DIR, "icon-large.png")
    create_png(80, 80, xray_icon_drawer, icon_80)
    create_png(130, 130, xray_icon_drawer, icon_130)
