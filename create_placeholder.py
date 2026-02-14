from PIL import Image, ImageDraw, ImageFont
import os

# Create a placeholder image
width, height = 800, 400
image = Image.new('RGB', (width, height), color='#0a0a0a')
draw = ImageDraw.Draw(image)

# Draw border
border_color = '#00f0ff'
for i in range(5):
    draw.rectangle([i, i, width-1-i, height-1-i], outline=border_color)

# Add text
text = "HYBRID SYNDICATE"
subtext = "Replace with hybrid-syndicate.png"

try:
    # Try to use a default font
    font = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", 60)
    subfont = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf", 24)
except:
    font = ImageFont.load_default()
    subfont = ImageFont.load_default()

# Calculate text position (centered)
bbox = draw.textbbox((0, 0), text, font=font)
text_width = bbox[2] - bbox[0]
text_height = bbox[3] - bbox[1]
text_x = (width - text_width) // 2
text_y = (height - text_height) // 2 - 40

draw.text((text_x, text_y), text, fill='#00f0ff', font=font)

# Add subtext
bbox2 = draw.textbbox((0, 0), subtext, font=subfont)
subtext_width = bbox2[2] - bbox2[0]
subtext_x = (width - subtext_width) // 2
subtext_y = text_y + text_height + 20

draw.text((subtext_x, subtext_y), subtext, fill='#39ff14', font=subfont)

# Save the image
image.save('hybrid-syndicate.png')
print("Placeholder image created: hybrid-syndicate.png")
