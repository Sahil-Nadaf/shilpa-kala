from flask import Flask, request, jsonify
from flask_cors import CORS
from PIL import Image, ImageDraw, ImageFont
import base64
import io
import sqlite3
import hashlib
import os

app = Flask(__name__)
CORS(app)

DB_PATH = os.environ.get('DB_PATH', 'shilpakala.db')

# -----------------------------------------------
# Database Setup
# -----------------------------------------------
def init_db():
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()

    # Users table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            email TEXT UNIQUE NOT NULL,
            password TEXT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')

    # Photos table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS photos (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_email TEXT NOT NULL,
            artisan_name TEXT NOT NULL,
            wood_type TEXT NOT NULL,
            price TEXT NOT NULL,
            image_data TEXT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')

    conn.commit()
    conn.close()
    print("Database ready ✅")

def hash_password(password):
    return hashlib.sha256(password.encode()).hexdigest()

def get_db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

init_db()


# -----------------------------------------------
# Auth Routes
# -----------------------------------------------
@app.route('/signup', methods=['POST'])
def signup():
    try:
        data     = request.get_json()
        name     = data.get('name', '').strip()
        email    = data.get('email', '').strip().lower()
        password = data.get('password', '').strip()

        if not name or not email or not password:
            return jsonify({'success': False, 'message': 'All fields are required.'}), 400
        if len(password) < 4:
            return jsonify({'success': False, 'message': 'Password must be at least 4 characters.'}), 400

        hashed = hash_password(password)
        conn = get_db()
        try:
            conn.execute(
                'INSERT INTO users (name, email, password) VALUES (?, ?, ?)',
                (name, email, hashed)
            )
            conn.commit()
            print(f"New user: {email}")
            return jsonify({'success': True, 'message': 'Account created!', 'name': name, 'email': email})
        except sqlite3.IntegrityError:
            return jsonify({'success': False, 'message': 'Email already exists.'}), 409
        finally:
            conn.close()
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500


@app.route('/login', methods=['POST'])
def login():
    try:
        data     = request.get_json()
        email    = data.get('email', '').strip().lower()
        password = data.get('password', '').strip()

        if not email or not password:
            return jsonify({'success': False, 'message': 'Email and password required.'}), 400

        hashed = hash_password(password)
        conn = get_db()
        try:
            user = conn.execute(
                'SELECT * FROM users WHERE email = ? AND password = ?',
                (email, hashed)
            ).fetchone()
            if user:
                print(f"Login: {email}")
                return jsonify({'success': True, 'name': user['name'], 'email': user['email']})
            else:
                return jsonify({'success': False, 'message': 'Invalid email or password.'}), 401
        finally:
            conn.close()
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500


# -----------------------------------------------
# Photo Routes
# -----------------------------------------------

@app.route('/save-photo', methods=['POST'])
def save_photo():
    """Save a branded photo to the database"""
    try:
        data         = request.get_json()
        user_email   = data.get('user_email', '').strip().lower()
        artisan_name = data.get('artisan_name', '')
        wood_type    = data.get('wood_type', '')
        price        = data.get('price', '')
        image_data   = data.get('image_data', '')  # base64 string

        if not user_email or not image_data:
            return jsonify({'success': False, 'message': 'Missing required fields.'}), 400

        conn = get_db()
        try:
            cursor = conn.execute(
                '''INSERT INTO photos (user_email, artisan_name, wood_type, price, image_data)
                   VALUES (?, ?, ?, ?, ?)''',
                (user_email, artisan_name, wood_type, price, image_data)
            )
            conn.commit()
            photo_id = cursor.lastrowid
            print(f"Photo saved: id={photo_id} for {user_email}")
            return jsonify({'success': True, 'photo_id': photo_id})
        finally:
            conn.close()
    except Exception as e:
        print(f"Save photo error: {e}")
        return jsonify({'success': False, 'message': str(e)}), 500


@app.route('/photos/<user_email>', methods=['GET'])
def get_photos(user_email):
    """Get a page of photos for a user. Supports ?limit=&offset= for pagination."""
    try:
        user_email = user_email.strip().lower()

        try:
            limit  = int(request.args.get('limit', 20))
            offset = int(request.args.get('offset', 0))
        except ValueError:
            limit, offset = 20, 0
        limit  = max(1, min(limit, 100))
        offset = max(0, offset)

        conn = get_db()
        try:
            total = conn.execute(
                'SELECT COUNT(*) FROM photos WHERE user_email = ?',
                (user_email,)
            ).fetchone()[0]

            rows = conn.execute(
                '''SELECT id, artisan_name, wood_type, price, image_data, created_at
                   FROM photos WHERE user_email = ?
                   ORDER BY created_at DESC
                   LIMIT ? OFFSET ?''',
                (user_email, limit, offset)
            ).fetchall()

            photos = [{
                'id':           row['id'],
                'artisan_name': row['artisan_name'],
                'wood_type':    row['wood_type'],
                'price':        row['price'],
                'image_data':   row['image_data'],
                'created_at':   row['created_at'],
            } for row in rows]

            has_more = offset + len(photos) < total
            print(f"Fetched {len(photos)} photos for {user_email} (offset={offset}, total={total})")
            return jsonify({
                'success':  True,
                'photos':   photos,
                'total':    total,
                'has_more': has_more,
            })
        finally:
            conn.close()
    except Exception as e:
        print(f"Get photos error: {e}")
        return jsonify({'success': False, 'message': str(e)}), 500


@app.route('/photo/<int:photo_id>', methods=['DELETE'])
def delete_photo(photo_id):
    """Delete a photo by ID"""
    try:
        conn = get_db()
        try:
            conn.execute('DELETE FROM photos WHERE id = ?', (photo_id,))
            conn.commit()
            print(f"Deleted photo id={photo_id}")
            return jsonify({'success': True})
        finally:
            conn.close()
    except Exception as e:
        print(f"Delete photo error: {e}")
        return jsonify({'success': False, 'message': str(e)}), 500


@app.route('/photo/<int:photo_id>', methods=['PUT'])
def update_photo(photo_id):
    """Update photo details and re-brand"""
    try:
        data         = request.get_json()
        artisan_name = data.get('artisan_name', '')
        wood_type    = data.get('wood_type', '')
        price        = data.get('price', '')
        image_data   = data.get('image_data', '')

        conn = get_db()
        try:
            conn.execute(
                '''UPDATE photos SET artisan_name=?, wood_type=?, price=?, image_data=?
                   WHERE id=?''',
                (artisan_name, wood_type, price, image_data, photo_id)
            )
            conn.commit()
            print(f"Updated photo id={photo_id}")
            return jsonify({'success': True})
        finally:
            conn.close()
    except Exception as e:
        print(f"Update photo error: {e}")
        return jsonify({'success': False, 'message': str(e)}), 500


# -----------------------------------------------
# Image Branding
# -----------------------------------------------
def _load_font(size):
    for path in (
        "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
        "/System/Library/Fonts/Helvetica.ttc",
    ):
        try:
            return ImageFont.truetype(path, size)
        except Exception:
            continue
    return ImageFont.load_default()


def add_branding(image_bytes, artisan_name, wood_type, price):
    img = Image.open(io.BytesIO(image_bytes)).convert("RGB")
    width, height = img.size
    print(f"Image size: {width}x{height}")

    draw = ImageDraw.Draw(img)

    # All sizes are fractions of the image so a phone-camera shot
    # (e.g. 3000x4000) and a gallery pick (e.g. 1080x1080) get the
    # same proportional banner + badge.
    banner_height = int(height * 0.22)
    banner_top    = height - banner_height
    badge_width   = int(width * 0.42)
    badge_height  = int(height * 0.05)
    pad_x         = int(width * 0.025)

    draw.rectangle([(0, banner_top), (width, height)], fill=(92, 61, 17))
    draw.rectangle([(width - badge_width, 0), (width, badge_height)], fill=(192, 118, 26))

    font_big   = _load_font(int(width * 0.070))
    font_med   = _load_font(int(width * 0.055))
    font_small = _load_font(int(width * 0.045))
    font_badge = _load_font(int(badge_height * 0.55))

    badge_text_y = max(0, int((badge_height - badge_height * 0.55) / 2))
    draw.text((width - badge_width + pad_x, badge_text_y), "HANDMADE", fill="white", font=font_badge)

    draw.text((pad_x, banner_top + int(banner_height * 0.10)),
              f"{artisan_name}",             fill="white",         font=font_big)
    draw.text((pad_x, banner_top + int(banner_height * 0.45)),
              f"{wood_type}  |  Rs.{price}", fill=(255, 213, 128), font=font_med)
    draw.text((pad_x, banner_top + int(banner_height * 0.75)),
              "Handmade in Karnataka",       fill=(255, 213, 128), font=font_small)

    return img


@app.route('/brand-image', methods=['POST'])
def brand_image():
    try:
        data         = request.get_json()
        image_b64    = data.get('image')
        artisan_name = data.get('artisan_name', 'Artisan')
        wood_type    = data.get('wood_type', 'Wood')
        price        = data.get('price', '0')

        if not image_b64:
            return jsonify({'error': 'No image provided'}), 400

        image_bytes = base64.b64decode(image_b64)
        branded_img = add_branding(image_bytes, artisan_name, wood_type, price)

        buffer = io.BytesIO()
        branded_img.save(buffer, format='JPEG', quality=95)
        output_b64 = base64.b64encode(buffer.getvalue()).decode('utf-8')

        print(f"Branded image ready, size: {len(output_b64)}")
        return jsonify({'image': output_b64})

    except Exception as e:
        import traceback
        print(traceback.format_exc())
        return jsonify({'error': str(e)}), 500


# -----------------------------------------------
# Health Check
# -----------------------------------------------
@app.route('/health', methods=['GET'])
def health():
    conn = get_db()
    users_count  = conn.execute('SELECT COUNT(*) FROM users').fetchone()[0]
    photos_count = conn.execute('SELECT COUNT(*) FROM photos').fetchone()[0]
    conn.close()
    return jsonify({
        'status': 'Shilpa-Kala backend running ✅',
        'total_users': users_count,
        'total_photos': photos_count,
    })


if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5001))
    app.run(host='0.0.0.0', port=port, debug=False)