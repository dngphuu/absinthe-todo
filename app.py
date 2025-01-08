from flask import Flask, render_template, redirect, request, url_for

app = Flask(__name__, template_folder="templates")


@app.route("/login")
def login():
    return render_template("login.html")

@app.route("/")
def index():
    return render_template("index.html")

if __name__ == "__main__":
    app.run(debug=True)
