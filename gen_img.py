import io
import codecs
import textwrap
import numpy as np
from PIL import Image


img = np.array([32, 32, 32], dtype=np.uint8).reshape(1,1,3)
img = np.broadcast_to(img, (128, 128, 3))
print(img.shape)
img = Image.fromarray(img)
f = io.BytesIO()
img.save(f, format='png')
img = f.getvalue()
img = codecs.encode(img, 'base64')
img = img.decode().replace('\n', '')
print('\n'.join(textwrap.wrap(img, 60)))
