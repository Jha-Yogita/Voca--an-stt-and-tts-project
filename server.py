import json
from flask import Flask, render_template, request
from flask_cors import CORS
from worker import process_message, reset_chat

app = Flask(__name__)
cors = CORS(app, resources={r"/*": {"origins": "*"}})


@app.route('/', methods=['GET'])
def index():
    return render_template('index.html')


@app.route('/process-message', methods=['POST'])
def process_message_route():
    user_message = request.json.get('userMessage', '')
    print("user_message:", user_message)

    response_text = process_message(user_message)

    print("response:", response_text)
    return app.response_class(
        response=json.dumps({"responseText": response_text}),
        status=200,
        mimetype='application/json'
    )


@app.route('/reset', methods=['POST'])
def reset_conversation():
    reset_chat()
    return {"status": "reset"}


if __name__ == "__main__":
    app.run(port=8000, host='0.0.0.0', debug=True)