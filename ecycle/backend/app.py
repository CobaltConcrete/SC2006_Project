import os
from flask import Flask, request, jsonify
from flask_cors import CORS
from config import Config
from models import db, User, ChecklistOption, UserChecklist
import pandas as pd
from geopy.distance import geodesic
from dotenv import load_dotenv
import requests

app = Flask(__name__)
app.config.from_object(Config)
db.init_app(app)
CORS(app)
load_dotenv()

@app.route('/register', methods=['POST'])
def register():
    data = request.get_json()
    username = data['username']
    password = data['password']
    usertype = data.get('usertype', 'user')

    if User.query.filter_by(username=username).first() is not None:
        return jsonify({'error': 'Username already exists'}), 400

    new_user = User.create_user(username, password, usertype)
    db.session.add(new_user)
    db.session.commit()

    return jsonify({'message': 'User registered successfully'}), 201

@app.route('/login', methods=['POST'])
def login():
    data = request.get_json()
    username = data['username']
    password = data['password']

    user = User.query.filter_by(username=username).first()

    if user and user.check_password(password):
        return jsonify({'message': 'Login successful', 'usertype': user.usertype, 'userid': user.userid}), 200
    else:
        return jsonify({'error': 'Invalid username or password'}), 401

@app.route('/checklist-options', methods=['GET'])
def get_checklist_options():
    options = ChecklistOption.query.all()
    return jsonify([{'checklistoptionid': option.checklistoptionid, 'checklistoptiontype': option.checklistoptiontype} for option in options]), 200

@app.route('/user-checklist', methods=['POST'])
def save_user_checklist():
    data = request.get_json()
    userid = data['userid']
    checklistoptionids = data['checklistoptionids']

    # Delete existing options for this user
    UserChecklist.query.filter_by(userid=userid).delete()

    # Add new options
    for checklistoptionid in checklistoptionids:
        user_checklist = UserChecklist(userid=userid, checklistoptionid=checklistoptionid)
        db.session.add(user_checklist)

    db.session.commit()
    return jsonify({'message': 'Checklist options saved successfully'}), 201


# Load repair and disposal locations from CSV files
repair_df = pd.read_csv('./locationCSV/repairfinal.csv')
dispose_df = pd.read_csv('./locationCSV/ewastefinal.csv')

# Route for nearby repair locations
@app.route('/nearby-repair-locations', methods=['POST'])
def nearby_repair_locations():
    return get_nearby_locations(repair_df)

# Route for nearby disposal locations
@app.route('/nearby-dispose-locations', methods=['POST'])
def nearby_dispose_locations():
    return get_nearby_locations(dispose_df)

# Helper function to calculate nearby locations
def get_nearby_locations(df):
    data = request.get_json()
    user_lat = data.get('lat')
    user_lon = data.get('lon')

    if user_lat is None or user_lon is None:
        return jsonify({'error': 'User location is required'}), 400

    user_location = (user_lat, user_lon)
    df['distance'] = df.apply(lambda row: geodesic(
        user_location, (row['latitude'], row['longitude'])
    ).km, axis=1)

    nearby_locations = df.sort_values('distance').head(5)
    return jsonify(nearby_locations.to_dict(orient='records')), 200

GOOGLE_MAPS_API_KEY = os.getenv("GOOGLE_MAPS_API_KEY")  # Replace with your actual Google Maps API Key

@app.route('/get-coordinates', methods=['POST'])
def get_coordinates():
    address = request.json.get('address')
    if not address:
        return jsonify({'error': 'Address is required'}), 400

    url = f'https://maps.googleapis.com/maps/api/geocode/json?address={address}&key={GOOGLE_MAPS_API_KEY}'
    response = requests.get(url)
    data = response.json()

    if data['status'] == 'OK':
        location = data['results'][0]['geometry']['location']
        print(location)
        return jsonify({'lat': location['lat'], 'lon': location['lng']}), 200
    else:
        return jsonify({'error': 'Invalid address'}), 400

# @app.route('/get-directions', methods=['POST'])
# def get_directions():
#     data = request.get_json()
#     user_location = data.get('user_location')
#     destination = data.get('destination')

#     if not user_location or not destination:
#         return jsonify({'error': 'User location and destination are required'}), 400

#     directions_url = f'https://maps.googleapis.com/maps/api/directions/json?origin={user_location["lat"]},{user_location["lon"]}&destination={destination["lat"]},{destination["lon"]}&key={GOOGLE_MAPS_API_KEY}'
    
#     response = requests.get(directions_url)
#     directions_data = response.json()

#     if directions_data['status'] == 'OK':
#         routes = directions_data['routes'][0]
#         steps = routes['legs'][0]['steps']
        
#         directions = []
#         for step in steps:
#             directions.append(step['html_instructions'])  # Get HTML instructions for directions

#         return jsonify({'directions': directions}), 200
#     else:
#         return jsonify({'error': 'Unable to get directions'}), 400

@app.route('/get-directions', methods=['POST'])
def get_directions():
    data = request.get_json()
    user_location = data.get('user_location')
    destination = data.get('destination')
    mode = data.get('mode', 'DRIVING')  # Default mode is DRIVING

    if not user_location or not destination:
        return jsonify({'error': 'User location and destination are required'}), 400

    directions_url = f'https://maps.googleapis.com/maps/api/directions/json?origin={user_location["lat"]},{user_location["lon"]}&destination={destination["lat"]},{destination["lon"]}&mode={mode}&key={GOOGLE_MAPS_API_KEY}'
    
    response = requests.get(directions_url)
    directions_data = response.json()

    if directions_data['status'] == 'OK':
        routes = directions_data['routes'][0]
        steps = routes['legs'][0]['steps']
        
        directions = []
        for step in steps:
            directions.append(step['html_instructions'])  # Get HTML instructions for directions

        return jsonify({'directions': directions}), 200
    else:
        return jsonify({'error': 'Unable to get directions'}), 400


if __name__ == '__main__':
    app.run(debug=True)
