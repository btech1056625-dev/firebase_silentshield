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
        
        # Convert data to DataFrame
        input_df = pd.DataFrame([data])
        
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
        return jsonify({'error': str(e)}), 400

@app.route('/health', methods=['GET'])
def health():
    return jsonify({'status': 'healthy', 'model_loaded': model is not None})

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    app.run(host='0.0.0.0', port=port, debug=True)
