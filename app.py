from flask import Flask, render_template, redirect, request, session, url_for

app = Flask(__name__, template_folder="templates")
app.secret_key = "secret_key"

@app.route("/login", methods=["GET", "POST"])
def login():
    if request.method == "POST":
        session['isAuth'] = True
        return redirect(url_for("index"))
    return render_template("login.html")

@app.route("/logout")
def logout():
    session.pop('isAuth', None)
    return redirect(url_for("login"))

@app.route("/")
def index():
    if session.get('isAuth'):
        return render_template("index.html")
    else:
        return redirect(url_for("login"))

if __name__ == "__main__":
    app.run(debug=True)
