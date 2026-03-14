import joblib
import pandas as pd
import numpy as np
import os
import sys

def run_test_prediction():
    # Path to the model
    model_path = os.path.join(os.path.dirname(__file__), 'bot_detection_model.pkl')
    
    if not os.path.exists(model_path):
        print(f"Error: Model file not found at {model_path}")
        return

    # Load the model
    try:
        model = joblib.load(model_path)
        print(f"--- Model Loaded Successfully ---")
    except Exception as e:
        print(f"Error loading model: {e}")
        return

    # Sample data (similar to bot_detection_inference.py)
    sample_data = {
        'mouse_avg_velocity': 120.5,
        'mouse_acceleration_std': 45.2,
        'mouse_curvature_entropy': 0.85,
        'click_frequency': 2.1,
        'typing_dwell_time': 0.12,
        'typing_flight_time': 0.15,
        'user_agent_entropy': 14.2,
        'screen_resolution_variety': 2.0,
        'webgl_fingerprint_uniqueness': 0.98,
        'font_count': 45,
        'requests_per_second': 5.5,
        'session_duration': 300,
        'navigation_entropy': 1.2,
        'burstiness': 0.4,
        'interaction_complexity': 38.42,
        'human_behavior_score': 0.27,
        'session_intensity': 0.0183
    }

    print("\nRunning prediction on sample data:")
    for key, value in sample_data.items():
        print(f"  {key}: {value}")

    # Prepare data
    input_df = pd.DataFrame([sample_data])
    
    # Predict
    try:
        prediction = model.predict(input_df.values)
        probability = model.predict_proba(input_df.values)[:, 1]
        
        result = "BOT" if prediction[0] == 1 else "HUMAN"
        confidence = probability[0] if prediction[0] == 1 else (1 - probability[0])
        
        print("\n" + "="*30)
        print(f" RESULT: {result}")
        print(f" CONFIDENCE: {confidence:.4f}")
        print("="*30)
        
    except Exception as e:
        print(f"\nError during prediction: {e}")

if __name__ == "__main__":
    run_test_prediction()
