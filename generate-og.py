#!/usr/bin/env python3
"""Generate OG thumbnail image 1200x1200 for ilsanroom3 landing site."""

from PIL import Image, ImageDraw, ImageFont
import os

W, H = 1200, 1200
BG = (26, 26, 46)        # #1a1a2e
ACCENT = (139, 92, 246)   # #8B5CF6
WHITE = (255, 255, 255)
LIGHT = (192, 132, 252)   # #c084fc

FONT_BLACK = os.path.join(os.path.dirname(__file__), "NotoSansKR-Black.ttf")
FONT_BOLD = os.path.join(os.path.dirname(__file__), "NotoSansKR-Bold.ttf")

def make_font(path, size):
    return ImageFont.truetype(path, size)

def text_width(draw, text, font):
    bbox = draw.textbbox((0, 0), text, font=font)
    return bbox[2] - bbox[0]

def text_height(draw, text, font):
    bbox = draw.textbbox((0, 0), text, font=font)
    return bbox[3] - bbox[1]

def fit_font(draw, text, font_path, max_w, start_size=300):
    """Find largest font size where text fits within max_w."""
    size = start_size
    while size > 20:
        font = make_font(font_path, size)
        if text_width(draw, text, font) <= max_w:
            return font, size
        size -= 4
    return make_font(font_path, 20), 20

def generate_og(main_text, sub_text, output_path):
    img = Image.new("RGB", (W, H), BG)
    draw = ImageDraw.Draw(img)

    # Top accent bar
    draw.rectangle([0, 0, W, 8], fill=ACCENT)

    # Bottom accent bar
    draw.rectangle([0, H - 8, W, H], fill=ACCENT)

    # Side accent strips
    draw.rectangle([0, 0, 6, H], fill=ACCENT)
    draw.rectangle([W - 6, 0, W, H], fill=ACCENT)

    # Decorative diamond accent in center-top
    draw.polygon([(W//2 - 20, 180), (W//2, 160), (W//2 + 20, 180), (W//2, 200)], fill=ACCENT)

    # --- Main text (신실장) — HUGE, centered ---
    max_w = int(W * 0.8)
    main_font, main_size = fit_font(draw, main_text, FONT_BLACK, max_w, start_size=400)
    mw = text_width(draw, main_text, main_font)
    mh = text_height(draw, main_text, main_font)
    mx = (W - mw) // 2
    my = (H - mh) // 2 - 20  # slightly above center

    # Text shadow for depth
    for ox, oy in [(4, 4), (3, 3), (2, 2)]:
        draw.text((mx + ox, my + oy), main_text, fill=(10, 10, 30), font=main_font)
    draw.text((mx, my), main_text, fill=WHITE, font=main_font)

    # --- Sub text (일산명월관) — above main text ---
    sub_font, sub_size = fit_font(draw, sub_text, FONT_BOLD, max_w, start_size=120)
    sw = text_width(draw, sub_text, sub_font)
    sx = (W - sw) // 2
    sy = my - sub_size - 50

    # Sub text with accent color
    draw.text((sx + 2, sy + 2), sub_text, fill=(10, 10, 30), font=sub_font)
    draw.text((sx, sy), sub_text, fill=LIGHT, font=sub_font)

    # --- Bottom tagline ---
    tag_text = "일산룸 — 예약 전에 반드시 읽어야 할 글"
    tag_font = make_font(FONT_BOLD, 48)
    tw = text_width(draw, tag_text, tag_font)
    tx = (W - tw) // 2
    ty = my + mh + 60
    draw.text((tx, ty), tag_text, fill=(160, 160, 180), font=tag_font)

    # --- Accent line under tagline ---
    line_y = ty + 70
    line_w = 200
    draw.rectangle([(W//2 - line_w//2, line_y), (W//2 + line_w//2, line_y + 4)], fill=ACCENT)

    # Save
    os.makedirs(os.path.dirname(output_path) or ".", exist_ok=True)
    img.save(output_path, "PNG", optimize=True)
    print(f"Generated: {output_path} ({os.path.getsize(output_path):,} bytes)")

if __name__ == "__main__":
    generate_og(
        main_text="신실장",
        sub_text="일산명월관",
        output_path=os.path.join(os.path.dirname(__file__), "og-home.png")
    )
