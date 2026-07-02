#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
UniHealth 360 -- Launch Assets Generator
Creates professional healthcare app icons and splash screens
"""

from PIL import Image, ImageDraw
import os
from pathlib import Path

# Create assets directories
dirs = [
    "unihealth-provider/assets",
    "unihealth-patient360/assets",
    "unihealth-provider/play-store",
    "unihealth-patient360/play-store"
]

for d in dirs:
    Path(d).mkdir(parents=True, exist_ok=True)

print("[OK] Created asset directories\n")

# 1. CREATE APP ICON (1024x1024)
def create_icon():
    img = Image.new('RGBA', (1024, 1024), (255, 255, 255, 0))
    draw = ImageDraw.Draw(img)
    
    # Gradient background (blue)
    for y in range(1024):
        r = int(30 + (30 * y / 1024))
        g = int(64 + (58 * y / 1024))
        b = int(175 - (17 * y / 1024))
        draw.line([(0, y), (1024, y)], fill=(r, g, b, 255))
    
    # White circle background
    draw.ellipse([100, 100, 924, 924], fill=(255, 255, 255, 242))
    
    # Medical cross (blue)
    draw.rectangle([462, 282, 562, 762], fill=(30, 64, 175, 255))
    draw.rectangle([282, 462, 762, 562], fill=(30, 64, 175, 255))
    
    # Outer circle outline
    draw.ellipse([300, 300, 724, 724], outline=(30, 64, 175, 255), width=20)
    
    # Center accent circle (cyan)
    draw.ellipse([492, 492, 532, 532], fill=(6, 182, 212, 255))
    
    # Accent circle in corner
    draw.ellipse([750, 50, 950, 250], fill=(255, 255, 255, 51))
    
    return img

# 2. CREATE SPLASH SCREEN (1242x2436)
def create_splash():
    img = Image.new('RGBA', (1242, 2436), (255, 255, 255, 0))
    draw = ImageDraw.Draw(img)
    
    # Gradient background
    for y in range(2436):
        ratio = y / 2436
        if ratio < 0.5:
            r = int(30)
            g = int(64)
            b = int(175 - (85 * ratio * 2))
        else:
            r = int(30)
            g = int(64 - (64 * (ratio - 0.5) * 2))
            b = int(85 - (85 * (ratio - 0.5) * 2))
        draw.line([(0, y), (1242, y)], fill=(r, g, b, 255))
    
    # Decorative circles
    draw.ellipse([50, 150, 350, 450], fill=(255, 255, 255, 26))
    draw.ellipse([1000, 300, 1400, 700], fill=(6, 182, 212, 38))
    draw.ellipse([400, 2100, 800, 2500], fill=(255, 255, 255, 20))
    
    # Center icon circle
    draw.ellipse([441, 620, 801, 980], fill=(255, 255, 255, 242))
    
    # Medical cross centered
    center_x, center_y = 621, 800
    draw.rectangle([center_x - 30, center_y - 90, center_x + 30, center_y + 90], fill=(30, 64, 175, 255))
    draw.rectangle([center_x - 90, center_y - 30, center_x + 90, center_y + 30], fill=(30, 64, 175, 255))
    
    # Outer circle
    draw.ellipse([501, 680, 741, 920], outline=(30, 64, 175, 255), width=12)
    
    # Center accent
    draw.ellipse([611, 790, 631, 810], fill=(6, 182, 212, 255))
    
    # Bottom accent line
    draw.rectangle([300, 2300, 942, 2304], fill=(6, 182, 212, 153))
    
    return img

# 3. CREATE ADAPTIVE ICON (1024x1024)
def create_adaptive_icon():
    img = Image.new('RGBA', (1024, 1024), (255, 255, 255, 0))
    draw = ImageDraw.Draw(img)
    
    # Gradient background
    for y in range(1024):
        ratio = y / 1024
        r = int(30)
        g = int(64)
        b = int(175 - (17 * ratio))
        draw.line([(0, y), (1024, y)], fill=(r, g, b, 255))
    
    # Inner circle (safe zone)
    draw.ellipse([232, 232, 792, 792], fill=(255, 255, 255, 255))
    
    # Medical cross (blue)
    center = 512
    draw.rectangle([center - 45, center - 135, center + 45, center + 135], fill=(30, 64, 175, 255))
    draw.rectangle([center - 135, center - 45, center + 135, center + 45], fill=(30, 64, 175, 255))
    
    # Outer circle outline
    draw.ellipse([292, 292, 732, 732], outline=(30, 64, 175, 255), width=16)
    
    # Center accent
    draw.ellipse([482, 482, 542, 542], fill=(6, 182, 212, 255))
    
    return img

# 4. CREATE FAVICON (48x48)
def create_favicon():
    img = Image.new('RGBA', (48, 48), (255, 255, 255, 0))
    draw = ImageDraw.Draw(img)
    
    # Blue background
    draw.rectangle([0, 0, 48, 48], fill=(30, 64, 175, 255))
    
    # White circle
    draw.ellipse([4, 4, 44, 44], fill=(255, 255, 255, 255))
    
    # Small cross
    draw.rectangle([20, 10, 28, 38], fill=(30, 64, 175, 255))
    draw.rectangle([10, 20, 38, 28], fill=(30, 64, 175, 255))
    
    # Center dot
    draw.ellipse([21, 21, 27, 27], fill=(6, 182, 212, 255))
    
    return img

# Generate and save
print("Creating app icons...")
icon = create_icon()
icon.save("unihealth-provider/assets/icon.png")
icon.save("unihealth-patient360/assets/icon.png")
print("[OK] icon.png saved (1024x1024)")

print("\nCreating splash screens...")
splash = create_splash()
splash.save("unihealth-provider/assets/splash.png")
splash.save("unihealth-patient360/assets/splash.png")
print("[OK] splash.png saved (1242x2436)")

print("\nCreating adaptive icons...")
adaptive = create_adaptive_icon()
adaptive.save("unihealth-provider/assets/adaptive-icon.png")
adaptive.save("unihealth-patient360/assets/adaptive-icon.png")
print("[OK] adaptive-icon.png saved (1024x1024)")

print("\nCreating favicons...")
favicon = create_favicon()
favicon.save("unihealth-provider/assets/favicon.png")
favicon.save("unihealth-patient360/assets/favicon.png")
print("[OK] favicon.png saved (48x48)")

print("\n" + "="*70)
print("SUCCESS: ALL ASSETS CREATED")
print("="*70)
print("\n[OK] unihealth-provider/assets/")
print("  - icon.png")
print("  - splash.png")
print("  - adaptive-icon.png")
print("  - favicon.png")
print("\n[OK] unihealth-patient360/assets/")
print("  - icon.png")
print("  - splash.png")
print("  - adaptive-icon.png")
print("  - favicon.png")
