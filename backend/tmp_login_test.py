import requests

login_resp = requests.post(
    "http://127.0.0.1:8000/api/v1/auth/login/full",
    data={"username": "admin@combine.dev", "password": "admin123"},
)
print(login_resp.status_code)
print(login_resp.text)
