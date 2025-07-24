import os
from flask import Flask, render_template, request, redirect, url_for, flash, jsonify
from flask_sqlalchemy import SQLAlchemy
from flask_bcrypt import Bcrypt
from flask_login import LoginManager, UserMixin, login_user, login_required, logout_user, current_user
from datetime import datetime, timedelta
import requests
import pytz
from sqlalchemy import func, desc
import socket

app = Flask(__name__, template_folder='templates')
app.config['SECRET_KEY'] = os.urandom(24).hex()
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///weather_deluxe.db'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

db = SQLAlchemy(app)
bcrypt = Bcrypt(app)
login_manager = LoginManager(app)
login_manager.login_view = 'login'

# API ключ для WeatherAPI (зарегистрируйтесь на https://www.weatherapi.com/)
WEATHER_API_KEY = "8542e500a2b64c3fb3e182657250607"  # Замените на свой ключ

# Модель пользователя
class User(UserMixin, db.Model):
    id = db.Column(db.Integer, primary_key=True)
    email = db.Column(db.String(100), unique=True, nullable=False)
    phone = db.Column(db.String(20), nullable=False)
    password = db.Column(db.String(100), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

# Модель отзыва
class Feedback(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'))
    text = db.Column(db.Text, nullable=False)
    rating = db.Column(db.Integer, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    user = db.relationship('User', backref='feedbacks')

# Модель истории запросов
class WeatherRequest(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'))
    city = db.Column(db.String(100), nullable=False)
    timestamp = db.Column(db.DateTime, default=datetime.utcnow)
    user = db.relationship('User', backref='weather_requests')

# Модель достижений
class Achievement(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'))
    name = db.Column(db.String(50), nullable=False)
    earned_at = db.Column(db.DateTime, default=datetime.utcnow)
    user = db.relationship('User', backref='achievements')

# Модель уведомлений
class Notification(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'))
    city = db.Column(db.String(100))
    condition = db.Column(db.String(50))
    is_active = db.Column(db.Boolean, default=True)
    user = db.relationship('User', backref='notifications')

@login_manager.user_loader
def load_user(user_id):
    return User.query.get(int(user_id))

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/register', methods=['GET', 'POST'])
def register():
    if current_user.is_authenticated:
        return redirect(url_for('dashboard'))
    
    if request.method == 'POST':
        try:
            email = request.form['email']
            phone = request.form['phone']
            password = request.form['password']
            
            if User.query.filter_by(email=email).first():
                flash('Email уже зарегистрирован!', 'danger')
                return redirect(url_for('register'))
            
            hashed_password = bcrypt.generate_password_hash(password).decode('utf-8')
            new_user = User(email=email, phone=phone, password=hashed_password)
            db.session.add(new_user)
            db.session.commit()
            
            # Добавляем достижение за регистрацию
            achievement = Achievement(
                user_id=new_user.id,
                name="Первый шаг"
            )
            db.session.add(achievement)
            db.session.commit()
            flash('Регистрация прошла успешно! Можете войти.', 'success')
            return redirect(url_for('login'))
        except Exception as e:
            db.session.rollback()
            flash(f'Ошибка регистрации: {str(e)}', 'danger')
    
    return render_template('register.html')

@app.route('/login', methods=['GET', 'POST'])
def login():
    if current_user.is_authenticated:
        return redirect(url_for('dashboard'))
    
    if request.method == 'POST':
        email = request.form['email']
        password = request.form['password']
        user = User.query.filter_by(email=email).first()
        
        if user and bcrypt.check_password_hash(user.password, password):
            login_user(user)
            return redirect(url_for('dashboard'))
        else:
            flash('Неверный email или пароль!', 'danger')
    
    return render_template('login.html')

@app.route('/logout')
@login_required
def logout():
    logout_user()
    return redirect(url_for('index'))

@app.route('/dashboard')
@login_required
def dashboard():
    # Получаем последние 5 запросов погоды
    recent_requests = WeatherRequest.query.filter_by(
        user_id=current_user.id
    ).order_by(WeatherRequest.timestamp.desc()).limit(5).all()
    
    # Получаем достижения
    achievements = Achievement.query.filter_by(
        user_id=current_user.id
    ).order_by(Achievement.earned_at.desc()).all()
    
    # Получаем активные уведомления
    notifications = Notification.query.filter_by(
        user_id=current_user.id,
        is_active=True
    ).all()
    
    return render_template('dashboard.html', 
                           user=current_user,
                           recent_requests=recent_requests,
                           achievements=achievements,
                           notifications=notifications)

@app.route('/weather', methods=['GET', 'POST'])
@login_required
def weather():
    # Получаем город из формы, координат или параметра запроса
    city = request.form.get('city') or request.args.get('city') or 'Москва'
    lat = request.args.get('lat')
    lon = request.args.get('lon')
    
    try:
        # Формируем URL запроса в зависимости от входных данных
        if lat and lon:
            url = f"http://api.weatherapi.com/v1/forecast.json?key={WEATHER_API_KEY}&q={lat},{lon}&days=5&lang=ru"
        else:
            url = f"http://api.weatherapi.com/v1/forecast.json?key={WEATHER_API_KEY}&q={city}&days=5&lang=ru"
        
        response = requests.get(url, timeout=10)
        data = response.json()
        
        # Проверка на ошибки API
        if 'error' in data:
            error_msg = data['error']['message']
            flash(f'Ошибка: {error_msg}. Показываем погоду для Москвы', 'warning')
            return redirect(url_for('weather', city='Москва'))
        
        # Форматируем данные о текущей погоде
        current = data['current']
        location = data['location']
        forecast_days = data['forecast']['forecastday']
        
        # Получаем время восхода и заката для текущего дня
        sunrise = forecast_days[0]['astro']['sunrise']
        sunset = forecast_days[0]['astro']['sunset']
        
        weather_data = {
            'city': location['name'],
            'country': location['country'],
            'lat': location['lat'],
            'lon': location['lon'],
            'temp': current['temp_c'],
            'feels_like': current['feelslike_c'],
            'description': current['condition']['text'],
            'icon': current['condition']['icon'].replace("64x64", "128x128"),
            'humidity': current['humidity'],
            'wind': current['wind_kph'],
            'pressure': current['pressure_mb'],
            'sunrise': sunrise,
            'sunset': sunset,'clothing': get_clothing_recommendation(current['temp_c']),
            'forecast': []
        }
        
        # Формируем прогноз на 5 дней
        for day in forecast_days:
            date_obj = datetime.strptime(day['date'], '%Y-%m-%d')
            weather_data['forecast'].append({
                'date': date_obj.strftime('%d.%m'),
                'weekday': ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'][date_obj.weekday()],
                'temp_min': day['day']['mintemp_c'],
                'temp_max': day['day']['maxtemp_c'],
                'icon': day['day']['condition']['icon'].replace("64x64", "128x128"),
                'description': day['day']['condition']['text']
            })
        
        # Сохраняем запрос в историю
        new_request = WeatherRequest(
            user_id=current_user.id,
            city=city
        )
        db.session.add(new_request)
        
        # Проверяем достижения
        check_achievements(current_user.id)
        
        db.session.commit()
            
    except requests.exceptions.Timeout:
        flash('Превышено время ожидания ответа от сервера погоды', 'danger')
        weather_data = None
    except Exception as e:
        print(f"Ошибка получения погоды: {e}")
        weather_data = None
        flash(f'Ошибка получения данных: {str(e)}', 'danger')
    
    # Получаем популярные города
    popular_cities = get_popular_cities()
    
    return render_template('weather.html', weather=weather_data, popular_cities=popular_cities)

def get_clothing_recommendation(temp):
    """Возвращает рекомендации по одежде в зависимости от температуры"""
    if temp > 25: 
        return "Легкая одежда, шорты и футболка, солнцезащитные очки"
    elif 15 < temp <= 25: 
        return "Легкая куртка или свитер"
    elif 5 < temp <= 15: 
        return "Теплая куртка, джинсы"
    elif -5 < temp <= 5: 
        return "Теплая куртка, шапка, шарф"
    else: 
        return "Зимняя одежда, шапка, шарф, перчатки, термобелье"

def get_popular_cities():
    # Получаем 6 самых популярных городов из истории запросов
    popular = db.session.query(
        WeatherRequest.city,
        func.count(WeatherRequest.city).label('count')
    ).group_by(WeatherRequest.city).order_by(desc('count')).limit(6).all()
    
    if popular:
        return [city for city, count in popular]
    return ['Москва', 'Санкт-Петербург', 'Новосибирск', 'Екатеринбург', 'Сочи', 'Владивосток']

def check_achievements(user_id):
    # Проверяем количество запросов пользователя
    request_count = WeatherRequest.query.filter_by(user_id=user_id).count()
    
    # Добавляем достижения в зависимости от количества запросов
    if request_count >= 10:
        achievement = Achievement.query.filter_by(
            user_id=user_id,
            name="Погодный энтузиаст"
        ).first()
        if not achievement:
            new_achievement = Achievement(
                user_id=user_id,
                name="Погодный энтузиаст"
            )
            db.session.add(new_achievement)
    
    if request_count >= 50:
        achievement = Achievement.query.filter_by(
            user_id=user_id,
            name="Метеоролог-любитель"
        ).first()
        if not achievement:
            new_achievement = Achievement(
                user_id=user_id,
                name="Метеоролог-любитель"
            )
            db.session.add(new_achievement)
    
    db.session.commit()

@app.route('/about')
def about():
    return render_template('about.html')

@app.route('/contact')
def contact():
    return render_template('contact.html')

@app.route('/feedback', methods=['GET', 'POST'])
@login_required
def feedback():
    if request.method == 'POST':
        try:
            rating = int(request.form['rating'])
            text = request.form['text']
            new_feedback = Feedback(
                user_id=current_user.id,
                rating=rating,
                text=text
            )
            db.session.add(new_feedback)
            db.session.commit()
            
            flash('Спасибо за ваш отзыв!', 'success')
            return redirect(url_for('feedback'))
        except Exception as e:
            db.session.rollback()
            flash(f'Ошибка: {str(e)}', 'danger')
    
    # Получаем все отзывы
    feedbacks = Feedback.query.order_by(Feedback.created_at.desc()).all()
    return render_template('feedback.html', feedbacks=feedbacks)

@app.route('/notifications', methods=['GET', 'POST'])
@login_required
def notifications():
    if request.method == 'POST':
        try:
            city = request.form['city']
            condition = request.form['condition']
            
            new_notification = Notification(
                user_id=current_user.id,
                city=city,
                condition=condition
            )
            db.session.add(new_notification)
            db.session.commit()
            
            flash('Уведомление успешно создано!', 'success')
            return redirect(url_for('notifications'))
        except Exception as e:
            db.session.rollback()
            flash(f'Ошибка: {str(e)}', 'danger')
    
    # Получаем все уведомления пользователя
    notifications = Notification.query.filter_by(
        user_id=current_user.id
    ).order_by(Notification.id.desc()).all()
    
    return render_template('notifications.html', notifications=notifications)

@app.route('/compare', methods=['GET'])
@login_required
def compare():
    cities = request.args.getlist('cities')
    weather_data = []
    
    for city in cities:
        try:
            # Получаем погоду для каждого города
            url = f"http://api.weatherapi.com/v1/current.json?key={WEATHER_API_KEY}&q={city}&lang=ru"
            response = requests.get(url, timeout=5)
            data = response.json()
            
            if 'error' not in data:
                weather_data.append({
                    'city': data['location']['name'],
                    'temp': data['current']['temp_c'],
                    'description': data['current']['condition']['text'],
                    'icon': data['current']['condition']['icon'].replace("64x64", "128x128"),
                    'humidity': data['current']['humidity'],
                    'wind': data['current']['wind_kph']
                })
        except:
            continue
    
    return render_template('compare.html', weather_data=weather_data)

@app.route('/widget/<city>')
def weather_widget(city):
    try:
        # Получаем погоду для виджета
        url = f"http://api.weatherapi.com/v1/current.json?key={WEATHER_API_KEY}&q={city}&lang=ru"
        response = requests.get(url, timeout=5)
        data = response.json()
        
        if 'error' not in data:
            weather_data = {
                'city': data['location']['name'],
                'temp': data['current']['temp_c'],
                'description': data['current']['condition']['text'],
                'icon': data['current']['condition']['icon'].replace("64x64", "128x128")
            }
            return render_template('widget.html', weather=weather_data)
    except:
        pass
    
    return render_template('widget.html', weather=None)

@app.after_request
def add_header(response):
    # Добавляем заголовки для отключения кеширования в режиме разработки
    if app.debug:
        response.headers["Cache-Control"] = "no-cache, no-store, must-revalidate"
        response.headers["Pragma"] = "no-cache"
        response.headers["Expires"] = "0"
    return response

def get_local_ip():
    """Получает локальный IP-адрес компьютера"""
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.connect(("8.8.8.8", 80))
        ip = s.getsockname()[0]
        s.close()
        return ip
    except:
        return "127.0.0.1"

if __name__ == '__main__':
    with app.app_context():
        db.create_all()
    
    # Получаем локальный IP
    ip = get_local_ip()
    print(f"\nДоступ к сайту в локальной сети:")
    print(f"http://{ip}:5001")
    
    # Для доступа из интернета через ngrok
    print("\nДля доступа из интернета:")
    print("1. Скачайте ngrok: https://ngrok.com/download")
    print("2. Запустите команду: ngrok http 5001")
    print("3. Используйте предоставленный ngrok URL\n")
    
    # Запускаем сервер на всех интерфейсах
    app.run(host='0.0.0.0', port=5001, debug=True)