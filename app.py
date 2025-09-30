from flask import Flask, render_template, request, redirect, url_for, session, flash
from werkzeug.security import generate_password_hash, check_password_hash

app = Flask(__name__)
app.secret_key = "supersecretkey_r21m"  # replace with env var in production

# Mock users (username -> hashed password)
users = {
    "demo": generate_password_hash("password123"),
    "admin": generate_password_hash("adminpass")
}

@app.route("/")
def home():
    return redirect(url_for("login"))

@app.route("/login", methods=["GET", "POST"])
def login():
    if request.method == "POST":
        username = request.form["username"]
        password = request.form["password"]

        if username in users and check_password_hash(users[username], password):
            session["user"] = username
            # Removed "Login successful!" flash
            return redirect(url_for("dashboard"))
        else:
            flash("Invalid username or password", "danger")
    return render_template("login.html")

@app.route("/dashboard")
def dashboard():
    if "user" not in session:
        flash("Please log in first", "warning")
        return redirect(url_for("login"))
    return render_template("dashboard.html", user=session["user"])

@app.route("/logout")
def logout():
    session.clear()  # clears everything (safer than pop for future growth)
    flash("You’ve been logged out.", "info")
    return redirect(url_for("login"))

if __name__ == "__main__":
    app.run(debug=True)
