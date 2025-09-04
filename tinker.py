from flask import Flask, render_template
from flask_socketio import SocketIO, send, emit
import socket
import sys

port = 5002

app = Flask(__name__)
socketio = SocketIO(app)

def broadcast(name, value):
	emit(name, value, broadcast=True, include_self=False)

def get_ip_address():
	s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
	# use a public address to bypass the need to connect
	s.connect(("8.8.8.8", 80))
	ip_address = s.getsockname()[0]
	s.close()
	return ip_address

@socketio.on('connect')
def test_connect():
	print('connected')
	emit('after connect',  {'data':'Lets dance'})

@socketio.on('message')
def handle_message(data):
    print('received message: ' + data)

@socketio.on('hex')
def handle_hex(val):
	broadcast('hex', val)

@socketio.on('audio')
def handle_audio(val):
	broadcast('audio', val)

@socketio.on('pauseAudio')
def handle_pause(val):
	broadcast('pauseAudio', val)

@socketio.on('autoFlash')
def handle_auto_flash(cfg):
    broadcast('autoFlash', cfg)

@socketio.on('stopAuto')
def handle_stop_auto(_val):
    broadcast('stopAuto', {})

@app.route('/')
def index():
    return render_template('index.html')

if __name__ == '__main__':

	ip = get_ip_address()
	if ip:
		print(f"access at http://{ip}:{port}")
	else:
		print(f"No non-local IP found. Access may be available at http://127.0.0.1:{port}")
	socketio.run(app, host='0.0.0.0', debug=True, port=port)
