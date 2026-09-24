import urllib.request, urllib.error, json
req = urllib.request.Request(
    'https://telegram-z0dj.onrender.com/tasks', 
    data=json.dumps({'user_id': 1080737807, 'title': 'Test date', 'description': '', 'remind_at': '2026-09-23T20:12:00.000Z'}).encode(), 
    headers={'Origin': 'https://heroic-boba-c1e326.netlify.app', 'Content-Type': 'application/json'}
)
try:
    urllib.request.urlopen(req)
except urllib.error.HTTPError as e:
    print(e.read().decode())
