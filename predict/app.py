import joblib
import pandas as pd
import numpy as np
from flask import Flask, request, jsonify
from flask_cors import CORS
import os

app = Flask(__name__)
CORS(app)

# Load the model
MODEL_PATH = os.path.join(os.path.dirname(__file__), 'bot_detection_model.pkl')

try:
    model = joblib.load(MODEL_PATH)
    print(f"Model loaded successfully from {MODEL_PATH}")
except Exception as e:
    print(f"Error loading model: {e}")
    model = None

@app.route('/predict', methods=['POST'])
def predict():
    if model is None:
        return jsonify({'error': 'Model not loaded'}), 500
    
    try:
        data = request.json
        if not data:
            return jsonify({'error': 'No data provided'}), 400
        
        print(f"DEBUG: Processing Features: {data}")
        
        # Convert data to DataFrame with fixed feature order
        feature_columns = [
            'mouse_avg_velocity', 'mouse_acceleration_std', 'mouse_curvature_entropy',
            'click_frequency', 'typing_dwell_time', 'typing_flight_time',
            'user_agent_entropy', 'screen_resolution_variety', 'webgl_fingerprint_uniqueness',
            'font_count', 'requests_per_second', 'session_duration',
            'navigation_entropy', 'burstiness', 'interaction_complexity',
            'human_behavior_score', 'session_intensity'
        ]
        
        # Extract features in exact order
        features_dict = {col: data.get(col, 0) for col in feature_columns}
        input_df = pd.DataFrame([features_dict])[feature_columns]
        
        # Ensure correct feature order if necessary (assuming data matches model expectations)
        # Note: input_df.values ensures no feature name warnings are triggered if names don't match perfectly
        prediction = model.predict(input_df.values)
        probability = model.predict_proba(input_df.values)[:, 1]
        
        result = "Bot" if prediction[0] == 1 else "Human"
        confidence = float(probability[0]) if prediction[0] == 1 else float(1 - probability[0])
        
        return jsonify({
            'label': result,
            'prediction': int(prediction[0]),
            'confidence': confidence,
            'probability': float(probability[0])
        })
        
    except Exception as e:
        print(f"❌ ML Error: {str(e)}")
        return jsonify({'error': str(e)}), 400

@app.route('/health', methods=['GET'])
def health():
    return jsonify({'status': 'healthy', 'model_loaded': model is not None})

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    app.run(host='0.0.0.0', port=port, debug=True)
