import eel
import os
import sys
import sqlite3
import datetime
import webbrowser
import requests
import pyjokes
import random
import time
import threading
import re
from bs4 import BeautifulSoup
import urllib.parse
import string
import g4f
from werkzeug.security import generate_password_hash, check_password_hash

# --- Robust Pathing ---
script_directory = os.path.dirname(os.path.abspath(__file__))
web_folder_path = os.path.join(script_directory, 'web')
eel.init(web_folder_path)

# --- Database Setup ---
def init_db():
    db_path = os.path.join(script_directory, 'jarvis_users.db')
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, email TEXT UNIQUE NOT NULL,
            password_hash TEXT, google_id TEXT UNIQUE, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')
    conn.commit()
    conn.close()

# --- Authentication Functions ---
def get_db_connection():
    db_path = os.path.join(script_directory, 'jarvis_users.db')
    return sqlite3.connect(db_path)

@eel.expose
def handle_signup(name, email, password):
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        cursor.execute('SELECT * FROM users WHERE email = ?', (email,))
        if cursor.fetchone():
            return {'status': 'error', 'message': 'Email already registered.'}
        password_hash = generate_password_hash(password)
        cursor.execute('INSERT INTO users (name, email, password_hash) VALUES (?, ?, ?)', (name, email, password_hash))
        conn.commit()
        return {'status': 'success', 'message': 'Signup successful! Please login.'}
    finally:
        conn.close()

@eel.expose
def handle_login(email, password):
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        cursor.execute('SELECT name, password_hash FROM users WHERE email = ?', (email,))
        user = cursor.fetchone()
        if user and user[1] and check_password_hash(user[1], password):
            return {'status': 'success', 'name': user[0]}
        else:
            return {'status': 'error', 'message': 'Invalid email or password.'}
    finally:
        conn.close()

@eel.expose
def handle_google_login(google_user):
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        cursor.execute('SELECT name FROM users WHERE google_id = ?', (google_user['id'],))
        user = cursor.fetchone()
        if user:
            return {'status': 'success', 'name': user[0]}
        cursor.execute('SELECT * FROM users WHERE email = ?', (google_user['email'],))
        if cursor.fetchone():
            cursor.execute('UPDATE users SET google_id = ? WHERE email = ?', (google_user['id'], google_user['email']))
        else:
            cursor.execute('INSERT INTO users (name, email, google_id) VALUES (?, ?, ?)',
                           (google_user['name'], google_user['email'], google_user['id']))
        conn.commit()
        return {'status': 'success', 'name': google_user['name']}
    finally:
        conn.close()

# --- Jarvis Command Functions ---
def open_website(url, name):
    webbrowser.open(url)
    return f"Opening {name}."

def play_on_youtube(query):
    search_query = urllib.parse.quote(query)
    url = f"https://www.youtube.com/results?search_query={search_query}"
    webbrowser.open(url)
    return f"Searching for {query} on YouTube."

# --- Command Dictionaries ---
KEYWORD_COMMANDS = {
    "time": lambda: f"The current time is {datetime.datetime.now().strftime('%I:%M %p')}.",
    "date": lambda: f"Today is {datetime.datetime.now().strftime('%B %d, %Y')}.",
    "open youtube": lambda: open_website("https://youtube.com", "YouTube"),
    "open google": lambda: open_website("https://google.com", "Google"),
    "hello": lambda: "Hello! How can I help you?",
    "hi": lambda: "Hi there! What can I do for you?",
}

REGEX_COMMANDS = {
    r"play (.+) on youtube": play_on_youtube,
}

@eel.expose
def get_response(user_input):
    """Processes user commands and gets AI responses."""
    print("--------------------")
    print(f"[DEBUG] Received input: '{user_input}'")
    normalized_input = user_input.lower().strip()

    # 1. Check for REGEX commands
    for pattern, func in REGEX_COMMANDS.items():
        match = re.search(pattern, normalized_input)
        if match:
            return func(match.group(1))

    # 2. Check for KEYWORD commands
    for keyword, func in KEYWORD_COMMANDS.items():
        if keyword in normalized_input:
            return func()

    # 3. Fallback to AI, letting g4f choose the provider automatically
    print("[DEBUG] No local command matched. Querying AI...")
    try:
        # This is the simplest and most robust call.
        # It tells the library to find ANY working provider for the default model.
        response = g4f.ChatCompletion.create(
            model=g4f.models.default,
            messages=[{"role": "user", "content": user_input}],
            stream=False,
        )
        if not response:
             raise Exception("AI returned an empty or invalid response.")

        print(f"[DEBUG] AI Response: '{response}'")
        return response
    except Exception as e:
        print(f"[!! AI ERROR !!] An error occurred with g4f: {e}")
        return "Sorry, my AI brain is currently offline. Please try again later."

# --- Main Execution ---
if __name__ == '__main__':
    init_db()
    print("Starting Jarvis Application...")
    eel.start('login.html', size=(1000, 700))