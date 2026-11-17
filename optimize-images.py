# אופטימיזציה לתמונות: ממיר כל PNG/JPG בתיקייה Images (וכל תתי-התיקיות) ל-WebP.
# עד 2400 פיקסלים בצד הארוך, איכות 80, ושקיפות נשמרת כשיש.
# המפה של Leftovers (Images/mape1) נשארת ברזולוציה המקורית, באיכות 85 (הזכוכית המגדלת מגדילה אותה).
# קובץ המקור עובר לתיקייה originals (באותו מבנה תיקיות), שלא עולה ל-GitHub.
#
# הרצה מהתיקייה הראשית של הפרויקט: python3 optimize-images.py
# צריך את Pillow (פעם אחת): python3 -m pip install pillow
# אחרי ההרצה: לעדכן את ההפניות לתמונה בקוד ל-.webp
import os
import shutil
import sys
from PIL import Image

MAX_SIZE = 2400
QUALITY = 80
MAP_IMAGE = os.path.join("Images", "mape1")
MAP_QUALITY = 85

before = after = 0
for root, dirs, files in os.walk("Images"):
    for name in sorted(files):
        if not name.lower().endswith((".png", ".jpg", ".jpeg")):
            continue
        source = os.path.join(root, name)
        target = os.path.splitext(source)[0] + ".webp"
        if os.path.exists(target):
            sys.exit("כבר קיים: " + target)

        image = Image.open(source)
        image.load()
        if image.mode in ("P", "LA"):
            image = image.convert("RGBA")
        # שקיפות אמיתית? אם כל הפיקסלים אטומים, שומרים בלי ערוץ שקיפות
        if image.mode == "RGBA" and image.getchannel("A").getextrema()[0] == 255:
            image = image.convert("RGB")
        elif image.mode not in ("RGB", "RGBA"):
            image = image.convert("RGB")

        is_map = os.path.splitext(source)[0] == MAP_IMAGE
        if not is_map and max(image.size) > MAX_SIZE:
            image.thumbnail((MAX_SIZE, MAX_SIZE), Image.LANCZOS)
        image.save(target, "WEBP", quality=MAP_QUALITY if is_map else QUALITY, method=6)

        before += os.path.getsize(source)
        after += os.path.getsize(target)
        # המקור עובר ל-originals
        original = os.path.join("originals", source)
        os.makedirs(os.path.dirname(original), exist_ok=True)
        shutil.move(source, original)
        print(f"{source} -> {target} {image.size}")

print(f"סה\"כ: {before / 1e6:.1f}MB -> {after / 1e6:.1f}MB")
