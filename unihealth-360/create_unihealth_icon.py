#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
UniHealth 360 - Professional EHR Platform Icon Generator
Creates icon: Medical cross + Person + 360° circle with blue-cyan gradient
"""

from PIL import Image, ImageDraw
import math

def create_unihealth_360_icon():
    """Create professional UniHealth 360 icon with medical cross design"""
    
    # Create image
    img = Image.new('RGBA', (1024, 1024), (255, 255, 255, 255))
    draw = ImageDraw.Draw(img)
    
    center = 512
    
    # Color palette (matching your design)
    DARK_BLUE = (0, 51, 102, 255)       # Dark navy blue (#003366)
    BLUE = (0, 102, 204, 255)           # Bright blue (#0066CC)
    LIGHT_BLUE = (102, 178, 255, 255)   # Light blue (#66B2FF)
    DARK_TEAL = (0, 128, 102, 255)      # Dark teal (#008066)
    TEAL = (0, 180, 153, 255)           # Teal/cyan (#00B499)
    LIGHT_TEAL = (102, 220, 200, 255)   # Light teal (#66DCC8)
    WHITE = (255, 255, 255, 255)
    
    # ===== OUTER CIRCLE RING (Blue to Teal Gradient) =====
    # Draw thick outer ring with gradient
    ring_inner = 300
    ring_outer = 350
    
    for i in range(ring_inner, ring_outer):
        ratio = (i - ring_inner) / (ring_outer - ring_inner)
        # Gradient from blue to teal
        r = int(0 + (0 * ratio))
        g = int(102 + (78 * ratio))
        b = int(204 - (51 * ratio))
        color = (r, g, b, 255)
        
        radius = i
        draw.ellipse(
            [center - radius, center - radius,
             center + radius, center + radius],
            outline=color,
            width=1
        )
    
    # ===== INNER WHITE CIRCLE =====
    draw.ellipse(
        [center - 280, center - 280,
         center + 280, center + 280],
        fill=WHITE
    )
    
    # ===== MEDICAL CROSS (Left side - Blue) =====
    cross_left = center - 80
    cross_top = center - 60
    cross_size = 80
    
    # Vertical bar of cross
    draw.rectangle(
        [cross_left - 20, cross_top,
         cross_left + 20, cross_top + cross_size],
        fill=DARK_BLUE
    )
    
    # Horizontal bar of cross
    draw.rectangle(
        [cross_left - cross_size/2.5, cross_top + cross_size/2.5,
         cross_left + cross_size/2.5, cross_top + cross_size/2.5 + 40],
        fill=DARK_BLUE
    )
    
    # ===== PERSON FIGURE (Center-Right - Blue to Teal) =====
    person_x = center + 40
    person_top = center - 80
    
    # Head (circle)
    head_radius = 30
    draw.ellipse(
        [person_x - head_radius, person_top - head_radius,
         person_x + head_radius, person_top + head_radius],
        fill=WHITE
    )
    draw.ellipse(
        [person_x - head_radius, person_top - head_radius,
         person_x + head_radius, person_top + head_radius],
        outline=BLUE,
        width=3
    )
    
    # Body (rounded rectangle - blue)
    body_top = person_top + head_radius + 10
    body_height = 80
    body_width = 50
    
    draw.rectangle(
        [person_x - body_width/2, body_top,
         person_x + body_width/2, body_top + body_height],
        fill=BLUE
    )
    
    # Left arm (teal)
    arm_points_left = [
        (person_x - body_width/2, body_top + 20),
        (person_x - body_width, body_top + 30),
        (person_x - body_width, body_top + 60),
        (person_x - body_width/2, body_top + 50),
    ]
    draw.polygon(arm_points_left, fill=TEAL)
    
    # Right arm (blue)
    arm_points_right = [
        (person_x + body_width/2, body_top + 20),
        (person_x + body_width, body_top + 30),
        (person_x + body_width, body_top + 60),
        (person_x + body_width/2, body_top + 50),
    ]
    draw.polygon(arm_points_right, fill=BLUE)
    
    # Legs (teal)
    draw.rectangle(
        [person_x - body_width/3, body_top + body_height,
         person_x, body_top + body_height + 40],
        fill=TEAL
    )
    draw.rectangle(
        [person_x, body_top + body_height,
         person_x + body_width/3, body_top + body_height + 40],
        fill=BLUE
    )
    
    # ===== CHECKMARK (Lower right of person) =====
    check_x = person_x + 60
    check_y = body_top + 80
    
    checkmark_points = [
        (check_x - 20, check_y),
        (check_x, check_y + 20),
        (check_x + 30, check_y - 20),
    ]
    draw.line(checkmark_points, fill=WHITE, width=4)
    
    # ===== 360° INDICATOR (Right side) =====
    arc_x = center + 140
    arc_y = center - 100
    arc_radius = 70
    
    # Draw 3/4 circle arc (teal)
    arc_bbox = [
        arc_x - arc_radius, arc_y - arc_radius,
        arc_x + arc_radius, arc_y + arc_radius
    ]
    
    # Main arc (teal, 3/4 of circle)
    draw.arc(arc_bbox, 30, 300, fill=TEAL, width=15)
    
    # Arrow/tail at end of arc
    arrow_angle = math.radians(30)
    arrow_x = arc_x + arc_radius * math.cos(arrow_angle)
    arrow_y = arc_y - arc_radius * math.sin(arrow_angle)
    
    # Circle at arrow point
    draw.ellipse(
        [arrow_x - 15, arrow_y - 15,
         arrow_x + 15, arrow_y + 15],
        outline=TEAL,
        width=4
    )
    draw.ellipse(
        [arrow_x - 8, arrow_y - 8,
         arrow_x + 8, arrow_y + 8],
        fill=WHITE
    )
    
    # "360°" text indicator (simple)
    # Circle for degree symbol
    degree_x = arc_x + 20
    degree_y = arc_y - 100
    
    draw.ellipse(
        [degree_x - 12, degree_y - 12,
         degree_x + 12, degree_y + 12],
        outline=DARK_BLUE,
        width=2
    )
    
    return img

# Generate icon
print("Creating UniHealth 360 professional icon...")
icon = create_unihealth_360_icon()

# Save it to provider app
icon_path = "C:\\Users\\Administrator\\Documents\\GitHub\\HEALTHCARE_SYSTEM\\unihealth-360\\unihealth-provider\\assets\\icon.png"
icon.save(icon_path)
print(f"[OK] UniHealth 360 icon saved: {icon_path}")
print("[OK] Size: 1024x1024")
print("[OK] Format: PNG with transparency")
print("[OK] Design: Medical cross + Person + 360 degrees")
print("[OK] Colors: Blue to Teal gradient")
print("\nUniHealth 360 provider app icon ready!")
